"""Phase 3 — Intake · Living Blueprint · Action Map · Emergency Hub

Wired into server.py. Uses the same `db`, `api_router`, `current_user`,
`require_role`, `now_iso`, `new_id`, `_audit`, `_staff_can_access_participant`,
and `get_document_understanding_service` primitives already in server.py.
"""
from __future__ import annotations

import io
import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel

logger = logging.getLogger("bmb.phase3")

# These are injected by server.py after import (avoids circular import).
db = None
api_router: APIRouter = None  # type: ignore
current_user = None
require_role = None
now_iso = None
new_id = None
_audit = None
BASE_APP_URL = ""   # e.g. https://blueprint-launch-9.preview.emergentagent.com


# ============================================================
#  INTAKE
# ============================================================
INTAKE_SCHEMA = [
    {"id": "immediate", "title": "Right now",
     "questions": [
         {"key": "housing_safe_tonight", "label": "Do you have a safe place to stay tonight?", "type": "yes_no_unsure"},
         {"key": "food_access", "label": "Do you have access to food today?", "type": "yes_no_unsure"},
         {"key": "phone_working", "label": "Do you have a working phone?", "type": "yes_no_unsure"},
         {"key": "email_access", "label": "Do you have access to email?", "type": "yes_no_unsure"},
         {"key": "urgent_concern", "label": "Is there anything urgent going on today?", "type": "text_long"},
     ]},
    {"id": "identification", "title": "Identification & documents",
     "questions": [
         {"key": "has_state_id", "label": "Do you have a valid state ID?", "type": "yes_no_unsure"},
         {"key": "has_drivers_license", "label": "Do you have a driver's license?", "type": "yes_no_unsure"},
         {"key": "has_ssn_card", "label": "Do you have your Social Security card?", "type": "yes_no_unsure"},
         {"key": "has_birth_certificate", "label": "Do you have your birth certificate?", "type": "yes_no_unsure"},
         {"key": "has_release_paperwork", "label": "Do you have your release / court / supervision paperwork?", "type": "yes_no_unsure"},
     ]},
    {"id": "education_employment", "title": "Education & work",
     "questions": [
         {"key": "education_level", "label": "Highest level of education completed?",
          "type": "choice", "options": ["Less than high school", "GED / HiSET", "High school diploma", "Some college", "Associate's", "Bachelor's or higher"]},
         {"key": "wants_ged", "label": "Interested in earning a GED?", "type": "yes_no_unsure"},
         {"key": "currently_employed", "label": "Are you currently employed?", "type": "yes_no_unsure"},
         {"key": "wants_resume_help", "label": "Would help building a resume be useful?", "type": "yes_no_unsure"},
         {"key": "wants_interview_help", "label": "Would interview preparation be useful?", "type": "yes_no_unsure"},
         {"key": "career_interest", "label": "What kind of work interests you most?", "type": "text_short"},
     ]},
    {"id": "health", "title": "Health",
     "questions": [
         {"key": "has_provider", "label": "Do you have a doctor or clinic right now?", "type": "yes_no_unsure"},
         {"key": "takes_medications", "label": "Are you taking any medications?", "type": "yes_no_unsure"},
         {"key": "needs_refill_soon", "label": "Do any of your medications need refilling in the next 2 weeks?", "type": "yes_no_unsure"},
         {"key": "wants_mental_health_support", "label": "Would mental-health support be helpful?", "type": "yes_no_unsure"},
         {"key": "wants_recovery_support", "label": "Would recovery / substance-use support be helpful?", "type": "yes_no_unsure"},
         {"key": "has_insurance", "label": "Do you currently have Medicaid or health insurance?", "type": "yes_no_unsure"},
     ]},
    {"id": "compliance", "title": "Legal & supervision",
     "questions": [
         {"key": "on_supervision", "label": "Are you currently on parole or probation?", "type": "yes_no_unsure"},
         {"key": "knows_reporting", "label": "Do you know when and how to report?", "type": "yes_no_unsure"},
         {"key": "upcoming_court", "label": "Do you have any upcoming court dates?", "type": "yes_no_unsure"},
         {"key": "wants_reminders", "label": "Would reminders for these help?", "type": "yes_no_unsure"},
     ]},
    {"id": "support", "title": "Support network",
     "questions": [
         {"key": "has_emergency_contact", "label": "Do you have an emergency contact you trust?", "type": "yes_no_unsure"},
         {"key": "has_support_person", "label": "Is there someone who could help you in a pinch?", "type": "yes_no_unsure"},
         {"key": "has_dependents", "label": "Do you have children or dependents?", "type": "yes_no_unsure"},
         {"key": "wants_family_help", "label": "Would help reconnecting with healthy family be useful?", "type": "yes_no_unsure"},
     ]},
]
ALLOWED_ANSWER_META = {"dont_know", "not_applicable", "later"}


