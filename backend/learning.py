"""Learning engine — server-scored quizzes, video watch-percentage progress, private journal.
Registered from server.py after primitives exist.

- `QUIZ_BANK` — the correct answers stay on the server. Frontend never sees them.
- `POST /api/quizzes/{id}/submit` grades, stores in `quiz_results`, flips Employment
  Readiness `workplace_expectations` gate automatically on the next
  /api/ereadiness/progress call.
- `POST /api/education/lesson-progress-percent` records video watch percentage; when it
  crosses 90 we auto-mark the lesson complete.
- Journal entries live in `journal_entries` — strictly participant-private. Staff cannot
  read the body under any code path.
"""
from __future__ import annotations
from typing import Optional
from datetime import datetime, timezone

from fastapi import Depends, HTTPException
from pydantic import BaseModel

db = None
api_router = None
current_user = None
now_iso = None
new_id = None
_audit = None

# ---------------------------------------------------------------------------
# QUIZZES
# ---------------------------------------------------------------------------
# passing_pct — minimum share of correct answers to "pass".
QUIZ_BANK = {
    "workplace_expectations": {
        "id": "workplace_expectations",
        "title": "Workplace expectations — knowledge check",
        "description": "A 5-question check on what employers expect. Pass with 4/5.",
        "passing_pct": 80,
        "questions": [
            {"prompt": "Your shift starts at 8:00 AM. What time should you arrive most days?",
             "options": ["Right at 8:00", "5-10 minutes early", "A little after 8:00", "Whenever you're ready"],
             "answer": 1,
             "explain": "Being 5-10 minutes early is the standard — it signals reliability without wasting your own time."},
            {"prompt": "You're going to be 20 minutes late because of a bus delay. Best move?",
             "options": ["Just get there and hope no one notices",
                         "Text or call your supervisor before your shift starts",
                         "Wait until you arrive to tell someone",
                         "Skip the day and try again tomorrow"],
             "answer": 1,
             "explain": "Notify your supervisor as soon as you know. Employers care about communication more than the delay itself."},
            {"prompt": "A coworker asks about your record on your first day. You…",
             "options": ["Share every detail so they know you're honest",
                         "Deny it firmly",
                         "Keep the answer short: 'That's private, but happy to talk about the work here.'",
                         "Report them to HR immediately"],
             "answer": 2,
             "explain": "Keep it brief and pivot back to work. Your record is not for casual conversation, and you're not obligated to share."},
            {"prompt": "Your manager gives you feedback that felt harsh. Best response?",
             "options": ["Argue back — they don't understand",
                         "Listen, ask one clarifying question, and thank them",
                         "Go home early",
                         "Complain to your coworkers"],
             "answer": 1,
             "explain": "Listen first. Ask one clarifying question if needed. Even hard feedback is information."},
            {"prompt": "You're paid every two weeks. Your paycheck is $50 short. You…",
             "options": ["Say nothing — don't make waves",
                         "Post about it on social media",
                         "Bring your pay stub to HR or payroll and ask them to check",
                         "Quit"],
             "answer": 2,
             "explain": "Pay disputes are normal and handled through HR/payroll with your pay stub as the receipt."},
        ],
    },
}


class QuizSubmitIn(BaseModel):
    # Dict of "question_index" -> chosen option index
    answers: dict[str, int]


class LessonWatchIn(BaseModel):
    lesson_id: str
    percent_viewed: int              # 0-100
    last_position_seconds: Optional[int] = None


# ---------------------------------------------------------------------------
# JOURNAL — participant-private
# ---------------------------------------------------------------------------
class JournalEntryIn(BaseModel):
    body: str
    mood: Optional[int] = None       # 1-5 optional
    tags: Optional[list[str]] = None


class JournalEntryPatch(BaseModel):
    body: Optional[str] = None
    mood: Optional[int] = None
    tags: Optional[list[str]] = None


