"""Build My Blueprint — A Path Forward re-entry platform backend.

Participant-owned life-readiness system. Not a task manager.
- Email/password (JWT session tokens) + Emergent Google Auth
- Emergent object storage for private documents
- Bridge AI (GPT-5.6 Terra) with participant context & navigation grounding
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import base64
import hmac
import bcrypt
import requests
from dotenv import load_dotenv
from fastapi import (
    APIRouter, Cookie, Depends, FastAPI, File, Header, HTTPException,
    Query, Request, Response, UploadFile,
)
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
APP_NAME = os.environ.get("APP_NAME", "bmb-reentry")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "heatherprejean7325@gmail.com").lower()
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "Blueprint2026!")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="A Path Forward — Build My Blueprint")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("bmb")


# ---------- Storage ----------
_storage_key: Optional[str] = None

def init_storage(force: bool = False) -> Optional[str]:
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        logger.warning("EMERGENT_LLM_KEY missing; storage disabled")
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Utils ----------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()

def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try: return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception: return False


# ---------- Short-lived signed URLs for private file access ----------
# We do not use presigned URLs from the storage provider (none available).
# Instead we mint a short-lived HMAC-signed token bound to (doc_id, user_id, exp).
# Kept in-memory / stateless — no DB round-trip on verify.
SIGNED_URL_TTL_SECONDS = 15 * 60           # 15 minutes
SIGNED_URL_MAX_TTL_SECONDS = 60 * 60       # never accept > 60 min

def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _sign_download(doc_id: str, user_id: str, scope: str, exp_ts: int) -> str:
    """Return an opaque signature binding this file to this actor and expiry.
    scope: 'owner' | 'staff' | 'avatar' — separates capability domains so a
    staff signature cannot be replayed as an owner signature or vice-versa.
    """
    msg = f"{doc_id}|{user_id}|{scope}|{exp_ts}".encode()
    mac = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    return _b64u(mac)

def _verify_download(doc_id: str, user_id: str, scope: str, exp_ts: int, sig: str) -> bool:
    if not (doc_id and user_id and scope and sig and exp_ts):
        return False
    if exp_ts < int(datetime.now(timezone.utc).timestamp()):
        return False
    expected = _sign_download(doc_id, user_id, scope, exp_ts)
    return hmac.compare_digest(expected, sig)

def _mint_signed_url(doc_id: str, user_id: str, scope: str, base_url: str) -> dict:
    """Return {url, expires_at, ttl_seconds} for a private download link.
    base_url should be the app's public origin (e.g. https://…preview.emergentagent.com).
    """
    exp = int((datetime.now(timezone.utc) + timedelta(seconds=SIGNED_URL_TTL_SECONDS)).timestamp())
    sig = _sign_download(doc_id, user_id, scope, exp)
    url = f"{base_url.rstrip('/')}/api/documents/download-signed/{doc_id}?uid={user_id}&scope={scope}&exp={exp}&sig={sig}"
    return {"url": url, "expires_at": datetime.fromtimestamp(exp, tz=timezone.utc).isoformat(),
            "ttl_seconds": SIGNED_URL_TTL_SECONDS}


# ---------- Auth ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class GoogleSessionIn(BaseModel):
    session_id: str


async def _create_session(user_id: str) -> str:
    token = f"sess_{uuid.uuid4().hex}{uuid.uuid4().hex}"
    await db.sessions.insert_one({
        "session_token": token, "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    return token


async def current_user(
    session_token: Optional[str] = Cookie(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict:
    token = session_token or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(401, "Not authenticated")
    session = await db.sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(401, "Invalid session")
    exp = session["expires_at"]
    if isinstance(exp, str): exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc): raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user: raise HTTPException(401, "User not found")
    return user


def _set_cookie(response: Response, token: str):
    response.set_cookie("session_token", token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*3600)


@api_router.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    if await db.users.find_one({"email": body.email.lower()}, {"_id": 0}):
        raise HTTPException(400, "Email already registered")
    uid = new_id("user_")
    await db.users.insert_one({
        "user_id": uid, "email": body.email.lower(), "name": body.name,
        "password_hash": hash_password(body.password), "auth_type": "password",
        "picture": None, "created_at": now_iso(),
    })
    await seed_participant(uid, minimal=True, name=body.name)
    token = await _create_session(uid)
    _set_cookie(response, token)
    return {"session_token": token, "user_id": uid}


@api_router.post("/auth/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()}, {"_id": 0})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = await _create_session(user["user_id"])
    _set_cookie(response, token)
    return {"session_token": token, "user_id": user["user_id"]}


@api_router.post("/auth/google-session")
async def google_session(body: GoogleSessionIn, response: Response):
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": body.session_id}, timeout=15,
    )
    if r.status_code != 200:
        raise HTTPException(401, "Google authentication failed")
    data = r.json()
    email = data["email"].lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        uid = new_id("user_")
        await db.users.insert_one({
            "user_id": uid, "email": email, "name": data.get("name", email.split("@")[0]),
            "picture": data.get("picture"), "auth_type": "google", "password_hash": None,
            "created_at": now_iso(),
        })
        await seed_participant(uid, minimal=True, name=data.get("name", "Participant"))
    else:
        uid = user["user_id"]
        await db.users.update_one({"user_id": uid}, {"$set": {"picture": data.get("picture") or user.get("picture"), "name": user.get("name") or data.get("name")}})
    token = data["session_token"]
    await db.sessions.insert_one({
        "session_token": token, "user_id": uid,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": now_iso(),
    })
    _set_cookie(response, token)
    return {"session_token": token, "user_id": uid}


@api_router.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    # Include memberships (role bindings) + primary enrollment + pathway_id.
    bindings = await db.role_bindings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    enrollments = await db.enrollments.find({"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(20)
    pathway = None
    if enrollments:
        pw = await db.pathway_ids.find_one({"enrollment_id": enrollments[0]["id"]}, {"_id": 0})
        pathway = pw
    return {**user, "memberships": bindings, "enrollments": enrollments, "pathway": pathway}


@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(default=None)):
    if session_token:
        await db.sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Generic CRUD helpers ----------
def crud_endpoints(name: str, collection: str, allowed_fields: list[str], sort_field: str = "created_at", sort_dir: int = -1):
    """Attach GET/POST/PATCH/DELETE endpoints for a per-user collection."""

    @api_router.get(f"/{name}")
    async def _list(user: dict = Depends(current_user)):
        return await db[collection].find({"user_id": user["user_id"]}, {"_id": 0}).sort(sort_field, sort_dir).to_list(1000)

    @api_router.post(f"/{name}")
    async def _create(body: dict, user: dict = Depends(current_user)):
        payload = {k: v for k, v in body.items() if k in allowed_fields}
        payload.update({"id": new_id(), "user_id": user["user_id"], "created_at": now_iso()})
        await db[collection].insert_one(payload)
        payload.pop("_id", None)
        return payload

    @api_router.patch(f"/{name}/{{item_id}}")
    async def _update(item_id: str, body: dict, user: dict = Depends(current_user)):
        upd = {k: v for k, v in body.items() if k in allowed_fields}
        if not upd:
            raise HTTPException(400, "No allowed fields to update")
        res = await db[collection].update_one({"id": item_id, "user_id": user["user_id"]}, {"$set": upd})
        if res.matched_count == 0: raise HTTPException(404, "Not found")
        return await db[collection].find_one({"id": item_id}, {"_id": 0})

    @api_router.delete(f"/{name}/{{item_id}}")
    async def _delete(item_id: str, user: dict = Depends(current_user)):
        await db[collection].delete_one({"id": item_id, "user_id": user["user_id"]})
        return {"ok": True}

    _list.__name__ = f"list_{name}"; _create.__name__ = f"create_{name}"
    _update.__name__ = f"update_{name}"; _delete.__name__ = f"delete_{name}"


# ---------- Tasks / Notes / Goals ----------
@api_router.get("/tasks")
async def list_tasks(section: Optional[str] = None, user: dict = Depends(current_user)):
    q = {"user_id": user["user_id"]}
    if section: q["section"] = section
    return await db.tasks.find(q, {"_id": 0}).sort("due_date", 1).to_list(1000)

@api_router.post("/tasks")
async def create_task(body: dict, user: dict = Depends(current_user)):
    allowed = {"section", "title", "description", "due_date", "priority", "tags", "required", "linked_type", "linked_id"}
    doc = {k: v for k, v in body.items() if k in allowed}
    doc.setdefault("priority", "normal"); doc.setdefault("required", False)
    doc.update({"id": new_id(), "user_id": user["user_id"], "status": "open", "created_at": now_iso()})
    await db.tasks.insert_one(doc); doc.pop("_id", None); return doc

@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: dict, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.items() if k in {"title", "description", "due_date", "priority", "status", "tags", "required"}}
    if upd.get("status") == "done": upd["completed_at"] = now_iso()
    res = await db.tasks.update_one({"id": task_id, "user_id": user["user_id"]}, {"$set": upd})
    if res.matched_count == 0: raise HTTPException(404, "Task not found")
    return await db.tasks.find_one({"id": task_id}, {"_id": 0})

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(current_user)):
    await db.tasks.delete_one({"id": task_id, "user_id": user["user_id"]}); return {"ok": True}

@api_router.get("/notes")
async def list_notes(section: Optional[str] = None, user: dict = Depends(current_user)):
    q = {"user_id": user["user_id"]}
    if section: q["section"] = section
    return await db.notes.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.post("/notes")
async def create_note(body: dict, user: dict = Depends(current_user)):
    doc = {"id": new_id(), "user_id": user["user_id"], "section": body.get("section", "general"),
           "subsection": body.get("subsection"), "content": body.get("content", ""), "created_at": now_iso()}
    await db.notes.insert_one(doc); doc.pop("_id", None); return doc

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(current_user)):
    await db.notes.delete_one({"id": note_id, "user_id": user["user_id"]}); return {"ok": True}

crud_endpoints("goals", "goals", ["title", "description", "timeframe", "category", "progress", "milestones", "target_date"], sort_field="target_date", sort_dir=1)
crud_endpoints("support-circle", "support_contacts", ["name", "role", "category", "contact_method", "contact_value", "when_to_contact", "notes"])


# ---------- Requirements ----------
crud_endpoints("requirements", "requirements",
    ["type", "description", "agency", "person", "start_date", "due_date", "recurrence", "status",
     "amount_due", "amount_paid", "appointment_at", "notes", "reminder_days_before", "document_ids"], sort_field="due_date", sort_dir=1)


# ---------- Medications / Conditions / Appointments / Wellness ----------
crud_endpoints("health/medications", "medications",
    ["name", "generic_name", "dose", "frequency", "times", "provider", "reason", "started_at", "notes", "photo_doc_id"])
crud_endpoints("health/conditions", "conditions",
    ["name", "diagnosed_at", "provider", "plan", "related_medications", "notes"])
crud_endpoints("health/appointments", "appointments",
    ["provider", "location", "scheduled_at", "purpose", "notes", "follow_up", "document_ids"], sort_field="scheduled_at", sort_dir=1)
crud_endpoints("health/wellness-logs", "wellness_logs",
    ["kind", "value", "unit", "note", "logged_at"], sort_field="logged_at", sort_dir=-1)


# ---------- Emergency Profile (single doc per user) ----------
class EmergencyProfileIn(BaseModel):
    enabled: bool = False
    name: Optional[str] = None
    dob: Optional[str] = None
    blood_type: Optional[str] = None
    organ_donor: Optional[bool] = None
    dnr: Optional[bool] = None
    advance_directive: Optional[str] = None
    healthcare_proxy: Optional[dict] = None
    communication_needs: Optional[str] = None
    allergies: list[str] = []
    conditions_summary: Optional[str] = None
    medications_summary: Optional[str] = None
    emergency_contacts: list[dict] = []
    qr_slug: Optional[str] = None

@api_router.get("/health/emergency-profile")
async def get_emergency(user: dict = Depends(current_user)):
    doc = await db.emergency_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return doc or {"user_id": user["user_id"], "enabled": False}

@api_router.put("/health/emergency-profile")
async def put_emergency(body: EmergencyProfileIn, user: dict = Depends(current_user)):
    data = body.model_dump()
    data["user_id"] = user["user_id"]
    data["updated_at"] = now_iso()
    if data.get("enabled") and not data.get("qr_slug"):
        data["qr_slug"] = uuid.uuid4().hex[:12]
    await db.emergency_profile.update_one({"user_id": user["user_id"]}, {"$set": data}, upsert=True)
    return await db.emergency_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------- Benefits ----------
crud_endpoints("benefits", "benefits",
    ["kind", "plan_name", "carrier", "member_id", "group_id", "deductible", "copay", "coinsurance",
     "effective_date", "renewal_date", "monthly_premium", "employer_provided", "notes", "document_ids"])


# ---------- Housing / Utilities ----------
crud_endpoints("housing/records", "housing_records",
    ["status", "type", "address", "move_in", "lease_start", "lease_end", "rent", "landlord_name",
     "landlord_contact", "insurance", "notes", "document_ids"])
crud_endpoints("housing/utilities", "utilities",
    ["kind", "provider", "account_number", "monthly_estimate", "autopay", "notes"])


# ---------- Employment: Jobs / Income / Applications / Resumes ----------
crud_endpoints("employment/jobs", "jobs",
    ["employer", "job_title", "supervisor", "employer_address", "start_date", "end_date", "status",
     "hours_per_week", "pay_rate", "pay_frequency", "salary_or_hourly", "notes"])
crud_endpoints("employment/income", "income",
    ["job_id", "pay_date", "gross_pay", "taxes", "deductions", "net_pay", "hours", "notes", "document_id"],
    sort_field="pay_date", sort_dir=-1)
crud_endpoints("employment/applications", "job_applications",
    ["company", "role", "applied_at", "status", "source", "location", "notes"],
    sort_field="applied_at", sort_dir=-1)
crud_endpoints("employment/resumes", "resumes",
    ["title", "document_id", "summary"])


# ---------- Habits & Wellness (education/organization, not treatment) ----------
crud_endpoints("habits", "habits",
    ["habit_type", "readiness", "target", "triggers", "coping_strategies", "started_at", "notes"])
crud_endpoints("habits/logs", "habit_logs",
    ["habit_id", "kind", "intensity", "note", "logged_at"], sort_field="logged_at", sort_dir=-1)


# ---------- Personal Profile (Identity) ----------
class PersonalProfileIn(BaseModel):
    strengths: list[str] = []
    values: list[str] = []
    interests: list[str] = []
    skills: list[str] = []
    work_preferences: Optional[str] = None
    motivators: list[str] = []
    career_interests: list[str] = []
    story: Optional[str] = None
    wins: list[dict] = []

@api_router.get("/profile/personal")
async def get_personal(user: dict = Depends(current_user)):
    doc = await db.personal_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return doc or {"user_id": user["user_id"], "strengths": [], "values": [], "interests": [], "skills": [], "motivators": [], "career_interests": [], "wins": []}

@api_router.put("/profile/personal")
async def put_personal(body: PersonalProfileIn, user: dict = Depends(current_user)):
    data = body.model_dump(); data["user_id"] = user["user_id"]; data["updated_at"] = now_iso()
    await db.personal_profile.update_one({"user_id": user["user_id"]}, {"$set": data}, upsert=True)
    return await db.personal_profile.find_one({"user_id": user["user_id"]}, {"_id": 0})


# ---------- Avatars (profile pictures) ----------
# Stored in the same private object bucket. Even avatars go through the signed-URL
# flow — we never expose a permanent public storage URL. Signed URLs cache-safe up
# to 5 minutes because avatar contents change rarely.
_AVATAR_MIME = {"image/png", "image/jpeg", "image/webp", "image/gif"}

@api_router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(current_user)):
    ctype = (file.content_type or "").lower()
    if ctype not in _AVATAR_MIME:
        raise HTTPException(400, "Avatar must be PNG, JPEG, WEBP, or GIF")
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Avatar too large (max 5MB)")
    ext = ctype.split("/")[-1].replace("jpeg", "jpg")
    # Deterministic path per user so re-uploads overwrite (storage has no delete API).
    path = f"{APP_NAME}/avatars/{user['user_id']}.{ext}"
    result = put_object(path, data, ctype)
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"avatar_storage_path": result["path"],
                  "avatar_content_type": ctype,
                  "avatar_updated_at": now_iso()}},
    )
    return {"ok": True, "content_type": ctype, "size": result.get("size", len(data))}


@api_router.get("/profile/avatar-url")
async def own_avatar_url(request: Request, user: dict = Depends(current_user)):
    """Short-lived signed URL to the caller's own avatar. Safe for <img src>."""
    u = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "avatar_storage_path": 1}) or {}
    if not u.get("avatar_storage_path"):
        raise HTTPException(404, "No avatar")
    base = os.environ.get("PUBLIC_APP_URL") or str(request.base_url).rstrip("/")
    # We reuse the download-signed route; for avatars doc_id is the target user_id.
    return _mint_signed_url(user["user_id"], user["user_id"], "avatar", base)


