"""Graduation Journey & Build My Blueprint™ Doorway — A Path Forward.

Registered from server.py after primitives are ready.

Design principles:
- Journey stages: enter → build → graduate → unlock → expand.
- Graduation is *admin-controlled*. The system tracks readiness signals
  (Blueprint completion, assessments done, employment readiness %, action-map
  completion) as *evidence* for administrators — never as auto-graduation.
- The Build My Blueprint™ door is ALWAYS visible as a future destination.
  Its interactive UNLOCK experience is gated on `graduation_approved == True`.
- A "See What's Next" transition page is available *only after graduation*.
  It offers optional outbound link to buildmyblueprintbbc.com — never redirects.
- Nothing here creates a paid subscription, transfers data, or auto-enrolls.
"""
from __future__ import annotations

import logging
from typing import Any, Optional, Literal

from fastapi import Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("apf.journey")

# Injected by server.py via register()
db = None
api_router = None
current_user = None
require_role = None
now_iso = None
new_id = None
_audit = None


# =============================================================================
#  MODELS
# =============================================================================
class MilestoneIn(BaseModel):
    key: str
    label: str
    note: Optional[str] = None


class WelcomeSeenIn(BaseModel):
    seen: bool = True


class TransitionInterestIn(BaseModel):
    # "interested" -> participant wants to continue into BMB
    # "not_now"    -> participant declined for now (soft; revisitable)
    choice: Literal["interested", "not_now"]
    note: Optional[str] = None


class GraduateIn(BaseModel):
    graduation_date: Optional[str] = None  # ISO date; defaults to today (UTC)
    note: Optional[str] = None


