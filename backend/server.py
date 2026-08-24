"""Build My Blueprint — A Path Forward re-entry platform backend.

Participant-owned life-readiness system. Not a task manager.
- Email/password (JWT session tokens) + Emergent Google Auth
- Emergent object storage for private documents
- Bridge AI (GPT-5.6 Terra) with participant context & navigation grounding
"""
from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

import bcrypt
import requests
from dotenv import load_dotenv
from fastapi import (
    APIRouter, Cookie, Depends, FastAPI, File, Header, HTTPException,
    Query, Response, UploadFile,
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
    return user


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
     "amount_due", "amount_paid", "appointment_at", "notes", "reminder_days_before"], sort_field="due_date", sort_dir=1)


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
    content, ctype = get_object(doc["storage_path"])
    return Response(content=content, media_type=doc.get("content_type") or ctype)


@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(current_user)):
    await db.documents.update_one({"id": doc_id, "user_id": user["user_id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


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
        m["lessons"] = lessons
    course["modules"] = modules
    return course

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
@api_router.get("/resources")
async def list_resources(category: Optional[str] = None):
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
    lines.append("\nNAVIGATION MAP (use these exact routes when suggesting actions):")
    for label, route in BRIDGE_NAV:
        lines.append(f" - {label}: {route}")
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
    return {
        "models": CHATGPT_MODELS,
        "default": DEFAULT_BRIDGE_MODEL,
        "current": user.get("bridge_model") or DEFAULT_BRIDGE_MODEL,
    }


class BridgeModelIn(BaseModel):
    model: str

@api_router.put("/bridge/model")
async def set_bridge_model(body: BridgeModelIn, user: dict = Depends(current_user)):
    if body.model not in ALLOWED_MODEL_IDS:
        raise HTTPException(400, "Unknown model")
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"bridge_model": body.model}})
    return {"ok": True, "model": body.model}


@api_router.post("/bridge/chat")
async def bridge_chat(body: BridgeIn, user: dict = Depends(current_user)):
    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    sid = body.session_id or f"bridge_{user['user_id']}"
    await db.bridge_messages.insert_one({
        "id": new_id(), "user_id": user["user_id"], "session_id": sid,
        "role": "user", "content": body.message, "created_at": now_iso(),
    })
    ctx = await build_bridge_context(user)
    system_message = BRIDGE_SYSTEM_BASE + "\n\n### PARTICIPANT CONTEXT (private; use to personalize)\n" + ctx

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


@app.on_event("startup")
async def startup():
    try: init_storage()
    except Exception as e: logger.warning(f"Storage init failed: {e}")
    await seed_global_content()
    await ensure_owner()
    logger.info("Startup complete")


@api_router.get("/health")
async def health():
    return {"status": "ok", "app": "a-path-forward"}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
