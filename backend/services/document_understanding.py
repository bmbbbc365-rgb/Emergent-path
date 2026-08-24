"""Document Understanding Service.

Provider-agnostic abstraction for AI-powered document analysis.
Callers speak to `DocumentUnderstandingService`; the underlying provider
(Gemini today, potentially OpenAI/Claude/other later) is swappable via
env var without touching the Document Center or Blueprint workflows.

Design rules:
- Do NOT persist raw model responses that contain sensitive identifiers.
  Return structured, validated fields; sensitive values are marked so the
  caller can store them separately.
- Do NOT extract sensitive identifiers unless they serve a legitimate
  organizational purpose for the participant.
- If the model cannot confidently classify a document, return
  document_type="unknown" with a low confidence — never invent certainty.
"""
from __future__ import annotations

import json
import logging
import os
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger("bmb.doc-understanding")


# ---------- Public dataclasses ----------
@dataclass
class ExtractedField:
    """A single extracted piece of data."""
    key: str                        # e.g. "employer", "pay_date"
    label: str                      # human label, e.g. "Employer"
    value: Any                      # extracted value (string, number, ISO date)
    sensitive: bool = False         # if true, mask in UI by default


@dataclass
class AnalysisResult:
    """Structured, provider-agnostic result of analyzing one document."""
    document_type: str              # e.g. "pay_stub", "drivers_license", "unknown"
    document_type_label: str        # e.g. "Pay Stub"
    category: str                   # BMB category slug, e.g. "employment"
    confidence: float               # 0.0 – 1.0
    suggested_sections: list[str] = field(default_factory=list)  # BMB section slugs
    suggested_hub_targets: list[str] = field(default_factory=list)  # e.g. "employment_income"
    summary: str = ""               # 1-2 sentence plain-language summary (NO sensitive values)
    fields: list[ExtractedField] = field(default_factory=list)   # non-sensitive fields
    sensitive_fields: list[ExtractedField] = field(default_factory=list)  # SSN/DL/etc.
    provider: str = ""              # e.g. "gemini"
    model: str = ""                 # e.g. "gemini-3-flash-preview"
    warnings: list[str] = field(default_factory=list)


# ---------- Extraction schema hint given to the model ----------
# Enumerated known document types. The model is allowed to return "other" or "unknown".
KNOWN_DOCUMENT_TYPES = {
    "drivers_license":        {"label": "Driver's License / State ID", "category": "identification"},
    "state_id":               {"label": "State ID", "category": "identification"},
    "social_security_card":   {"label": "Social Security Card",        "category": "identification"},
    "birth_certificate":      {"label": "Birth Certificate",           "category": "identification"},
    "passport":               {"label": "Passport",                    "category": "identification"},
    "release_document":       {"label": "Release Document",            "category": "requirements"},
    "court_document":         {"label": "Court Document",              "category": "requirements"},
    "supervision_document":   {"label": "Probation / Parole / Supervision Document", "category": "requirements"},
    "requirement_document":   {"label": "Requirement / Compliance Document", "category": "requirements"},
    "pay_stub":               {"label": "Pay Stub",                    "category": "employment"},
    "employer_letter":        {"label": "Employer Letter",             "category": "employment"},
    "w2":                     {"label": "W-2",                         "category": "employment"},
    "resume":                 {"label": "Resume",                      "category": "employment"},
    "training_certificate":   {"label": "Training Certificate",        "category": "education"},
    "education_record":       {"label": "Education Record",            "category": "education"},
    "benefits_document":      {"label": "Benefits Document",           "category": "benefits"},
    "insurance_card":         {"label": "Insurance Card",              "category": "benefits"},
    "insurance_document":     {"label": "Insurance Document",          "category": "benefits"},
    "medicaid_document":      {"label": "Medicaid / Medicare Document","category": "benefits"},
    "lease":                  {"label": "Lease Agreement",             "category": "housing"},
    "utility_bill":           {"label": "Utility Bill",                "category": "housing"},
    "housing_document":       {"label": "Housing Document",            "category": "housing"},
    "medical_record":         {"label": "Medical Record / Visit Summary", "category": "health"},
    "prescription":           {"label": "Prescription",                "category": "health"},
    "vaccination_record":     {"label": "Vaccination Record",          "category": "health"},
    "health_document":        {"label": "Health Document",             "category": "health"},
    "bank_document":          {"label": "Bank Document",               "category": "financial"},
    "financial_document":     {"label": "Financial Document",          "category": "financial"},
    "resource_document":      {"label": "Program / Resource Document", "category": "resources"},
    "other":                  {"label": "Other Document",              "category": "other"},
    "unknown":                {"label": "Undetermined",                "category": "other"},
}

