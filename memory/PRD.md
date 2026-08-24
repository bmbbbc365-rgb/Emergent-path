# A Path Forward™ — Product Requirements & Working Notes

## Product identity
- **Program:** A Path Forward™
- **Platform:** Build My Blueprint™
- **Organization:** Beautifully Brokered 365
- **Core message:** Education. Organization. Accountability. Opportunity. A Path Forward.
- **Owner / demo participant:** `heatherprejean7325@gmail.com` / `Blueprint2026!`

## Users / personas
1. **Participant** — person returning to the community; owns everything; controls all sharing.
2. **Future partner layer** (architected, not yet built): BB Super Admin, Strategic Partner, Program/Referral Partner, Employer/HR, authorized support roles.

## Core principles (do not violate)
- Participant owns the data. Nothing is visible to any outside party unless explicitly permitted.
- Not corrections / probation / legal / medical / clinical software. Education, organization, accountability, opportunity, resource navigation.
- Bridge does not diagnose, prescribe, give legal advice, provide therapy/crisis counseling, or guarantee benefits/eligibility. Crisis → 988 / 911.
- **AI assists — the participant confirms. AI never silently changes consequential records or auto-completes legally-significant requirements.**
- **Sensitive identifiers (SSN / DL# / member IDs / policy #s / account #s) are masked by default; full values only after explicit reveal action; never propagated into unrelated hub records or Bridge context.**

## What's implemented
- Auth: JWT email/password + Emergent Google Auth.
- My Blueprint dashboard.
- **Release Requirements & Supervision.**
- **Document Center** (private uploads via Emergent object storage).
- Deep hubs: Health, Benefits, Home, Employment & Income, Identity.
- Education content system (courses / modules / lessons with LDT-G blocks).
- Bridge AI (ChatGPT via emergentintegrations, personality picker for participants, model picker for admins).
- Arkansas 10:33 public landing page.
- **[Feb 2026] Smart Document & Intake Engine** — Gemini-powered document understanding, provider-agnostic service, human-in-the-loop confirm/apply, event log, duplicate detection, sensitive-field masking + explicit reveal, cross-user access enforced 404.

## Smart Document architecture (Feb 2026)
- `services/document_understanding.py` — provider-agnostic `DocumentUnderstandingService` with `GeminiProvider` (default `gemini-3-flash-preview`). Model can be swapped without touching Document Center or workflows.
- New endpoints (all participant-scoped, auth checked server-side, all cross-user access returns 404):
  - `POST /api/documents/analyze` — upload, store original in object storage, run vision analysis, return classification + fields + duplicate warning. **Nothing committed to hub records yet.**
  - `POST /api/documents/{id}/confirm` — participant confirms/edits type, category, fields; `keep_sensitive_field_keys` opt-in list.
  - `POST /api/documents/{id}/apply-extraction` — second explicit action; creates a hub record (`employment_income` / `employment_job` / `benefits_record` / `housing_record` / `health_appointment` / `credential`).
  - `POST /api/documents/{id}/link-requirement` — attach doc as evidence; never marks requirement complete.
  - `POST /api/documents/{id}/reveal-sensitive` — explicit reveal of ONE sensitive value; returns 404 if not stored.
  - `GET /api/documents/{id}` — detail + analysis (sensitive values masked) + event log.
  - `GET /api/documents/catalog/types` — the known type catalog.
- New collections: `document_analyses` (structured extraction; raw model text NOT retained), `document_events` (`DOCUMENT_UPLOADED / _ANALYZED / _CONFIRMED / _LINKED / EXTRACTION_APPLIED / REQUIREMENT_EVIDENCE_LINKED / CREDENTIAL_IDENTIFIED`).
- `documents` extended: `content_hash` (sha256 for dup detection), `document_type`, `confidence`, `related_sections[]`, `related_record_ids[]`, `analysis_id`, `status`.
- Frontend: mobile-first `/app/documents/scan` (camera capture + upload), Analysis Review panel with editable fields, sensitive fields masked with per-field Show + opt-in Store, ApplyExtraction dialog, requirement attachment picker, duplicate warning, and "Scan a document" CTA on any Blueprint section.

## Acceptance tests (all PASS)
- A Pay stub → pay_stub / 0.98 conf / employer/dates/gross/net → income record created ✅
- B Driver License → drivers_license / DL# masked as `••••7777` / not stored when user opts out ✅
- C Insurance card → insurance_card → benefits_record target, member_id sensitive ✅
- D Visit summary → medical_record → health-hub, no diagnoses in structured fields ✅
- E Unknown blob → document_type=unknown / confidence=0.1 (no invented certainty) ✅
- F Wrong classification → user correction persists (lease → utility_bill) ✅
- G Duplicate → sha256 match returns `duplicate_of` on second upload ✅
- H Persistence → status/type/sections/events all survive refetch ✅
- I Cross-user access → GET/reveal-sensitive/download/confirm all 404 for other user ✅

## Data model
Adds: `document_analyses`, `document_events`. Extends: `documents`, `requirements.document_ids`.

## Prioritized backlog (P0 → P2)
- **P0** Integrate LDT-G tabs directly into Requirements, Employment, Health, Benefits, Home hubs.
- **P1** Recovery Habits deep page (triggers, coping, urge log).
- **P1** Granular permissions for Future Partner Layer.
- **P1** Notifications + Resend email reminders for required deadlines.
- **P2** Testimonial Wall + Welcome Video on landing.
- **P2** Bridge can locate documents by natural language ("Where is my most recent pay stub?") using the new event/relationship data — respecting the same server-side authorization.
- **P2** Course knowledge-check UI + certificates.
- **P2** Partner layer (Strategic / Employer / Program).

## Notes for next session
- Storage abstraction lives in `services/document_understanding.py`. Provider can be changed via `DOC_UNDERSTANDING_PROVIDER` / `DOC_UNDERSTANDING_MODEL` env vars — no code changes to callers.
- Bridge continues to use OpenAI (GPT-5.6 Terra default). Gemini is only used for document understanding.
- Raw model responses containing sensitive text are NOT persisted; only structured fields + confirmed values are stored.
