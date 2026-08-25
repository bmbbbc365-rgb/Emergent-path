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

## Private File & Media Storage (Feb 2026)
Emergent-managed object storage is now the single home for every participant file — documents, evidence, avatars — with **short-lived (15 min) HMAC-signed URLs** replacing any long-lived token in URL bars.

### Backend
- `server.py` — HMAC helpers `_sign_download / _verify_download / _mint_signed_url`; scopes: `owner | staff | avatar`.
- New endpoints:
  - `POST /api/documents/{doc_id}/signed-url` (owner only — 404 if not yours).
  - `POST /api/staff/documents/{doc_id}/signed-url` (staff — caseload gated + audit-logged).
  - `GET /api/documents/download-signed/{doc_id}?uid&scope&exp&sig` (cookie-less, sig-verified, staff-scope re-checks caseload at fetch time so revoked bindings can't replay).
  - `POST /api/profile/avatar` (5MB, PNG/JPEG/WEBP/GIF, deterministic path `bmb-reentry/avatars/{user_id}.{ext}`).
  - `GET /api/profile/avatar-url` (self) and `GET /api/profile/avatar-url/{target_user_id}` (staff / same caseload only).
- Consultant note attachments: `NoteIn/NoteUpdate.attachment_document_ids` — attachments MUST belong to the enrollment's participant (prevents staff pinning cross-participant files as a leak vector).
- Legacy `GET /api/documents/{doc_id}/download` still works with a session cookie (owner only) and returns 410 if a doc has no storage path.

### Frontend
- `DocumentDetail.jsx` — "View original" now requests `/documents/{id}/signed-url` and opens the returned short-lived URL. Removed `?auth={session_token}` query pattern (was leaking a 7-day cookie into the URL bar).

### Guarantees (test-verified)
- Owner sig → 200; tampered sig → 401; expired `exp` → 401; wrong scope → 400; cross-participant owner signed-URL → 404; staff signed-URL out of caseload → 403; avatar cross-tenant → 403; legacy session route still gated (401 without auth).
- Sensitive extracted fields still masked by default and only revealable via the existing `/reveal-sensitive` route — never in list responses, never in signed URLs.

### Tests
- `tests/test_signed_urls.py` — 8 tests, pass.
- Full backend regression (`backend_test.py` + `test_retest_bridge.py`) — 60/60 pass.

## Cross-user isolation (verified)
- `otheruser` → `/api/staff/participants/{id}/notes` = 403.
- `otheruser` → `/api/notes/mine` returns only their own (empty).
- `otheruser` → participant-scoped `/api/reminders` returns only their own (empty).
- `otheruser` → owner signed-URL for owner's doc = 404 (cross-participant isolation).
- `otheruser` → `/api/profile/avatar-url/{owner_uid}` = 403.

## Batch A — Full Blueprint · Assessments · Employment Readiness gating (Feb 2026)
- New backend module `blueprint_v2.py` (wired from `server.py`) registers:
  - **Full Path Forward Blueprint** — 30 questions, 13 categories (`/api/blueprint-intake/*`). Autosaves, resumable, carries forward Quick Check-In answers where keys match. Existing 28-Q Quick Check-In preserved unchanged.
  - **4 assessments** — Work Style (10), Values (2), Interests (1 multi), Workforce Preferences (10). Deterministic rule-based scoring. `/api/assessments/*`.
  - **Employment Readiness gating** — 10-item catalog with three kinds: `verifiable` (server-checked: assessment done, lesson viewed, quiz passed), `evidence` (document type in on-file docs), `attest` (participant-attested ordinary life task). `/api/ereadiness/*`. Staff-side visibility is pct+state only, no private evidence bodies.
  - **Daily affirmation** — 30 reentry-aware, mature messages, deterministic by date. `/api/affirmations/today`.
  - **Hub visits** — `/api/hub-visits/*` for the dashboard's "continue where you left off".
- Tests: `tests/test_batch_a.py` — 14/14 pass. Full regression: 82/82 pass.

## Batch B — Doorway architecture (Feb 2026)
- `/app/frontend/src/lib/doorways.js` — content-driven map for 17 new doorways (recovery, wellness sub-pages, all Independent Living children, document guided flows, health insurance, life skills). Every doorway has real Learn/Do/Track/Get Help content — no coming-soon pages.
- `/app/frontend/src/pages/Doorway.jsx` — single JSON-driven page mounted at `/app/doorway/:slug`. Uses shared `<HubLDTG />`. Category-colored gradient header. Automatic hub-visit tracking for the dashboard.

## Batch C — Interior redesign · Bridge AI · Voice input (Feb 2026)
- **Layout.jsx** — background is now a warm 3-layer gradient (cream + rose-gold + plum tints). Sidebar redone as plum→deep-navy gradient with a rose-gold radial. Header pill button "Ask Bridge AI" with plum→rose-gold gradient. Added **mobile bottom nav** (Home · Blueprint · Assess · Library · Bridge AI). Auto-opens Bridge AI when a route has `?bridge=…`.
- **Dashboard v2** (`pages/DashboardV2.jsx`) — replaces the flat white dashboard:
  - Personalized `Good morning, {first_name}` hero with plum→rose-gold gradient
  - `<AffirmationCard />` — daily rotating warm cream card
  - Today's Focus (from Action Map with LLM-personalized "why")
  - Full Blueprint / Assessments quick-access panel
  - Continue where you left off (Hub visits)
  - Sections grid with per-category color families
  - Small wins (last 3 completed action-map items)
- **Bridge AI rename** — component header, header button, chat placeholder all updated. Assistant identity is now "Bridge AI" everywhere.
- **Bridge AI voice input** — new `<VoiceInput />` component in `components/`. Web Speech API primary (Chrome/Edge/Safari/Android). Whisper fallback via new `POST /api/bridge/transcribe` (OpenAISpeechToText via emergentintegrations, `whisper-1`, 25MB cap). States: ready → listening → processing → ready/error/denied. Never records silently. Populates the same text field the participant can type into.

### Route additions
- `/app/blueprint/intake` — Full Blueprint 30-Q wizard
- `/app/assessments` and `/app/assessments/:id` — hub + runner
- `/app/section/employment-readiness` — real gated readiness page
- `/app/doorway/:slug` — 17 doorways

## Cross-user isolation (still verified)
- Signed URL scope re-check on fetch (from previous batch).
- Ereadiness endpoints scoped by `participant_user_id`; staff endpoint gated by `_staff_can_access_participant` + strips private evidence bodies.
- Assessment responses/results scoped by `participant_user_id`.
- Hub visits scoped by `participant_user_id`.

## Learning Engine + Journal Voice (Feb 2026)
Server-scored quizzes, real video watch-percentage tracking, and a private participant journal with voice dictation. Employment Readiness gates now flip **on their own** when the underlying work is done.

### Backend (`backend/learning.py`, wired from `server.py`)
- `POST /api/quizzes/{id}/submit` — grades against server-side answers (never leaked to the client), stores in `quiz_results`, returns `{score_pct, passed, feedback[]}`. Passing `workplace_expectations` automatically flips the Employment Readiness item on the next `/api/ereadiness/progress` call.
- `GET /api/quizzes/{id}` — returns questions + options but strips `answer` field before serializing.
- `POST /api/education/lesson-progress-percent` — continuous video-watch ping. Progress only ever moves forward (scrubbing back doesn't lose earned progress). Auto-marks the lesson complete at ≥90%.
- `GET/POST/PATCH/DELETE /api/journal/entries` — private journal. Body/mood/tags. `is_deleted` soft delete. Staff visibility explicitly denied — journal is never exposed via any staff endpoint.
- Updated `_evaluate_ereadiness` in `blueprint_v2.py`:
  - New `lesson_title:kw1|kw2` condition matches completed lessons OR their parent course by substring (e.g. "Interview Basics" course completion satisfies `interview_prep`).
  - Existing `lesson_viewed:id` condition still works.
  - Reads from the real `lesson_progress` collection (completed=True OR progress≥90).

### Frontend
- `pages/QuizRunner.jsx` at `/app/quiz/:quizId` — real quiz UI with disabled options after submit, per-question feedback, retry, and a "See my progress" button that jumps to Employment Readiness.
- `pages/Journal.jsx` at `/app/journal` — private journal with the shared `<VoiceInput />` mic (Web Speech + Whisper fallback), typed mood 1-5, per-entry delete. Interim voice transcript shows live in the textarea.
- `pages/Library.jsx` — added `<VideoBlock />` block type. Renders a real `<video>` element that pings the server every 5% of watch progress and on `ended`.
- Updated `pages/EmploymentReadiness.jsx` to route `workplace_expectations` directly to `/app/quiz/workplace_expectations`.
- `lib/doorways.js` — `wellness-journal` doorway now routes Do actions to `/app/journal` (was `/app/section/wellness`).

### Tests (`tests/test_learning_journal.py` — 8/8 pass, full regression 90/90 pass)
- Quiz public endpoint does not leak correct answers.
- Passing the quiz flips `workplace_expectations` to `completed`.
- Failing the quiz does NOT flip the gate.
- Video watch progress only moves forward; auto-completes at 90%.
- Interview lesson completion (via course-title join) flips `interview_prep`.
- Journal entries are isolated per participant (other users can't read or delete).
- Empty-body and out-of-bounds mood rejected.
