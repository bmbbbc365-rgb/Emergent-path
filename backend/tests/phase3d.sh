#!/bin/bash
set -e
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOK=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"heatherprejean7325@gmail.com","password":"Blueprint2026!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
STAFF_TOK=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"staff1@example.com","password":"StaffPass1!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")
OTHER_TOK=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"otheruser@example.com","password":"Otherpass1!"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['session_token'])")

ENR=$(curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/auth/me" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['enrollments'][0]['id'])")
echo "Enrollment: $ENR"

echo ""; echo "=== 1. Staff creates 3 notes (participant, shared, internal) ==="
for pair in "shared|Nice progress this week. Let's plan next 30 days.|shared" "participant|Reminder: bring your ID next visit.|participant" "internal|Coordinating with PO about check-in window.|internal"; do
  IFS='|' read -r LABEL BODY VIS <<< "$pair"
  curl -s -X POST -H "Authorization: Bearer $STAFF_TOK" -H "Content-Type: application/json" -d "{\"body\":\"$BODY\",\"visibility\":\"$VIS\"}" "$API_URL/api/staff/participants/$ENR/notes" > /dev/null
done
curl -s -H "Authorization: Bearer $STAFF_TOK" "$API_URL/api/staff/participants/$ENR/notes" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('staff sees notes:',len(d))
for n in d: print(' -',n['visibility'],'::',n['body'][:60])
"

echo ""; echo "=== 2. Participant /notes/mine — sees participant + shared, count of internal ==="
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/notes/mine" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('participant sees notes:',len(d['notes']))
for n in d['notes']: print(' -',n['visibility'],'::',n['body'][:60])
print('internal_notes_exist:',d['internal_notes_exist'],'count:',d['internal_notes_count'])
"

echo ""; echo "=== 3. Cross-user: otheruser cannot list Heather's notes ==="
curl -s -o /dev/null -w "otheruser → /notes/mine (own): %{http_code}\n" -H "Authorization: Bearer $OTHER_TOK" "$API_URL/api/notes/mine"
curl -s -o /dev/null -w "otheruser → staff list of ENR: %{http_code}\n" -H "Authorization: Bearer $OTHER_TOK" "$API_URL/api/staff/participants/$ENR/notes"

echo ""; echo "=== 4. Reminders refresh + list ==="
curl -s -X POST -H "Authorization: Bearer $TOK" "$API_URL/api/reminders/refresh" | python3 -m json.tool
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/reminders" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('reminders:',len(d))
for r in d[:5]: print(' -',r['related_type'],'::',r['title'],'::fire:',r['fire_at'][:10])
"

echo ""; echo "=== 5. Dismiss a reminder ==="
FIRST=$(curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/reminders" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0]['id'] if d else '')")
if [ -n "$FIRST" ]; then
  curl -s -o /dev/null -w "dismiss: %{http_code}\n" -X PATCH -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" -d '{"status":"dismissed"}' "$API_URL/api/reminders/$FIRST"
  curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/reminders" | python3 -c "import sys,json;d=json.load(sys.stdin);print('reminders after dismiss:',len(d))"
fi

echo ""; echo "=== 6. Action Map regen with LLM-personalized why ==="
curl -s -X POST -H "Authorization: Bearer $TOK" "$API_URL/api/action-map/regenerate" > /dev/null
curl -s -H "Authorization: Bearer $TOK" "$API_URL/api/action-map" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('actions:',len(d))
for a in d[:6]:
  wp = a.get('why_personal')
  print(' -',a['title'],'| why:',a['why'][:60],'| why_personal:',(wp[:70] if wp else '(fallback to base)'))
"

echo ""; echo "=== DONE ==="
