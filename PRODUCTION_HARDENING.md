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
- [ ] Add program configuration and invitation management UI
- [ ] Add scoped participation summary
- [ ] Add audit-event viewer
- [ ] Add participant-approved BBC handoff token design; do not transmit data until separately approved

### Participant journey
- [ ] Reconcile progress calculations across Dashboard, Living Blueprint, Journey, requirements, and Bridge
- [ ] Verify first-login release/personal Blueprint choice
- [ ] Verify save/exit/resume and completion transitions
- [ ] Verify every doorway and empty state

### Vault hardening
- [ ] Remove or hide zero-byte/test artifacts from participant views without deleting real files
- [ ] Batch upload and unrecognized review queue
- [ ] Confidence correction and audit history
- [ ] Expiration-derived reminder proposals
- [ ] Mobile camera and multi-file QA
- [ ] Storage failure, retry, file-size, MIME, and malware-safety handling

### Arkansas supervision and release
- [ ] Officer summary and reporting schedule
- [ ] Drug/alcohol testing schedule and reminders
- [ ] Electronic-monitor provider, instructions, charge logs, and user-defined reminders
- [ ] Curfew, travel/location, and association restrictions
- [ ] Conditions checklist with evidence and verification
- [ ] Hours-based community service; never treat hours as currency
- [ ] Reconcile restitution/fines/fees aggregates with Bridge

### Staff participation
- [ ] Preserve staff exclusion from journals, private health details, Support Circle, and unrelated documents
- [ ] Assigned-caseload participation summary
- [ ] Evidence-return reasons and participant Fix It doorway
- [ ] Milestone templates and staff recognition
- [ ] Role, organization, program, and assignment authorization regression tests

### Mobile and stabilization
- [ ] 320/375/390/768/1024 responsive passes
- [ ] Keyboard, screen-reader, focus, contrast, and reduced-motion QA
- [ ] Loading timeout, retry, and error states
- [ ] Cross-surface totals and progress regression tests
- [ ] Production logs, rate limits, storage, CORS, auth cookies, and deployment smoke test

### Education — last
- [ ] Inventory uploaded education first
- [ ] Add only missing, verified content
- [ ] Course authoring and resume-where-left-off
- [ ] Certificates only after journey/vault/supervision/stabilization pass