class IntakeAnswerIn(BaseModel):
    section: str
    key: str
    value: object = None
    meta: Optional[str] = None  # dont_know | not_applicable | later


async def _get_intake_progress(uid: str, org_id: Optional[str], prog_id: Optional[str], enr_id: Optional[str]) -> dict:
    doc = await db.intake_progress.find_one({"participant_user_id": uid}, {"_id": 0})
    if not doc:
        doc = {"id": new_id("ip_"), "participant_user_id": uid, "organization_id": org_id,
               "program_id": prog_id, "enrollment_id": enr_id,
               "current_section": INTAKE_SCHEMA[0]["id"], "sections_complete": [],
               "pct": 0, "completed_at": None, "last_activity_at": now_iso()}
        await db.intake_progress.insert_one(doc)
    return doc


def register(_db, _api_router, _current_user, _require_role, _now_iso, _new_id, _audit_fn, base_url: str):
    """Called by server.py after imports."""
    global db, api_router, current_user, require_role, now_iso, new_id, _audit, BASE_APP_URL
    db = _db; api_router = _api_router; current_user = _current_user
    require_role = _require_role; now_iso = _now_iso; new_id = _new_id
    _audit = _audit_fn; BASE_APP_URL = base_url
    # Register the additional P3d/e/f endpoints (staff notes + reminders + participant notes-mine).
    register_notes_reminders()

    # -------- Intake --------
    @api_router.get("/onboarding/schema")
    async def onboarding_schema(user: dict = Depends(current_user)):
        return {"sections": INTAKE_SCHEMA}

    @api_router.get("/onboarding/state")
    async def onboarding_state(user: dict = Depends(current_user)):
        en = await db.enrollments.find_one({"participant_user_id": user["user_id"]}, {"_id": 0}) or {}
        prog = await _get_intake_progress(user["user_id"], en.get("org_id"), en.get("program_id"), en.get("id"))
        answers = await db.intake_responses.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(500)
        return {"progress": prog, "answers": answers}

    @api_router.put("/onboarding/answer")
    async def onboarding_answer(body: IntakeAnswerIn, user: dict = Depends(current_user)):
        if not any(s["id"] == body.section for s in INTAKE_SCHEMA):
            raise HTTPException(400, "Unknown section")
        section = next(s for s in INTAKE_SCHEMA if s["id"] == body.section)
        if not any(q["key"] == body.key for q in section["questions"]):
            raise HTTPException(400, "Unknown question")
        if body.meta and body.meta not in ALLOWED_ANSWER_META:
            raise HTTPException(400, "Invalid meta")
        en = await db.enrollments.find_one({"participant_user_id": user["user_id"]}, {"_id": 0}) or {}
        await db.intake_responses.update_one(
            {"participant_user_id": user["user_id"], "section": body.section, "key": body.key},
            {"$set": {"id": new_id("ir_"), "participant_user_id": user["user_id"],
                      "organization_id": en.get("org_id"), "program_id": en.get("program_id"),
                      "enrollment_id": en.get("id"),
                      "section": body.section, "key": body.key,
                      "value": body.value, "meta": body.meta, "updated_at": now_iso()}},
            upsert=True,
        )
        # Update progress pct
        total = sum(len(s["questions"]) for s in INTAKE_SCHEMA)
        answered = await db.intake_responses.count_documents({"participant_user_id": user["user_id"]})
        await db.intake_progress.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {"pct": round(answered / total * 100), "last_activity_at": now_iso(),
                      "current_section": body.section}},
        )
        return {"ok": True, "pct": round(answered / total * 100)}

    @api_router.post("/onboarding/complete")
    async def onboarding_complete(user: dict = Depends(current_user)):
        await db.intake_progress.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {"completed_at": now_iso()}},
        )
        result = await recompute_stability(user["user_id"])
        await regenerate_action_map(user["user_id"])
        return {"ok": True, "blueprint": result}

    # -------- Living Blueprint / Stability --------
    @api_router.get("/blueprint")
    async def get_blueprint(user: dict = Depends(current_user)):
        domains = await db.stability_domain_state.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(50)
        if not domains:
            await recompute_stability(user["user_id"])
            domains = await db.stability_domain_state.find(
                {"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(50)
        history = await db.stability_history.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
        return {"domains": domains, "history": list(reversed(history))}

    @api_router.post("/blueprint/recompute")
    async def blueprint_recompute(user: dict = Depends(current_user)):
        return await recompute_stability(user["user_id"])

    # -------- Action Map --------
    @api_router.get("/action-map")
    async def list_action_map(user: dict = Depends(current_user)):
        items = await db.action_map_items.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).sort([("priority", -1), ("created_at", -1)]).to_list(200)
        return items

    class ActionUpdateIn(BaseModel):
        status: Optional[str] = None
        notes: Optional[str] = None
        due_date: Optional[str] = None
        declined: Optional[bool] = None

    @api_router.patch("/action-map/{item_id}")
    async def update_action(item_id: str, body: ActionUpdateIn, user: dict = Depends(current_user)):
        upd = {k: v for k, v in body.model_dump(exclude_none=True).items()
               if k in {"status", "notes", "due_date", "declined"}}
        if upd.get("status") == "completed":
            upd["completed_at"] = now_iso()
        res = await db.action_map_items.update_one(
            {"id": item_id, "participant_user_id": user["user_id"]}, {"$set": upd})
        if res.matched_count == 0: raise HTTPException(404, "Not found")
        if upd.get("status") == "completed":
            await recompute_stability(user["user_id"])
        return await db.action_map_items.find_one({"id": item_id}, {"_id": 0})

    @api_router.post("/action-map/regenerate")
    async def regen(user: dict = Depends(current_user)):
        return await regenerate_action_map(user["user_id"])

    # -------- Emergency Hub --------
    class EmergencyPublicIn(BaseModel):
        enabled: bool
        allowed_fields: list[str] = []

    @api_router.get("/emergency/public-profile")
    async def get_emergency_public(user: dict = Depends(current_user)):
        rec = await db.emergency_profile_public.find_one({"participant_user_id": user["user_id"]}, {"_id": 0})
        return rec or {"participant_user_id": user["user_id"], "enabled": False, "allowed_fields": []}

    @api_router.put("/emergency/public-profile")
    async def put_emergency_public(body: EmergencyPublicIn, user: dict = Depends(current_user)):
        rec = await db.emergency_profile_public.find_one({"participant_user_id": user["user_id"]}, {"_id": 0})
        if not rec:
            rec = {"id": new_id("epub_"), "participant_user_id": user["user_id"],
                   "public_slug": secrets.token_urlsafe(24), "enabled": body.enabled,
                   "allowed_fields": body.allowed_fields, "created_at": now_iso(),
                   "rotated_at": None, "revoked_at": None, "scan_count": 0}
            await db.emergency_profile_public.insert_one(rec)
            rec.pop("_id", None)
        else:
            await db.emergency_profile_public.update_one(
                {"participant_user_id": user["user_id"]},
                {"$set": {"enabled": body.enabled, "allowed_fields": body.allowed_fields,
                          "revoked_at": None if body.enabled else now_iso()}},
            )
            rec = await db.emergency_profile_public.find_one({"participant_user_id": user["user_id"]}, {"_id": 0})
        return rec

    @api_router.post("/emergency/rotate-slug")
    async def rotate_slug(user: dict = Depends(current_user)):
        new_slug = secrets.token_urlsafe(24)
        await db.emergency_profile_public.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {"public_slug": new_slug, "rotated_at": now_iso()}},
            upsert=False,
        )
        rec = await db.emergency_profile_public.find_one({"participant_user_id": user["user_id"]}, {"_id": 0})
        return rec

    @api_router.get("/emergency/qr")
    async def emergency_qr(user: dict = Depends(current_user)):
        rec = await db.emergency_profile_public.find_one({"participant_user_id": user["user_id"]}, {"_id": 0})
        if not rec: raise HTTPException(404, "Configure emergency profile first")
        url = f"{BASE_APP_URL}/e/{rec['public_slug']}"
        img = qrcode.make(url)
        buf = io.BytesIO(); img.save(buf, format="PNG")
        return Response(content=buf.getvalue(), media_type="image/png",
                        headers={"Cache-Control": "no-store"})

    @api_router.get("/emergency/scan-history")
    async def scan_history(user: dict = Depends(current_user)):
        events = await db.audit_events.find(
            {"actor_user_id": None, "target_type": "emergency_public",
             "action": "emergency.public_view", "target_id": user["user_id"]},
            {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
        return events


# ============================================================
#  STABILITY ENGINE  (10 domains → stage)
# ============================================================
DOMAINS = [
    "safety_essentials", "identification", "housing", "transportation",
    "employment_income", "education_training", "health", "wellness",
    "compliance", "support_network",
]

def _stage(score: int) -> str:
    if score < 30: return "needs_attention"
    if score < 60: return "getting_started"
    if score < 85: return "building"
    return "stable"


async def _answer(uid, section, key) -> Optional[dict]:
    return await db.intake_responses.find_one(
        {"participant_user_id": uid, "section": section, "key": key}, {"_id": 0})


async def _yes(uid, section, key) -> bool:
    a = await _answer(uid, section, key)
    return bool(a) and a.get("value") == "yes"


async def _score_domain(uid: str, domain: str) -> tuple[int, str]:
    """Return (score, plain-language reason)."""
    if domain == "safety_essentials":
        score = 0; reasons = []
        if await _yes(uid, "immediate", "housing_safe_tonight"): score += 40
        else: reasons.append("a safe place to stay")
        if await _yes(uid, "immediate", "food_access"): score += 20
        else: reasons.append("food access")
        if await _yes(uid, "immediate", "phone_working"): score += 20
        else: reasons.append("a working phone")
        if await _yes(uid, "immediate", "email_access"): score += 20
        else: reasons.append("email access")
        return score, ("You still need " + ", ".join(reasons) + ".") if reasons else "You have the essentials covered."
    if domain == "identification":
        docs = await db.documents.find({"user_id": uid, "is_deleted": False, "status": "confirmed"},
                                        {"_id": 0, "document_type": 1}).to_list(200)
        types = {d.get("document_type") for d in docs}
        checks = {"state_id": ("state_id" in types or "drivers_license" in types),
                  "ssn_card": "social_security_card" in types,
                  "birth_cert": "birth_certificate" in types}
        # Fall back to intake if docs not present.
        if not checks["state_id"]: checks["state_id"] = await _yes(uid, "identification", "has_state_id") or await _yes(uid, "identification", "has_drivers_license")
        if not checks["ssn_card"]: checks["ssn_card"] = await _yes(uid, "identification", "has_ssn_card")
        if not checks["birth_cert"]: checks["birth_cert"] = await _yes(uid, "identification", "has_birth_certificate")
        got = sum(checks.values())
        score = int(got / 3 * 100)
        missing = [k.replace("_", " ") for k, v in checks.items() if not v]
        return score, ("You still need: " + ", ".join(missing) + ".") if missing else "Your core IDs are in place."
    if domain == "housing":
        h = await db.housing_records.find_one({"user_id": uid, "status": "current"}, {"_id": 0})
        if h: return 80, f"You have a current housing record ({h.get('type','—')})."
        if await _yes(uid, "immediate", "housing_safe_tonight"): return 40, "You have somewhere safe tonight — let's plan the next 30 days."
        return 10, "Housing is the first thing to stabilize."
    if domain == "transportation":
        has_dl = await _yes(uid, "identification", "has_drivers_license")
        return (70, "You have a driver's license.") if has_dl else (35, "Getting a valid ID and understanding transit options are next.")
    if domain == "employment_income":
        jobs = await db.jobs.count_documents({"user_id": uid, "status": "active"})
        apps = await db.job_applications.count_documents({"user_id": uid})
        if jobs > 0: return 85, "You have active employment."
        if apps > 0: return 55, f"You have {apps} application(s) in progress."
        if await _yes(uid, "education_employment", "wants_resume_help"): return 25, "Building your resume is the first move."
        return 20, "Employment work has not started yet."
    if domain == "education_training":
        a = await _answer(uid, "education_employment", "education_level")
        lvl = (a or {}).get("value") or ""
        if any(k in lvl.lower() for k in ("bachelor", "associate", "some college")): return 80, f"{lvl} completed."
        if "high school" in lvl.lower() or "ged" in lvl.lower(): return 65, f"{lvl} completed."
        if await _yes(uid, "education_employment", "wants_ged"): return 35, "You want to earn a GED — we can plan that."
        return 30, "Education plans not set yet."
    if domain == "health":
        provider = await _yes(uid, "health", "has_provider")
        insurance = await _yes(uid, "health", "has_insurance")
        meds = await db.medications.count_documents({"user_id": uid})
        score = 0
        if provider: score += 40
        if insurance: score += 30
        if meds > 0: score += 20
        if await _yes(uid, "immediate", "urgent_concern"): score -= 10
        r = []
        if not provider: r.append("a doctor or clinic")
        if not insurance: r.append("insurance / Medicaid")
        return max(0, score), ("You still need " + ", ".join(r) + ".") if r else "Your health basics are organized."
    if domain == "wellness":
        logs = await db.wellness_logs.count_documents({"user_id": uid})
        if logs >= 5: return 70, f"{logs} wellness check-ins logged."
        if logs > 0: return 45, "You've started logging wellness."
        return 25, "Regular check-ins help you notice patterns early."
    if domain == "compliance":
        reqs = await db.requirements.find({"user_id": uid}, {"_id": 0}).to_list(500)
        if not reqs: return 40, "No supervision requirements entered."
        done = sum(1 for r in reqs if (r.get("verification") or {}).get("status") == "verified")
        total = len(reqs)
        return int(done / total * 100) if total else 0, f"{done} of {total} requirements verified."
    if domain == "support_network":
        contacts = await db.support_contacts.count_documents({"user_id": uid})
        has_ec = await _yes(uid, "support", "has_emergency_contact")
        score = 0
        if contacts >= 3: score += 60
        elif contacts >= 1: score += 30
        if has_ec: score += 40
        return min(100, score), f"{contacts} people in your Support Circle."
    return 0, ""


async def recompute_stability(uid: str) -> dict:
    en = await db.enrollments.find_one({"participant_user_id": uid}, {"_id": 0}) or {}
    out = []
    for d in DOMAINS:
        score, reason = await _score_domain(uid, d)
        stage = _stage(score)
        prior = await db.stability_domain_state.find_one(
            {"participant_user_id": uid, "domain": d}, {"_id": 0})
        await db.stability_domain_state.update_one(
            {"participant_user_id": uid, "domain": d},
            {"$set": {"participant_user_id": uid, "enrollment_id": en.get("id"),
                      "domain": d, "score": score, "stage": stage,
                      "reason": reason, "updated_at": now_iso()}},
            upsert=True,
        )
        if not prior or prior.get("stage") != stage:
            await db.stability_history.insert_one({
                "id": new_id("sh_"), "participant_user_id": uid,
                "enrollment_id": en.get("id"), "domain": d,
                "prior_stage": (prior or {}).get("stage"), "new_stage": stage,
                "score": score, "created_at": now_iso(),
            })
        out.append({"domain": d, "score": score, "stage": stage, "reason": reason})
    return {"domains": out}


# ============================================================
#  ACTION MAP — hybrid rules + LLM "why"
# ============================================================
async def regenerate_action_map(uid: str) -> dict:
    en = await db.enrollments.find_one({"participant_user_id": uid}, {"_id": 0}) or {}
    scoping = {"organization_id": en.get("org_id"), "program_id": en.get("program_id"),
               "enrollment_id": en.get("id"), "participant_user_id": uid}

    # Load domain state
    states = {s["domain"]: s for s in await db.stability_domain_state.find(
        {"participant_user_id": uid}, {"_id": 0}).to_list(50)}

    proposals: list[dict] = []
    def add(domain, title, why, priority=2, route=None):
        proposals.append({"domain": domain, "title": title, "why": why,
                          "priority": priority, "route": route})

    # --- Deterministic rules only ---
    id_state = states.get("identification", {})
    if id_state.get("stage") in ("needs_attention", "getting_started"):
        add("identification", "Get your state ID", id_state.get("reason") or "You need a state ID.",
            priority=3, route="/app/section/documents")
    if not await _yes(uid, "identification", "has_ssn_card"):
        add("identification", "Request a replacement Social Security card",
            "SSN cards are free to replace via SSA.", priority=2, route="/app/section/documents")

    safety = states.get("safety_essentials", {})
    if not await _yes(uid, "immediate", "phone_working"):
        add("safety_essentials", "Get a working phone",
            "Employers, providers, and supervision all need to reach you.", priority=3,
            route="/app/section/independent-living")

    if states.get("employment_income", {}).get("stage") in ("needs_attention", "getting_started"):
        if await _yes(uid, "education_employment", "wants_resume_help"):
            add("employment_income", "Draft your first resume",
                "One page, one strength, one recent win.", priority=2, route="/app/library")
        add("employment_income", "Apply to 3 fair-chance employers this week",
            "Consistent small applications compound.", priority=2, route="/app/section/employment-record")

    if states.get("health", {}).get("stage") == "needs_attention":
        if not await _yes(uid, "health", "has_provider"):
            add("health", "Find a primary care clinic",
                "A provider unlocks refills, referrals, and continuity of care.", priority=3,
                route="/app/section/health-hub")
        if not await _yes(uid, "health", "has_insurance"):
            add("health", "Check Medicaid eligibility",
                "Medicaid may cover you at no cost.", priority=3, route="/app/section/benefits-hub")

    if states.get("compliance", {}).get("stage") in ("needs_attention", "getting_started"):
        add("compliance", "Confirm your next check-in date",
            "Missing a check-in creates real consequences — reminders help.", priority=3,
            route="/app/section/requirements")

    if states.get("support_network", {}).get("stage") in ("needs_attention", "getting_started"):
        add("support_network", "Add 3 people to your Support Circle",
            "One person for stressful moments, one for accountability, one for fun.",
            priority=2, route="/app/section/support-circle")

    if states.get("housing", {}).get("stage") == "needs_attention":
        add("housing", "Stabilize your next 30 days of housing",
            "Even temporary safety unlocks everything else.", priority=3,
            route="/app/section/home-hub")

    # Wipe outdated auto-suggestions, preserve user-modified/completed
    await db.action_map_items.delete_many({
        "participant_user_id": uid, "source": "rule",
        "status": {"$nin": ["completed", "in_progress"]},
        "declined": {"$ne": True},
    })
    now = now_iso()
    for p in proposals:
        # Skip if a matching non-declined item already exists
        exists = await db.action_map_items.find_one({
            "participant_user_id": uid, "title": p["title"],
            "status": {"$in": ["not_started", "in_progress", "waiting", "needs_help"]},
        })
        if exists: continue
        why_personal = await _personalize_why(uid, p["title"], p["why"], p["domain"])
        doc = {"id": new_id("act_"), **scoping, **p,
               "why_personal": why_personal, "source": "rule",
               "status": "not_started", "declined": False,
               "history": [{"at": now, "event": "created"}],
               "created_at": now, "updated_at": now}
        await db.action_map_items.insert_one(doc)
    # Regenerate reminders so due-date/expiration events are always fresh.
    try:
        await refresh_reminders(uid)
    except Exception as e:
        logger.warning(f"refresh_reminders failed: {e}")
    return {"created": len(proposals)}


# ============================================================
#  LLM personalization for Action Map "why"
# ============================================================
import os

_ACTION_LLM_ON = os.environ.get("ACTION_MAP_LLM", "on").lower() == "on"


async def _personalize_why(uid: str, title: str, base_why: str, domain: str) -> Optional[str]:
    """Rephrase the deterministic 'why' in the participant's voice, using their
    intake context. The RULE is still authoritative — we never invent new
    facts, requirements, medical/legal advice, or timelines. If LLM fails,
    we return None and callers fall back to base_why.
    """
    if not _ACTION_LLM_ON:
        return None
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        answers = await db.intake_responses.find(
            {"participant_user_id": uid}, {"_id": 0, "section": 1, "key": 1, "value": 1, "meta": 1}
        ).to_list(200)
        # Compact, non-sensitive context — no names, no SSN, no doc contents.
        ctx = "; ".join(
            f"{a['section']}.{a['key']}={a.get('value') or a.get('meta') or '—'}" for a in answers
        )[:1500]
        chat = LlmChat(
            api_key=key,
            session_id=f"apf_why_{uid}_{domain}",
            system_message=(
                "You are a re-entry stabilization coach. Rewrite the given base 'why' in the "
                "participant's voice — warm, plain, second-person, ONE sentence, ≤22 words. "
                "You must NOT invent new facts, timelines, legal/medical/supervision claims, "
                "credentials, phone numbers, or resources. If the base already fits, tighten it. "
                "Never mention that you rewrote it. Return only the sentence."
            ),
        ).with_model("openai", "gpt-5.6-terra")
        msg = UserMessage(text=(
            f"Domain: {domain}\nAction title: {title}\nBase why: {base_why}\n"
            f"Participant intake (compact): {ctx}\n"
            "Rewrite the base why in the participant's voice. Same meaning, more human."
        ))
        out = await chat.send_message(msg)
        text = str(out).strip().strip('"').strip()
        if len(text) < 6 or len(text) > 240:
            return None
        return text
    except Exception as e:
        logger.warning(f"LLM why personalization failed: {e}")
        return None


# ============================================================
#  P3e — Staff Notes  (participant | shared | internal)
# ============================================================
_VISIBILITIES = {"participant", "shared", "internal"}


async def _staff_can(user: dict, participant_user_id: str) -> bool:
    """Local helper matching server.py's _staff_can_access_participant contract.
    We re-check via db instead of importing to keep this module standalone.
    """
    bindings = user.get("_bindings")
    if bindings is None:
        bindings = await db.role_bindings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
        user["_bindings"] = bindings
    if any(b["role"] == "super_admin" for b in bindings):
        return True
    progs = {b["program_id"] for b in bindings
             if b["role"] in ("program_admin", "program_staff") and b.get("program_id")}
    if not progs:
        return False
    en = await db.enrollments.find_one(
        {"participant_user_id": participant_user_id, "program_id": {"$in": list(progs)}},
        {"_id": 0})
    return en is not None


# ============================================================
#  P3f — Reminders  (in-app first; email/SMS later behind provider abstraction)
# ============================================================
async def refresh_reminders(uid: str) -> dict:
    """Idempotent: for each document expiration and each Action Map due_date,
    ensure ONE non-dismissed reminder exists at the right time.
    """
    from datetime import timedelta as _td, date as _date
    from datetime import datetime as _dt
    en = await db.enrollments.find_one({"participant_user_id": uid}, {"_id": 0}) or {}
    scoping = {"organization_id": en.get("org_id"), "program_id": en.get("program_id"),
               "enrollment_id": en.get("id"), "user_id": uid}
    created = 0

    # 1) Documents with expiration dates
    docs = await db.documents.find(
        {"user_id": uid, "is_deleted": False, "expires_on": {"$exists": True, "$ne": None}},
        {"_id": 0, "id": 1, "label": 1, "document_type_label": 1, "expires_on": 1},
    ).to_list(500)
    for d in docs:
        try:
            exp = _dt.fromisoformat((d["expires_on"]).replace("Z", "+00:00")) if "T" in str(d["expires_on"]) else _dt.fromisoformat(str(d["expires_on"]))
        except Exception:
            continue
        fire = exp - _td(days=30)
        title = f"{d.get('document_type_label') or 'Document'} expires soon"
        body = f"{d.get('label') or 'Document'} expires on {str(d['expires_on'])[:10]}."
        exists = await db.reminders.find_one({
            "user_id": uid, "related_type": "document", "related_id": d["id"],
            "status": {"$in": ["scheduled", "sent"]},
        })
        if exists: continue
        await db.reminders.insert_one({
            "id": new_id("rem_"), **scoping,
            "related_type": "document", "related_id": d["id"],
            "title": title, "body": body,
            "fire_at": fire.isoformat(), "channels": ["in_app"],
            "status": "scheduled", "created_at": now_iso(),
        }); created += 1

    # 2) Action Map items with due_date
    acts = await db.action_map_items.find(
        {"participant_user_id": uid, "due_date": {"$exists": True, "$ne": None},
         "status": {"$nin": ["completed"]}, "declined": {"$ne": True}},
        {"_id": 0, "id": 1, "title": 1, "why": 1, "due_date": 1},
    ).to_list(500)
    for a in acts:
        try:
            due = _dt.fromisoformat(str(a["due_date"]))
        except Exception:
            continue
        fire = due - _td(days=2)
        exists = await db.reminders.find_one({
            "user_id": uid, "related_type": "action", "related_id": a["id"],
            "status": {"$in": ["scheduled", "sent"]},
        })
        if exists: continue
        await db.reminders.insert_one({
            "id": new_id("rem_"), **scoping,
            "related_type": "action", "related_id": a["id"],
            "title": f"Coming up: {a['title']}",
            "body": a.get("why") or "",
            "fire_at": fire.isoformat(), "channels": ["in_app"],
            "status": "scheduled", "created_at": now_iso(),
        }); created += 1

    return {"created": created}


# ============================================================
#  Endpoint registration for P3d/e/f
# ============================================================
class NoteIn(BaseModel):
    body: str
    visibility: str  # participant | shared | internal


class NoteUpdate(BaseModel):
    body: Optional[str] = None
    visibility: Optional[str] = None


class ReminderPatch(BaseModel):
    status: Optional[str] = None    # dismissed | snoozed | sent | scheduled
    snooze_until: Optional[str] = None


def register_notes_reminders():

    @api_router.get("/staff/participants/{enrollment_id}/notes")
    async def list_notes(enrollment_id: str, user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
        en = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
        if not en: raise HTTPException(404, "Enrollment not found")
        if not await _staff_can(user, en["participant_user_id"]):
            raise HTTPException(403, "Out of scope")
        notes = await db.staff_notes.find(
            {"enrollment_id": enrollment_id}, {"_id": 0}
        ).sort("created_at", -1).to_list(500)
        return notes

    @api_router.post("/staff/participants/{enrollment_id}/notes")
    async def create_note(enrollment_id: str, body: NoteIn,
                          user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
        if body.visibility not in _VISIBILITIES:
            raise HTTPException(400, "Invalid visibility")
        en = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
        if not en: raise HTTPException(404, "Enrollment not found")
        if not await _staff_can(user, en["participant_user_id"]):
            raise HTTPException(403, "Out of scope")
        note = {
            "id": new_id("note_"), "enrollment_id": enrollment_id,
            "participant_user_id": en["participant_user_id"],
            "organization_id": en.get("org_id"), "program_id": en.get("program_id"),
            "author_user_id": user["user_id"], "author_role": user.get("_effective_role"),
            "body": body.body, "visibility": body.visibility,
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.staff_notes.insert_one(note); note.pop("_id", None)
        await _audit(user["user_id"], user.get("_effective_role"), en.get("org_id"),
                     f"note.create.{body.visibility}", "staff_note", note["id"])
        return note

    @api_router.patch("/staff/notes/{note_id}")
    async def update_note(note_id: str, body: NoteUpdate,
                          user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
        note = await db.staff_notes.find_one({"id": note_id}, {"_id": 0})
        if not note: raise HTTPException(404, "Not found")
        if not await _staff_can(user, note["participant_user_id"]):
            raise HTTPException(403, "Out of scope")
        upd = {}
        if body.body is not None: upd["body"] = body.body
        if body.visibility is not None:
            if body.visibility not in _VISIBILITIES: raise HTTPException(400, "Invalid visibility")
            upd["visibility"] = body.visibility
        upd["updated_at"] = now_iso()
        await db.staff_notes.update_one({"id": note_id}, {"$set": upd})
        return await db.staff_notes.find_one({"id": note_id}, {"_id": 0})

    @api_router.delete("/staff/notes/{note_id}")
    async def delete_note(note_id: str,
                          user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
        note = await db.staff_notes.find_one({"id": note_id}, {"_id": 0})
        if not note: raise HTTPException(404, "Not found")
        if not await _staff_can(user, note["participant_user_id"]):
            raise HTTPException(403, "Out of scope")
        await db.staff_notes.delete_one({"id": note_id})
        return {"ok": True}

    @api_router.get("/notes/mine")
    async def notes_mine(user: dict = Depends(current_user)):
        """Participant view: returns only 'participant' + 'shared' notes, PLUS a
        transparency indicator that internal notes exist (count only)."""
        visible = await db.staff_notes.find(
            {"participant_user_id": user["user_id"],
             "visibility": {"$in": ["participant", "shared"]}},
            {"_id": 0}).sort("created_at", -1).to_list(200)
        internal_count = await db.staff_notes.count_documents(
            {"participant_user_id": user["user_id"], "visibility": "internal"})
        return {"notes": visible, "internal_notes_exist": internal_count > 0,
                "internal_notes_count": internal_count}

    # ---- Reminders ----
    @api_router.post("/reminders/refresh")
    async def reminders_refresh(user: dict = Depends(current_user)):
        return await refresh_reminders(user["user_id"])

    @api_router.get("/reminders")
    async def list_reminders(user: dict = Depends(current_user)):
        rs = await db.reminders.find(
            {"user_id": user["user_id"], "status": {"$nin": ["dismissed"]}},
            {"_id": 0}).sort("fire_at", 1).to_list(200)
        return rs

    @api_router.patch("/reminders/{rid}")
    async def patch_reminder(rid: str, body: ReminderPatch,
                              user: dict = Depends(current_user)):
        upd = {k: v for k, v in body.model_dump(exclude_none=True).items()
               if k in {"status", "snooze_until"}}
        res = await db.reminders.update_one(
            {"id": rid, "user_id": user["user_id"]}, {"$set": upd})
        if res.matched_count == 0: raise HTTPException(404, "Not found")
        return await db.reminders.find_one({"id": rid}, {"_id": 0})