@api_router.get("/profile/avatar-url/{target_user_id}")
async def other_avatar_url(target_user_id: str, request: Request,
                            user: dict = Depends(current_user)):
    """Signed URL for another user's avatar. Only shown to staff who have that
    user in caseload, or for participants who share a program with the caller.
    Prevents avatar enumeration across tenants.
    """
    target = await db.users.find_one({"user_id": target_user_id}, {"_id": 0, "avatar_storage_path": 1}) or {}
    if not target.get("avatar_storage_path"):
        raise HTTPException(404, "No avatar")
    if target_user_id != user["user_id"]:
        bindings = await _get_bindings(user["user_id"])
        ctx = {"user_id": user["user_id"], "_bindings": bindings}
        allowed = any(b["role"] == "super_admin" for b in bindings) \
                  or await _staff_can_access_participant(ctx, target_user_id)
        if not allowed:
            raise HTTPException(403, "Out of scope")
    base = os.environ.get("PUBLIC_APP_URL") or str(request.base_url).rstrip("/")
    return _mint_signed_url(target_user_id, user["user_id"], "avatar", base)


# ---------- Documents ----------
@api_router.get("/documents")
async def list_documents(section: Optional[str] = None, category: Optional[str] = None, user: dict = Depends(current_user)):
    q = {"user_id": user["user_id"], "is_deleted": False}
    if section: q["section"] = section
    if category: q["category"] = category
    return await db.documents.find(q, {"_id": 0}).sort("uploaded_at", -1).to_list(1000)


@api_router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    section: str = Query("document-center"),
    category: str = Query("other"),
    label: str = Query(""),
    user: dict = Depends(current_user),
):
    data = await file.read()
    ext = (file.filename or "file").split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    result = put_object(path, data, file.content_type or "application/octet-stream")
    doc = {
        "id": new_id("doc_"), "user_id": user["user_id"],
        "section": section, "category": category,
        "label": label or file.filename, "storage_path": result["path"],
        "original_filename": file.filename, "content_type": file.content_type or "application/octet-stream",
        "size": result.get("size", len(data)), "is_deleted": False, "uploaded_at": now_iso(),
    }
    await db.documents.insert_one(doc); doc.pop("_id", None); return doc


@api_router.patch("/documents/{doc_id}")
async def rename_document(doc_id: str, body: dict, user: dict = Depends(current_user)):
    upd = {k: v for k, v in body.items() if k in {"label", "category", "section"}}
    if not upd: raise HTTPException(400, "Nothing to update")
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": upd})
    return await db.documents.find_one({"id": doc_id}, {"_id": 0})


@api_router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    authorization: Optional[str] = Header(default=None),
    session_token: Optional[str] = Cookie(default=None),
    auth: Optional[str] = Query(default=None),
):
    token = session_token or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None) or auth
    if not token: raise HTTPException(401, "Not authenticated")
    session = await db.sessions.find_one({"session_token": token}, {"_id": 0})
    if not session: raise HTTPException(401, "Invalid session")
    doc = await db.documents.find_one({"id": doc_id, "user_id": session["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc: raise HTTPException(404, "Not found")
    if not doc.get("storage_path"):
        raise HTTPException(410, "This document is no longer available")
    content, ctype = get_object(doc["storage_path"])
    return Response(content=content, media_type=doc.get("content_type") or ctype)


@api_router.post("/documents/{doc_id}/signed-url")
async def mint_owner_signed_url(doc_id: str, request: Request, user: dict = Depends(current_user)):
    """Owner-only: mint a 15-minute signed URL for this document.
    The URL is safe to use in <img src> / new tabs — it never sends the session cookie."""
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(404, "Not found")
    base = os.environ.get("PUBLIC_APP_URL") or str(request.base_url).rstrip("/")
    return _mint_signed_url(doc_id, user["user_id"], "owner", base)


@api_router.get("/documents/download-signed/{doc_id}")
async def download_signed(
    doc_id: str,
    uid: str = Query(...),
    scope: str = Query(...),
    exp: int = Query(...),
    sig: str = Query(...),
):
    """Cookie-less download endpoint. Access is granted purely by the signed URL,
    which was minted by an authenticated owner or scoped staff caller. Bounded to 15 min.
    """
    if scope not in ("owner", "staff", "avatar"):
        raise HTTPException(400, "Invalid scope")
    if exp > int(datetime.now(timezone.utc).timestamp()) + SIGNED_URL_MAX_TTL_SECONDS:
        raise HTTPException(400, "Invalid expiry")
    if not _verify_download(doc_id, uid, scope, exp, sig):
        raise HTTPException(401, "Invalid or expired link")

    if scope == "avatar":
        u = await db.users.find_one({"user_id": doc_id}, {"_id": 0, "avatar_storage_path": 1, "avatar_content_type": 1}) or {}
        path = u.get("avatar_storage_path")
        if not path: raise HTTPException(404, "No avatar")
        content, ctype = get_object(path)
        return Response(content=content, media_type=u.get("avatar_content_type") or ctype,
                        headers={"Cache-Control": "private, max-age=300"})

    # Documents (owner or staff scope)
    doc = await db.documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(404, "Not found")
    if scope == "owner":
        if doc["user_id"] != uid:
            raise HTTPException(403, "Forbidden")
    else:  # staff — re-check caseload at fetch time so revoked bindings can't replay
        staff = await db.users.find_one({"user_id": uid}, {"_id": 0})
        if not staff: raise HTTPException(401, "Unknown signer")
        bindings = await _get_bindings(uid)
        staff_ctx = {"user_id": uid, "_bindings": bindings}
        if not await _staff_can_access_participant(staff_ctx, doc["user_id"]):
            raise HTTPException(403, "No longer in caseload")
    content, ctype = get_object(doc["storage_path"])
    return Response(content=content, media_type=doc.get("content_type") or ctype,
                    headers={"Cache-Control": "private, no-store"})


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(current_user)):
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ---------- Smart Document & Intake Engine ----------
# Uses the provider-agnostic DocumentUnderstandingService (services/document_understanding.py).
# The service currently uses Gemini via the Emergent Universal Key. Bridge (OpenAI) is untouched.
from services.document_understanding import (  # noqa: E402
    get_document_understanding_service, is_supported_mime, mask_sensitive_value,
    KNOWN_DOCUMENT_TYPES, CATEGORY_TO_SECTIONS,
)


DOCUMENT_TYPE_CATALOG = [
    {"id": k, "label": v["label"], "category": v["category"]}
    for k, v in KNOWN_DOCUMENT_TYPES.items()
]

DOC_EVENT_TYPES = {
    "DOCUMENT_UPLOADED", "DOCUMENT_ANALYZED", "DOCUMENT_CONFIRMED",
    "DOCUMENT_CLASSIFIED", "DOCUMENT_LINKED", "EXTRACTED_DATA_CONFIRMED",
    "RELEVANT_DATE_FOUND", "REQUIREMENT_EVIDENCE_LINKED", "CREDENTIAL_IDENTIFIED",
    "EXTRACTION_APPLIED",
}


async def _record_doc_event(user_id: str, doc_id: str, event_type: str, payload: Optional[dict] = None):
    """Log a document lifecycle event. Sensitive values must never be placed in payload."""
    if event_type not in DOC_EVENT_TYPES:
        return
    await db.document_events.insert_one({
        "id": new_id(), "user_id": user_id, "doc_id": doc_id,
        "type": event_type, "payload": payload or {}, "created_at": now_iso(),
    })


def _sanitize_fields_for_output(fields: list[dict]) -> list[dict]:
    """Ensure a fields list is safe to return (labels + values, non-sensitive only)."""
    out = []
    for f in fields or []:
        if not isinstance(f, dict) or not f.get("key"):
            continue
        out.append({"key": f["key"], "label": f.get("label") or f["key"], "value": f.get("value")})
    return out


def _serialize_analysis(analysis: dict) -> dict:
    """Return an analysis document with sensitive values MASKED."""
    if not analysis:
        return {}
    sensitive = analysis.get("sensitive_fields") or []
    masked = []
    for f in sensitive:
        masked.append({
            "key": f.get("key"), "label": f.get("label") or f.get("key"),
            "value_masked": mask_sensitive_value(f.get("key", ""), f.get("value")),
            "sensitive": True,
        })
    return {
        "id": analysis.get("id"),
        "doc_id": analysis.get("doc_id"),
        "document_type": analysis.get("document_type"),
        "document_type_label": analysis.get("document_type_label"),
        "category": analysis.get("category"),
        "confidence": analysis.get("confidence"),
        "suggested_sections": analysis.get("suggested_sections") or [],
        "suggested_hub_targets": analysis.get("suggested_hub_targets") or [],
        "summary": analysis.get("summary") or "",
        "fields": _sanitize_fields_for_output(analysis.get("fields") or []),
        "sensitive_fields": masked,
        "provider": analysis.get("provider"),
        "model": analysis.get("model"),
        "warnings": analysis.get("warnings") or [],
        "created_at": analysis.get("created_at"),
    }


@api_router.get("/documents/catalog/types")
async def documents_catalog_types(user: dict = Depends(current_user)):
    """Return the known document-type catalog used by the classifier and pickers."""
    return {"types": DOCUMENT_TYPE_CATALOG,
            "sections_by_category": CATEGORY_TO_SECTIONS}


@api_router.post("/documents/analyze")
async def analyze_document(
    file: UploadFile = File(...),
    label: str = Query(""),
    user: dict = Depends(current_user),
):
    """Upload a document, store the original, run Gemini vision analysis,
    return a draft classification. NOTHING is committed to hub records yet —
    the participant must confirm via /confirm and /apply-extraction.
    """
    service = get_document_understanding_service()
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20MB)")

    content_type = (file.content_type or "application/octet-stream").lower()
    filename = file.filename or "upload"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"

    # Content hash for duplicate detection (per participant).
    content_hash = hashlib.sha256(data).hexdigest()
    existing_dup = await db.documents.find_one(
        {"user_id": user["user_id"], "is_deleted": False, "content_hash": content_hash},
        {"_id": 0, "id": 1, "label": 1, "document_type": 1, "uploaded_at": 1},
    )

    # Persist the original into existing object storage (untouched by AI).
    path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.{ext}"
    result = put_object(path, data, content_type)

    doc_id = new_id("doc_")
    doc = {
        "id": doc_id,
        "user_id": user["user_id"],
        "section": "document-center",
        "category": "other",
        "label": label or filename,
        "storage_path": result["path"],
        "original_filename": filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "content_hash": content_hash,
        "document_type": None,
        "document_type_label": None,
        "confidence": None,
        "related_sections": ["documents"],
        "related_record_ids": [],   # list of {type, id, section}
        "analysis_id": None,
        "status": "analyzing",
        "is_deleted": False,
        "uploaded_at": now_iso(),
    }
    await db.documents.insert_one(doc)
    await _record_doc_event(user["user_id"], doc_id, "DOCUMENT_UPLOADED",
                            {"filename": filename, "size": doc["size"]})

    # Run vision analysis (Gemini via emergentintegrations). We write bytes to a
    # temp file because the emergentintegrations SDK takes a file path.
    analysis_serialized: Optional[dict] = None
    if service and is_supported_mime(content_type):
        try:
            with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tf:
                tf.write(data)
                tmp_path = tf.name
            try:
                result_obj = await service.analyze(tmp_path, content_type, hints={"filename": filename})
            finally:
                try: os.unlink(tmp_path)
                except Exception: pass

            analysis_id = new_id("ana_")
            analysis_doc = {
                "id": analysis_id,
                "user_id": user["user_id"],
                "doc_id": doc_id,
                "document_type": result_obj.document_type,
                "document_type_label": result_obj.document_type_label,
                "category": result_obj.category,
                "confidence": result_obj.confidence,
                "suggested_sections": result_obj.suggested_sections,
                "suggested_hub_targets": result_obj.suggested_hub_targets,
                "summary": result_obj.summary,
                # NOTE: We intentionally do NOT store the raw model response.
                "fields": [{"key": f.key, "label": f.label, "value": f.value} for f in result_obj.fields],
                "sensitive_fields": [
                    {"key": f.key, "label": f.label, "value": f.value} for f in result_obj.sensitive_fields
                ],
                "provider": result_obj.provider,
                "model": result_obj.model,
                "warnings": result_obj.warnings,
                "created_at": now_iso(),
            }
            await db.document_analyses.insert_one(analysis_doc)
            await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": {
                "analysis_id": analysis_id,
                "document_type": result_obj.document_type,
                "document_type_label": result_obj.document_type_label,
                "category": result_obj.category,
                "confidence": result_obj.confidence,
                "status": "needs_review",
            }})
            await _record_doc_event(user["user_id"], doc_id, "DOCUMENT_ANALYZED",
                                    {"document_type": result_obj.document_type,
                                     "confidence": result_obj.confidence})
            analysis_serialized = _serialize_analysis(analysis_doc)
        except Exception as e:
            logger.exception("Document analysis failed")
            await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]},
                                          {"$set": {"status": "needs_review"}})
    else:
        # Unsupported mime type — still preserve the file, mark for manual review.
        await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]},
                                      {"$set": {"status": "needs_review"}})

    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"]}, {"_id": 0})
    return {
        "document": doc,
        "analysis": analysis_serialized,
        "duplicate_of": existing_dup,   # None or {id, label, ...}
    }


class DocumentConfirmIn(BaseModel):
    document_type: str
    category: Optional[str] = None
    label: Optional[str] = None
    related_sections: list[str] = []
    fields: list[dict] = []                # non-sensitive; participant can edit
    keep_sensitive_field_keys: list[str] = []  # which sensitive fields to retain


@api_router.post("/documents/{doc_id}/confirm")
async def confirm_document(doc_id: str, body: DocumentConfirmIn, user: dict = Depends(current_user)):
    """Participant confirms (or corrects) the AI classification and extracted fields.
    Sensitive fields not listed in keep_sensitive_field_keys are DROPPED from storage.
    """
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")

    dtype = (body.document_type or "unknown").lower()
    if dtype not in KNOWN_DOCUMENT_TYPES:
        dtype = "other"
    meta = KNOWN_DOCUMENT_TYPES[dtype]
    category = body.category or meta["category"]
    sections = body.related_sections or CATEGORY_TO_SECTIONS.get(category, ["documents"])

    upd = {
        "document_type": dtype,
        "document_type_label": meta["label"],
        "category": category,
        "related_sections": sections,
        "section": sections[0] if sections else "documents",
        "confirmed_at": now_iso(),
        "status": "confirmed",
    }
    if body.label:
        upd["label"] = body.label
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": upd})

    # Update analysis with confirmed fields (participant-edited).
    if doc.get("analysis_id"):
        analysis = await db.document_analyses.find_one({"id": doc["analysis_id"], "user_id": user["user_id"]}, {"_id": 0})
        if analysis:
            # Preserve only chosen sensitive fields; drop the rest permanently.
            keep = set(body.keep_sensitive_field_keys or [])
            existing_sensitive = analysis.get("sensitive_fields") or []
            kept_sensitive = [f for f in existing_sensitive if f.get("key") in keep]
            confirmed_fields = _sanitize_fields_for_output(body.fields)
            await db.document_analyses.update_one(
                {"id": analysis["id"], "user_id": user["user_id"]},
                {"$set": {
                    "confirmed_fields": confirmed_fields,
                    "sensitive_fields": kept_sensitive,
                    "confirmed_at": now_iso(),
                }},
            )

    await _record_doc_event(user["user_id"], doc_id, "DOCUMENT_CONFIRMED",
                            {"document_type": dtype, "category": category})
    if dtype == "training_certificate":
        await _record_doc_event(user["user_id"], doc_id, "CREDENTIAL_IDENTIFIED", {})

    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"]}, {"_id": 0})
    analysis = None
    if doc.get("analysis_id"):
        raw = await db.document_analyses.find_one({"id": doc["analysis_id"], "user_id": user["user_id"]}, {"_id": 0})
        analysis = _serialize_analysis(raw or {})
    return {"document": doc, "analysis": analysis}