CATEGORY_TO_SECTIONS = {
    "identification":  ["documents"],
    "requirements":    ["documents", "requirements"],
    "employment":      ["documents", "employment-record", "employment-readiness"],
    "education":       ["documents", "employment-readiness"],
    "benefits":        ["documents", "benefits-hub"],
    "housing":         ["documents", "home-hub"],
    "health":          ["documents", "health-hub"],
    "financial":       ["documents"],
    "resources":       ["documents", "independent-living"],
    "other":           ["documents"],
}

CATEGORY_TO_HUB_TARGETS = {
    "employment":     ["employment_income", "employment_job"],
    "benefits":       ["benefits_record"],
    "housing":        ["housing_record"],
    "health":         ["health_appointment"],
    "education":      ["credential"],
    "requirements":   ["requirement_evidence"],
}


# Sensitive identifier keys the model may return — these are extracted only
# when useful, and stored separately from the ordinary field list.
SENSITIVE_KEYS = {
    "ssn", "social_security_number", "sin",
    "drivers_license_number", "state_id_number", "license_number",
    "member_id", "insurance_member_id", "policy_number",
    "medicaid_id", "medicare_id",
    "account_number", "bank_account_number", "routing_number",
    "passport_number",
}


def mask_sensitive_value(key: str, value: Any) -> str:
    """Return a UI-safe mask like '***-**-1234' or '••••1234'."""
    if value is None:
        return ""
    s = str(value)
    digits = re.sub(r"\D", "", s)
    if key in {"ssn", "social_security_number", "sin"} and len(digits) >= 4:
        return f"***-**-{digits[-4:]}"
    if len(s) <= 4:
        return "•" * len(s)
    return f"••••{s[-4:]}"


# ---------- Provider interface ----------
class DocumentProvider:
    """Base class for document-understanding providers."""

    name = "base"
    model = ""

    async def analyze(self, file_path: str, mime_type: str, hints: Optional[dict] = None) -> AnalysisResult:  # noqa: D401
        raise NotImplementedError


