"""Canonical participant progress summary for A Path Forward.

All participant and staff surfaces should read this service instead of independently
calculating task, requirement, document, assessment, and action-map totals.
"""
from __future__ import annotations

from fastapi import Depends

db = None
api_router = None
current_user = None

CATEGORY_SECTIONS = {
    "release_supervision": {"requirements"},
    "documentation": {"documents"},
    "getting_established": {"documents", "independent-living"},
    "employment_income": {"employment-readiness", "employment-record"},
    "education_skills": {"digital-readiness", "life-skills"},
    "health_organization": {"health-hub"},
    "benefits_understanding": {"benefits-hub"},
    "recovery_wellness": {"wellness"},
    "support_network": {"support-circle"},
    "personal_growth": {"identity"},
}


def _ratio(done: int, total: int) -> int:
    return round(done / total * 100) if total else 0


async def compute_progress_summary(user_id: str) -> dict:
    tasks = await db.tasks.find({"user_id": user_id}, {"_id": 0, "section": 1, "status": 1, "due_date": 1}).to_list(2000)
    requirements = await db.requirements.find({"user_id": user_id}, {"_id": 0, "status": 1, "verification": 1, "due_date": 1}).to_list(2000)
    documents = await db.documents.find({"user_id": user_id, "is_deleted": False}, {"_id": 0, "status": 1, "size": 1, "label": 1}).to_list(2000)

    # Known zero-byte signed-URL fixtures are not participant progress.
    documents = [
        d for d in documents
        if not (int(d.get("size") or 0) == 0 and str(d.get("label") or "").strip().lower() == "signed-url-test")
    ]

    assessment_total = 4
    assessment_done = await db.assessment_results.count_documents({
        "participant_user_id": user_id, "completed_at": {"$ne": None},
    })
    action_total = await db.action_map_items.count_documents({"user_id": user_id})
    action_done = await db.action_map_items.count_documents({"user_id": user_id, "status": "completed"})

    categories = {}
    for key, sections in CATEGORY_SECTIONS.items():
        rows = [t for t in tasks if t.get("section") in sections]
        done = sum(1 for t in rows if t.get("status") == "done")
        categories[key] = {"completed": done, "total": len(rows), "percent": _ratio(done, len(rows))}

    req_done = sum(1 for r in requirements if r.get("status") in ("done", "waived") or (r.get("verification") or {}).get("state") in ("verified", "not_applicable"))
    categories["release_supervision"] = {
        "completed": req_done,
        "total": len(requirements),
        "percent": _ratio(req_done, len(requirements)),
    }

    completed_units = sum(v["completed"] for v in categories.values()) + assessment_done + action_done
    total_units = sum(v["total"] for v in categories.values()) + assessment_total + action_total

    upcoming = sorted(
        [{"title": t.get("title"), "due_date": t.get("due_date"), "source": "task"} for t in tasks if t.get("status") != "done" and t.get("due_date")]
        + [{"title": r.get("description"), "due_date": r.get("due_date"), "source": "requirement"} for r in requirements if r.get("status") not in ("done", "waived") and r.get("due_date")],
        key=lambda row: row.get("due_date") or "",
    )[:10]

    return {
        "overall": {"completed": completed_units, "total": total_units, "percent": _ratio(completed_units, total_units)},
        "categories": categories,
        "requirements": {"completed": req_done, "total": len(requirements), "percent": _ratio(req_done, len(requirements))},
        "assessments": {"completed": assessment_done, "total": assessment_total, "percent": _ratio(assessment_done, assessment_total)},
        "action_map": {"completed": action_done, "total": action_total, "percent": _ratio(action_done, action_total)},
        "documents": {"total": len(documents), "needs_review": sum(1 for d in documents if d.get("status") == "needs_review")},
        "upcoming": upcoming,
    }


def register(_db, _api_router, _current_user):
    global db, api_router, current_user
    db, api_router, current_user = _db, _api_router, _current_user

    @api_router.get("/progress/summary")
    async def progress_summary(user: dict = Depends(current_user)):
        return await compute_progress_summary(user["user_id"])
