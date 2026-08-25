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

## Batch A — Universal Resource Registry (Feb 2026)
The A Path Forward resource experience is now a real system, not a set of labels.

### Backend
- **`resources_v2.py`** — module registered from `server.py`. Classification: `kind ∈ {learn, tool, support}`. 8 pathways (`get-stable · get-healthy · get-organized · get-to-work · rebuild-money · rebuild-life · build-future · know-where`). Region, disclaimer_type, is_crisis, credential_pathway, tags, priority.
- **Endpoints**: `GET /api/resources/pathways`, `GET /api/resources` (filter by q/kind/pathway/category/region/is_crisis), `GET /api/resources/{id}`, `GET /api/resources/saved`, `POST/DELETE /api/resources/{id}/save`. Admin CRUD at `POST /api/admin/resources` and `PATCH /api/admin/resources/{id}` (super_admin/program_admin only).
- **Seed data**: 46 Arkansas + national resources — 211 · DHS · ADWS · JobLink · 988 · SAMHSA · 911 · Ready.gov · Red Cross · OSHA · Arkansas DEM · CFPB · FDIC Money Smart · IRS · IdentityTheft.gov · FAFSA · HealthCare.gov · MedlinePlus · Arkansas Health · FindTreatment.gov · CDC overdose · Arkansas Naloxone · Apprenticeship.gov · CareerOneStop · Arkansas Workforce Centers · DOL · DOL EBSA · Arkansas Labor · SBA · ASBTDC · SCORE · Arkansas SOS · Grants.gov · Candid · Arkansas EDC · GCFGlobal · FTC scams + 7 in-app TOOL cards (Full Blueprint · Assessments · Employment Readiness · Journal · Emergency QR · Document Center · Digital Life Readiness).
- **Route collision fix**: legacy `GET /api/resources` renamed to `/api/resources-legacy` so the new rich shape (`{resources, count}`) wins on `/api/resources`. Library.jsx repointed.
- **Legacy blank-card fix**: `_shape()` falls back `title → name → "Untitled resource"`; list endpoint now excludes rows without a `kind` field so 9 old capitalized-category rows no longer leak in.
- **Crisis rail correctness**: rails query `is_crisis=true` (not category) and exclude `kind='tool'`. SAMHSA promoted with `is_crisis=true` so 988 · 911 · SAMHSA all appear.

### Frontend
- **`pages/Resources.jsx`** — `ResourcesHub` (plum→rose-gold gradient hero + search + crisis rail + 3 kind pills + Saved pill + Find local help CTA + 8 pathway cards + recently-saved shortcut), `ResourcesBrowse` (search/filter results with per-card kind badge, Arkansas pill, crisis flag), `ResourcesSaved` (my list), `ResourceDetail` (kind badge, disclaimer card per disclaimer_type, credential-pathway badge, tags, save/unsave, external site OR in-app tool button).
- **`pages/FindHelp.jsx`** — Arkansas 211-forward page: plum→terracotta hero with `tel:211` and `arkansas211.org` links, crisis rail (988 · 911 · SAMHSA), and 13 need buckets (Food · Housing · Utilities · Transportation · Benefits · Legal · Employment · Healthcare · Mental Health · Recovery · Family · Veterans · Emergency) auto-populated by tag matching.
- **Sidebar** — new "Resources" link with `Compass` icon above the SECTIONS list.
- **Contrast fix** — eyebrow labels on the dark gradient heroes use inline styles (`rgba(243,225,216,0.85)`) to bypass the global `.overline` color rule.

### Testing (iteration_5)
- 15/15 new `test_resources_v2.py` tests pass. Full regression: 106/106 pass.
- Frontend end-to-end: 100% functional after fixes — hub, search, kind filters, pathway drilldown, detail with disclaimers, bookmark persistence across reload, saved page, find-help with 211 tel: link, sidebar entry. Regression smoke: 10 core routes untouched (dashboard, blueprint intake, assessments, employment readiness, journal, quiz, documents, digital-readiness, library, emergency).

### Batches B & C (deferred to next turns)
- **Batch B**: deep learn content per category (Emergency + First Aid tooling, Financial deep learn, Health deep learn, Recovery deep learn, Career interactive tools, Technology deep learn) with real substantive Learn cards and Find Support routes.
- **Batch C**: A Path Forward interactive toolkit (~40 named tools: budget/bill-calendar/debt-inventory/resume-builder/job-tracker/interview-prep/business-plan/grant-outline/etc.), Vault + calendar + employment integrations, Bridge resource-navigator upgrades (Bridge querying the registry directly), Business/Grants/Leadership deep content, final visual refinement pass.
- **New participant hub** at `/app/section/digital-readiness` (`pages/DigitalHub.jsx`) — warm teal-terracotta gradient hero + a responsive 12-tile grid (1/2/3 columns on mobile/tablet/desktop). Every tile is a real doorway. Section footer includes a "practical readiness — not an official credential" reminder card.
- **12 new doorway entries** in `lib/doorways.js` (`digital-*` slugs): Create an Email · Email Basics · Professional Email Template · Create a Spreadsheet · Internet Basics · Online Forms & Applications · Digital Documents · Upload & Download Files · Attach & Send Documents · School & Work Technology Basics · Password & Account Safety · Video Calls & Virtual Meetings. Each has plain-language Learn cards, real Do actions (some link out to Gmail / Outlook / Zoom / typing.com — opens in a new tab with `noopener,noreferrer`), Track links back into the app, and Bridge AI Get-help entries.
- **Doorway shell extended** (`pages/Doorway.jsx`): renders a `<VideoPlaceholders />` block above Learn (~18 placeholder cards across the 12 doorways, each labeled "Video: ..." with a "Placeholder" pill) and a `<TemplateGallery />` block below Do with copy-to-clipboard cards (11 total templates across Email Template · Spreadsheet · Attach & Send · Online Forms).
- **Category color**: `ACCENT.digital` = `#2E5266` (deep teal), sitting visually next to Employment so the digital area reads as work-adjacent.
- **hub_visits race fix** (found during Digital section testing): `blueprint_v2.py` now creates a unique compound index on `(participant_user_id, key)` and runs a one-time de-dup at register time. `DashboardV2` also de-dups defensively client-side — eliminates the React duplicate-key console warning.
- **Verified by testing_agent** (`iteration_4.json`): 100% frontend pass — all 12 tiles render, tile→doorway navigation works, video placeholders render on every digital doorway, template Copy button writes to clipboard (verified 237 chars), external Do-tab links open in a new tab, sidebar entry routes correctly, mobile 390px layout has no horizontal overflow, and 9 core routes remain unaffected.

