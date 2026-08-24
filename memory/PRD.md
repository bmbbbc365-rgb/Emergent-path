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

## What's implemented (as of Feb 2026)
- Auth: JWT email/password + Emergent Google Auth; email/password always available.
- My Blueprint dashboard: command center pulling required tasks, requirements owed/paid, appointments, medications, benefits, housing, jobs, applications, education progress, goals, and section progress.
- **Release Requirements & Supervision** — structured records (PO/agency, check-ins, drug tests, ankle monitor, class, community service, court, restitution, fees, curfew, residence, employment). Amount due/paid + payment logging.
- **Document Center** — private uploads via Emergent object storage; per-participant scoped; rename/soft-delete/download.
- **Independent Living / Support Circle / Life Skills / Digital / Wellness** — generic Blueprint section pages (tasks + notes + docs) wired to Education courses.
- **Health Hub** — medications, conditions, appointments, wellness tracking, Emergency Profile (with QR slug when enabled).
- **Benefits Hub** — active benefits (health/dental/vision/life/disability/critical/accident/medicaid/medicare/auto/renters), "When Something Happens" scenarios (7 seeded), plain-language education.
- **Home Hub** — housing records, utilities, safety & maintenance basics.
- **Employment & Income Record** — jobs (supervisor, address, hours, pay), income log (gross/taxes/deductions/net), job applications, resumes.
- **Identity & Confidence** — strengths/values/interests/skills/motivators chips + story + wins journal.
- **Education content system** — categories → courses → modules → lessons (text/activity/audio/quiz/video); per-participant lesson progress + course rollup.
- **Bridge AI** — GPT-5.6 Terra via `emergentintegrations`, SSE streaming, participant-context-aware system prompt, context-aware quick suggestions, in-message navigation buttons via `[Label](/app/route)` markdown, safety boundaries enforced.
- **Sharing & privacy** — participant-scoped permissions collection; grantee email + role + level; nothing shared by default.
- Design: BB365 palette — midnight/plum/rose-gold/champagne/cream — Fraunces display + IBM Plex Sans body.

## Data model (Mongo, all user_id-scoped unless noted)
`users`, `sessions` · `tasks`, `notes`, `goals`, `documents`, `support_contacts` · `requirements` · `medications`, `conditions`, `appointments`, `wellness_logs`, `emergency_profile` · `benefits`, `benefit_scenarios` (global) · `housing_records`, `utilities` · `jobs`, `income`, `job_applications`, `resumes` · `courses`, `modules`, `lessons`, `lesson_progress`, `education_categories` (global) · `habits`, `habit_logs` · `personal_profile` · `permissions`, `resources` (global) · `bridge_messages`.

## Prioritized backlog (P0 → P2)
- **P0** Replace `window.prompt` in Requirements payment logging with a shadcn Dialog + amount validation.
- **P0** Add `data-testid`s to all dialog Save buttons and dialog fields; render inline validation instead of silent HTML5 blocking.
- **P0** Swap native `<input type="date/datetime-local">` for shadcn Calendar/Popover across all deep pages.
- **P1** PUT `/api/health/emergency-profile` and `/api/profile/personal` should merge (use `exclude_unset`) rather than full-replace to prevent client wipes.
- **P1** Set `CORS_ORIGINS` explicitly (wildcard + `allow_credentials=True` is invalid); add Pydantic bodies to generic `crud_endpoints`.
- **P1** Split `server.py` into routers (`auth`, `health`, `benefits`, `employment`, `education`, `bridge`) + a `seed` module.
- **P1** Notifications system + email/SMS reminders for required deadlines (Resend integration).
- **P2** Course knowledge-check / quiz UI + certificates on completion.
- **P2** Document category filters in the Document Center + Getting-Established checklist grouping.
- **P2** Bridge multi-personality selector.
- **P2** Partner layer (Strategic Partner / Employer / Program): invite → participant-approved sharing → outcome reporting.
- **P2** Habits (Recovery) deep page: readiness-to-change, triggers, coping, urge/craving tracker, setback reset — models already exist.
- **P2** FHIR / patient-portal architecture for Health Hub (endpoints stubbed).
- **P2** QR route for participant-approved Emergency Profile view.

## Notes for next session
- Backend tests live at `/app/backend/tests/`; run `cd /app/backend && python -m pytest tests/ -q`.
- Bridge SSE encodes newlines as `<NL>` inside `data:` frames; frontend decodes them.
- Seed only runs when a user has zero tasks; owner is re-seeded on startup if empty.
