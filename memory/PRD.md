# A Path Forward™ — Product Requirements

**Positioning:** This Emergent-built app IS *A Path Forward*. The participant-facing framing "Build My Blueprint™ · A Path Forward · Powered by Beautifully Brokered 365" is intentional. It does NOT connect to, sync with, or migrate from any production BBC system.

**Owner:** `heatherprejean7325@gmail.com` / `Blueprint2026!` (super_admin + participant, PathwayID `APF-2026-000001-G`).

## Core principles
Participant owns the data · No fake functionality · Evidence ≠ verification · Sensitive identifiers masked+opt-in-stored+reveal-per-field · PathwayID is identifier, not auth · Multi-tenant · Every hub has a real doorway.

## Phase status
- **P1** Multi-tenant + RBAC + audit — ✅ shipped
- **P2** Requirement verification workflow + staff caseload + evidence review — ✅ shipped
- **P3a+b+c** Intake · Living Blueprint · Action Map · Emergency Hub — ✅ shipped this pass
- Prior work preserved: Smart Document Engine · Requirement Evidence UI · Bridge Doc Search · Hub LDT-G

## Phase 3 architecture
- **Intake** (`intake_responses`, `intake_progress`) — 6 sections, 30 questions, resumable, autosave, dont_know/not_applicable/later meta on every question.
- **Stability engine** (`stability_domain_state`, `stability_history`) — 10 domains, deterministic rules over intake answers + platform artifacts (documents, jobs, appointments, etc). Internal 0–100 score → participant-facing stage `needs_attention → getting_started → building → stable`. Stage transitions append to history. Recompute triggered by onboarding-complete, evidence attach, action completion.
- **Action Map** (`action_map_items`) — hybrid: **deterministic rules only** produce items (`services=phase3.regenerate_action_map`); LLM never invents authoritative legal/medical/supervision requirements. Each item carries `title`, `why`, `priority`, `route`, `history[]`, `declined`. Regenerating preserves user-completed / declined items. Completing an item recomputes stability.
- **Emergency Hub** (`emergency_profile_public`) — opaque `secrets.token_urlsafe(24)` slug (never `user_id`), field-level allow-list, kill switch, rotate button that invalidates old slug, QR PNG generation via `qrcode` lib, scan history visible to participant (IP + UA + timestamp per scan) via `audit_events`.
- **Public endpoint** `/api/e/{slug}` — unauthenticated, mounted on its own `public_router` so no `current_user` dependency leaks in, returns 410 when disabled/revoked, 404 when not found, includes ONLY fields in `allowed_fields`, logs every read.

## Frontend routes added
- `/app/onboarding` — 6-section intake with autosave + meta buttons
- `/app/blueprint` — 10 stage tiles + What Needs Attention + Progress You Can See history
- `/app/emergency` — Emergency Settings with field allow-list, QR display, rotate, scan history
- `/e/:slug` — public unauthenticated card view

## New backend endpoints
`GET /api/onboarding/schema` · `GET /api/onboarding/state` · `PUT /api/onboarding/answer` · `POST /api/onboarding/complete` · `GET/POST /api/blueprint` · `POST /api/blueprint/recompute` · `GET/PATCH /api/action-map[/{id}]` · `POST /api/action-map/regenerate` · `GET/PUT /api/emergency/public-profile` · `POST /api/emergency/rotate-slug` · `GET /api/emergency/qr` · `GET /api/emergency/scan-history` · `GET /api/e/{slug}` (public).

## Files changed
- Backend new: `backend/phase3.py` (300+ LOC — self-contained module; injected via `phase3.register()` in `server.py`).
- Backend edited: `server.py` — `Request` import, wire phase3, public router mount, `PUBLIC_APP_URL` env.
- Frontend new: `pages/Onboarding.jsx`, `pages/LivingBlueprint.jsx`, `pages/EmergencySettings.jsx`, `pages/PublicEmergency.jsx`.
- Frontend edited: `App.js` (4 new routes).

## Acceptance evidence
Full end-to-end validated in the live screenshot of `/app/blueprint`:
- 10 stage tiles rendered with real per-domain reasons (e.g. "You still need a working phone, email access", "You have active employment", "You still need: ssn card, birth cert").
- 7 real stage transitions in Progress-You-Can-See (Housing needs_attention → getting_started, Legal & supervision → needs_attention, etc).
- What Needs Attention correctly shows "Nothing high-priority right now" after we completed one action.

## What remains planned
- P3d Transportation/Housing/Essentials modules (data model in place; UI later)
- P3e Consultant planning notes (shared / internal / participant visibility)
- P3f In-app reminders + document expirations
- P4 Learning engine · P5 Calendar OAuth + messaging · P6+ later