@api_router.get("/documents/{doc_id}")
async def get_document(doc_id: str, user: dict = Depends(current_user)):
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    analysis = None
    if doc.get("analysis_id"):
        raw = await db.document_analyses.find_one({"id": doc["analysis_id"], "user_id": user["user_id"]}, {"_id": 0})
        analysis = _serialize_analysis(raw or {})
    events = await db.document_events.find({"user_id": user["user_id"], "doc_id": doc_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"document": doc, "analysis": analysis, "events": events}


@api_router.post("/documents/{doc_id}/reveal-sensitive")
async def reveal_sensitive(doc_id: str, body: dict, user: dict = Depends(current_user)):
    """Explicit reveal — returns ONE sensitive field's full value.
    Requires participant to be logged in AND to own the document. Never included in list responses.
    """
    field_key = (body or {}).get("field_key")
    if not field_key:
        raise HTTPException(400, "field_key required")
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc or not doc.get("analysis_id"):
        raise HTTPException(404, "Not found")
    analysis = await db.document_analyses.find_one({"id": doc["analysis_id"], "user_id": user["user_id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(404, "Not found")
    for f in (analysis.get("sensitive_fields") or []):
        if f.get("key") == field_key:
            return {"key": field_key, "label": f.get("label"), "value": f.get("value")}
    raise HTTPException(404, "Sensitive field not stored")


class ApplyExtractionIn(BaseModel):
    target: str                   # e.g. "employment_income", "employment_job", "benefits_record", "housing_record", "health_appointment"
    overrides: dict = {}


@api_router.post("/documents/{doc_id}/apply-extraction")
async def apply_extraction(doc_id: str, body: ApplyExtractionIn, user: dict = Depends(current_user)):
    """Create a hub record from confirmed extracted fields. Never called automatically —
    requires a second explicit participant action after /confirm.
    """
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc or doc.get("status") != "confirmed" or not doc.get("analysis_id"):
        raise HTTPException(400, "Document must be confirmed first")
    analysis = await db.document_analyses.find_one({"id": doc["analysis_id"], "user_id": user["user_id"]}, {"_id": 0})
    fields_list = (analysis or {}).get("confirmed_fields") or (analysis or {}).get("fields") or []
    fmap = {f["key"]: f.get("value") for f in fields_list if isinstance(f, dict) and f.get("key")}
    fmap.update(body.overrides or {})

    def get(*keys, default=None):
        for k in keys:
            if k in fmap and fmap[k] not in (None, ""):
                return fmap[k]
        return default

    def as_float(v):
        try: return float(str(v).replace("$", "").replace(",", ""))
        except Exception: return None

    created = None
    collection = None
    payload: dict = {}
    section_link = "documents"

    if body.target == "employment_income":
        payload = {
            "pay_date": get("pay_date", "date", "payment_date"),
            "pay_period_start": get("pay_period_start", "pay_period_start_date", "period_start"),
            "pay_period_end": get("pay_period_end", "pay_period_end_date", "period_end"),
            "gross_pay": as_float(get("gross_pay", "gross", "gross_earnings", "gross_amount")),
            "taxes": as_float(get("taxes", "total_taxes", "tax_total")),
            "deductions": as_float(get("deductions", "total_deductions")),
            "net_pay": as_float(get("net_pay", "net", "take_home", "net_amount")),
            "hours": as_float(get("hours", "hours_worked", "total_hours")),
            "notes": get("employer", "employer_name") and f"Employer: {get('employer', 'employer_name')}" or None,
            "document_id": doc_id,
        }
        collection = "income"; section_link = "employment-record"
    elif body.target == "employment_job":
        payload = {
            "employer": get("employer", "employer_name", "company"),
            "job_title": get("job_title", "title", "role", "position"),
            "start_date": get("start_date", "hire_date", "employment_start"),
            "status": "active",
            "pay_rate": as_float(get("pay_rate", "hourly_rate", "rate")),
            "notes": get("employer_address") and f"Address: {get('employer_address')}" or None,
        }
        collection = "jobs"; section_link = "employment-record"
    elif body.target == "benefits_record":
        payload = {
            "kind": get("benefit_type", "kind", "coverage_type", "plan_type", default="other"),
            "plan_name": get("plan_name", "plan"),
            "carrier": get("carrier", "insurer", "issuer", "insurance_company"),
            "effective_date": get("effective_date", "coverage_start", "start_date"),
            "renewal_date": get("renewal_date", "coverage_end", "end_date"),
            "monthly_premium": as_float(get("premium", "monthly_premium")),
            "document_ids": [doc_id],
        }
        collection = "benefits"; section_link = "benefits-hub"
    elif body.target == "housing_record":
        payload = {
            "status": "current",
            "type": get("housing_type", default="rented"),
            "address": get("address", "property_address", "tenant_address"),
            "lease_start": get("lease_start", "start_date", "lease_start_date"),
            "lease_end": get("lease_end", "end_date", "lease_end_date"),
            "rent": as_float(get("rent", "monthly_rent", "monthly_amount")),
            "landlord_name": get("landlord", "landlord_name", "lessor"),
            "landlord_contact": get("landlord_contact", "landlord_phone", "lessor_phone"),
            "document_ids": [doc_id],
        }
        collection = "housing_records"; section_link = "home-hub"
    elif body.target == "health_appointment":
        payload = {
            "provider": get("provider", "clinic", "doctor", "provider_name"),
            "location": get("location", "address", "clinic_address"),
            "scheduled_at": get("appointment_at", "appointment_date", "date_time", "date"),
            "purpose": get("purpose", "reason", "visit_type"),
            "document_ids": [doc_id],
        }
        collection = "appointments"; section_link = "health-hub"
    elif body.target == "credential":
        payload = {
            "title": get("credential_name", "course_name", "certificate_name") or doc.get("label"),
            "document_id": doc_id,
            "summary": get("issuer", "provider") and f"Issued by {get('issuer', 'provider')}" or None,
        }
        collection = "resumes"; section_link = "employment-readiness"
    else:
        raise HTTPException(400, f"Unsupported target: {body.target}")

    payload = {k: v for k, v in payload.items() if v not in (None, "", [])}
    payload.update({"id": new_id(), "user_id": user["user_id"], "created_at": now_iso()})
    await db[collection].insert_one(payload)
    payload.pop("_id", None)
    created = payload

    # Attach the newly created record to the document's related_record_ids.
    await db.documents.update_one(
        {"id": doc_id, "user_id": user["user_id"]},
        {"$addToSet": {"related_record_ids": {"type": body.target, "id": created["id"], "section": section_link}},
         "$push": {"related_sections": section_link}},
    )
    # Deduplicate related_sections.
    doc2 = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"]}, {"_id": 0})
    sections_dedup = list(dict.fromkeys(doc2.get("related_sections") or []))
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": {"related_sections": sections_dedup}})

    await _record_doc_event(user["user_id"], doc_id, "EXTRACTION_APPLIED",
                            {"target": body.target, "record_id": created["id"]})
    return {"created": created, "target": body.target}


class LinkRequirementIn(BaseModel):
    requirement_id: str


@api_router.post("/documents/{doc_id}/link-requirement")
async def link_requirement(doc_id: str, body: LinkRequirementIn, user: dict = Depends(current_user)):
    """Attach a document to an existing requirement as evidence.
    IMPORTANT: does NOT mark the requirement complete — that remains a human action.
    """
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    req = await db.requirements.find_one({"id": body.requirement_id, "user_id": user["user_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Requirement not found")

    await db.requirements.update_one(
        {"id": body.requirement_id, "user_id": user["user_id"]},
        {"$addToSet": {"document_ids": doc_id}},
    )
    # Phase 2: attaching evidence transitions verification.status → evidence_submitted
    # ONLY IF verification is required and current state is earlier. Never marks verified.
    fresh_req = await db.requirements.find_one({"id": body.requirement_id, "user_id": user["user_id"]}, {"_id": 0})
    ver = (fresh_req or {}).get("verification") or {}
    if ver.get("required") and ver.get("status") in {None, "not_started", "in_progress", "returned"}:
        new_ver = {**ver, "status": "evidence_submitted", "submitted_at": now_iso()}
        await db.requirements.update_one(
            {"id": body.requirement_id, "user_id": user["user_id"]},
            {"$set": {"verification": new_ver, "status": "in_progress"}},
        )
    await db.documents.update_one(
        {"id": doc_id, "user_id": user["user_id"]},
        {"$addToSet": {"related_record_ids": {"type": "requirement", "id": body.requirement_id, "section": "requirements"}},
         "$push": {"related_sections": "requirements"}},
    )
    doc2 = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"]}, {"_id": 0})
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]},
                                  {"$set": {"related_sections": list(dict.fromkeys(doc2.get("related_sections") or []))}})
    await _record_doc_event(user["user_id"], doc_id, "REQUIREMENT_EVIDENCE_LINKED",
                            {"requirement_id": body.requirement_id})
    return {"ok": True}


@api_router.delete("/documents/{doc_id}/link-requirement/{req_id}")
async def unlink_requirement(doc_id: str, req_id: str, user: dict = Depends(current_user)):
    """Remove the doc↔requirement relationship. Does NOT delete the original document.
    Does NOT change requirement status.
    """
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["user_id"], "is_deleted": False}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Document not found")
    req = await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Requirement not found")
    await db.requirements.update_one(
        {"id": req_id, "user_id": user["user_id"]}, {"$pull": {"document_ids": doc_id}},
    )
    await db.documents.update_one(
        {"id": doc_id, "user_id": user["user_id"]},
        {"$pull": {"related_record_ids": {"type": "requirement", "id": req_id}}},
    )
    return {"ok": True}


@api_router.get("/requirements/{req_id}/documents")
async def list_requirement_documents(req_id: str, user: dict = Depends(current_user)):
    """Return docs attached to a requirement (participant-scoped; no sensitive values)."""
    req = await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})
    if not req:
        raise HTTPException(404, "Requirement not found")
    ids = req.get("document_ids") or []
    if not ids:
        return []
    docs = await db.documents.find(
        {"user_id": user["user_id"], "is_deleted": False, "id": {"$in": ids}},
        {"_id": 0},
    ).to_list(200)
    return docs


@api_router.get("/document-search")
async def search_documents(
    q: Optional[str] = None,
    document_type: Optional[str] = None,
    category: Optional[str] = None,
    section: Optional[str] = None,
    requirement_id: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(current_user),
):
    """Server-side participant-scoped document search used by the UI and by Bridge.
    Never returns sensitive extracted values.
    """
    query: dict = {"user_id": user["user_id"], "is_deleted": False}
    if document_type:
        query["document_type"] = document_type
    if category:
        query["category"] = category
    if section:
        query["related_sections"] = section
    if requirement_id:
        req = await db.requirements.find_one({"id": requirement_id, "user_id": user["user_id"]}, {"_id": 0})
        if not req:
            return []
        query["id"] = {"$in": req.get("document_ids") or []}
    if q:
        rx = re.compile(re.escape(q), re.IGNORECASE)
        query["$or"] = [
            {"label": {"$regex": rx}},
            {"original_filename": {"$regex": rx}},
            {"document_type": {"$regex": rx}},
            {"document_type_label": {"$regex": rx}},
            {"category": {"$regex": rx}},
        ]
    docs = await db.documents.find(query, {"_id": 0}).sort("uploaded_at", -1).to_list(max(1, min(limit, 100)))
    # Ensure NO sensitive analysis leak in list output.
    for d in docs:
        d.pop("analysis_id", None)   # keep client from directly indexing analysis
    return docs


# ---------- Permissions ----------
class SharingIn(BaseModel):
    resource_type: str            # section | document | employment_report | benefits_summary
    resource_id: Optional[str] = None
    section: Optional[str] = None
    shared_with_email: EmailStr
    shared_with_role: str
    permission_level: str = "view"
    note: Optional[str] = ""
    expires_at: Optional[str] = None

@api_router.get("/sharing")
async def list_sharing(user: dict = Depends(current_user)):
    return await db.permissions.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)

@api_router.post("/sharing")
async def create_sharing(body: SharingIn, user: dict = Depends(current_user)):
    doc = {"id": new_id(), "user_id": user["user_id"], **body.model_dump(), "status": "pending", "created_at": now_iso()}
    await db.permissions.insert_one(doc); doc.pop("_id", None); return doc

@api_router.delete("/sharing/{sid}")
async def revoke_sharing(sid: str, user: dict = Depends(current_user)):
    await db.permissions.delete_one({"id": sid, "user_id": user["user_id"]}); return {"ok": True}


# ---------- Education content system ----------
@api_router.get("/education/categories")
async def list_categories():
    return await db.education_categories.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/education/courses")
async def list_courses(category: Optional[str] = None, user: dict = Depends(current_user)):
    q = {} if not category else {"category": category}
    courses = await db.courses.find(q, {"_id": 0}).to_list(1000)
    progress_docs = await db.lesson_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    prog_by_lesson = {p["lesson_id"]: p for p in progress_docs}
    for c in courses:
        modules = await db.modules.find({"course_id": c["id"]}, {"_id": 0}).sort("order", 1).to_list(1000)
        total_lessons = 0; done_lessons = 0
        for m in modules:
            lessons = await db.lessons.find({"module_id": m["id"]}, {"_id": 0}).sort("order", 1).to_list(1000)
            for l in lessons:
                total_lessons += 1
                if prog_by_lesson.get(l["id"], {}).get("completed"):
                    done_lessons += 1
            m["lessons_count"] = len(lessons)
        c["modules"] = modules
        c["lessons_total"] = total_lessons
        c["lessons_done"] = done_lessons
        c["progress"] = round(done_lessons / total_lessons * 100) if total_lessons else 0
    return courses

@api_router.get("/education/course/{course_id}")
async def course_detail(course_id: str, user: dict = Depends(current_user)):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course: raise HTTPException(404, "Course not found")
    modules = await db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    progress_docs = await db.lesson_progress.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    prog_by_lesson = {p["lesson_id"]: p for p in progress_docs}
    for m in modules:
        lessons = await db.lessons.find({"module_id": m["id"]}, {"_id": 0}).sort("order", 1).to_list(1000)
        for l in lessons:
            p = prog_by_lesson.get(l["id"], {})
            l["completed"] = bool(p.get("completed"))
            l["progress"] = p.get("progress", 0)
            # Attach rich content blocks if we have them for this lesson
            l["content"] = LESSON_CONTENT.get((course["title"], l["title"])) or []
        m["lessons"] = lessons
    course["modules"] = modules
    return course