def register(_db, _api_router, _current_user, _now_iso, _new_id, _audit_fn):
    global db, api_router, current_user, now_iso, new_id, _audit
    db = _db; api_router = _api_router; current_user = _current_user
    now_iso = _now_iso; new_id = _new_id; _audit = _audit_fn

    # ---------------- Quizzes ----------------
    @api_router.get("/quizzes/{quiz_id}")
    async def get_quiz(quiz_id: str, user: dict = Depends(current_user)):
        q = QUIZ_BANK.get(quiz_id)
        if not q:
            raise HTTPException(404, "Unknown quiz")
        # Strip correct answers before sending to the client.
        public = {
            "id": q["id"], "title": q["title"], "description": q["description"],
            "passing_pct": q["passing_pct"],
            "questions": [
                {"prompt": qi["prompt"], "options": qi["options"]}
                for qi in q["questions"]
            ],
        }
        last = await db.quiz_results.find_one(
            {"user_id": user["user_id"], "quiz_id": quiz_id},
            {"_id": 0}, sort=[("created_at", -1)])
        return {"quiz": public, "last_attempt": last}

    @api_router.post("/quizzes/{quiz_id}/submit")
    async def submit_quiz(quiz_id: str, body: QuizSubmitIn, user: dict = Depends(current_user)):
        q = QUIZ_BANK.get(quiz_id)
        if not q:
            raise HTTPException(404, "Unknown quiz")
        total = len(q["questions"])
        if total == 0:
            raise HTTPException(500, "Quiz has no questions")

        correct = 0
        feedback = []
        for idx, qi in enumerate(q["questions"]):
            picked = body.answers.get(str(idx))
            if picked is None:
                # Missing answer counts as wrong.
                feedback.append({"index": idx, "picked": None, "correct": qi["answer"],
                                 "is_correct": False, "explain": qi["explain"]})
                continue
            is_correct = int(picked) == qi["answer"]
            if is_correct:
                correct += 1
            feedback.append({"index": idx, "picked": int(picked), "correct": qi["answer"],
                             "is_correct": is_correct, "explain": qi["explain"]})

        score_pct = round(correct / total * 100)
        passed = score_pct >= q["passing_pct"]

        row = {
            "id": new_id("qr_"),
            "user_id": user["user_id"],
            "quiz_id": quiz_id,
            "score_pct": score_pct,
            "correct": correct,
            "total": total,
            "passed": passed,
            "created_at": now_iso(),
        }
        await db.quiz_results.insert_one(row)
        row.pop("_id", None)
        return {"ok": True, "result": row, "feedback": feedback}

    # ---------------- Lesson watch progress ----------------
    @api_router.post("/education/lesson-progress-percent")
    async def lesson_progress_percent(body: LessonWatchIn, user: dict = Depends(current_user)):
        """Continuous progress ping from the video player. When percent crosses 90,
        auto-mark the lesson completed. Progress only ever moves forward — a viewer
        who scrubs back to 10% does not lose their earned progress.
        """
        pct = max(0, min(100, int(body.percent_viewed or 0)))
        existing = await db.lesson_progress.find_one(
            {"user_id": user["user_id"], "lesson_id": body.lesson_id}, {"_id": 0}) or {}
        prev_pct = int(existing.get("progress") or 0)
        new_pct = max(prev_pct, pct)
        completed = bool(existing.get("completed")) or new_pct >= 90
        upd = {
            "user_id": user["user_id"], "lesson_id": body.lesson_id,
            "progress": new_pct, "completed": completed,
            "last_position_seconds": body.last_position_seconds,
            "updated_at": now_iso(),
        }
        await db.lesson_progress.update_one(
            {"user_id": user["user_id"], "lesson_id": body.lesson_id},
            {"$set": upd, "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True, "progress": new_pct, "completed": completed}

    # ---------------- Journal (participant-private) ----------------
    @api_router.get("/journal/entries")
    async def list_entries(user: dict = Depends(current_user)):
        rows = await db.journal_entries.find(
            {"user_id": user["user_id"], "is_deleted": {"$ne": True}}, {"_id": 0}
        ).sort("created_at", -1).limit(200).to_list(200)
        return {"entries": rows, "total": len(rows)}

    @api_router.post("/journal/entries")
    async def create_entry(body: JournalEntryIn, user: dict = Depends(current_user)):
        text = (body.body or "").strip()
        if not text:
            raise HTTPException(400, "Entry body is required")
        if len(text) > 20000:
            raise HTTPException(400, "Entry is too long (20k max)")
        if body.mood is not None and (body.mood < 1 or body.mood > 5):
            raise HTTPException(400, "Mood must be 1-5")
        row = {
            "id": new_id("j_"),
            "user_id": user["user_id"],
            "body": text,
            "mood": body.mood,
            "tags": body.tags or [],
            "is_deleted": False,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        await db.journal_entries.insert_one(row)
        row.pop("_id", None)
        return row

    @api_router.patch("/journal/entries/{entry_id}")
    async def update_entry(entry_id: str, body: JournalEntryPatch,
                            user: dict = Depends(current_user)):
        cur = await db.journal_entries.find_one(
            {"id": entry_id, "user_id": user["user_id"], "is_deleted": {"$ne": True}}, {"_id": 0})
        if not cur:
            raise HTTPException(404, "Not found")
        upd = {"updated_at": now_iso()}
        if body.body is not None:
            t = body.body.strip()
            if not t: raise HTTPException(400, "Entry body cannot be empty")
            upd["body"] = t
        if body.mood is not None:
            if body.mood < 1 or body.mood > 5:
                raise HTTPException(400, "Mood must be 1-5")
            upd["mood"] = body.mood
        if body.tags is not None:
            upd["tags"] = body.tags
        await db.journal_entries.update_one({"id": entry_id}, {"$set": upd})
        return await db.journal_entries.find_one({"id": entry_id}, {"_id": 0})

    @api_router.delete("/journal/entries/{entry_id}")
    async def delete_entry(entry_id: str, user: dict = Depends(current_user)):
        cur = await db.journal_entries.find_one(
            {"id": entry_id, "user_id": user["user_id"]}, {"_id": 0})
        if not cur:
            raise HTTPException(404, "Not found")
        await db.journal_entries.update_one(
            {"id": entry_id}, {"$set": {"is_deleted": True, "updated_at": now_iso()}})
        return {"ok": True}
