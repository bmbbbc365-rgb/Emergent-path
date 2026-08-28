# A Path Forward — August 31 Production Hardening

Branch: `codex/aug31-production-hardening`

This checkpoint preserves working production functionality and sequences only verified gaps.

## Scope order

1. End-to-end participant journey
2. Document Vault production hardening
3. Arkansas release and supervision requirements
4. Partner Administration and BBC 365 doorway
5. Staff participation through Partner Administration
6. Mobile production QA
7. Production stabilization
8. Education expansion (last)

## Existing systems to preserve

- Public fictional demo, guided tour, share flow, and live/scripted Bridge demo
- Participant journey, milestones, staff-controlled graduation, and voluntary BBC doorway
- Smart Document Engine, duplicate detection, OCR review, sensitive-field masking, evidence links, and document search
- Multi-tenant organization/program/enrollment model, RBAC, invitations, audit events, and staff caseload
- Living Blueprint, Action Map, assessments, Employment Readiness, reminders, resources, and Bridge context
- Arkansas and national resource registry
- Existing authentication, storage, and participant-owned privacy boundaries

## Current work

### Partner Administration
- [x] Add protected `/partner-admin` doorway
- [x] Link authorized staff to caseload and journey recognition
- [x] State BBC separation, participant choice, and no automatic transfer/enrollment/payment
- [x] Add program configuration and invitation management UI
- [x] Add scoped participation summary
- [x] Add audit-event viewer
- [ ] Add participant-approved BBC handoff token design; do not transmit data until separately approved

### Participant journey
- [x] Add canonical progress service and connect Journey; Dashboard/Bridge adoption remains
- [ ] Verify first-login release/personal Blueprint choice
- [ ] Verify save/exit/resume and completion transitions
- [ ] Verify every doorway and empty state

### Vault hardening
- [x] Hide known zero-byte signed-URL fixtures without deleting stored records
- [x] Add validated multi-file section uploads
- [ ] Complete unrecognized review queue
- [ ] Confidence correction and audit history
- [ ] Expiration-derived reminder proposals
- [ ] Mobile camera and multi-file QA
- [x] Reject empty, unsupported, and over-25MB uploads
- [ ] Add malware-safety scanning and storage retry telemetry

### Arkansas supervision and release
- [x] Officer summary and reporting schedule
- [x] Drug/alcohol testing schedule and reminders
- [x] Electronic-monitor provider, instructions, charge logs, and user-defined reminders
- [x] Add structured curfew, travel/location, and association restriction record fields
- [ ] Conditions checklist with evidence and verification
- [x] Use hours-based community service and exclude it from currency totals
- [ ] Reconcile restitution/fines/fees aggregates with Bridge

### Staff participation
- [ ] Preserve staff exclusion from journals, private health details, Support Circle, and unrelated documents
- [x] Add program-scoped assigned-caseload participation summary
- [x] Evidence-return reasons and participant Fix It doorway
- [ ] Milestone templates and staff recognition
- [x] Scope journey administration queries and participant operations by authorized program
- [x] Add automated authorization regression tests

### Mobile and stabilization
- [ ] 320/375/390/768/1024 responsive passes
- [x] Close mobile navigation automatically after route changes
- [ ] Keyboard, screen-reader, focus, contrast, and reduced-motion QA
- [x] Add accessible names to mobile navigation/session controls
- [x] Add recoverable Full Blueprint loading failure and retry state
- [ ] Complete loading/error states across remaining routes
- [ ] Cross-surface totals and progress regression tests
- [ ] Production logs, rate limits, storage, CORS, auth cookies, and deployment smoke test

### Education — last
- [ ] Inventory uploaded education first
- [ ] Add only missing, verified content
- [ ] Course authoring and resume-where-left-off
- [ ] Certificates only after journey/vault/supervision/stabilization pass