# ---- Rich lesson content (LEARN → DO → TRACK → GET HELP blocks) ----
LESSON_CONTENT = {
    ("Decision-Making Framework", "The 4-step framework"): [
        {"type": "text", "title": "Learn: Pause → Name → Weigh → Choose",
         "body": "Hard calls feel less overwhelming when you slow them down.\n\n1. **Pause.** Take one breath before you respond.\n2. **Name the choice.** What are you actually deciding? Write it as a single sentence.\n3. **Weigh consequences.** For each option list the likely short-term and long-term effect on you, your goals, and the people you care about.\n4. **Choose the next right thing.** You don't have to solve the whole problem — pick the next honest step."},
        {"type": "reflection", "title": "Reflection",
         "prompt": "Think about a recent hard call. Which of the four steps did you skip? What would you do differently next time?"},
        {"type": "resource", "title": "If it involves legal or safety risk",
         "items": [{"label": "Talk to your PO or attorney before acting.", "detail": "This platform is not legal advice."},
                   {"label": "In a crisis, call or text 988.", "detail": "Free, confidential, 24/7."}]},
    ],
    ("Decision-Making Framework", "Practice: replay a hard call"): [
        {"type": "text", "title": "Do the work",
         "body": "This lesson is an activity. Pick one decision from the last two weeks — big or small — and run it back through the four steps."},
        {"type": "worksheet", "title": "Worksheet",
         "prompts": ["The decision was…", "What I actually did…", "Short-term effect…", "Long-term effect…", "What I'd do differently next time…"]},
        {"type": "checklist", "title": "Habit checklist",
         "items": ["I paused before responding", "I named the choice out loud or in writing", "I weighed short + long-term effects", "I chose the next right thing"]},
    ],
    ("Decision-Making Framework", "Check-in"): [
        {"type": "quiz", "title": "Knowledge check",
         "questions": [
             {"q": "Which is NOT part of the framework?", "options": ["Pause", "Name", "React", "Weigh"], "answer": 2,
              "why": "React is the opposite of the framework — the framework replaces reacting with choosing."},
             {"q": "What's the point of step 4?", "options": ["Solve everything now", "Pick the next honest step", "Talk to no one"], "answer": 1,
              "why": "Small honest steps compound. You don't have to solve the whole problem in one move."},
         ]},
    ],
    ("Recognizing Scams & Manipulation", "Red flags"): [
        {"type": "text", "title": "Learn: the common red flags",
         "body": "Scammers rely on urgency, secrecy, and small early wins. Watch for:\n• **Urgency:** \"You must act right now.\"\n• **Secrecy:** \"Don't tell anyone.\"\n• **Upfront fees:** legitimate jobs and benefits do not ask you to pay to apply.\n• **Too good to be true:** unusually easy money, guaranteed approval, no ID needed."},
        {"type": "scenario", "title": "Scenario",
         "situation": "You get a text: \"Congrats — you're pre-approved for a $2,000 grant. Send your bank routing number to claim.\"",
         "question": "What are the red flags? What would you do?"},
    ],
    ("Recognizing Scams & Manipulation", "Quiz: is this a scam?"): [
        {"type": "quiz", "title": "Spot it",
         "questions": [
             {"q": "You get a check by mail asking you to deposit it and Western Union some back. What is it?", "options": ["A great job", "A fake check scam", "Normal onboarding"], "answer": 1,
              "why": "Real employers never ask you to send money back from a check they mailed you."},
             {"q": "A recruiter demands $150 to \"secure your background check\" before interview.", "options": ["Pay it", "Walk away", "Send half"], "answer": 1,
              "why": "Legitimate employers pay for their own background checks."},
         ]},
    ],
    ("Stress & Emotional Awareness", "Naming what you feel"): [
        {"type": "text", "title": "Learn: name it to tame it",
         "body": "Big feelings shrink when you name them out loud. Try: \"I'm noticing anger,\" or \"I'm noticing shame.\" Naming activates the thinking part of your brain and quiets the alarm."},
        {"type": "reflection", "title": "Reflection",
         "prompt": "What feeling is loudest right now? Name it. Where do you feel it in your body?"},
    ],
    ("Stress & Emotional Awareness", "4-7-8 Breathing"): [
        {"type": "text", "title": "Do: try 4-7-8",
         "body": "Inhale through your nose for 4 seconds. Hold for 7. Exhale slowly through pursed lips for 8. Repeat 3 – 4 cycles."},
        {"type": "checklist", "title": "Try it now",
         "items": ["I sat somewhere quiet", "I did 3 – 4 cycles", "I noticed a small shift"]},
    ],
    ("Stress & Emotional Awareness", "Journal: your stress signals"): [
        {"type": "worksheet", "title": "Body & mind cues",
         "prompts": ["Body cue 1 (e.g., jaw clenching)", "Body cue 2", "Thought cue 1 (e.g., 'nothing works')", "Thought cue 2", "Behavior cue (e.g., isolating)"]},
        {"type": "resource", "title": "Get help",
         "items": [{"label": "SAMHSA Helpline: 1-800-662-4357", "detail": "24/7 free, confidential."},
                   {"label": "988 Suicide & Crisis Lifeline", "detail": "Call or text 988."}]},
    ],
    ("Resume for Fair-Chance Employers", "Format basics"): [
        {"type": "text", "title": "Learn",
         "body": "Keep it to one page. Sections in this order:\n1. **Contact** — name, phone, email\n2. **Headline** — 1 line: role + strengths\n3. **Skills** — 4 – 6 concrete skills\n4. **Experience** — most recent first; use action verbs\n5. **Education / training** — include certificates"},
        {"type": "checklist", "title": "Resume readiness",
         "items": ["Contact info at top", "Professional email address", "One page", "No typos", "Action verbs (operated, coordinated, resolved)", "Saved as PDF"]},
    ],
    ("Resume for Fair-Chance Employers", "Language that works"): [
        {"type": "text", "title": "Verbs that carry weight",
         "body": "Use: operated, coordinated, resolved, trained, delivered, maintained, supported, prepared, verified. Avoid: 'responsible for,' 'helped with,' 'stuff.'"},
        {"type": "worksheet", "title": "Rewrite",
         "prompts": ["Old line: 'Helped with cleaning'", "New line with strong verb:", "Old line: 'Was responsible for shipping'", "New line with strong verb:"]},
    ],
    ("Resume for Fair-Chance Employers", "Draft yours"): [
        {"type": "text", "title": "Do it",
         "body": "Copy your details into the sections above. Save it, then upload to the Document Center under 'Employment'."},
        {"type": "resource", "title": "Next step",
         "items": [{"label": "Open Employment & Professional Readiness", "route": "/app/section/employment-readiness"},
                   {"label": "Open Document Center", "route": "/app/section/documents"}]},
    ],
    ("Interview Basics", "Common questions"): [
        {"type": "text", "title": "Learn",
         "body": "Employers usually ask:\n• Tell me about yourself.\n• Why here?\n• Tell me about a challenge and how you handled it.\n\nPrepare 60 – 90 second answers. End with a strength you'll bring to the role."},
        {"type": "reflection", "title": "Prepare",
         "prompt": "Write your 60-second answer to 'Tell me about yourself.' Include: what you do, one strength, one recent win, and what you're looking for next."},
    ],
    ("Interview Basics", "Answering about your record"): [
        {"type": "text", "title": "Own it briefly",
         "body": "Employers respect honesty and forward motion. A strong answer has three parts:\n1. Name it briefly (one sentence).\n2. What you learned or did about it.\n3. What you do now.\n\nDo not over-explain. Return the conversation to the job."},
        {"type": "scenario", "title": "Try it",
         "situation": "The interviewer asks: \"I see you have a record. Can you tell me about it?\"",
         "question": "Write a 3-sentence answer using the pattern above."},
    ],
    ("Interview Basics", "Practice out loud"): [
        {"type": "checklist", "title": "Practice checklist",
         "items": ["I recorded myself once", "I timed it (60 – 90 seconds)", "I ended with a strength", "I asked a friend for feedback"]},
    ],
    ("Personal Budgeting 101", "Fixed vs. variable expenses"): [
        {"type": "text", "title": "Learn",
         "body": "**Fixed** expenses are the same each month (rent, phone, insurance). **Variable** expenses change (groceries, gas, entertainment). Knowing which is which is the first step to a budget that survives real life."},
        {"type": "worksheet", "title": "Your top 5 fixed & top 5 variable",
         "prompts": ["Fixed 1", "Fixed 2", "Fixed 3", "Fixed 4", "Fixed 5", "Variable 1", "Variable 2", "Variable 3", "Variable 4", "Variable 5"]},
    ],
    ("Personal Budgeting 101", "50 / 30 / 20 starter"): [
        {"type": "text", "title": "Learn",
         "body": "As a starter target: 50% needs, 30% wants, 20% savings + debt. Adjust to reality — if rent is 55% of income, savings might start at 5%. Small consistent beats big and once."},
        {"type": "checklist", "title": "This week",
         "items": ["I wrote my monthly income", "I listed my needs", "I set a $5 – $25 automatic savings transfer"]},
    ],
    ("Personal Budgeting 101", "Set one savings goal"): [
        {"type": "reflection", "title": "One small goal",
         "prompt": "Pick one savings goal for the next 30 days. Write the number and the date. What's step one this week?"},
        {"type": "resource", "title": "Next step",
         "items": [{"label": "Open Employment & Income Record", "route": "/app/section/employment-record"}]},
    ],
    ("Digital Basics", "Email that looks professional"): [
        {"type": "text", "title": "Learn",
         "body": "Use First.Last (or a close variant) at a mainstream provider (Gmail, Outlook). Avoid nicknames or numbers that feel personal. This email will appear on every job application and government form."},
        {"type": "checklist", "title": "Set it up",
         "items": ["I have a professional email address", "It's on my resume", "I checked it today"]},
    ],
    ("Digital Basics", "Strong passwords"): [
        {"type": "text", "title": "Learn",
         "body": "Aim for 12+ characters. Never reuse the same password across sites. A password manager (built into your phone) can remember them for you so you don't have to."},
        {"type": "quiz", "title": "Check",
         "questions": [
             {"q": "Which is the strongest?", "options": ["Password1", "Rainbow!turtle-42-coffee", "MyName2020"], "answer": 1,
              "why": "Longer + random words is much harder to guess than a short 'complex' password."},
             {"q": "Should you use the same password everywhere?", "options": ["Yes, easier", "No, never"], "answer": 1,
              "why": "One leak exposes every account."},
         ]},
    ],
    ("Digital Basics", "Turn on 2-factor"): [
        {"type": "text", "title": "Do",
         "body": "2-factor authentication (2FA) means logging in requires a code from your phone in addition to your password. Turn it on for email first — email controls every 'reset password' link."},
        {"type": "checklist", "title": "Enable 2FA",
         "items": ["Primary email 2FA is ON", "Bank / benefits 2FA is ON", "I saved recovery codes somewhere safe"]},
    ],
    ("Handling Rejection & Setbacks", "Rejection isn't identity"): [
        {"type": "text", "title": "Learn",
         "body": "One 'no' isn't a verdict. In a real job search you'll get many nos before a yes. Your worth doesn't change with the outcome — the plan does."},
        {"type": "reflection", "title": "Reflect",
         "prompt": "What is the story you tell yourself after a setback? Write the new story you want to tell."},
    ],
    ("Handling Rejection & Setbacks", "Reset routine"): [
        {"type": "checklist", "title": "Reset in 3 steps",
         "items": ["Sleep", "Move (walk 10 – 20 minutes)", "Call one person in your Support Circle"]},
        {"type": "resource", "title": "Do next",
         "items": [{"label": "Open Support Circle", "route": "/app/section/support-circle"},
                   {"label": "Open Identity & Confidence", "route": "/app/section/identity"}]},
    ],
}

class LessonProgressIn(BaseModel):
    lesson_id: str
    progress: int = 100
    completed: bool = True
    quiz_score: Optional[int] = None

@api_router.post("/education/lesson-progress")
async def set_lesson_progress(body: LessonProgressIn, user: dict = Depends(current_user)):
    await db.lesson_progress.update_one(
        {"user_id": user["user_id"], "lesson_id": body.lesson_id},
        {"$set": {**body.model_dump(), "user_id": user["user_id"], "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


# ---------- Resources ----------
@api_router.get("/resources-legacy")
async def list_resources_legacy(category: Optional[str] = None):
    q = {} if not category else {"category": category}
    return await db.resources.find(q, {"_id": 0}).to_list(1000)


# ---------- Benefits scenarios (static education) ----------
@api_router.get("/benefits/scenarios")
async def list_scenarios():
    return await db.benefit_scenarios.find({}, {"_id": 0}).to_list(1000)


# ---------- Dashboard command center ----------
@api_router.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(current_user)):
    uid = user["user_id"]
    now = datetime.now(timezone.utc)
    soon = (now + timedelta(days=7)).date().isoformat()
    today = now.date().isoformat()

    total_tasks = await db.tasks.count_documents({"user_id": uid})
    done_tasks = await db.tasks.count_documents({"user_id": uid, "status": "done"})
    required_open = await db.tasks.count_documents({"user_id": uid, "required": True, "status": "open"})
    required_total = await db.tasks.count_documents({"user_id": uid, "required": True})

    upcoming = await db.tasks.find(
        {"user_id": uid, "status": "open", "due_date": {"$gte": today, "$lte": soon}},
        {"_id": 0},
    ).sort("due_date", 1).to_list(20)
    priority_today = await db.tasks.find(
        {"user_id": uid, "status": "open", "$or": [{"due_date": today}, {"priority": "high"}]},
        {"_id": 0},
    ).sort("due_date", 1).limit(6).to_list(6)

    docs_count = await db.documents.count_documents({"user_id": uid, "is_deleted": False})

    # Requirements snapshot
    reqs = await db.requirements.find({"user_id": uid}, {"_id": 0}).to_list(500)
    req_paid = sum((r.get("amount_paid") or 0) for r in reqs)
    req_owed = sum(max(0, (r.get("amount_due") or 0) - (r.get("amount_paid") or 0)) for r in reqs)
    req_next = sorted([r for r in reqs if r.get("due_date")], key=lambda r: r["due_date"])[:5]

    # Appointments soon
    appts_soon = await db.appointments.find({"user_id": uid, "scheduled_at": {"$gte": today}}, {"_id": 0}).sort("scheduled_at", 1).limit(5).to_list(5)

    meds_count = await db.medications.count_documents({"user_id": uid})
    conditions_count = await db.conditions.count_documents({"user_id": uid})
    benefits_active = await db.benefits.count_documents({"user_id": uid})
    housing = await db.housing_records.find({"user_id": uid}, {"_id": 0}).limit(1).to_list(1)
    jobs_active = await db.jobs.count_documents({"user_id": uid, "status": "active"})
    apps_open = await db.job_applications.count_documents({"user_id": uid, "status": {"$in": ["applied", "interviewing"]}})

    goals = await db.goals.find({"user_id": uid}, {"_id": 0}).to_list(50)
    avg_progress = round(sum(g.get("progress", 0) for g in goals) / max(len(goals), 1))

    # Education progress across courses
    lesson_progress = await db.lesson_progress.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(5000)
    total_lessons = await db.lessons.count_documents({})
    edu_pct = round(len(lesson_progress) / total_lessons * 100) if total_lessons else 0

    section_progress = {}
    for section in ["requirements", "documents", "independent-living", "wellness", "life-skills",
                    "support-circle", "identity", "employment-readiness", "employment-record",
                    "digital-readiness", "health-hub", "benefits-hub", "home-hub"]:
        total = await db.tasks.count_documents({"user_id": uid, "section": section})
        done = await db.tasks.count_documents({"user_id": uid, "section": section, "status": "done"})
        section_progress[section] = {"total": total, "done": done, "pct": round((done / total) * 100) if total else 0}

    return {
        "tasks": {"total": total_tasks, "done": done_tasks, "pct": round(done_tasks / total_tasks * 100) if total_tasks else 0},
        "required": {"total": required_total, "open": required_open, "done": required_total - required_open,
                     "pct": round((required_total - required_open) / required_total * 100) if required_total else 0},
        "upcoming": upcoming,
        "today_priority": priority_today,
        "documents_count": docs_count,
        "goals_avg_progress": avg_progress,
        "goals_count": len(goals),
        "goals": goals,
        "section_progress": section_progress,
        "requirements": {"paid": req_paid, "owed": req_owed, "next": req_next, "count": len(reqs)},
        "appointments": appts_soon,
        "health": {"medications": meds_count, "conditions": conditions_count},
        "benefits": {"active": benefits_active},
        "housing": housing[0] if housing else None,
        "employment": {"active_jobs": jobs_active, "open_applications": apps_open},
        "education": {"lessons_done": len(lesson_progress), "lessons_total": total_lessons, "pct": edu_pct},
    }


# ---------- Bridge AI ----------
BRIDGE_NAV = [
    ("My Blueprint dashboard", "/app"),
    ("Release Requirements", "/app/section/requirements"),
    ("Document Center", "/app/section/documents"),
    ("Independent Living & Resources", "/app/section/independent-living"),
    ("Recovery & Wellness Education", "/app/section/wellness"),
    ("Decisions & Life Skills", "/app/section/life-skills"),
    ("Support Circle", "/app/section/support-circle"),
    ("Identity & Confidence", "/app/section/identity"),
    ("Employment Readiness", "/app/section/employment-readiness"),
    ("Employment & Income Record", "/app/section/employment-record"),
    ("Digital Life Readiness", "/app/section/digital-readiness"),
    ("Health Hub", "/app/section/health-hub"),
    ("Benefits Hub", "/app/section/benefits-hub"),
    ("Home Hub", "/app/section/home-hub"),
    ("Learn & Resources library", "/app/library"),
    ("Privacy & Sharing", "/app/privacy"),
]


async def build_bridge_context(user: dict) -> str:
    uid = user["user_id"]
    s = await dashboard_summary(user)
    lines = [
        f"Participant: {user.get('name', 'the participant')} · Email: {user.get('email')}",
        f"Overall required tasks: {s['required']['done']}/{s['required']['total']} complete.",
        f"Documents saved: {s['documents_count']}. Active benefits on file: {s['benefits']['active']}. "
        f"Medications: {s['health']['medications']}. Conditions: {s['health']['conditions']}. "
        f"Active jobs: {s['employment']['active_jobs']}. Open applications: {s['employment']['open_applications']}.",
        f"Restitution/fees owed: ${s['requirements']['owed']:.2f}. Paid to date: ${s['requirements']['paid']:.2f}.",
    ]
    up = s.get("upcoming") or []
    if up:
        lines.append("Upcoming (next 7 days):")
        for t in up[:6]:
            lines.append(f" - {t.get('due_date')}: {t.get('title')} ({t.get('section')})")
    appts = s.get("appointments") or []
    if appts:
        lines.append("Upcoming appointments:")
        for a in appts:
            lines.append(f" - {a.get('scheduled_at')}: {a.get('purpose')} with {a.get('provider')}")
    if s.get("housing"):
        h = s["housing"]
        lines.append(f"Housing: {h.get('type','—')} at {h.get('address','—')} (status: {h.get('status','—')}).")

    # Document inventory (confirmed docs only, no sensitive values).
    docs = await db.documents.find(
        {"user_id": uid, "is_deleted": False},
        {"_id": 0, "id": 1, "label": 1, "document_type": 1, "document_type_label": 1,
         "category": 1, "related_sections": 1, "related_record_ids": 1,
         "status": 1, "uploaded_at": 1, "confidence": 1},
    ).sort("uploaded_at", -1).to_list(200)
    if docs:
        lines.append("\nDOCUMENT INVENTORY (confirmed metadata only; NEVER include SSN / DL# / member IDs / policy #s / account #s):")
        for d in docs[:60]:
            typ = d.get("document_type_label") or "Unclassified"
            when = (d.get("uploaded_at") or "")[:10]
            secs = ",".join(d.get("related_sections") or [])
            rels = d.get("related_record_ids") or []
            req_ids = [r.get("id") for r in rels if isinstance(r, dict) and r.get("type") == "requirement"]
            status = d.get("status") or ""
            row = f" - [{d['id']}] {d.get('label') or 'Untitled'} — {typ} · uploaded {when} · sections={secs} · status={status}"
            if req_ids:
                row += f" · linked-requirements={','.join(req_ids)}"
            lines.append(row)
        lines.append("When referring to a document, use markdown link `[View: <label>](/app/documents/<doc_id>)`. Only reference doc IDs that appear above — never invent one.")

    # Requirements list (id + description + status + attached doc ids)
    reqs = await db.requirements.find({"user_id": uid}, {"_id": 0, "id": 1, "description": 1, "type": 1, "status": 1, "document_ids": 1, "due_date": 1}).to_list(200)
    if reqs:
        lines.append("\nREQUIREMENTS (id · description · status · attached docs):")
        for r in reqs[:60]:
            dcount = len(r.get("document_ids") or [])
            lines.append(f" - [{r['id']}] {r.get('description') or r.get('type')} · {r.get('status')} · docs={dcount}")

    lines.append("\nNAVIGATION MAP (use these exact routes when suggesting actions):")
    for label, route in BRIDGE_NAV:
        lines.append(f" - {label}: {route}")
    lines.append(" - Scan a document: /app/documents/scan")
    lines.append(" - View a specific document: /app/documents/<doc_id>")
    return "\n".join(lines)


BRIDGE_SYSTEM_BASE = (
    "You are Bridge, the intelligent navigation and support layer inside A Path Forward™ on the "
    "Build My Blueprint™ platform by Beautifully Brokered 365. Your job is to help a re-entry participant "
    "organize their life, understand their own information, learn from platform education, and find approved resources.\n\n"
    "You are NOT a generic chatbot. You know this application's architecture and you help the participant NAVIGATE and ACT.\n\n"
    "TONE: warm, empowering, plain language, non-judgmental, never punitive or institutional.\n\n"
    "SAFETY BOUNDARIES (never cross):\n"
    " - Do not diagnose, prescribe, or change medications.\n"
    " - Do not give legal advice or replace an attorney or supervising officer.\n"
    " - Do not provide therapy, crisis counseling, or substance-use treatment.\n"
    " - Do not guarantee benefits, coverage, eligibility, employment, housing, or outcomes.\n"
    " - Do not access or share participant information the participant hasn't shared with you.\n"
    " - For crises, direct the person to call or text 988 (Suicide & Crisis Lifeline) or 911 for emergencies.\n\n"
    "ALWAYS clarify ambiguous questions before answering. For example, if the user asks 'Where can I get insurance?' "
    "first ask whether they mean health, dental, vision, life, auto, or renters, and then explain the education and "
    "approved-resource pathway inside the app.\n\n"
    "DOCUMENTS: The PARTICIPANT CONTEXT below includes a DOCUMENT INVENTORY. When the user asks about their "
    "documents ('do I have…', 'where is my…', 'find my…', 'what did I upload for…'), search that inventory "
    "AND the REQUIREMENTS section to answer honestly. If a matching document exists, reference it with "
    "`[View: <label>](/app/documents/<doc_id>)`. Do NOT invent doc IDs. If nothing matches, say so plainly "
    "and offer `[Scan a document](/app/documents/scan)`. NEVER reveal SSNs, driver's-license numbers, member "
    "IDs, policy numbers, or account numbers — those are masked and only the participant can reveal them "
    "on the document detail page.\n\n"
    "END EVERY REPLY with a short 'Next steps' section containing 1-3 in-app action links using the exact markdown "
    "syntax `[Label](/app/route)` taken from the NAVIGATION MAP below. These become tappable buttons.\n\n"
    "Keep replies concise (usually under 180 words). Use short paragraphs and simple bullets."
)


class BridgeIn(BaseModel):
    message: str
    session_id: Optional[str] = None
    model: Optional[str] = None


# OpenAI ChatGPT models available for Bridge (from emergentintegrations playbook)
CHATGPT_MODELS = [
    {"id": "gpt-5.6-terra", "label": "GPT-5.6 Terra", "tier": "flagship",
     "description": "Balanced flagship — warm, careful, great for supportive guidance."},
    {"id": "gpt-5.6-sol", "label": "GPT-5.6 Sol", "tier": "flagship",
     "description": "Deep reasoning for planning and complex questions."},
    {"id": "gpt-5.6-luna", "label": "GPT-5.6 Luna", "tier": "flagship",
     "description": "Fast, empathetic, conversational."},
    {"id": "gpt-5.5", "label": "GPT-5.5", "tier": "flagship",
     "description": "Solid general-purpose reasoning."},
    {"id": "gpt-5.4", "label": "GPT-5.4", "tier": "standard",
     "description": "Reliable everyday model. Recommended default."},
    {"id": "gpt-5.4-mini", "label": "GPT-5.4 Mini", "tier": "fast",
     "description": "Quick answers, lower cost."},
    {"id": "gpt-5.2", "label": "GPT-5.2", "tier": "standard",
     "description": "Stable earlier-generation flagship."},
    {"id": "gpt-5", "label": "GPT-5", "tier": "standard",
     "description": "Original GPT-5 baseline."},
    {"id": "gpt-5-mini", "label": "GPT-5 Mini", "tier": "fast",
     "description": "Small, fast GPT-5 variant."},
    {"id": "gpt-5-nano", "label": "GPT-5 Nano", "tier": "fast",
     "description": "Smallest, fastest GPT-5 variant."},
    {"id": "gpt-4.1", "label": "GPT-4.1", "tier": "standard",
     "description": "Strong long-context model."},
    {"id": "gpt-4.1-mini", "label": "GPT-4.1 Mini", "tier": "fast",
     "description": "Lower-cost 4.1 variant."},
    {"id": "gpt-4o", "label": "GPT-4o", "tier": "standard",
     "description": "Multimodal-capable earlier flagship."},
    {"id": "o3", "label": "OpenAI o3", "tier": "reasoning",
     "description": "Reasoning-focused model for hard problems."},
    {"id": "o4-mini", "label": "OpenAI o4-mini", "tier": "reasoning",
     "description": "Lightweight reasoning model."},
]
DEFAULT_BRIDGE_MODEL = "gpt-5.6-terra"
ALLOWED_MODEL_IDS = {m["id"] for m in CHATGPT_MODELS}


@api_router.get("/bridge/models")
async def list_bridge_models(user: dict = Depends(current_user)):
    # Model selection is an admin-only capability. Participants use personalities.
    if not user.get("is_owner"):
        raise HTTPException(403, "Model selection is administrator-only. Use /api/bridge/personalities instead.")
    return {
        "models": CHATGPT_MODELS,
        "default": DEFAULT_BRIDGE_MODEL,
        "current": user.get("bridge_model") or DEFAULT_BRIDGE_MODEL,
    }


class BridgeModelIn(BaseModel):
    model: str

@api_router.put("/bridge/model")
async def set_bridge_model(body: BridgeModelIn, user: dict = Depends(current_user)):
    if not user.get("is_owner"):
        raise HTTPException(403, "Model selection is administrator-only.")
    if body.model not in ALLOWED_MODEL_IDS:
        raise HTTPException(400, "Unknown model")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"bridge_model": body.model}})
    return {"ok": True, "model": body.model}