# ---------- Gemini provider (default) ----------
class GeminiProvider(DocumentProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-3-flash-preview"):
        self.api_key = api_key
        self.model = model

    def _build_system(self) -> str:
        types_list = "\n".join(f"  - {k}: {v['label']}" for k, v in KNOWN_DOCUMENT_TYPES.items())
        return (
            "You are a document-understanding service for a re-entry life-readiness platform "
            "called Build My Blueprint. A participant has uploaded a document. Your job is to "
            "classify it and extract STRUCTURED, USEFUL fields ONLY.\n\n"
            "STRICT OUTPUT: return a single JSON object matching the schema below. "
            "Do not include any prose outside the JSON. Do not include markdown code fences.\n\n"
            "Known document_type values (use one of these, prefer the most specific):\n"
            f"{types_list}\n\n"
            "SCHEMA:\n"
            "{\n"
            '  "document_type": "one of the values above",\n'
            '  "confidence": 0.0-1.0,\n'
            '  "summary": "one plain-language sentence, no sensitive identifiers",\n'
            '  "fields": [ { "key": "snake_case", "label": "Human Label", "value": "..." }, ... ],\n'
            '  "sensitive_fields": [ { "key": "ssn|drivers_license_number|member_id|etc.", "label": "...", "value": "..." }, ... ]\n'
            "}\n\n"
            "FIELD RULES:\n"
            "- Only include fields with legitimate organizational value (dates, amounts, employer, "
            "  agency, program, provider, policy plan name, address, etc.).\n"
            "- Sensitive identifiers (SSN, driver's license number, insurance/member/policy/account "
            "  numbers) go in 'sensitive_fields'. Extract them ONLY if they provide a legitimate "
            "  workflow purpose. Do NOT extract everything printed on an ID card just because you can.\n"
            "- Never invent or guess values. If unsure, omit the field.\n"
            "- Use ISO dates (YYYY-MM-DD). Dollar amounts as numbers (no $).\n"
            "- DO NOT include free-form medical diagnoses or personal narratives in fields.\n"
            "- If you cannot confidently identify the document, set document_type='unknown' and "
            "  confidence<=0.4. Do not fabricate certainty.\n"
            "- The 'summary' must NOT contain SSN, DL number, or full account numbers.\n"
        )

    async def analyze(self, file_path: str, mime_type: str, hints: Optional[dict] = None) -> AnalysisResult:
        from emergentintegrations.llm.chat import (
            LlmChat, UserMessage, FileContentWithMimeType, TextDelta, StreamDone,
        )

        session_id = f"doc_{uuid.uuid4().hex}"
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=self._build_system(),
        ).with_model("gemini", self.model)

        attachment = FileContentWithMimeType(file_path=file_path, mime_type=mime_type)
        user_text = "Analyze this document and return ONLY the JSON object per the schema."
        if hints and hints.get("filename"):
            user_text += f" The original filename was: {hints['filename']}"

        chunks: list[str] = []
        try:
            async for ev in chat.stream_message(UserMessage(text=user_text, file_contents=[attachment])):
                if isinstance(ev, TextDelta):
                    chunks.append(ev.content)
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("Gemini analyze failed")
            return AnalysisResult(
                document_type="unknown",
                document_type_label=KNOWN_DOCUMENT_TYPES["unknown"]["label"],
                category="other",
                confidence=0.0,
                summary="We could not analyze this document right now.",
                suggested_sections=["documents"],
                provider=self.name, model=self.model,
                warnings=[f"provider_error: {e}"],
            )

        raw = "".join(chunks).strip()
        return self._parse(raw)

    def _parse(self, raw: str) -> AnalysisResult:
        # Strip markdown fences if the model added them.
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        # Find outermost JSON object if there is stray text.
        m = re.search(r"\{.*\}", cleaned, re.DOTALL)
        payload_str = m.group(0) if m else cleaned
        try:
            data = json.loads(payload_str)
        except Exception:
            logger.warning("Doc analysis: model returned non-JSON")
            return AnalysisResult(
                document_type="unknown",
                document_type_label=KNOWN_DOCUMENT_TYPES["unknown"]["label"],
                category="other",
                confidence=0.0,
                summary="We're not completely sure what this document is.",
                suggested_sections=["documents"],
                provider=self.name, model=self.model,
                warnings=["parse_failed"],
            )

        dtype = str(data.get("document_type", "unknown")).lower().strip()
        if dtype not in KNOWN_DOCUMENT_TYPES:
            dtype = "unknown"
        meta = KNOWN_DOCUMENT_TYPES[dtype]
        confidence = float(data.get("confidence", 0.0) or 0.0)
        confidence = max(0.0, min(1.0, confidence))

        fields_raw = data.get("fields") or []
        sensitive_raw = data.get("sensitive_fields") or []

        fields: list[ExtractedField] = []
        for f in fields_raw:
            if not isinstance(f, dict) or not f.get("key"):
                continue
            k = str(f["key"]).lower().strip()
            # Re-route any sensitive-looking key into the sensitive bucket even if
            # the model put it in the wrong list.
            if k in SENSITIVE_KEYS:
                sensitive_raw.append(f)
                continue
            fields.append(ExtractedField(
                key=k,
                label=str(f.get("label") or k.replace("_", " ").title()),
                value=f.get("value"),
                sensitive=False,
            ))

        sensitive: list[ExtractedField] = []
        for f in sensitive_raw:
            if not isinstance(f, dict) or not f.get("key"):
                continue
            k = str(f["key"]).lower().strip()
            sensitive.append(ExtractedField(
                key=k,
                label=str(f.get("label") or k.replace("_", " ").title()),
                value=f.get("value"),
                sensitive=True,
            ))

        return AnalysisResult(
            document_type=dtype,
            document_type_label=meta["label"],
            category=meta["category"],
            confidence=confidence,
            suggested_sections=list(CATEGORY_TO_SECTIONS.get(meta["category"], ["documents"])),
            suggested_hub_targets=list(CATEGORY_TO_HUB_TARGETS.get(meta["category"], [])),
            summary=str(data.get("summary") or ""),
            fields=fields,
            sensitive_fields=sensitive,
            provider=self.name,
            model=self.model,
        )


# ---------- Service facade ----------
class DocumentUnderstandingService:
    """The single object the rest of the app talks to."""

    def __init__(self, provider: DocumentProvider):
        self.provider = provider

    async def analyze(self, file_path: str, mime_type: str, hints: Optional[dict] = None) -> AnalysisResult:
        return await self.provider.analyze(file_path, mime_type, hints=hints)


# ---------- Factory ----------
_SINGLETON: Optional[DocumentUnderstandingService] = None

def get_document_understanding_service() -> Optional[DocumentUnderstandingService]:
    """Return a memoized service backed by the configured provider."""
    global _SINGLETON
    if _SINGLETON is not None:
        return _SINGLETON
    api_key = os.environ.get("EMERGENT_LLM_KEY") or ""
    if not api_key:
        logger.warning("EMERGENT_LLM_KEY missing; DocumentUnderstandingService disabled")
        return None
    provider_name = os.environ.get("DOC_UNDERSTANDING_PROVIDER", "gemini").lower()
    model = os.environ.get("DOC_UNDERSTANDING_MODEL", "gemini-3-flash-preview")
    if provider_name == "gemini":
        provider: DocumentProvider = GeminiProvider(api_key=api_key, model=model)
    else:
        # Only Gemini is wired in today; the abstraction allows adding more.
        logger.warning("Unknown provider %s — defaulting to gemini", provider_name)
        provider = GeminiProvider(api_key=api_key, model=model)
    _SINGLETON = DocumentUnderstandingService(provider)
    return _SINGLETON


# ---------- Utilities used by callers ----------
SUPPORTED_MIME = {
    "image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif",
    "application/pdf",
}

def is_supported_mime(m: str) -> bool:
    return (m or "").lower() in SUPPORTED_MIME
