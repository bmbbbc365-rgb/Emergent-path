import os, sys, json, requests
from dotenv import dotenv_values
BASE = dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"].rstrip("/")
API = BASE + "/api"
r = requests.post(f"{API}/auth/login", json={"email": "heatherprejean7325@gmail.com", "password": "Blueprint2026!"}, timeout=30)
print("login", r.status_code)
b = r.json()
tok = b["session_token"]; uid = b["user_id"]
h = {"Authorization": f"Bearer {tok}"}
st = requests.get(f"{API}/journey/state", headers=h, timeout=30).json()
print("uid", uid)
print(json.dumps(st, indent=1)[:1500])
action = sys.argv[1] if len(sys.argv) > 1 else "show"
if action == "revoke" and st["state"]["graduation_approved"]:
    rr = requests.post(f"{API}/admin/journey/{uid}/revoke-graduation", headers=h, timeout=30)
    print("revoke", rr.status_code, rr.json()["state"]["graduation_approved"], rr.json()["stage"])
if action == "unseen":
    rr = requests.post(f"{API}/journey/welcome-seen", headers=h, json={"seen": False}, timeout=30)
    print("welcome reset", rr.status_code, rr.json()["state"]["welcome_seen"])