# ---- Bridge personalities (participant-facing) ----
BRIDGE_PERSONALITIES = [
    {"id": "gentle_mother", "label": "Gentle Mother",
     "description": "Warm, patient, encouraging. Speaks with steady care.",
     "tone": "Speak with warmth, patience, and unhurried care. Reassure without being cloying. Prioritize dignity and belonging."},
    {"id": "tough_coach", "label": "Tough Coach",
     "description": "Direct, motivating, honest. Focused on the next action.",
     "tone": "Be direct, concrete, and motivating. Cut fluff. Name the next action clearly. Never harsh or shaming."},
    {"id": "supportive_friend", "label": "Supportive Friend",
     "description": "Easy, conversational, honest peer voice.",
     "tone": "Speak like a trusted friend who has your back. Casual, plain language, empathetic, honest."},
    {"id": "steady_guide", "label": "Steady Guide",
     "description": "Calm, clear, professional. Great for navigating steps.",
     "tone": "Be calm, structured, and clear. Focus on step-by-step navigation and organization."},
]
DEFAULT_PERSONALITY = "gentle_mother"
PERSONALITY_BY_ID = {p["id"]: p for p in BRIDGE_PERSONALITIES}


@api_router.get("/bridge/personalities")
async def list_personalities(user: dict = Depends(current_user)):
    return {
        "personalities": BRIDGE_PERSONALITIES,
        "default": DEFAULT_PERSONALITY,
        "current": user.get("bridge_personality") or DEFAULT_PERSONALITY,
    }


class PersonalityIn(BaseModel):
    personality: str

@api_router.put("/bridge/personality")
async def set_personality(body: PersonalityIn, user: dict = Depends(current_user)):
    if body.personality not in PERSONALITY_BY_ID:
        raise HTTPException(400, "Unknown personality")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"bridge_personality": body.personality}})
    return {"ok": True, "personality": body.personality}


# ---- Key Areas taxonomy → education & resources ----
KEY_AREAS = [
    {"id": "communication", "label": "Communication", "category": "life-skills"},
    {"id": "budgeting", "label": "Budgeting", "category": "money"},
    {"id": "credit", "label": "Credit", "category": "money"},
    {"id": "employment", "label": "Employment", "category": "employment"},
    {"id": "workplace-expectations", "label": "Workplace Expectations", "category": "employment"},
    {"id": "housing", "label": "Housing", "category": "home"},
    {"id": "benefits", "label": "Benefits", "category": "benefits"},
    {"id": "health-literacy", "label": "Health Literacy", "category": "health"},
    {"id": "digital-literacy", "label": "Digital Literacy", "category": "digital"},
    {"id": "family-reconnection", "label": "Family Reconnection", "category": "identity"},
    {"id": "parenting", "label": "Parenting", "category": "identity"},
    {"id": "stress-coping", "label": "Stress & Coping", "category": "wellness"},
    {"id": "healthy-relationships", "label": "Healthy Relationships", "category": "wellness"},
    {"id": "scams-manipulation", "label": "Recognizing Scams & Manipulation", "category": "life-skills"},
    {"id": "decision-making", "label": "Decision Making", "category": "life-skills"},
    {"id": "anger-regulation", "label": "Anger / Emotional Regulation", "category": "wellness"},
    {"id": "goal-setting", "label": "Goal Setting", "category": "identity"},
    {"id": "organization", "label": "Organization", "category": "life-skills"},
]

# Key area → course-title matches for wiring (used at query time)
KEY_AREA_COURSE_MAP = {
    "communication": ["Interview Basics", "Resume for Fair-Chance Employers"],
    "budgeting": ["Personal Budgeting 101"],
    "credit": ["Personal Budgeting 101"],
    "employment": ["Resume for Fair-Chance Employers", "Interview Basics"],
    "workplace-expectations": ["Interview Basics"],
    "digital-literacy": ["Digital Basics"],
    "scams-manipulation": ["Recognizing Scams & Manipulation", "Digital Basics"],
    "decision-making": ["Decision-Making Framework"],
    "stress-coping": ["Stress & Emotional Awareness", "Handling Rejection & Setbacks"],
    "healthy-relationships": ["Stress & Emotional Awareness"],
    "anger-regulation": ["Stress & Emotional Awareness"],
    "goal-setting": ["Decision-Making Framework", "Handling Rejection & Setbacks"],
    "organization": ["Digital Basics"],
}
# Key area → resource category
KEY_AREA_RESOURCE_MAP = {
    "housing": ["Housing"], "benefits": ["Benefits"], "health-literacy": ["Health"],
    "employment": ["Employment"], "family-reconnection": ["Recovery", "Legal"],
    "stress-coping": ["Recovery", "Crisis"], "parenting": ["Recovery"],
}
# Key area → in-app tool routes
KEY_AREA_TOOL_MAP = {
    "employment": [{"label": "Employment & Income Record", "route": "/app/section/employment-record"},
                   {"label": "Employment Readiness", "route": "/app/section/employment-readiness"}],
    "budgeting": [{"label": "Income Record", "route": "/app/section/employment-record"}],
    "housing": [{"label": "Home Hub", "route": "/app/section/home-hub"}],
    "benefits": [{"label": "Benefits Hub", "route": "/app/section/benefits-hub"}],
    "health-literacy": [{"label": "Health Hub", "route": "/app/section/health-hub"}],
    "digital-literacy": [{"label": "Digital Life Readiness", "route": "/app/section/digital-readiness"}],
    "goal-setting": [{"label": "Identity & Confidence", "route": "/app/section/identity"}],
    "decision-making": [{"label": "Decisions & Life Skills", "route": "/app/section/life-skills"}],
    "organization": [{"label": "Document Center", "route": "/app/section/documents"}],
}


@api_router.get("/education/key-areas")
async def get_key_areas():
    all_courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    by_title = {c["title"]: c for c in all_courses}
    all_resources = await db.resources.find({}, {"_id": 0}).to_list(1000)
    by_cat = {}
    for r in all_resources:
        by_cat.setdefault(r["category"], []).append(r)
    out = []
    for a in KEY_AREAS:
        courses = [{"id": by_title[t]["id"], "title": t, "category": by_title[t]["category"]}
                   for t in KEY_AREA_COURSE_MAP.get(a["id"], []) if t in by_title]
        resources = []
        for cat in KEY_AREA_RESOURCE_MAP.get(a["id"], []):
            resources.extend(by_cat.get(cat, []))
        tools = KEY_AREA_TOOL_MAP.get(a["id"], [])
        out.append({**a, "courses": courses, "resources": resources, "tools": tools})
    return out


@api_router.post("/bridge/chat")
async def bridge_chat(body: BridgeIn, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    sid = body.session_id or f"bridge_{user['user_id']}"
    await db.bridge_messages.insert_one({
        "id": new_id(), "user_id": user["user_id"], "session_id": sid,
        "role": "user", "content": body.message, "created_at": now_iso(),
    })
    ctx = await build_bridge_context(user)
    personality = PERSONALITY_BY_ID.get(user.get("bridge_personality") or DEFAULT_PERSONALITY, PERSONALITY_BY_ID[DEFAULT_PERSONALITY])
    tone_line = f"\n\n### VOICE / PERSONALITY: {personality['label']}\n{personality['tone']}\n"
    system_message = BRIDGE_SYSTEM_BASE + tone_line + "\n### PARTICIPANT CONTEXT (private; use to personalize)\n" + ctx

    # Resolve model: request override → user preference → default
    requested = (body.model or "").strip()
    model_id = requested if requested in ALLOWED_MODEL_IDS else (user.get("bridge_model") or DEFAULT_BRIDGE_MODEL)
    if model_id not in ALLOWED_MODEL_IDS:
        model_id = DEFAULT_BRIDGE_MODEL

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid, system_message=system_message
                   ).with_model("openai", model_id)

    assistant_chunks: list[str] = []

    async def event_gen():
        try:
            async for ev in chat.stream_message(UserMessage(text=body.message)):
                if isinstance(ev, TextDelta):
                    assistant_chunks.append(ev.content)
                    # Wrap chunk in newline markers so multi-line chunks survive SSE
                    yield f"data: {ev.content.replace(chr(10), '<NL>')}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.exception("Bridge stream error")
            yield f"data: [Bridge is temporarily unavailable: {e}]\n\n"
        finally:
            full = "".join(assistant_chunks)
            if full:
                await db.bridge_messages.insert_one({
                    "id": new_id(), "user_id": user["user_id"], "session_id": sid,
                    "role": "assistant", "content": full, "created_at": now_iso(),
                })
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api_router.get("/bridge/history")
async def bridge_history(user: dict = Depends(current_user)):
    sid = f"bridge_{user['user_id']}"
    return await db.bridge_messages.find({"user_id": user["user_id"], "session_id": sid}, {"_id": 0}).sort("created_at", 1).to_list(500)


@api_router.post("/bridge/transcribe")
async def bridge_transcribe(audio: UploadFile = File(...), user: dict = Depends(current_user)):
    """Fallback voice input path — accepts a browser MediaRecorder blob and returns text.
    Used when the browser lacks Web Speech API (Firefox, some iOS versions).
    Enforces caller auth and a 25MB soft-cap. Never records without an explicit request.
    """
    from emergentintegrations.llm.openai import OpenAISpeechToText

    data = await audio.read()
    if not data:
        raise HTTPException(400, "Empty audio")
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(400, "Audio too large (max 25MB)")

    # Whisper needs a filename with a recognized extension; MediaRecorder → webm/ogg
    ct = (audio.content_type or "audio/webm").lower()
    ext = "webm"
    if "ogg" in ct: ext = "ogg"
    elif "wav" in ct: ext = "wav"
    elif "mp4" in ct or "m4a" in ct: ext = "m4a"
    elif "mpeg" in ct or "mp3" in ct: ext = "mp3"

    tmp = tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False)
    try:
        tmp.write(data); tmp.close()
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        with open(tmp.name, "rb") as f:
            resp = await stt.transcribe(file=f, model="whisper-1",
                                        response_format="json", language="en")
        text = getattr(resp, "text", None) or ""
        return {"text": text.strip()}
    except Exception as e:
        logger.exception("Bridge transcribe failed")
        raise HTTPException(500, f"Voice transcription failed")
    finally:
        try: os.unlink(tmp.name)
        except Exception: pass


