#!/bin/bash
set -e
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
WORK=/app/backend/tests/_work
mkdir -p "$WORK"

echo "=== 1. Owner login + memberships / pathway_id ==="
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"heatherprejean7325@gmail.com","password":"Blueprint2026!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/auth/me" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('user_id:',d['user_id'])
print('memberships:',[(b['role'],b.get('program_id'),b.get('scope')) for b in d.get('memberships',[])])
print('enrollments:',[(e['program_id'],e['status']) for e in d.get('enrollments',[])])
print('pathway:',d.get('pathway',{}).get('pathway_id'))
"

echo ""; echo "=== 2. Organizations / Programs ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/organizations" | python3 -c "import sys,json;d=json.load(sys.stdin);print('orgs:',[(o['slug'],o['name']) for o in d])"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/programs" | python3 -c "import sys,json;d=json.load(sys.stdin);print('progs:',[(p['slug'],p['name']) for p in d])"

echo ""; echo "=== 3. Super_admin invites program_staff ==="
PROG=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/programs" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'])")
INV=$(curl -s -X POST "$API_URL/api/invitations" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"email\":\"staff1@example.com\",\"role\":\"program_staff\",\"program_id\":\"$PROG\",\"name\":\"Staff One\"}")
echo "$INV" > "$WORK/inv.json"
CODE=$(python3 -c "import json;d=json.load(open('$WORK/inv.json'));print(d['invitation']['pathway_code'])")
echo "code: $CODE"
curl -s "$API_URL/api/invitations/verify/$CODE" | python3 -m json.tool

ACCEPT=$(curl -s -X POST "$API_URL/api/invitations/accept" -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"password\":\"StaffPass1!\",\"name\":\"Staff One\"}")
STAFFTOK=$(echo "$ACCEPT" | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
curl -s -H "Authorization: Bearer $STAFFTOK" "$API_URL/api/auth/me" | python3 -c "import sys,json;d=json.load(sys.stdin);print('staff bindings:',[(b['role'],b.get('program_id')) for b in d.get('memberships',[])])"

echo ""; echo "=== 4. Staff caseload ==="
curl -s -H "Authorization: Bearer $STAFFTOK" "$API_URL/api/staff/caseload" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('caseload count:',len(d))
for x in d[:5]:
  print(' -',x['participant'].get('name'),'| pathway:',x['pathway_id'],'| needs_review:',x['needs_review'],'/',x['requirements_total'])
"

echo ""; echo "=== 5. Cross-user isolation: OTHER user (participant only, no staff role) cannot see /staff ==="
OTHER_TOK=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"otheruser@example.com","password":"Otherpass1!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
curl -s -o /dev/null -w "otheruser → /staff/caseload: %{http_code}\n" -H "Authorization: Bearer $OTHER_TOK" "$API_URL/api/staff/caseload"
curl -s -o /dev/null -w "otheruser → /audit/events: %{http_code}\n" -H "Authorization: Bearer $OTHER_TOK" "$API_URL/api/audit/events"

echo ""; echo "=== 6. Attach evidence → auto-transition to evidence_submitted ==="
# Find a requirement with verification.required=true
REQ=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/requirements" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=[x for x in d if (x.get('verification') or {}).get('required') and (x.get('verification') or {}).get('status') != 'verified']
print(r[0]['id'] if r else '')
")
echo "requirement (verif required): $REQ"
DOC=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/documents" | python3 -c "import sys,json;d=json.load(sys.stdin);r=[x for x in d if x.get('status')=='confirmed'];print(r[0]['id'] if r else '')")
echo "confirmed doc: $DOC"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"requirement_id\":\"$REQ\"}" "$API_URL/api/documents/$DOC/link-requirement" > /dev/null
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/requirements" | python3 -c "
import sys,json
d=json.load(sys.stdin)
r=[x for x in d if x['id']=='$REQ'][0]
print('after attach: status=',r['status'],'verification=',r.get('verification'))
"

echo ""; echo "=== 7. Staff evidence review (no sensitive_fields leaked) ==="
curl -s -H "Authorization: Bearer $STAFFTOK" "$API_URL/api/staff/requirements/$REQ/evidence" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('req status:',d['requirement']['status'])
print('docs:',[(x.get('document_type_label'),x.get('label')) for x in d['documents']])
print('sensitive leaked to staff?', any('sensitive_fields' in x or 'storage_path' in x or 'content_hash' in x for x in d['documents']))
"

echo ""; echo "=== 8. Participant cannot self-verify ==="
# Try PATCH generic crud with status=done (this is allowed by generic crud but must NOT flip verification.status to verified)
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"status":"done"}' "$API_URL/api/requirements/$REQ" > /dev/null
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/requirements" | python3 -c "
import sys,json
r=[x for x in json.load(sys.stdin) if x['id']=='$REQ'][0]
v=r.get('verification',{})
print('after participant PATCH status=done: overall.status=',r['status'],'verification.status=',v.get('status'),'(must NOT be verified)')
"

echo ""; echo "=== 9. Staff verifies ==="
curl -s -X POST -H "Authorization: Bearer $STAFFTOK" -H "Content-Type: application/json" -d '{"decision":"verified"}' "$API_URL/api/staff/requirements/$REQ/verify" | python3 -c "
import sys,json
r=json.load(sys.stdin)
v=r.get('verification',{})
print('after staff verify: status=',r.get('status'),'verification.status=',v.get('status'),'verified_by=',v.get('verified_by'),'role=',v.get('verifier_role'))
"

echo ""; echo "=== 10. Audit trail (super_admin scope) ==="
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/api/audit/events" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('total events:',len(d))
for e in d[:6]: print(' -',e['action'],'::',e['target_type'],'by',e.get('actor_role'))
"

echo ""; echo "=== 11. Cross-program isolation: APF staff cannot touch a requirement belonging to a participant with no APF enrollment ==="
OTHER_REQ=$(curl -s -X POST -H "Authorization: Bearer $OTHER_TOK" -H "Content-Type: application/json" -d '{"type":"other","description":"foreign req","status":"open"}' "$API_URL/api/requirements" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s -o /dev/null -w "APF staff verify foreign req: %{http_code}\n" -X POST -H "Authorization: Bearer $STAFFTOK" -H "Content-Type: application/json" -d '{"decision":"verified"}' "$API_URL/api/staff/requirements/$OTHER_REQ/verify"
curl -s -o /dev/null -w "APF staff evidence-view foreign req: %{http_code}\n" -H "Authorization: Bearer $STAFFTOK" "$API_URL/api/staff/requirements/$OTHER_REQ/evidence"

echo ""; echo "=== 12. Invitation reuse blocked ==="
curl -s -o /dev/null -w "reuse same code: %{http_code}\n" -X POST -H "Content-Type: application/json" -d "{\"code\":\"$CODE\",\"password\":\"x\"}" "$API_URL/api/invitations/accept"

echo ""; echo "=== DONE ==="