# =============================================================================
#  HELPERS
# =============================================================================
def _default_state(user_id: str) -> dict:
    return {
        "id": new_id("jrn_"),
        "participant_user_id": user_id,
        "welcome_seen": False,
        "welcome_seen_at": None,
        "milestones": [],  # [{key,label,note,added_at,added_by}]
        "graduation_approved": False,
        "graduation_date": None,
        "graduation_approved_by": None,
        "graduation_note": None,
        "transition_offered_at": None,       # auto-set on graduation approval
        "transition_viewed": False,          # participant clicked "See What's Next"
        "transition_viewed_at": None,
        "graduation_celebrated": False,      # one-time confetti reveal
        "graduation_celebrated_at": None,
        "interested_in_continuing": None,    # True | False | None (undecided)
        "decision_at": None,
        "decision_note": None,
        "handoff_status": "not_started",     # future SSO/account handoff
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


async def _get_or_init(user_id: str) -> dict:
    doc = await db.journey_state.find_one({"participant_user_id": user_id}, {"_id": 0})
    if doc:
        return doc
    doc = _default_state(user_id)
    await db.journey_state.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def _readiness_signals(user_id: str) -> dict:
    """Read journey evidence from the canonical progress service."""
    from progress_summary import compute_progress_summary
    summary = await compute_progress_summary(user_id)
    return {
        "blueprint_completed": summary["overall"]["total"] > 0 and summary["overall"]["percent"] == 100,
        "blueprint_pct": summary["overall"]["percent"],
        "assessments_completed": summary["assessments"]["completed"],
        "assessments_total": summary["assessments"]["total"],
        "ereadiness_pct": summary["categories"]["employment_income"]["percent"],
        "ereadiness_completed": summary["categories"]["employment_income"]["completed"],
        "ereadiness_total": summary["categories"]["employment_income"]["total"],
        "action_items_completed": summary["action_map"]["completed"],
        "action_items_total": summary["action_map"]["total"],
        "requirements_completed": summary["requirements"]["completed"],
        "requirements_total": summary["requirements"]["total"],
        "documents_total": summary["documents"]["total"],
        "documents_needs_review": summary["documents"]["needs_review"],
    }


def _derive_stage(state: dict, signals: dict) -> str:
    """Derive the participant's current stage from state + signals.

    - `enter`     — not through Blueprint yet.
    - `build`     — actively building; Blueprint complete OR under way but not graduated.
    - `graduate`  — graduation approved (admin) but transition not yet viewed.
    - `unlock`    — transition page viewed, decision pending.
    - `expand`    — participant said "interested_in_continuing".
    """
    if state.get("graduation_approved"):
        if state.get("interested_in_continuing") is True:
            return "expand"
        if state.get("transition_viewed"):
            return "unlock"
        return "graduate"
    if signals.get("blueprint_completed"):
        return "build"
    return "enter"


async def _hydrate(user_id: str) -> dict:
    state = await _get_or_init(user_id)
    signals = await _readiness_signals(user_id)
    stage = _derive_stage(state, signals)
    return {
        "state": {k: v for k, v in state.items() if k != "_id"},
        "signals": signals,
        "stage": stage,
    }


# =============================================================================
#  REGISTER
# =============================================================================
def register(_db, _api_router, _current_user, _require_role, _now_iso, _new_id, _audit_fn):
    global db, api_router, current_user, require_role, now_iso, new_id, _audit
    db = _db
    api_router = _api_router
    current_user = _current_user
    require_role = _require_role
    now_iso = _now_iso
    new_id = _new_id
    _audit = _audit_fn

    # ---------- Participant endpoints ----------
    @api_router.get("/journey/state")
    async def journey_state(user: dict = Depends(current_user)):
        return await _hydrate(user["user_id"])

    @api_router.post("/journey/welcome-seen")
    async def journey_welcome_seen(body: WelcomeSeenIn, user: dict = Depends(current_user)):
        await db.journey_state.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {
                "welcome_seen": bool(body.seen),
                "welcome_seen_at": now_iso() if body.seen else None,
                "updated_at": now_iso(),
            },
             "$setOnInsert": {**{k: v for k, v in _default_state(user["user_id"]).items()
                                  if k not in ("welcome_seen", "welcome_seen_at", "updated_at")}}},
            upsert=True,
        )
        return await _hydrate(user["user_id"])

    @api_router.post("/journey/graduation-celebrated")
    async def journey_grad_celebrated(user: dict = Depends(current_user)):
        """Marks that the participant has seen the one-time confetti reveal.
        Only meaningful after graduation; silently no-ops otherwise so the
        client can call this unconditionally on Journey mount."""
        state = await _get_or_init(user["user_id"])
        if not state.get("graduation_approved"):
            return await _hydrate(user["user_id"])
        await db.journey_state.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {
                "graduation_celebrated": True,
                "graduation_celebrated_at": now_iso(),
                "updated_at": now_iso(),
            }},
        )
        return await _hydrate(user["user_id"])

    @api_router.post("/journey/transition/view")
    async def journey_transition_view(user: dict = Depends(current_user)):
        """Participant opened the See-What's-Next page. Only meaningful after
        graduation is approved — otherwise the page is locked and this is a
        no-op that returns the current state."""
        state = await _get_or_init(user["user_id"])
        if not state.get("graduation_approved"):
            # Silent no-op; the UI decides not to route them here anyway.
            return await _hydrate(user["user_id"])
        await db.journey_state.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {
                "transition_viewed": True,
                "transition_viewed_at": now_iso(),
                "updated_at": now_iso(),
            }},
        )
        return await _hydrate(user["user_id"])

    @api_router.post("/journey/transition/interest")
    async def journey_transition_interest(
        body: TransitionInterestIn, user: dict = Depends(current_user),
    ):
        state = await _get_or_init(user["user_id"])
        if not state.get("graduation_approved"):
            raise HTTPException(400, "Graduation must be approved before recording interest")
        interested = body.choice == "interested"
        await db.journey_state.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {
                "interested_in_continuing": interested,
                "decision_at": now_iso(),
                "decision_note": (body.note or None),
                "updated_at": now_iso(),
            }},
        )
        return await _hydrate(user["user_id"])

    # ---------- Admin / staff endpoints ----------
    _ADMIN_ROLES = ("super_admin", "program_admin")

    @api_router.get("/admin/journey")
    async def admin_journey_list(
        user: dict = Depends(require_role(*_ADMIN_ROLES, "program_staff")),
    ):
        """List participants + a compact journey snapshot for the admin table."""
        # Pull participants from enrollments so we scope to this program only.
        if user.get("_effective_role") == "super_admin":
            enrollment_query = {}
        else:
            program_ids = [b.get("program_id") for b in user.get("_bindings", [])
                           if b.get("role") in ("program_admin", "program_staff") and b.get("program_id")]
            enrollment_query = {"program_id": {"$in": program_ids}}
        enrollments = await db.enrollments.find(enrollment_query, {"_id": 0}).to_list(2000)
        rows = []
        for en in enrollments:
            uid = en.get("participant_user_id")
            if not uid:
                continue
            u = await db.users.find_one({"user_id": uid}, {"_id": 0, "name": 1, "email": 1})
            if not u:
                continue
            snap = await _hydrate(uid)
            rows.append({
                "user_id": uid,
                "enrollment_id": en.get("id"),
                "pathway_id": en.get("pathway_id"),
                "participant": {"name": u.get("name"), "email": u.get("email")},
                "stage": snap["stage"],
                "signals": snap["signals"],
                "graduation_approved": snap["state"].get("graduation_approved"),
                "graduation_date": snap["state"].get("graduation_date"),
                "milestones_count": len(snap["state"].get("milestones") or []),
                "welcome_seen": snap["state"].get("welcome_seen"),
                "transition_viewed": snap["state"].get("transition_viewed"),
                "interested_in_continuing": snap["state"].get("interested_in_continuing"),
            })
        return {"participants": rows, "count": len(rows)}

    @api_router.get("/admin/journey/{user_id}")
    async def admin_journey_get(
        user_id: str,
        user: dict = Depends(require_role(*_ADMIN_ROLES, "program_staff")),
    ):
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
        if not u:
            raise HTTPException(404, "Participant not found")
        if not await _staff_can_access_participant(user, user_id):
            raise HTTPException(404, "Participant not found")
        snap = await _hydrate(user_id)
        return {"participant": {"user_id": user_id, **u}, **snap}

    @api_router.post("/admin/journey/{user_id}/graduate")
    async def admin_journey_graduate(
        user_id: str, body: GraduateIn,
        user: dict = Depends(require_role(*_ADMIN_ROLES)),
    ):
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})
        if not u:
            raise HTTPException(404, "Participant not found")
        if not await _staff_can_access_participant(user, user_id):
            raise HTTPException(404, "Participant not found")
        state = await _get_or_init(user_id)
        if state.get("graduation_approved"):
            raise HTTPException(400, "Already graduated")
        grad_date = body.graduation_date or now_iso().split("T")[0]
        await db.journey_state.update_one(
            {"participant_user_id": user_id},
            {"$set": {
                "graduation_approved": True,
                "graduation_date": grad_date,
                "graduation_approved_by": user["user_id"],
                "graduation_note": body.note,
                "transition_offered_at": now_iso(),
                "updated_at": now_iso(),
            }},
        )
        try:
            await _audit(
                user["user_id"], user.get("primary_role"), None,
                "journey.graduate",
                target_type="user", target_id=user_id,
                before=None, after={"graduation_date": grad_date, "note": body.note},
            )
        except Exception:
            pass
        return await _hydrate(user_id)

    @api_router.post("/admin/journey/{user_id}/revoke-graduation")
    async def admin_journey_revoke(
        user_id: str,
        user: dict = Depends(require_role(*_ADMIN_ROLES)),
    ):
        if not await _staff_can_access_participant(user, user_id):
            raise HTTPException(404, "Participant not found")
        state = await _get_or_init(user_id)
        if not state.get("graduation_approved"):
            raise HTTPException(400, "Participant is not graduated")
        await db.journey_state.update_one(
            {"participant_user_id": user_id},
            {"$set": {
                "graduation_approved": False,
                "graduation_approved_by": None,
                "graduation_date": None,
                "graduation_note": None,
                "transition_offered_at": None,
                # keep transition_viewed/interest as historical record
                "updated_at": now_iso(),
            }},
        )
        try:
            await _audit(
                user["user_id"], user.get("primary_role"), None,
                "journey.revoke_graduation",
                target_type="user", target_id=user_id, before=None, after=None,
            )
        except Exception:
            pass
        return await _hydrate(user_id)

    @api_router.post("/admin/journey/{user_id}/milestone")
    async def admin_journey_milestone_add(
        user_id: str, body: MilestoneIn,
        user: dict = Depends(require_role(*_ADMIN_ROLES, "program_staff")),
    ):
        u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1})
        if not u:
            raise HTTPException(404, "Participant not found")
        if not await _staff_can_access_participant(user, user_id):
            raise HTTPException(404, "Participant not found")
        await _get_or_init(user_id)
        entry = {
            "id": new_id("mst_"),
            "key": body.key,
            "label": body.label,
            "note": body.note,
            "added_at": now_iso(),
            "added_by": user["user_id"],
        }
        await db.journey_state.update_one(
            {"participant_user_id": user_id},
            {"$push": {"milestones": entry}, "$set": {"updated_at": now_iso()}},
        )
        try:
            await _audit(
                user["user_id"], user.get("primary_role"), None,
                "journey.milestone_add",
                target_type="user", target_id=user_id,
                before=None, after=entry,
            )
        except Exception:
            pass
        return await _hydrate(user_id)

    @api_router.delete("/admin/journey/{user_id}/milestone/{milestone_id}")
    async def admin_journey_milestone_remove(
        user_id: str, milestone_id: str,
        user: dict = Depends(require_role(*_ADMIN_ROLES)),
    ):
        if not await _staff_can_access_participant(user, user_id):
            raise HTTPException(404, "Participant not found")
        res = await db.journey_state.update_one(
            {"participant_user_id": user_id},
            {"$pull": {"milestones": {"id": milestone_id}},
             "$set": {"updated_at": now_iso()}},
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Participant not found")
        return await _hydrate(user_id)