## Graduation Journey & Build My Blueprint™ Doorway (Feb 2026)
The participant-facing "Enter → Build → Graduate → Unlock → Expand" journey lives inside A Path Forward as an aspirational reentry story. A Path Forward and Build My Blueprint™ remain **separate applications** — this feature only prepares the transition, it never redirects, transfers data, or enrolls anyone.

### Backend (`backend/journey.py`)
- New `journey_state` collection keyed on `participant_user_id`. Fields: `welcome_seen`, `milestones[]`, `graduation_approved`, `graduation_date`, `graduation_approved_by`, `graduation_note`, `transition_offered_at`, `transition_viewed`, `interested_in_continuing`, `decision_at`, `handoff_status`.
- **`_readiness_signals(uid)`** computes live evidence from existing collections (blueprint_full_progress, assessment_results, ereadiness_progress, action_map_items). Signals are **advisory only** — never auto-graduate.
- **Stage derivation**: `expand > unlock > graduate > build > enter`. Requires `graduation_approved` for the last three; falls back to `build` on revoke.
- Endpoints:
  - `GET /api/journey/state` (participant) — hydrated snapshot.
  - `POST /api/journey/welcome-seen` — one-time modal ack.
  - `POST /api/journey/transition/view` — records the participant opened the "See What's Next" page (silent no-op when not graduated).
  - `POST /api/journey/transition/interest` `{choice: interested|not_now}` — 400 if not graduated. Records decision without enrolling anyone.
  - **Admin only** (super_admin/program_admin, staff can read):
    - `GET /api/admin/journey` — list + snapshot for every enrolled participant.
    - `GET /api/admin/journey/{user_id}` — detailed snapshot.
    - `POST /api/admin/journey/{user_id}/graduate` — approves. 400 if duplicate.
    - `POST /api/admin/journey/{user_id}/revoke-graduation`.
    - `POST /api/admin/journey/{user_id}/milestone` + `DELETE .../milestone/{id}`.
- All admin actions audit-logged via `_audit(...)` under `journey.*` action names.

### Frontend
- **`components/journey/`**: `JourneyKey.jsx` (elegant gradient SVG key with optional glow), `JourneyStrip.jsx` (5-stage horizontal responsive story on the dashboard), `WelcomeModal.jsx` (one-time post-Blueprint welcome), `BlueprintDoor.jsx` (Framer Motion door + key animation; locked/unlocked variants).
- **`pages/Journey.jsx`** at `/app/journey` — participant journey hub. Warm plum→rose-gold hero switches to "You built the key" once graduated. Evidence tiles (Blueprint / Assessments / E-Ready / Actions), recognized milestones, and either the locked-door section (pre-grad) or the graduation celebration with the interactive door. Tapping the key opens the **TransitionPage** (in-page, no route change): informational cards + a "before you decide" checklist + optional outbound link to `https://buildmyblueprintbbc.com` (opens new tab) + `[I'm interested]` / `[Not right now]` decision buttons.
- **`pages/AdminJourney.jsx`** at `/staff/journey` — program admin/staff panel: participant list with stage badge + evidence mini-stats, click-through detail modal with milestones CRUD and Approve/Revoke Graduation actions with optional note. Signals shown as evidence, not automation.
- **`DashboardV2.jsx`** now shows the JourneyStrip; auto-opens the Welcome modal once when Blueprint is complete and `welcome_seen == false`; displays a "You built the key. The next door is ready." graduation card when graduated (replaces standard focus card).
- **`Layout.jsx`** sidebar adds `My Journey` (KeyRound icon) for all users and `Staff · Journey` for anyone whose memberships include `super_admin/program_admin/program_staff`.
- **`App.js`** routes `/app/journey` and `/staff/journey`.

### Tests
- `tests/test_journey.py` — 9 tests: default state = `enter`, welcome-seen persists, transition-locked-without-graduation (400 on interest, silent view), admin list forbidden for participants, full flow (graduate → view → not-now → interested → revoke), duplicate grad blocked, milestone add/remove, 404 unknown user, participant self-graduation forbidden (403).
- Full new-module regression: `test_journey + test_resources_v2 + test_signed_urls + test_learning_journal` = 40/40 pass, 5 skipped.

### Product boundaries preserved
- No Build My Blueprint™ code or database mutations. BMB link is a single external anchor with `target=_blank rel=noopener noreferrer`.
- No pricing, no checkout, no auto-enrollment.
- Graduation is strictly admin-controlled; participant can never self-approve.
- Transition endpoint refuses interest recording before graduation (400).
- Revoking graduation returns the participant to `build`/`enter` while keeping historical `interested_in_continuing`/`transition_viewed` fields for audit continuity.
