# A Path Forward™ — Product Requirements & Working Notes

## Product identity
- **Program:** A Path Forward™
- **Platform:** Build My Blueprint™
- **Organization:** Beautifully Brokered 365
- **Core message:** Education. Organization. Accountability. Opportunity. A Path Forward.
- **Owner / demo participant:** `heatherprejean7325@gmail.com` / `Blueprint2026!`

## Core principles
- Participant owns the data. Nothing shared unless explicitly permitted.
- Not a corrections / legal / medical / clinical product. Education, organization, accountability, opportunity, resource navigation.
- AI assists — the participant confirms. AI never silently changes consequential records or auto-completes legally-significant requirements.
- Sensitive identifiers (SSN / DL# / member IDs / policy #s / account #s) masked by default; explicit reveal only; never propagated across hubs or shown to Bridge.

## What's implemented
- Auth: JWT + Emergent Google Auth.
- Dashboard, Requirements, Documents, Independent Living, Support Circle, Identity, Employment Readiness/Record, Digital Life, Health, Benefits, Home hubs.
- Education content system (courses/modules/lessons; LDT-G rich blocks).
- Bridge AI (OpenAI GPT-5.6 Terra default; personality picker for users; model picker admin-only).
- **[Feb 2026] Smart Document & Intake Engine** (Gemini vision, provider-agnostic service, event log, dup detection, sensitive-field masking + explicit reveal, server-side isolation).
- **[Feb 2026] Requirement Evidence UI, Bridge Document Search, Hub LDT-G** — this pass.

## New in this pass (Feb 2026)

### Requirement Evidence UI (`RequirementEvidence.jsx`)
Every requirement card now shows an Evidence area:
- "Add evidence" → dialog offers **Scan a new document** (reuses Smart Document Engine) or **Choose existing document** (picks from `/api/document-search`).
- Attached documents show non-sensitive metadata + open in Document Detail.
- Removing a link **unlinks only** — original document is preserved.
- Attaching evidence NEVER changes requirement status.

### Bridge Document Search
`build_bridge_context()` now injects a per-user **DOCUMENT INVENTORY** (id, label, type, category, sections, status, related requirement ids) + **REQUIREMENTS list**. Bridge system prompt instructs it to search that inventory, cite real doc ids using `[View: <label>](/app/documents/<doc_id>)`, offer `[Scan a document](/app/documents/scan)` when nothing matches, and never reveal masked sensitive identifiers.
- All auth server-side: Bridge context is built with the participant's own `user_id`; cross-user data is impossible.
- Verified: "Do I have a pay stub uploaded?" → Bridge returned `[View: August 21 Pay Stub](/app/documents/doc_...)` with the correct id.

### Document Detail page (`/app/documents/:id`)
Doorway target for Bridge and Evidence links. Shows metadata, extracted fields, sensitive fields (masked + per-field Show), connected sections/records, event history, "View original" download.

### Hub LDT-G (`HubLDTG.jsx`)
Reusable Learn → Do → Track → Get Help block. Every action is a real route (library, `/app/documents/scan`, dialog trigger, section navigation, `tel:` for helplines). Embedded in:
- **Requirements** — Decision-Making / Rejection / Scams courses · Scan evidence · Balance / Paid / Records counters · 988 / SAMHSA / Bridge.
- **Employment & Income** — Resume / Interview / Budgeting courses · Scan doc · Add job / pay / application dialogs · Active jobs / Applications / Pay logged / Resumes · Workforce resources / Bridge.
- **Health Hub** — Stress / Rejection / Appointments courses · Scan doc · Add med / appt / wellness dialogs · counts · 988 / SAMHSA / Bridge.
- **Benefits Hub** — How insurance works / HMO vs PPO / Medicaid · Scan doc · Add benefit · counts · resources / Bridge.
- **Home Hub** — Budgeting / Digital / Scams courses · Scan lease · Add housing / utility · counts · resources / Bridge.

### New endpoints
- `POST /api/documents/{id}/link-requirement` (extended earlier; unchanged interface).
- `DELETE /api/documents/{id}/link-requirement/{req_id}` — unlink; original preserved.
- `GET /api/requirements/{req_id}/documents` — evidence list.
- `GET /api/document-search?q=&document_type=&category=&section=&requirement_id=&limit=` — participant-scoped search used by UI and (via Bridge context) by Bridge.

## Acceptance tests (all PASS this pass)
1. Requirement evidence: link → 200; list=1; requirement.status stays `open`; unlink → 200; doc still 200; list=0 ✅
2. Scan-evidence flow: "Add Evidence → Scan New Document" routes to existing Smart Document workflow (no duplicate uploader) ✅
3. Bridge doc search: located real pay stub, returned `[View: <label>](/app/documents/<real_doc_id>)`, no hallucinated ids ✅
4. Bridge privacy: cross-user requirement evidence 404; cross-user search returns own results only (0 for empty user) ✅
5–8. Employment / Health / Benefits / Home LDT-G render with real doorways (verified via screenshots) ✅
9. Cross-hub: pay stub scan → confirmed → Applied → income record visible in Employment (validated last pass, still works) ✅

## Data model
Adds: `document_events` (existing), `document_analyses` (existing). Requirements now use `document_ids` (extended). No schema breaks.

## Prioritized backlog (P0 → P2)
- P1 Recovery Habits deep page (triggers / coping / urge log).
- P1 Granular permissions for Future Partner Layer.
- P1 Notifications + email reminders (Resend).
- P2 Testimonial Wall + Welcome Video on landing.
- P2 Course knowledge-check UI + certificates.
- P2 Bridge "do action" tool — proactively schedule reminders / attach documents when user says yes.

## Notes
- Bridge context tops out at 60 docs + 60 reqs to stay within a reasonable token budget. Increase later if needed.
- Route order matters: `/document-search` is a literal route (not under `/documents/`) to avoid clashing with `/documents/{doc_id}`.
- `HubLDTG` is generic — pass `learn / doActions / track / help` arrays; use `onClick` to open existing dialogs, `route` to navigate, `phone` for helplines.
