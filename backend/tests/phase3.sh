#!/bin/bash
set -e
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOK=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"heatherprejean7325@gmail.com","password":"Blueprint2026!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")

echo "=== 1. Onboarding schema + state ==="
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/onboarding/schema" | python3 -c "import sys,json;d=json.load(sys.stdin);print('sections:',[s['id'] for s in d['sections']],'total q:',sum(len(s['questions']) for s in d['sections']))"

echo ""; echo "=== 2. Save some answers ==="
for pair in "immediate|housing_safe_tonight|yes" "immediate|food_access|yes" "immediate|phone_working|no" "identification|has_state_id|no" "identification|has_ssn_card|no" "health|has_provider|no" "health|has_insurance|yes" "support|has_emergency_contact|yes" "education_employment|wants_resume_help|yes" "compliance|on_supervision|yes"; do
  IFS='|' read -r S K V <<< "$pair"
  curl -s -o /dev/null -X PUT -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d "{\"section\":\"$S\",\"key\":\"$K\",\"value\":\"$V\"}" "$API_URL/api/onboarding/answer"
done
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/onboarding/state" | python3 -c "import sys,json;d=json.load(sys.stdin);print('pct:',d['progress']['pct'],'answered:',len(d['answers']))"

echo ""; echo "=== 3. Complete → blueprint recompute ==="
curl -s -X POST -H "Authorization: Bearer $TOK" "$API_URL/api/onboarding/complete" | python3 -c "import sys,json;d=json.load(sys.stdin);[print(' -',x['domain'],'::',x['stage'],'::',x['score'],'::',x['reason'][:60]) for x in d['blueprint']['domains']]"

echo ""; echo "=== 4. Living Blueprint + history ==="
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/blueprint" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('domains:',len(d['domains']),'history:',len(d['history']))
"

echo ""; echo "=== 5. Action map ==="
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/action-map" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('action items:',len(d))
for a in d[:6]: print(' -',a['domain'],'::',a['title'],'::',a['priority'],'::',a['status'])
"

echo ""; echo "=== 6. Complete an action → recompute ==="
ACT=$(curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/action-map" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'])")
curl -s -o /dev/null -X PATCH -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"status":"completed"}' "$API_URL/api/action-map/$ACT"
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/blueprint" | python3 -c "import sys,json;d=json.load(sys.stdin);print('history now:',len(d['history']))"

echo ""; echo "=== 7. Emergency: toggle on with select fields ==="
curl -s -X PUT -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"enabled":true,"allowed_fields":["name","allergies","medications_summary","emergency_contacts"]}' "$API_URL/api/emergency/public-profile" > /tmp/ep.json
SLUG=$(python3 -c "import json;d=json.load(open('/tmp/ep.json'));print(d['public_slug'])")
echo "slug: ${SLUG:0:12}..."
echo "public GET /e/{slug}:"
curl -s "$API_URL/api/e/$SLUG" | python3 -c "import sys,json;d=json.load(sys.stdin);print('fields returned:',sorted(d['profile'].keys()))"

echo ""; echo "=== 8. Emergency: disable → 410 ==="
curl -s -X PUT -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"enabled":false,"allowed_fields":[]}' "$API_URL/api/emergency/public-profile" > /dev/null
curl -s -o /dev/null -w "public GET after disable: %{http_code}\n" "$API_URL/api/e/$SLUG"

echo ""; echo "=== 9. Emergency: rotate slug → old 404, new works ==="
curl -s -X PUT -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"enabled":true,"allowed_fields":["name"]}' "$API_URL/api/emergency/public-profile" > /dev/null
NEW_SLUG=$(curl -s -X POST -H "Authorization: Bearer $TOK" "$API_URL/api/emergency/rotate-slug" | python3 -c "import sys,json;print(json.load(sys.stdin)['public_slug'])")
curl -s -o /dev/null -w "old slug after rotate: %{http_code}\n" "$API_URL/api/e/$SLUG"
curl -s -o /dev/null -w "new slug: %{http_code}\n" "$API_URL/api/e/$NEW_SLUG"

echo ""; echo "=== 10. Scan history visible to participant ==="
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/emergency/scan-history" | python3 -c "import sys,json;d=json.load(sys.stdin);print('scans logged:',len(d))"

echo ""; echo "=== 11. Public URL never exposes non-authorized fields ==="
# The public endpoint returned only 'name' per allowed_fields=['name'] above:
curl -s "$API_URL/api/e/$NEW_SLUG" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('fields:',sorted(d['profile'].keys()),'(must be exactly [\"name\"] or empty if no emergency_profile stored)')
"

echo ""; echo "=== 12. QR PNG generation ==="
curl -s -o /tmp/qr.png -w "qr status: %{http_code} · type: %{content_type} · size: %{size_download}b\n" -H "Authorization: Bearer $TOK" "$API_URL/api/emergency/qr"
file /tmp/qr.png

echo ""; echo "=== 13. No auth on /e/slug ==="
curl -s -o /dev/null -w "unauth GET /e/slug: %{http_code}\n" "$API_URL/api/e/$NEW_SLUG"

echo ""; echo "=== DONE ==="