@api_router.get("/bridge/suggestions")
async def bridge_suggestions(user: dict = Depends(current_user)):
    """Return context-aware quick prompts based on real participant state."""
    s = await dashboard_summary(user)
    suggestions: list[str] = []
    if s["required"]["open"] > 0:
        suggestions.append("What required items should I focus on this week?")
    if s["requirements"]["owed"] > 0:
        suggestions.append(f"I still owe ${s['requirements']['owed']:.2f} in fees — help me plan payments.")
    if not s.get("housing"):
        suggestions.append("Help me organize my housing information.")
    if s["employment"]["open_applications"] == 0 and s["employment"]["active_jobs"] == 0:
        suggestions.append("Help me start a job search plan.")
    if s["benefits"]["active"] == 0:
        suggestions.append("What benefits should I be looking into?")
    if s["health"]["medications"] == 0:
        suggestions.append("Help me set up my medications in Health Hub.")
    fallbacks = [
        "What should I work on today?",
        "Show me what's coming up this week.",
        "Help me pick a course to complete next.",
        "Where can I get help with a resume?",
    ]
    for f in fallbacks:
        if len(suggestions) >= 4: break
        if f not in suggestions: suggestions.append(f)
    return suggestions[:6]


# ---------- Seed data ----------
async def seed_participant(user_id: str, minimal: bool, name: str):
    if await db.tasks.count_documents({"user_id": user_id}) > 0:
        return
    today = datetime.now(timezone.utc).date()
    def d(delta): return (today + timedelta(days=delta)).isoformat()

    # Tasks
    tasks = [
        # requirements
        ("requirements", "Weekly check-in with supervision officer", "Every Monday, phone or in-person", d(2), "high", True),
        ("requirements", "Attend Life Skills Workshop", "Tuesdays 6pm", d(6), "high", True),
        ("requirements", "Respond to drug testing call", "Random schedule — respond within 24 hrs", d(3), "high", True),
        ("requirements", "Court status review", "Bring updated docs", d(21), "high", True),
        ("requirements", "Log 4 community-service hours", "8/40 complete", d(7), "normal", True),
        ("requirements", "Restitution installment: $50", "Monthly", d(9), "normal", True),
        # documents
        ("documents", "Replace state ID", "Bring release papers + birth certificate", d(5), "high", True),
        ("documents", "Order replacement Social Security card", "Free via SSA", d(12), "normal", True),
        ("documents", "Request certified birth certificate", "Vital Records office", d(14), "normal", False),
        ("documents", "Set up secure mailing address", "PO Box or trusted address", d(4), "high", True),
        ("documents", "Open a bank account", "Second-chance banking options", d(10), "normal", False),
        # independent living
        ("independent-living", "Confirm housing for next 30 days", "", d(1), "high", True),
        ("independent-living", "Enroll in transit / bus pass program", "", d(7), "normal", False),
        ("independent-living", "Draft monthly budget", "", d(6), "normal", False),
        # wellness
        ("wellness", "Reflect on 3 triggers + coping plan", "Journal entry", d(1), "normal", False),
        ("wellness", "Complete lesson: Stress Awareness", "20 min", d(4), "normal", False),
        ("wellness", "Attend weekly recovery meeting", "In-person or virtual", d(3), "normal", False),
        # life skills
        ("life-skills", "Complete lesson: Decision-Making Framework", "", d(2), "normal", False),
        ("life-skills", "Role-play a difficult conversation", "", d(5), "low", False),
        # identity
        ("identity", "Write down 5 personal strengths", "", d(2), "low", False),
        ("identity", "Set one 30-day personal goal", "", d(1), "normal", False),
        # employment
        ("employment-readiness", "Draft resume — first pass", "", d(3), "high", False),
        ("employment-readiness", "Complete lesson: Interview basics", "", d(6), "normal", False),
        ("employment-readiness", "Apply to 3 fair-chance employers", "", d(8), "high", False),
        ("employment-record", "Log this week's hours & pay", "", d(5), "normal", False),
        # digital
        ("digital-readiness", "Set up a secure personal email", "", d(1), "high", True),
        ("digital-readiness", "Enable 2-factor on email", "", d(2), "high", True),
        # support
        ("support-circle", "Add 3 trusted people to Support Circle", "", d(1), "normal", False),
        # health / benefits / home
        ("health-hub", "Schedule primary-care intake visit", "", d(10), "normal", False),
        ("health-hub", "Refill prescription — pharmacy pickup", "", d(3), "high", False),
        ("benefits-hub", "Complete SNAP benefits application", "", d(7), "high", False),
        ("benefits-hub", "Check eligibility for workforce grants", "", d(10), "normal", False),
        ("home-hub", "Turn on utilities: electric + water", "", d(2), "high", True),
        ("home-hub", "Buy household essentials list", "", d(3), "normal", False),
    ]
    if minimal:
        cap = {}; light = []
        for t in tasks:
            cap[t[0]] = cap.get(t[0], 0) + 1
            if cap[t[0]] <= 2: light.append(t)
        tasks = light

    task_docs = []
    for section, title, desc, due, prio, required in tasks:
        task_docs.append({
            "id": new_id(), "user_id": user_id, "section": section, "title": title, "description": desc,
            "due_date": due, "priority": prio, "status": "open", "required": required, "tags": [],
            "created_at": now_iso(),
        })
    for i in [0, 6, 12]:
        if i < len(task_docs):
            task_docs[i]["status"] = "done"; task_docs[i]["completed_at"] = now_iso()
    if task_docs:
        await db.tasks.insert_many(task_docs)

    if minimal:
        return

    # Requirements (structured)
    reqs = [
        {"id": new_id(), "user_id": user_id, "type": "supervision_officer", "description": "PO Contact",
         "agency": "State Community Supervision", "person": "Officer T. Bell", "notes": "Reports every Monday",
         "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "check_in", "description": "Weekly PO check-in",
         "agency": "State Community Supervision", "recurrence": "weekly",
         "start_date": d(-14), "due_date": d(2), "status": "open", "reminder_days_before": 1, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "drug_test", "description": "Random drug testing (call-in)",
         "agency": "State Community Supervision", "recurrence": "random", "status": "open", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "class", "description": "Life Skills Workshop",
         "agency": "Community Center", "recurrence": "weekly", "start_date": d(-7), "due_date": d(6),
         "status": "open", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "community_service", "description": "40 hours community service",
         "agency": "Court", "amount_due": 40, "amount_paid": 8, "notes": "Hours-based", "status": "open", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "restitution", "description": "Restitution installment",
         "agency": "Court Clerk", "amount_due": 600, "amount_paid": 150, "recurrence": "monthly",
         "due_date": d(9), "status": "open", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "court_date", "description": "Court status review",
         "agency": "District Court, Rm 204", "appointment_at": d(21) + "T09:00:00",
         "status": "open", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "type": "fees", "description": "Supervision fees",
         "agency": "State Community Supervision", "amount_due": 90, "amount_paid": 30, "recurrence": "monthly",
         "status": "open", "created_at": now_iso()},
    ]
    await db.requirements.insert_many(reqs)

    # Goals
    goals = [
        {"id": new_id(), "user_id": user_id, "title": "30-Day Stability", "description": "Secure ID, housing, income & routines in 30 days.",
         "timeframe": "30", "category": "stability", "progress": 55, "target_date": d(30),
         "milestones": [{"label": "Replace ID", "done": False}, {"label": "Confirm housing", "done": True},
                        {"label": "First paycheck logged", "done": False}], "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "title": "90-Day Employment", "description": "Land steady employment aligned with strengths.",
         "timeframe": "90", "category": "employment", "progress": 25, "target_date": d(90),
         "milestones": [{"label": "Resume complete", "done": False}, {"label": "10 applications sent", "done": False}], "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "title": "6-Month Wellness", "description": "Consistent wellness routine + weekly meetings.",
         "timeframe": "180", "category": "wellness", "progress": 15, "target_date": d(180),
         "milestones": [{"label": "Weekly meetings", "done": False}], "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "title": "1-Year Independence", "description": "Housing, transportation, savings, stronger network.",
         "timeframe": "365", "category": "independence", "progress": 5, "target_date": d(365),
         "milestones": [{"label": "Emergency savings started", "done": False}], "created_at": now_iso()},
    ]
    await db.goals.insert_many(goals)

    # Support circle
    contacts = [
        {"id": new_id(), "user_id": user_id, "name": "Marcus Reed", "role": "Recovery Sponsor", "category": "recovery",
         "contact_method": "phone", "contact_value": "555-0142", "when_to_contact": "Triggers, cravings, tough days", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Aunt Denise", "role": "Family / rides", "category": "family",
         "contact_method": "phone", "contact_value": "555-0193", "when_to_contact": "Rides, family, encouragement", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Jamal Okafor", "role": "Case Navigator", "category": "professional",
         "contact_method": "email", "contact_value": "jamal@reentrypartners.org", "when_to_contact": "Program questions, resources", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Fair-Chance Career Center", "role": "Employment support", "category": "employment",
         "contact_method": "phone", "contact_value": "555-0177", "when_to_contact": "Resume, interview, jobs", "created_at": now_iso()},
    ]
    await db.support_contacts.insert_many(contacts)

    # Employment record
    job_id = new_id()
    await db.jobs.insert_many([{
        "id": job_id, "user_id": user_id, "employer": "Bluepath Logistics", "job_title": "Warehouse Associate",
        "supervisor": "Ryan Kessler", "employer_address": "800 Industrial Way",
        "start_date": d(-14), "status": "active", "hours_per_week": 32, "pay_rate": 18.50,
        "pay_frequency": "hourly", "salary_or_hourly": "hourly", "notes": "Fair-chance employer", "created_at": now_iso(),
    }])
    await db.income.insert_many([{
        "id": new_id(), "user_id": user_id, "job_id": job_id, "pay_date": d(-7),
        "gross_pay": 592.00, "taxes": 68.20, "deductions": 22.00, "net_pay": 501.80,
        "hours": 32, "notes": "First paycheck", "created_at": now_iso(),
    }])
    await db.job_applications.insert_many([
        {"id": new_id(), "user_id": user_id, "company": "Second Chance Manufacturing", "role": "Operator I",
         "applied_at": d(-3), "status": "applied", "source": "Fair-chance board", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "company": "Riverside Landscaping", "role": "Crew member",
         "applied_at": d(-5), "status": "interviewing", "source": "Referral", "created_at": now_iso()},
    ])
    await db.resumes.insert_many([{"id": new_id(), "user_id": user_id, "title": "Warehouse & Logistics — v1",
                                   "summary": "Reliable warehouse associate with strong safety record.", "created_at": now_iso()}])

    # Health
    await db.medications.insert_many([
        {"id": new_id(), "user_id": user_id, "name": "Lisinopril", "generic_name": "Lisinopril",
         "dose": "10 mg", "frequency": "1x daily", "times": ["08:00"], "provider": "Dr. Patel",
         "reason": "Blood pressure", "started_at": d(-60), "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "name": "Sertraline", "dose": "50 mg",
         "frequency": "1x daily", "times": ["21:00"], "provider": "Dr. Patel", "reason": "Anxiety",
         "started_at": d(-45), "created_at": now_iso()},
    ])
    await db.conditions.insert_many([
        {"id": new_id(), "user_id": user_id, "name": "Hypertension (managed)", "diagnosed_at": d(-90),
         "provider": "Dr. Patel", "plan": "Daily meds + reduce sodium", "created_at": now_iso()},
    ])
    await db.appointments.insert_many([
        {"id": new_id(), "user_id": user_id, "provider": "Community Clinic",
         "location": "1200 Main St", "scheduled_at": d(10) + "T10:30:00",
         "purpose": "Primary care intake", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "provider": "Dr. Patel",
         "location": "Community Clinic", "scheduled_at": d(24) + "T15:00:00",
         "purpose": "Medication follow-up", "created_at": now_iso()},
    ])
    await db.wellness_logs.insert_many([
        {"id": new_id(), "user_id": user_id, "kind": "sleep", "value": 6.5, "unit": "hours",
         "logged_at": d(-1) + "T07:00:00", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "kind": "mood", "value": 7, "unit": "1-10",
         "logged_at": d(-1) + "T20:00:00", "note": "Steady day", "created_at": now_iso()},
    ])
    await db.emergency_profile.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "enabled": False, "name": name, "blood_type": "O+",
                  "allergies": ["Penicillin"], "conditions_summary": "Hypertension",
                  "medications_summary": "Lisinopril 10mg daily", "emergency_contacts": [
                      {"name": "Aunt Denise", "phone": "555-0193", "relationship": "Aunt"}],
                  "updated_at": now_iso()}},
        upsert=True,
    )

    # Benefits
    await db.benefits.insert_many([
        {"id": new_id(), "user_id": user_id, "kind": "medicaid", "plan_name": "State Medicaid",
         "carrier": "State DHS", "member_id": "pending", "effective_date": d(-30),
         "notes": "Enrollment in progress", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "kind": "dental", "plan_name": "Basic Dental",
         "carrier": "Community Dental Coop", "monthly_premium": 15.00, "effective_date": d(-14), "created_at": now_iso()},
    ])

    # Housing
    await db.housing_records.insert_many([{
        "id": new_id(), "user_id": user_id, "status": "transitional", "type": "Apartment (unit 4)",
        "address": "1420 Elm Street, Unit 4", "move_in": d(-14), "rent": 425,
        "landlord_name": "Bridge Housing Nonprofit", "landlord_contact": "555-0155",
        "insurance": None, "notes": "6-month transitional lease", "created_at": now_iso(),
    }])
    await db.utilities.insert_many([
        {"id": new_id(), "user_id": user_id, "kind": "electricity", "provider": "PowerCo",
         "account_number": "PC-9284", "monthly_estimate": 55, "autopay": False, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "kind": "water", "provider": "City Water", "monthly_estimate": 25, "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "kind": "internet", "provider": "SpectrumNet", "monthly_estimate": 40, "created_at": now_iso()},
    ])

    # Personal profile
    await db.personal_profile.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id,
                  "strengths": ["Resilient", "Reliable", "Good listener", "Learns quickly"],
                  "values": ["Family", "Honesty", "Growth"],
                  "interests": ["Music", "Cooking", "Fitness"],
                  "skills": ["Warehouse operations", "Customer service", "Basic math"],
                  "work_preferences": "Steady day shift; team environment",
                  "career_interests": ["Logistics", "Skilled trades", "Fair-chance employers"],
                  "wins": [
                      {"label": "Signed transitional lease", "at": d(-14)},
                      {"label": "First paycheck", "at": d(-7)},
                  ], "updated_at": now_iso()}},
        upsert=True,
    )

    # Habits
    habit_id = new_id()
    await db.habits.insert_many([{
        "id": habit_id, "user_id": user_id, "habit_type": "alcohol", "readiness": "maintaining",
        "target": "abstinence", "triggers": ["old neighborhood", "arguments", "poor sleep"],
        "coping_strategies": ["Call sponsor", "10-min walk", "Breathing 4-7-8"],
        "started_at": d(-45), "created_at": now_iso(),
    }])
    await db.habit_logs.insert_many([
        {"id": new_id(), "user_id": user_id, "habit_id": habit_id, "kind": "urge", "intensity": 4,
         "note": "After long shift", "logged_at": d(-2) + "T22:00:00", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "habit_id": habit_id, "kind": "log", "intensity": 0,
         "note": "Attended meeting", "logged_at": d(-1) + "T19:30:00", "created_at": now_iso()},
    ])

    # Notes
    await db.notes.insert_many([
        {"id": new_id(), "user_id": user_id, "section": "identity", "subsection": "strengths",
         "content": "Resilient. Patient with kids. Reliable. Learn quickly.", "created_at": now_iso()},
        {"id": new_id(), "user_id": user_id, "section": "wellness", "subsection": "triggers",
         "content": "Old neighborhood, arguments, running low on sleep. Plan: call sponsor, walk 15 min, breathing.", "created_at": now_iso()},
    ])


