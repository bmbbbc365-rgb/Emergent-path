# A Path Forward™ — Product Requirements

**Positioning:** This Emergent-built app IS *A Path Forward*. The participant-facing framing "Build My Blueprint™ · A Path Forward · Powered by Beautifully Brokered 365" is intentional and unconnected to any production BBC system.

**Owner:** `heatherprejean7325@gmail.com` / `Blueprint2026!` (super_admin + participant, PathwayID `APF-2026-000001-G`).
**Staff:** `staff1@example.com` / `StaffPass1!` (program_staff of A Path Forward).
**Other:** `otheruser@example.com` / `Otherpass1!` (unaffiliated).

## Phases shipped
- **P1** Multi-tenant + RBAC + audit ✅
- **P2** Requirement verification workflow + staff caseload + evidence review ✅
- **P3a+b+c** Intake · Living Blueprint · Action Map · Emergency Hub ✅
- **P3d/e/f + LLM why** ✅ (this pass)
- Preserved: Smart Document Engine · Requirement Evidence UI · Bridge Doc Search · Hub LDT-G

## This pass (Feb 2026)

### Transportation deep page
`/app/transportation` — surfaces intake answers (has DL / has state ID / urgent concerns) + blueprint stage tile + HubLDTG doorways (scan ID doc, Arkansas DL guide, transit resources, Bridge).

### Staff Notes (three visibilities)
New `staff_notes` collection with `visibility ∈ {participant, shared, internal}`.
- `GET /api/staff/participants/{enrollment_id}/notes` (staff)
- `POST /api/staff/participants/{enrollment_id}/notes` (staff)
- `PATCH /api/staff/notes/{note_id}` (staff)
- `DELETE /api/staff/notes/{note_id}` (staff)
- `GET /api/notes/mine` (participant) — returns visible notes + `internal_notes_exist` + `internal_notes_count`.
- Frontend `<StaffNotes />` embedded in Staff participant detail.
- Frontend `<ParticipantAlerts />` on Dashboard shows a transparency banner ("Your consultant keeps N staff-only note(s). Content is not shown here.") + a "From your consultant" panel showing participant + shared notes only.

### In-App Reminders
New `reminders` collection.
- `POST /api/reminders/refresh` — idempotent generator: for every document with `expires_on`, emits a reminder 30 days before; for every action_map_item with `due_date`, emits a reminder 2 days before.
- `GET /api/reminders` (participant, not-dismissed).
- `PATCH /api/reminders/{id}` (dismiss / snooze).
- Regenerated after every `action_map/regenerate` (baked into `regenerate_action_map`).
- Surfaced on Dashboard via `<ParticipantAlerts />` (top 5, dismissible inline).

### LLM-personalized Action Map "why"
- `regenerate_action_map` now calls `_personalize_why(uid, title, base_why, domain)`.
- Provider: OpenAI `gpt-5.6-terra` via Emergent Universal Key + `emergentintegrations`.
- Deterministic rules remain authoritative — LLM only rewrites the base_why in the participant's voice using compact intake context. Result stored in `action_map_items.why_personal`; frontend falls back to `why` if missing.
- Live examples (verified):
  - "You need your Social Security card and birth certificate to get your state ID"
  - "You need a working phone so employers, providers, and supervision can reach you"
  - "You can replace your Social Security card for free through SSA"
- Gated by env `ACTION_MAP_LLM=on` (default on). Failure returns `None` and callers fall back to rule text — zero-crash guarantee.

## Files changed / new
- Backend: `phase3.py` extended (~250 LOC), Pydantic models hoisted to module scope so FastAPI recognises them.
- Frontend new: `pages/deep/TransportationDeep.jsx`, `components/StaffNotes.jsx`, `components/ParticipantAlerts.jsx`.
- Frontend edited: `App.js` (`/app/transportation` route), `Dashboard.jsx` (ParticipantAlerts at top), `Staff.jsx` (StaffNotes on participant detail).

## Cross-user isolation (verified)
- `otheruser` → `/api/staff/participants/{id}/notes` = 403.
- `otheruser` → `/api/notes/mine` returns only their own (empty).
- `otheruser` → participant-scoped `/api/reminders` returns only their own (empty).

## What remains planned
- P4 Learning engine (video watch %, assessments, cert PDF)
- P5 Calendar OAuth + secure messaging + email reminders (Resend)
- P6 Journal · Voice input · Resource/Template admin
- P7 Bridge action proposals
- P8 Program admin dashboards + reporting
