# A Path Forward™ / Build My Blueprint™ — Product Requirements

## Product identity
- **Program:** A Path Forward™ (10:33 Re-Entry Pathway)
- **Platform:** Build My Blueprint™
- **Organization:** Beautifully Brokered 365
- **Message:** Education. Organization. Accountability. Opportunity.
- **Owner / demo:** `heatherprejean7325@gmail.com` / `Blueprint2026!` (super_admin + participant)

## Core principles
- Participant owns the data. Nothing shared unless explicitly permitted.
- Not corrections / legal / medical / clinical software. Education, organization, accountability, opportunity, resource navigation.
- AI assists — the participant confirms. AI never silently changes consequential records or auto-completes legally-significant requirements.
- **Evidence attachment ≠ verification.** Requirements marked `verification.required=true` cannot be self-verified.
- Sensitive identifiers (SSN / DL# / member IDs / policy #s / account #s) masked by default; explicit reveal only; never propagated across hubs, never shown to staff, never in Bridge context.
- **PathwayID is an identifier, not authentication.** Cannot open a session on its own.
- Multi-tenant. Every participant record is scoped to `(organization_id, program_id, enrollment_id)`. Cross-tenant access returns 403/404.

## What ships today (Feb 2026)

### Phase 1 — Multi-tenant foundation ✅
- Collections: `organizations`, `programs`, `enrollments`, `pathway_ids`, `role_bindings`, `invitations`, `audit_events`.
- Boot migration `ensure_platform_tenants()` seeds BBC org + A Path Forward program, binds owner as super_admin + participant, creates PathwayID `APF-2026-000001-G` (checksummed), and backfills existing docs/tasks/requirements/health/benefits/etc. with `organization_id/program_id/enrollment_id`. Idempotent.
- `require_role(*roles)` FastAPI dependency; `_staff_can_access_participant()` scope check.
- Endpoints:
  - `GET /api/organizations` (scoped)
  - `GET /api/programs` (scoped)
  - `POST /api/invitations` / `GET /api/invitations` / `GET /api/invitations/verify/{code}` / `POST /api/invitations/accept`
  - `GET /api/auth/me` now returns `memberships[]`, `enrollments[]`, `pathway`.
- Frontend `/onboarding/{code}` page (invitation acceptance flow).

### Phase 2 — Requirement verification workflow ✅
- `requirements.verification`: `{required, status, submitted_at, verified_at, verified_by, verifier_role, return_reason}`.
- States: `not_started → in_progress → evidence_submitted → needs_review → verified` · or `→ returned → in_progress` · or `→ not_applicable`.
- Auto-transition: attaching evidence with `verification.required=true` moves the state to `evidence_submitted`.
- Participant PATCH `status=done` cannot flip `verification.status` to `verified`. Verification is exclusively `POST /api/staff/requirements/{id}/verify`.
- Staff endpoints:
  - `GET /api/staff/caseload`
  - `GET /api/staff/participants/{enrollment_id}` — journal / health / support-circle are excluded server-side.
  - `GET /api/staff/requirements/{id}/evidence` — doc metadata only, no `sensitive_fields`, no `storage_path`, no `content_hash`.
  - `POST /api/staff/requirements/{id}/verify` — decision: verified | returned | needs_review | not_applicable.
- Participant self actions: `POST /api/requirements/{id}/submit`, `POST /api/requirements/{id}/mark-in-progress`.
- Audit: `invitation.create`, `invitation.accept`, `requirement.verified|returned|needs_review|not_applicable`, `requirement.submit`.
- Frontend `/staff/caseload` and `/staff/participants/{id}` pages.

### Everything prior — preserved and working
- Auth (JWT + Emergent Google) · Documents Center + object storage · **Smart Document & Intake Engine** (Gemini vision, provider-agnostic, sensitive masking, dup detection, event log) · **Requirement Evidence UI** · **Bridge Document Search** (participant-scoped inventory in context; refuses to invent doc ids) · Learning content model · Bridge personality picker + admin model picker · Health / Benefits / Home / Employment Record / Identity deep hubs · Support Circle · Hub LDT-G component on Requirements / Employment / Health / Benefits / Home · Landing page (Arkansas 10:33 aesthetic) · Sharing/permissions primitive.

## Acceptance results (Phase 1+2 pass)
All 12 tests in `/app/backend/tests/phase12.sh` pass:
1 `/auth/me` returns memberships + PathwayID · 2 orgs/programs scoping · 3 invitation → verify → accept · 4 caseload lists Heather with correct needs_review counter · 5 unaffiliated user 403s on /staff and /audit · 6 evidence attach auto-transitions to evidence_submitted · 7 staff view has no sensitive_fields/storage_path/content_hash · 8 participant PATCH cannot self-verify · 9 staff verify flips state + records verifier · 10 audit contains invitation + verify events · 11 APF staff 403s on foreign requirement · 12 invitation single-shot.

## Data model additions
- 🔵 `organizations {id, slug, name, brand, config, status}`
- 🔵 `programs {id, org_id, slug, name, code, participant_alias, config, status}`
- 🔵 `enrollments {id, org_id, program_id, participant_user_id, status, started_at, assigned_staff_ids[]}`
- 🔵 `pathway_ids {id, pathway_id, org_id, program_id, enrollment_id, participant_user_id}`
- 🔵 `role_bindings {id, user_id, role, org_id, program_id, enrollment_id, scope}`
- 🔵 `invitations {id, pathway_code, org_id, program_id, invited_email, invited_role, expires_at, status, accepted_user_id}`
- 🔵 `audit_events {id, actor_user_id, actor_role, org_id, action, target_type, target_id, before, after, created_at}` (append-only)
- 🟡 `requirements` — added `verification` sub-object; also carries `organization_id/program_id/enrollment_id`
- 🟡 All existing participant-scoped collections carry `organization_id/program_id/enrollment_id`

## What remains planned (labelled in nav — NOT built as placeholder pages)
- Phase 3 Vault expansion (tags, expirations → auto reminders)
- Phase 4 Learning engine (video_progress, assessments, gate rules, certificate PDF)
- Phase 5 Calendar + Google Calendar OAuth + notifications + secure messaging
- Phase 6 Journal · Voice input · Resource Directory admin · Templates admin
- Phase 7 Bridge domain projections + action proposals
- Phase 8 Program admin dashboards, reporting

## Known limitations of this pass
- Program Admin management UI is not yet built — admin actions go through `super_admin` seeded on boot. Invitation API supports program_admin role today; UI is coming next pass.
- Google Calendar / messaging / journal not yet implemented.
- Certificate generator (PDF) not yet implemented.

## Files
- Backend: `server.py` (Phase 1+2 additions ~350 LOC + boot migration + auth extension).
- Backend tests: `backend/tests/phase12.sh` (12-step curl suite).
- Frontend new: `pages/Staff.jsx` (Caseload + Participant Detail + Review dialog), `pages/AcceptInvitation.jsx`.
- Frontend edited: `App.js` (new routes `/onboarding/:code`, `/staff/caseload`, `/staff/participants/:id`).