async def seed_global_content():
    if await db.resources.count_documents({}) == 0:
        await db.resources.insert_many([
            {"id": new_id(), "category": "Housing", "name": "Transitional Housing Referral", "description": "Emergency & transitional housing referrals in your area.", "contact": "Call 211", "url": "https://211.org"},
            {"id": new_id(), "category": "Employment", "name": "Fair-Chance Employer Network", "description": "Employers actively hiring people with records."},
            {"id": new_id(), "category": "Food", "name": "SNAP Program", "description": "Nutrition assistance for eligible people.", "url": "https://www.fns.usda.gov/snap"},
            {"id": new_id(), "category": "Recovery", "name": "SAMHSA Helpline", "description": "24/7 free, confidential treatment referral & information.", "contact": "1-800-662-4357", "url": "https://www.samhsa.gov"},
            {"id": new_id(), "category": "Legal", "name": "Legal Aid Society", "description": "Free civil legal help (record sealing, family, housing)."},
            {"id": new_id(), "category": "Health", "name": "Community Health Center Finder", "description": "Low-cost primary care based on income.", "url": "https://findahealthcenter.hrsa.gov"},
            {"id": new_id(), "category": "Benefits", "name": "Benefits.gov", "description": "Find federal benefits you may qualify for.", "url": "https://www.benefits.gov"},
            {"id": new_id(), "category": "Transportation", "name": "Local Transit Assistance", "description": "Discounted bus passes and rideshare vouchers.", "contact": "Call 211"},
            {"id": new_id(), "category": "Crisis", "name": "988 Suicide & Crisis Lifeline", "description": "Free, confidential support 24/7. Call or text 988.", "contact": "988", "url": "https://988lifeline.org"},
        ])

    if await db.benefit_scenarios.count_documents({}) == 0:
        scenarios = [
            {"id": "hospitalized", "label": "I was hospitalized",
             "guidance": "If you have health coverage, contact your carrier to notify them of the hospitalization and confirm in-network status. Ask about copays, coinsurance and any deductible. If you have a hospital indemnity or accident policy, initiate a claim.",
             "relevant_kinds": ["health", "medicaid", "medicare", "accident", "critical", "disability"]},
            {"id": "accident", "label": "I had an accident",
             "guidance": "Get needed medical care first. Then document the incident (photos, notes, witnesses). If you have auto, health, or accident insurance, report it to each carrier. If work-related, ask about workers' compensation.",
             "relevant_kinds": ["health", "accident", "auto", "disability"]},
            {"id": "diagnosis", "label": "I received a diagnosis",
             "guidance": "Ask your provider for a written care plan. Confirm which medications and follow-up visits are covered. If you have critical illness coverage, review whether the diagnosis is a qualifying event.",
             "relevant_kinds": ["health", "critical", "disability"]},
            {"id": "out_of_work", "label": "I'll be out of work",
             "guidance": "Ask HR (if applicable) about short-term disability, FMLA, or leave options. Check disability coverage. Update your budget for reduced income. Explore unemployment or state assistance eligibility.",
             "relevant_kinds": ["disability", "health", "employer"]},
            {"id": "baby", "label": "I had a baby",
             "guidance": "Add the baby to health coverage within the enrollment window (usually 30 days). Update life insurance beneficiaries. Review parental leave and pay options.",
             "relevant_kinds": ["health", "life", "employer"]},
            {"id": "family_death", "label": "A family member died",
             "guidance": "Obtain certified death certificates. Contact life insurance carriers if you're a beneficiary. Update your own beneficiaries and account contacts. Reach out to your Support Circle for help with the practical steps.",
             "relevant_kinds": ["life"]},
            {"id": "leaving_employer", "label": "I'm leaving my employer",
             "guidance": "Ask HR about your last day of coverage and continuation options (COBRA or state equivalent). Roll over any retirement account. Save your final pay stub and W-2.",
             "relevant_kinds": ["health", "dental", "vision", "life", "employer"]},
        ]
        await db.benefit_scenarios.insert_many(scenarios)

    if await db.education_categories.count_documents({}) == 0:
        cats = [
            {"id": "life-skills", "name": "Decisions & Life Skills"},
            {"id": "wellness", "name": "Wellness & Habits"},
            {"id": "employment", "name": "Employment"},
            {"id": "digital", "name": "Digital Life"},
            {"id": "money", "name": "Money & Independent Living"},
            {"id": "identity", "name": "Identity & Confidence"},
        ]
        await db.education_categories.insert_many(cats)

    if await db.courses.count_documents({}) == 0:
        courses_data = [
            ("Decision-Making Framework", "life-skills", 15, "Pause-think-choose for the hardest calls.",
             [("The 4-step framework", "text", "Slow down. Name the choice. List consequences. Choose the next right thing."),
              ("Practice: replay a hard call", "activity", "Write about a hard decision. What went well? What would you do differently?"),
              ("Check-in", "quiz", "Which is NOT part of the framework?")]),
            ("Recognizing Scams & Manipulation", "life-skills", 12, "Common red flags in messages, jobs, and quick-money offers.",
             [("Red flags", "text", "Urgency, secrecy, upfront fees, too-good-to-be-true offers."),
              ("Quiz: is this a scam?", "quiz", "You get a text with a check attached. What do you do?")]),
            ("Stress & Emotional Awareness", "wellness", 20, "Notice stress early. Use grounding, breathing, reset routines.",
             [("Naming what you feel", "text", "Emotions come in waves. Name it to tame it."),
              ("4-7-8 Breathing", "audio", "Try three cycles of 4-7-8 breathing."),
              ("Journal: your stress signals", "activity", "List 5 body/mind cues that mean you're getting overwhelmed.")]),
            ("Resume for Fair-Chance Employers", "employment", 25, "Write a strong resume even with employment gaps.",
             [("Format basics", "text", "Contact, headline, skills, experience, education. Keep to one page."),
              ("Language that works", "text", "Use verbs like operated, coordinated, resolved, trained."),
              ("Draft yours", "activity", "Copy the template. Fill in each section.")]),
            ("Interview Basics", "employment", 20, "What to expect, how to answer the tough questions.",
             [("Common questions", "text", "Tell me about yourself. Why here? Tell me about a challenge."),
              ("Answering about your record", "text", "Own it briefly. Focus on what you learned and what you do now."),
              ("Practice out loud", "activity", "Record a 60-second answer to 'Tell me about yourself.'")]),
            ("Personal Budgeting 101", "money", 20, "Track income, essentials, and one small savings goal.",
             [("Fixed vs. variable expenses", "text", "Rent is fixed. Groceries and gas vary."),
              ("50 / 30 / 20 starter", "text", "50% needs, 30% wants, 20% savings — adjust to reality."),
              ("Set one savings goal", "activity", "Pick a number. Automate a small transfer.")]),
            ("Digital Basics", "digital", 15, "Email, passwords, applications, and scam awareness.",
             [("Email that looks professional", "text", "First.Last@email — avoid nicknames on job apps."),
              ("Strong passwords", "text", "12+ characters. Different for each account. Use a manager."),
              ("Turn on 2-factor", "activity", "Enable 2FA on your primary email today.")]),
            ("Handling Rejection & Setbacks", "identity", 18, "Bounce back with a growth mindset and support.",
             [("Rejection isn't identity", "text", "One no doesn't define you. It moves you closer to the yes."),
              ("Reset routine", "text", "Sleep, movement, call your sponsor/support, back to the list.")]),
        ]
        for title, cat, mins, summary, lessons in courses_data:
            course_id = new_id("c_")
            await db.courses.insert_one({
                "id": course_id, "title": title, "category": cat, "duration_min": mins, "summary": summary,
                "created_at": now_iso(),
            })
            # One module per course by default
            module_id = new_id("m_")
            await db.modules.insert_one({"id": module_id, "course_id": course_id, "title": "Module 1", "order": 1})
            for i, (ltitle, ltype, body) in enumerate(lessons):
                await db.lessons.insert_one({
                    "id": new_id("l_"), "module_id": module_id, "course_id": course_id,
                    "title": ltitle, "kind": ltype, "body": body, "order": i + 1,
                })


async def ensure_owner():
    email = OWNER_EMAIL
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        uid = new_id("user_")
        await db.users.insert_one({
            "user_id": uid, "email": email, "name": "Heather (Demo Participant)",
            "password_hash": hash_password(OWNER_PASSWORD), "auth_type": "password",
            "picture": None, "is_owner": True, "created_at": now_iso(),
        })
        await seed_participant(uid, minimal=False, name="Heather")
    else:
        if await db.tasks.count_documents({"user_id": user["user_id"]}) == 0:
            await seed_participant(user["user_id"], minimal=False, name=user.get("name", "Heather"))
        await db.users.update_one({"user_id": user["user_id"]},
                                  {"$set": {"password_hash": hash_password(OWNER_PASSWORD), "is_owner": True}})


# ============================================================
# ============  PHASE 1: MULTI-TENANT + RBAC + AUDIT  =========
# ============================================================
# Collections introduced: organizations, programs, enrollments, pathway_ids,
# role_bindings, invitations, audit_events. Existing collections are backfilled
# with organization_id / program_id / enrollment_id where applicable.

ROLES = {"super_admin", "program_admin", "program_staff", "participant"}
BBC_ORG_SLUG = "beautifully-brokered-365"
APF_PROGRAM_SLUG = "a-path-forward"


def _pathway_checksum(base: str) -> str:
    total = sum(ord(c) for c in base if c.isalnum())
    return "ABCDEFGHJKLMNPRTVWXY"[total % 20]


async def _next_pathway_id(org: dict, program: dict) -> str:
    prefix = program.get("code") or "APF"
    year = datetime.now(timezone.utc).year
    count = await db.pathway_ids.count_documents({"program_id": program["id"]}) + 1
    base = f"{prefix}-{year}-{count:06d}"
    return f"{base}-{_pathway_checksum(base)}"


async def _audit(actor_user_id: Optional[str], actor_role: Optional[str], org_id: Optional[str],
                 action: str, target_type: str, target_id: Optional[str] = None,
                 before: Optional[dict] = None, after: Optional[dict] = None):
    await db.audit_events.insert_one({
        "id": new_id("aud_"), "actor_user_id": actor_user_id, "actor_role": actor_role,
        "org_id": org_id, "action": action, "target_type": target_type, "target_id": target_id,
        "before": before, "after": after, "created_at": now_iso(),
    })


async def ensure_platform_tenants():
    """Seed BBC org + A Path Forward program, bind owner as super_admin + participant,
    generate PathwayID, and backfill existing participant records with org/program/enrollment.
    Idempotent — safe to run on every boot.
    """
    org = await db.organizations.find_one({"slug": BBC_ORG_SLUG}, {"_id": 0})
    if not org:
        org = {
            "id": new_id("org_"), "slug": BBC_ORG_SLUG, "name": "Beautifully Brokered 365",
            "brand": {"primary_color": "#1B1033", "logo_url": None, "participant_alias": None},
            "config": {}, "status": "active", "created_at": now_iso(),
        }
        await db.organizations.insert_one(org)
    program = await db.programs.find_one({"org_id": org["id"], "slug": APF_PROGRAM_SLUG}, {"_id": 0})
    if not program:
        program = {
            "id": new_id("prg_"), "org_id": org["id"], "slug": APF_PROGRAM_SLUG,
            "name": "A Path Forward — 10:33 Re-entry Pathway", "code": "APF",
            "participant_alias": "A Path Forward",
            "config": {"verification_required_types": ["release_document", "court_document",
                                                        "supervision_document", "requirement_document"]},
            "status": "active", "created_at": now_iso(),
        }
        await db.programs.insert_one(program)

    owner = await db.users.find_one({"email": OWNER_EMAIL}, {"_id": 0})
    if not owner:
        return
    uid = owner["user_id"]

    # Owner is a super_admin at BBC scope
    if not await db.role_bindings.find_one({"user_id": uid, "role": "super_admin"}):
        await db.role_bindings.insert_one({
            "id": new_id("rb_"), "user_id": uid, "role": "super_admin",
            "org_id": org["id"], "program_id": None, "scope": "platform",
            "created_at": now_iso(), "created_by": "system",
        })

    # Owner is ALSO a participant of the demo program
    enrollment = await db.enrollments.find_one({"program_id": program["id"], "participant_user_id": uid}, {"_id": 0})
    if not enrollment:
        enrollment = {
            "id": new_id("en_"), "org_id": org["id"], "program_id": program["id"],
            "participant_user_id": uid, "status": "active",
            "started_at": now_iso(), "ended_at": None, "assigned_staff_ids": [],
        }
        await db.enrollments.insert_one(enrollment)
    # PathwayID
    if not await db.pathway_ids.find_one({"enrollment_id": enrollment["id"]}):
        pid = await _next_pathway_id(org, program)
        await db.pathway_ids.insert_one({
            "id": new_id("pw_"), "pathway_id": pid, "org_id": org["id"],
            "program_id": program["id"], "enrollment_id": enrollment["id"],
            "participant_user_id": uid, "created_at": now_iso(),
        })
    if not await db.role_bindings.find_one({"user_id": uid, "role": "participant", "program_id": program["id"]}):
        await db.role_bindings.insert_one({
            "id": new_id("rb_"), "user_id": uid, "role": "participant",
            "org_id": org["id"], "program_id": program["id"], "scope": "self",
            "enrollment_id": enrollment["id"], "created_at": now_iso(), "created_by": "system",
        })

    # Backfill: stamp existing participant records with org/program/enrollment.
    scoping = {"organization_id": org["id"], "program_id": program["id"], "enrollment_id": enrollment["id"]}
    for coll in ("tasks", "notes", "goals", "documents", "requirements", "medications",
                 "conditions", "appointments", "wellness_logs", "benefits", "housing_records",
                 "utilities", "jobs", "income", "job_applications", "resumes",
                 "lesson_progress", "habits", "habit_logs", "bridge_messages",
                 "document_analyses", "document_events"):
        await db[coll].update_many(
            {"user_id": uid, "organization_id": {"$exists": False}},
            {"$set": scoping},
        )
    await db.emergency_profile.update_many({"user_id": uid, "organization_id": {"$exists": False}}, {"$set": scoping})
    await db.personal_profile.update_many({"user_id": uid, "organization_id": {"$exists": False}}, {"$set": scoping})

    # Extend existing requirements with verification defaults if missing.
    prog_types = set((program.get("config") or {}).get("verification_required_types") or [])
    reqs = db.requirements.find({"user_id": uid, "verification": {"$exists": False}})
    async for r in reqs:
        req_required = (r.get("type") in {"court_date", "restitution", "fees", "class",
                                          "community_service", "drug_test", "check_in"})
        # Map current status → new state.
        cur = r.get("status") or "open"
        mapped = {
            "open": "not_started", "in_progress": "in_progress",
            "done": "verified" if req_required else "in_progress",
            "waived": "not_applicable",
        }.get(cur, "not_started")
        # If evidence already attached, promote to evidence_submitted.
        if r.get("document_ids") and mapped in ("not_started", "in_progress"):
            mapped = "evidence_submitted"
        await db.requirements.update_one({"id": r["id"]}, {"$set": {
            "verification": {"required": req_required, "status": mapped,
                             "submitted_at": None, "verified_at": None,
                             "verified_by": None, "verifier_role": None, "return_reason": None},
        }})


# ---------- Auth / RBAC helpers ----------
async def _get_bindings(user_id: str) -> list[dict]:
    return await db.role_bindings.find({"user_id": user_id}, {"_id": 0}).to_list(100)


def _has_role(bindings: list[dict], roles: set[str]) -> bool:
    return any(b["role"] in roles for b in bindings)


def _org_program_scope(bindings: list[dict], roles: set[str]) -> tuple[set[str], set[str]]:
    """Return (org_ids, program_ids) accessible for the requested roles."""
    orgs, progs = set(), set()
    for b in bindings:
        if b["role"] in roles:
            if b.get("org_id"): orgs.add(b["org_id"])
            if b.get("program_id"): progs.add(b["program_id"])
    return orgs, progs


def require_role(*roles: str):
    async def _dep(user: dict = Depends(current_user)) -> dict:
        bindings = await _get_bindings(user["user_id"])
        rset = set(roles)
        # super_admin implicitly satisfies any staff-level role check
        if any(b["role"] == "super_admin" for b in bindings):
            user["_bindings"] = bindings
            user["_effective_role"] = "super_admin"
            return user
        if not _has_role(bindings, rset):
            raise HTTPException(403, f"Requires role: {' or '.join(roles)}")
        # Pick the strongest role from the match
        priority = ["super_admin", "program_admin", "program_staff", "participant"]
        eff = next((r for r in priority if any(b["role"] == r for b in bindings)), None)
        user["_bindings"] = bindings
        user["_effective_role"] = eff
        return user
    return _dep


async def _staff_can_access_participant(user: dict, participant_user_id: str) -> bool:
    """True if the caller is a super_admin, or program_admin/staff in the same program as an enrollment."""
    bindings = user.get("_bindings") or await _get_bindings(user["user_id"])
    if any(b["role"] == "super_admin" for b in bindings):
        return True
    staff_programs = {b["program_id"] for b in bindings
                       if b["role"] in ("program_admin", "program_staff") and b.get("program_id")}
    if not staff_programs:
        return False
    en = await db.enrollments.find_one({"participant_user_id": participant_user_id,
                                        "program_id": {"$in": list(staff_programs)}}, {"_id": 0})
    return en is not None


# ---------- Organizations / Programs (read-scoped) ----------
@api_router.get("/organizations")
async def list_organizations(user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    if user.get("_effective_role") == "super_admin":
        return await db.organizations.find({}, {"_id": 0}).to_list(100)
    org_ids, _ = _org_program_scope(user["_bindings"], {"program_admin", "program_staff"})
    return await db.organizations.find({"id": {"$in": list(org_ids)}}, {"_id": 0}).to_list(100)


@api_router.get("/programs")
async def list_programs(user: dict = Depends(require_role("super_admin", "program_admin", "program_staff", "participant"))):
    bindings = user["_bindings"]
    if any(b["role"] == "super_admin" for b in bindings):
        return await db.programs.find({}, {"_id": 0}).to_list(200)
    prog_ids = {b["program_id"] for b in bindings if b.get("program_id")}
    # also include programs the user is enrolled in
    en = await db.enrollments.find({"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    for e in en:
        prog_ids.add(e["program_id"])
    return await db.programs.find({"id": {"$in": list(prog_ids)}}, {"_id": 0}).to_list(200)


# ---------- Invitations ----------
class InvitationIn(BaseModel):
    email: EmailStr
    role: str                     # program_admin | program_staff | participant
    program_id: str
    name: Optional[str] = None


@api_router.post("/invitations")
async def create_invitation(body: InvitationIn, user: dict = Depends(require_role("super_admin", "program_admin"))):
    if body.role not in {"program_admin", "program_staff", "participant"}:
        raise HTTPException(400, "Invalid role")
    program = await db.programs.find_one({"id": body.program_id}, {"_id": 0})
    if not program:
        raise HTTPException(404, "Program not found")
    # Non-super_admin must be admin of THAT program.
    if user["_effective_role"] != "super_admin":
        allowed = any(b.get("program_id") == body.program_id and b["role"] == "program_admin" for b in user["_bindings"])
        if not allowed:
            raise HTTPException(403, "Not an admin of that program")
    code = f"{program.get('code','APF')}-{uuid.uuid4().hex[:8].upper()}"
    doc = {
        "id": new_id("inv_"), "org_id": program["org_id"], "program_id": body.program_id,
        "invited_email": body.email.lower(), "invited_name": body.name,
        "invited_role": body.role, "pathway_code": code,
        "created_by": user["user_id"], "created_at": now_iso(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "status": "pending", "accepted_user_id": None,
    }
    await db.invitations.insert_one(doc)
    await _audit(user["user_id"], user["_effective_role"], program["org_id"],
                 "invitation.create", "invitation", doc["id"], None, {"email": body.email, "role": body.role})
    return {"invitation": {k: v for k, v in doc.items() if k != "_id"},
            "share_url": f"/onboarding/{code}"}


@api_router.get("/invitations")
async def list_invitations(program_id: Optional[str] = None,
                            user: dict = Depends(require_role("super_admin", "program_admin"))):
    q = {}
    if program_id: q["program_id"] = program_id
    else:
        _, prog_ids = _org_program_scope(user["_bindings"], {"program_admin"})
        if user["_effective_role"] != "super_admin":
            q["program_id"] = {"$in": list(prog_ids)}
    return await db.invitations.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.get("/invitations/verify/{code}")
async def verify_invitation(code: str):
    """Public: check code and return non-sensitive display info for the onboarding screen."""
    inv = await db.invitations.find_one({"pathway_code": code, "status": "pending"}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invitation not found or already used")
    if inv["expires_at"] < now_iso():
        raise HTTPException(410, "Invitation expired")
    program = await db.programs.find_one({"id": inv["program_id"]}, {"_id": 0}) or {}
    org = await db.organizations.find_one({"id": inv["org_id"]}, {"_id": 0}) or {}
    return {"code": code, "invited_email": inv["invited_email"], "invited_role": inv["invited_role"],
            "program_name": program.get("name"), "org_name": org.get("name")}


class AcceptInvitationIn(BaseModel):
    code: str
    password: Optional[str] = None
    name: Optional[str] = None


@api_router.post("/invitations/accept")
async def accept_invitation(body: AcceptInvitationIn, response: Response):
    """One-shot invitation redemption. Creates or attaches a user + role binding + (if participant) enrollment + PathwayID."""
    inv = await db.invitations.find_one({"pathway_code": body.code, "status": "pending"}, {"_id": 0})
    if not inv: raise HTTPException(404, "Invalid or already-used invitation")
    if inv["expires_at"] < now_iso(): raise HTTPException(410, "Invitation expired")
    email = inv["invited_email"]
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        if not body.password:
            raise HTTPException(400, "Password required for new account")
        uid = new_id("user_")
        await db.users.insert_one({
            "user_id": uid, "email": email, "name": body.name or email.split("@")[0],
            "password_hash": hash_password(body.password), "auth_type": "password",
            "picture": None, "created_at": now_iso(),
        })
    else:
        uid = user["user_id"]
    program = await db.programs.find_one({"id": inv["program_id"]}, {"_id": 0})
    if not program: raise HTTPException(404, "Program missing")

    # Role binding (idempotent)
    binding = await db.role_bindings.find_one(
        {"user_id": uid, "role": inv["invited_role"], "program_id": inv["program_id"]})
    if not binding:
        await db.role_bindings.insert_one({
            "id": new_id("rb_"), "user_id": uid, "role": inv["invited_role"],
            "org_id": inv["org_id"], "program_id": inv["program_id"],
            "scope": "self" if inv["invited_role"] == "participant" else "program",
            "created_at": now_iso(), "created_by": inv["created_by"],
        })

    # For participants, create enrollment + PathwayID (idempotent)
    if inv["invited_role"] == "participant":
        en = await db.enrollments.find_one({"program_id": inv["program_id"], "participant_user_id": uid}, {"_id": 0})
        if not en:
            en = {"id": new_id("en_"), "org_id": inv["org_id"], "program_id": inv["program_id"],
                  "participant_user_id": uid, "status": "active",
                  "started_at": now_iso(), "assigned_staff_ids": []}
            await db.enrollments.insert_one(en)
        if not await db.pathway_ids.find_one({"enrollment_id": en["id"]}):
            pid = await _next_pathway_id({"id": inv["org_id"]}, program)
            await db.pathway_ids.insert_one({
                "id": new_id("pw_"), "pathway_id": pid, "org_id": inv["org_id"],
                "program_id": inv["program_id"], "enrollment_id": en["id"],
                "participant_user_id": uid, "created_at": now_iso(),
            })
        if await db.tasks.count_documents({"user_id": uid}) == 0:
            await seed_participant(uid, minimal=True, name=body.name or "Participant")
        # Backfill new participant docs with scoping
        scoping = {"organization_id": inv["org_id"], "program_id": inv["program_id"], "enrollment_id": en["id"]}
        for coll in ("tasks", "notes", "goals", "documents", "requirements"):
            await db[coll].update_many({"user_id": uid, "organization_id": {"$exists": False}}, {"$set": scoping})

    await db.invitations.update_one({"id": inv["id"]},
                                    {"$set": {"status": "accepted", "accepted_user_id": uid,
                                              "accepted_at": now_iso()}})
    await _audit(uid, inv["invited_role"], inv["org_id"], "invitation.accept", "invitation", inv["id"])

    token = await _create_session(uid)
    _set_cookie(response, token)
    return {"session_token": token, "user_id": uid, "role": inv["invited_role"], "program_id": inv["program_id"]}


# ---------- Staff caseload + participant detail ----------
@api_router.get("/staff/caseload")
async def staff_caseload(user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    if user["_effective_role"] == "super_admin":
        enrollments = await db.enrollments.find({}, {"_id": 0}).to_list(1000)
    else:
        prog_ids = {b["program_id"] for b in user["_bindings"]
                    if b["role"] in ("program_admin", "program_staff") and b.get("program_id")}
        enrollments = await db.enrollments.find({"program_id": {"$in": list(prog_ids)}}, {"_id": 0}).to_list(1000)
    # attach participant name + pathway_id + basic counters
    out = []
    for en in enrollments:
        u = await db.users.find_one({"user_id": en["participant_user_id"]},
                                    {"_id": 0, "name": 1, "email": 1, "picture": 1}) or {}
        pw = await db.pathway_ids.find_one({"enrollment_id": en["id"]}, {"_id": 0, "pathway_id": 1}) or {}
        needs_review = await db.requirements.count_documents(
            {"user_id": en["participant_user_id"], "verification.status": {"$in": ["evidence_submitted", "needs_review"]}}
        )
        total_reqs = await db.requirements.count_documents({"user_id": en["participant_user_id"]})
        out.append({
            "enrollment": en, "participant": u,
            "pathway_id": pw.get("pathway_id"),
            "needs_review": needs_review, "requirements_total": total_reqs,
        })
    return out


@api_router.get("/staff/participants/{enrollment_id}")
async def staff_participant_detail(enrollment_id: str,
                                    user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    en = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
    if not en: raise HTTPException(404, "Enrollment not found")
    if not await _staff_can_access_participant(user, en["participant_user_id"]):
        raise HTTPException(403, "Out of scope")
    pid = en["participant_user_id"]
    u = await db.users.find_one({"user_id": pid}, {"_id": 0, "password_hash": 0}) or {}
    pw = await db.pathway_ids.find_one({"enrollment_id": enrollment_id}, {"_id": 0}) or {}
    reqs = await db.requirements.find({"user_id": pid}, {"_id": 0}).sort("due_date", 1).to_list(500)
    # NOTE: journal, health, and support-circle are participant-private; staff does NOT get them here.
    return {"enrollment": en, "participant": u, "pathway": pw, "requirements": reqs}


@api_router.post("/staff/documents/{doc_id}/signed-url")
async def mint_staff_signed_url(doc_id: str, request: Request,
                                 user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    """Staff-only: mint a 15-minute signed URL for a participant's evidence document,
    but ONLY if the participant is in the caller's caseload. Enforces cross-participant isolation.
    """
    doc = await db.documents.find_one({"id": doc_id, "is_deleted": False}, {"_id": 0})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(404, "Not found")
    if not await _staff_can_access_participant(user, doc["user_id"]):
        raise HTTPException(403, "Out of scope")
    base = os.environ.get("PUBLIC_APP_URL") or str(request.base_url).rstrip("/")
    signed = _mint_signed_url(doc_id, user["user_id"], "staff", base)
    await _audit(user["user_id"], user.get("_effective_role"), doc.get("organization_id"),
                 "document.staff_view_url", "document", doc_id, None,
                 {"expires_at": signed["expires_at"]})
    return signed


@api_router.get("/staff/requirements/{req_id}/evidence")
async def staff_requirement_evidence(req_id: str,
                                      user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    req = await db.requirements.find_one({"id": req_id}, {"_id": 0})
    if not req: raise HTTPException(404, "Not found")
    if not await _staff_can_access_participant(user, req["user_id"]):
        raise HTTPException(403, "Out of scope")
    doc_ids = req.get("document_ids") or []
    # Return metadata only. Sensitive extracted values are NEVER included.
    docs = await db.documents.find(
        {"user_id": req["user_id"], "is_deleted": False, "id": {"$in": doc_ids}},
        {"_id": 0, "content_hash": 0, "storage_path": 0},
    ).to_list(200)
    return {"requirement": req, "documents": docs}


class VerifyIn(BaseModel):
    decision: str            # verified | returned | needs_review | not_applicable
    reason: Optional[str] = None


@api_router.post("/staff/requirements/{req_id}/verify")
async def staff_verify_requirement(req_id: str, body: VerifyIn,
                                    user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
    if body.decision not in {"verified", "returned", "needs_review", "not_applicable"}:
        raise HTTPException(400, "Invalid decision")
    req = await db.requirements.find_one({"id": req_id}, {"_id": 0})
    if not req: raise HTTPException(404, "Not found")
    if not await _staff_can_access_participant(user, req["user_id"]):
        raise HTTPException(403, "Out of scope")
    before = req.get("verification") or {}
    ver = {**before, "status": body.decision, "verified_by": user["user_id"],
           "verifier_role": user["_effective_role"], "verified_at": now_iso(),
           "return_reason": body.reason if body.decision == "returned" else before.get("return_reason")}
    upd = {"verification": ver}
    if body.decision == "verified":
        upd["status"] = "done"
    elif body.decision == "returned":
        upd["status"] = "in_progress"
    elif body.decision == "not_applicable":
        upd["status"] = "waived"
    await db.requirements.update_one({"id": req_id}, {"$set": upd})
    await _audit(user["user_id"], user["_effective_role"], req.get("organization_id"),
                 f"requirement.{body.decision}", "requirement", req_id, before, ver)
    return await db.requirements.find_one({"id": req_id}, {"_id": 0})


# ---------- Participant self actions on requirements ----------
@api_router.post("/requirements/{req_id}/submit")
async def submit_requirement(req_id: str, user: dict = Depends(current_user)):
    req = await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})
    if not req: raise HTTPException(404, "Not found")
    if not (req.get("document_ids") or []):
        raise HTTPException(400, "Attach evidence first")
    before = req.get("verification") or {}
    ver = {**before, "status": "evidence_submitted", "submitted_at": now_iso()}
    await db.requirements.update_one({"id": req_id, "user_id": user["user_id"]},
                                     {"$set": {"verification": ver, "status": "in_progress"}})
    await _audit(user["user_id"], "participant", req.get("organization_id"),
                 "requirement.submit", "requirement", req_id, before, ver)
    return await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})


# ---------- Audit ----------
@api_router.get("/audit/events")
async def list_audit(user: dict = Depends(require_role("super_admin", "program_admin"))):
    q: dict = {}
    if user["_effective_role"] != "super_admin":
        org_ids, _ = _org_program_scope(user["_bindings"], {"program_admin"})
        q["org_id"] = {"$in": list(org_ids)}
    return await db.audit_events.find(q, {"_id": 0}).sort("created_at", -1).limit(500).to_list(500)


# ---------- Hook: auto-transition requirement on evidence attach ----------
# Overrides the earlier link_requirement to also move state to evidence_submitted.
_original_link = link_requirement  # noqa: F821  (defined earlier)


@api_router.post("/requirements/{req_id}/mark-in-progress")
async def mark_in_progress(req_id: str, user: dict = Depends(current_user)):
    """Participant self-marks in_progress (only allowed when verification is not required OR state permits)."""
    req = await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})
    if not req: raise HTTPException(404, "Not found")
    ver = req.get("verification") or {}
    if ver.get("required") and ver.get("status") in {"verified"}:
        raise HTTPException(400, "Requirement already verified")
    await db.requirements.update_one({"id": req_id, "user_id": user["user_id"]},
                                     {"$set": {"status": "in_progress",
                                               "verification": {**ver, "status": "in_progress"}}})
    return await db.requirements.find_one({"id": req_id, "user_id": user["user_id"]}, {"_id": 0})


# ============  END PHASE 1 + 2 ADDITIONS  ============



@app.on_event("startup")
async def startup():
    try: init_storage()
    except Exception as e: logger.warning(f"Storage init failed: {e}")
    await seed_global_content()
    await ensure_owner()
    await ensure_platform_tenants()   # Phase 1: BBC org + A Path Forward program + backfill
    logger.info("Startup complete")


@api_router.get("/health")
async def health():
    return {"status": "ok", "app": "a-path-forward"}


# ============= PHASE 3 wiring =============
import phase3 as _phase3  # noqa: E402
_phase3.register(
    db, api_router, current_user, require_role,
    now_iso, new_id, _audit,
    os.environ.get("PUBLIC_APP_URL") or "",
)

# Public (unauthenticated) emergency endpoint — must NOT sit under api_router because
# some scanners will hit it directly. It's mounted on the app with the /api prefix
# so it still routes through the ingress.
public_router = APIRouter(prefix="/api")


@public_router.get("/e/{slug}")
async def public_emergency(slug: str, request: Request):
    rec = await db.emergency_profile_public.find_one({"public_slug": slug}, {"_id": 0})
    if not rec:
        raise HTTPException(404, "Not found")
    if not rec.get("enabled") or rec.get("revoked_at"):
        raise HTTPException(410, "Emergency access is disabled")
    ep = await db.emergency_profile.find_one({"user_id": rec["participant_user_id"]}, {"_id": 0}) or {}
    allowed = set(rec.get("allowed_fields") or [])
    # Return ONLY authorized fields. Never SSN, DL#, etc.
    projection = {}
    for f in ("name", "dob", "blood_type", "allergies", "conditions_summary",
              "medications_summary", "healthcare_proxy", "communication_needs",
              "advance_directive", "emergency_contacts", "organ_donor", "dnr"):
        if f in allowed and ep.get(f) not in (None, "", []):
            projection[f] = ep.get(f)
    # Log scan (participant sees this as "someone scanned your emergency card")
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")[:200]
    await db.audit_events.insert_one({
        "id": new_id("aud_"), "actor_user_id": None, "actor_role": "public",
        "org_id": None, "action": "emergency.public_view",
        "target_type": "emergency_public", "target_id": rec["participant_user_id"],
        "before": None, "after": {"ip": ip, "ua": ua},
        "created_at": now_iso(),
    })
    await db.emergency_profile_public.update_one(
        {"public_slug": slug}, {"$inc": {"scan_count": 1}, "$set": {"last_scan_at": now_iso()}}
    )
    return {"profile": projection, "generated_at": now_iso()}


app.include_router(public_router)
# ============= END PHASE 3 wiring =============


# ============= BATCH A wiring — Full Blueprint · Assessments · EReadiness · Affirmations · Hub Visits =============
import blueprint_v2 as _bpv2  # noqa: E402
_bpv2.register(
    db, api_router, current_user, require_role,
    now_iso, new_id, _audit, _staff_can_access_participant,
)


# ============= LEARNING ENGINE — server-scored quizzes, video-watch %, private journal =============
import learning as _learning  # noqa: E402
_learning.register(db, api_router, current_user, now_iso, new_id, _audit)


# ============= RESOURCE REGISTRY (Batch A — Universal Resource System) =============
import resources_v2 as _resources_v2  # noqa: E402
_resources_v2.register(
    db, api_router, current_user, require_role,
    now_iso, new_id, _audit,
)


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
