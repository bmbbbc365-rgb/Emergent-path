"""Batch A — Full Path Forward Blueprint · Assessments · Employment Readiness gating.

Registered from server.py after primitives (db, api_router, current_user, require_role,
now_iso, new_id, _audit, _staff_can_access_participant) are ready.

Rules honored:
- The existing 28-Q intake (`INTAKE_SCHEMA` in phase3.py) is preserved unchanged as the
  Quick Check-In. This module adds a NEW 30-Q "Full Path Forward Blueprint" alongside it
  and carries forward answers where the same key exists.
- Employment Readiness completion is gated by REAL conditions per item (assessment done,
  lesson viewed, quiz passed, evidence uploaded, or explicit participant attestation for
  ordinary life tasks). No "just click complete" for verifiable work.
- Affirmations are participant-facing, mature, reentry-aware. Deterministic by date so
  every participant sees the same message on the same day.
- Everything participant-owned. Staff/admin visibility remains PCT-only for private items;
  the existing `_staff_can_access_participant` gate is reused.
"""
from __future__ import annotations

import datetime as _dt
import logging
from typing import Any, Optional

from fastapi import Depends, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("bmb.blueprint_v2")

# Injected by server.py via register()
db = None
api_router = None
current_user = None
require_role = None
now_iso = None
new_id = None
_audit = None
_staff_can_access_participant = None


# =============================================================================
#  FULL PATH FORWARD BLUEPRINT — 30 questions, 13 categories
# =============================================================================
# `intake_key` (optional) means: if the participant already answered this same key
# in the Quick Check-In (phase3.INTAKE_SCHEMA), we prepopulate the Full Blueprint
# with that answer — no re-asking.
FULL_BLUEPRINT_SCHEMA = [
    {"id": "immediate", "title": "Immediate Needs", "eyebrow": "Right now",
     "questions": [
         {"key": "housing_safe_tonight", "label": "Do you have a safe place to stay tonight?",
          "type": "yes_no_unsure", "intake_key": ("immediate", "housing_safe_tonight")},
         {"key": "food_two_days", "label": "Do you have food you can access today and tomorrow?",
          "type": "yes_no_unsure", "intake_key": ("immediate", "food_access")},
         {"key": "urgent_concern", "label": "Is anything urgent going on we should know today?",
          "type": "text_long", "intake_key": ("immediate", "urgent_concern")},
     ]},
    {"id": "housing_stability", "title": "Housing & Stability", "eyebrow": "Where you sleep",
     "questions": [
         {"key": "housing_current", "label": "Where are you staying right now?",
          "type": "choice",
          "options": ["Own place", "Renting", "Family or friend", "Transitional program",
                      "Shelter", "Unhoused", "Other"]},
         {"key": "housing_stability_30d",
          "label": "How stable is that arrangement for the next 30 days?",
          "type": "scale_1_5", "hint": "1 = very unstable, 5 = very stable"},
         {"key": "housing_barriers",
          "label": "What are the biggest barriers to stable housing? (choose all that apply)",
          "type": "multi_select",
          "options": ["Money", "Credit", "Background", "ID / documents", "Transportation",
                      "Employment", "Family situation", "Nothing right now", "Other"]},
     ]},
    {"id": "food_essentials", "title": "Food & Essentials", "eyebrow": "Day-to-day",
     "questions": [
         {"key": "phone_email_access",
          "label": "Do you have a working phone and an email you can check?",
          "type": "multi_select",
          "options": ["Working phone", "Email I check", "Neither reliable right now"]},
         {"key": "clothing_ready",
          "label": "Do you have clothing appropriate for work and interviews?",
          "type": "choice", "options": ["Yes", "Some, not enough", "No"]},
     ]},
    {"id": "transportation", "title": "Transportation", "eyebrow": "How you get around",
     "questions": [
         {"key": "transport_daily",
          "label": "How do you get around most days?",
          "type": "choice",
          "options": ["Own car", "Borrowed car", "Public transit", "Rideshare",
                      "Walk / bike", "None reliable"]},
         {"key": "id_status",
          "label": "Do you have a valid driver's license or state ID?",
          "type": "choice", "options": ["Driver's license", "State ID", "Neither", "Expired"]},
     ]},
    {"id": "id_documents", "title": "Identification & Documents", "eyebrow": "Paperwork on hand",
     "questions": [
         {"key": "docs_have",
          "label": "Which of these do you currently have? (choose all that apply)",
          "type": "multi_select",
          "options": ["Social Security card", "Birth certificate", "Release papers",
                      "Court documents", "Supervision documents"]},
         {"key": "docs_know_replace",
          "label": "Do you know how to replace what's missing?",
          "type": "choice", "options": ["Yes", "Somewhat", "No"]},
         {"key": "record_notes",
          "label": "Anything about your record you want the platform to help you navigate? (optional)",
          "type": "text_long"},
     ]},
    {"id": "education", "title": "Education", "eyebrow": "Learning & credentials",
     "questions": [
         {"key": "education_level", "label": "Highest level of school completed",
          "type": "choice",
          "options": ["Less than high school", "GED / HiSET", "High school diploma",
                      "Some college", "Associate's", "Bachelor's or higher"],
          "intake_key": ("education_employment", "education_level")},
         {"key": "education_interests",
          "label": "Interested in any of these? (choose all that apply)",
          "type": "multi_select",
          "options": ["GED / HiSET", "Certification / trade", "College", "Not right now"]},
     ]},
    {"id": "employment", "title": "Employment Readiness", "eyebrow": "Work",
     "questions": [
         {"key": "employed_now",
          "label": "Are you currently employed?",
          "type": "choice",
          "options": ["Full-time", "Part-time", "Gig / self-employed", "Not employed"]},
         {"key": "job_ready_1_5",
          "label": "How ready do you feel to apply for a job today?",
          "type": "scale_1_5", "hint": "1 = not ready, 5 = ready today"},
         {"key": "career_interest",
          "label": "What kind of work interests you most? (short answer)",
          "type": "text_short",
          "intake_key": ("education_employment", "career_interest")},
     ]},
    {"id": "health_meds", "title": "Health & Medications", "eyebrow": "Care and prescriptions",
     "questions": [
         {"key": "has_provider",
          "label": "Do you have a doctor or clinic right now?",
          "type": "yes_no_unsure", "intake_key": ("health", "has_provider")},
         {"key": "meds_status",
          "label": "Medications status",
          "type": "multi_select",
          "options": ["Not taking any", "Currently taking", "Need refill in next 2 weeks"]},
         {"key": "has_insurance",
          "label": "Do you have Medicaid or health insurance?",
          "type": "yes_no_unsure", "intake_key": ("health", "has_insurance")},
     ]},
    {"id": "recovery_mental", "title": "Mental Health & Recovery", "eyebrow": "Support if you want it",
     "questions": [
         {"key": "recovery_support_needs",
          "label": "Would any of these be helpful right now? (choose all that apply)",
          "type": "multi_select",
          "options": ["Mental-health support", "Recovery / substance-use support",
                      "Grief support", "Neither right now", "Prefer not to say"]},
         {"key": "stress_week_1_5",
          "label": "How would you rate your stress most days this past week?",
          "type": "scale_1_5", "hint": "1 = very calm, 5 = very stressed"},
     ]},
    {"id": "legal_supervision", "title": "Legal / Supervision", "eyebrow": "Obligations",
     "questions": [
         {"key": "supervision_status",
          "label": "Are you on parole, probation, or a supervision program?",
          "type": "choice",
          "options": ["Parole", "Probation", "Other supervision", "Not on supervision"]},
         {"key": "reporting_confidence",
          "label": "Do you know when and where to report / any upcoming court dates?",
          "type": "choice", "options": ["Yes", "Partly", "No"]},
     ]},
    {"id": "support_system", "title": "Support System", "eyebrow": "People in your corner",
     "questions": [
         {"key": "has_trust_person",
          "label": "Is there someone you trust you can call in a hard moment?",
          "type": "yes_no_unsure", "intake_key": ("support", "has_support_person")},
         {"key": "has_dependents",
          "label": "Do you have children or dependents you're responsible for?",
          "type": "yes_no", "intake_key": ("support", "has_dependents")},
     ]},
    {"id": "technology", "title": "Technology Access", "eyebrow": "Comfort with online tools",
     "questions": [
         {"key": "digital_confidence_1_5",
          "label": "How comfortable are you filling out forms and applications online?",
          "type": "scale_1_5", "hint": "1 = not at all, 5 = very comfortable"},
     ]},
    {"id": "financial", "title": "Financial Basics", "eyebrow": "Money",
     "questions": [
         {"key": "bank_account_status",
          "label": "Do you have a bank account you can use?",
          "type": "choice", "options": ["Yes", "No", "Had one — closed"]},
         {"key": "priority_ranking",
          "label": "Rank your top 3 areas that need help first",
          "type": "rank_top_3",
          "options": ["Housing", "Documents / ID", "Employment", "Health / medications",
                      "Transportation", "Recovery / mental health", "Legal / supervision",
                      "Support system", "Money / bank", "Education"]},
     ]},
]

_ALLOWED_META = {"dont_know", "not_applicable", "later"}


def _total_questions() -> int:
    return sum(len(s["questions"]) for s in FULL_BLUEPRINT_SCHEMA)


async def _bp_progress(uid: str) -> dict:
    doc = await db.blueprint_full_progress.find_one({"participant_user_id": uid}, {"_id": 0})
    if not doc:
        doc = {"id": new_id("bpp_"), "participant_user_id": uid,
               "current_section": FULL_BLUEPRINT_SCHEMA[0]["id"],
               "pct": 0, "completed_at": None,
               "last_activity_at": now_iso(), "created_at": now_iso()}
        await db.blueprint_full_progress.insert_one(doc)
        doc.pop("_id", None)
    return doc


async def _carry_forward_from_intake(uid: str):
    """Prepopulate Full Blueprint answers from Quick Check-In responses (same keys only).
    Idempotent — only runs when the Full Blueprint has zero answers yet."""
    already = await db.blueprint_full_responses.count_documents({"participant_user_id": uid})
    if already > 0:
        return 0
    intake = await db.intake_responses.find({"participant_user_id": uid}, {"_id": 0}).to_list(500)
    if not intake:
        return 0
    intake_map = {(r["section"], r["key"]): r for r in intake}
    carried = 0
    for section in FULL_BLUEPRINT_SCHEMA:
        for q in section["questions"]:
            src = q.get("intake_key")
            if not src or src not in intake_map:
                continue
            r = intake_map[src]
            if r.get("value") is None and not r.get("meta"):
                continue
            await db.blueprint_full_responses.update_one(
                {"participant_user_id": uid, "section": section["id"], "key": q["key"]},
                {"$set": {"id": new_id("bpr_"), "participant_user_id": uid,
                          "section": section["id"], "key": q["key"],
                          "value": r.get("value"), "meta": r.get("meta"),
                          "source": "carried_from_intake",
                          "updated_at": now_iso()}},
                upsert=True,
            )
            carried += 1
    if carried:
        total = _total_questions()
        await db.blueprint_full_progress.update_one(
            {"participant_user_id": uid},
            {"$set": {"pct": round(carried / total * 100), "last_activity_at": now_iso()}},
        )
    return carried


# ---------- Answer / progress ----------
class FullBlueprintAnswer(BaseModel):
    section: str
    key: str
    value: Any = None
    meta: Optional[str] = None


# ---------- Results / summary generation ----------
def _val(answers: dict, section: str, key: str, default=None):
    r = answers.get((section, key))
    if not r: return default
    return r.get("value") if r.get("meta") is None else default


def _has(answers: dict, section: str, key: str, needle) -> bool:
    v = _val(answers, section, key)
    if v is None: return False
    if isinstance(v, list):
        return needle in v
    return v == needle


def _summarize(answers: dict) -> dict:
    """Rule-based summary — no LLM, deterministic and fast."""
    strengths, priorities, immediate = [], [], []

    if _has(answers, "immediate", "housing_safe_tonight", "yes"):
        strengths.append("You have a safe place to stay tonight.")
    else:
        immediate.append("Getting shelter tonight")

    if _has(answers, "immediate", "food_two_days", "yes"):
        strengths.append("You have food access for the next two days.")
    else:
        immediate.append("Food for the next two days")

    stab = _val(answers, "housing_stability", "housing_stability_30d")
    if isinstance(stab, (int, float)):
        if stab >= 4:
            strengths.append("Your housing looks stable for the next month.")
        elif stab <= 2:
            priorities.append("Stabilize housing for the next 30 days")

    if _has(answers, "id_documents", "docs_have", "Social Security card"):
        strengths.append("Your Social Security card is on hand.")
    else:
        priorities.append("Replace your Social Security card")
    id_status = _val(answers, "transportation", "id_status")
    if id_status in ("Driver's license", "State ID"):
        strengths.append("You have a valid ID.")
    elif id_status in ("Neither", "Expired"):
        priorities.append("Get a valid state ID")

    if _has(answers, "employment", "employed_now", "Full-time") or _has(answers, "employment", "employed_now", "Part-time"):
        strengths.append("You're already working.")
    else:
        ready = _val(answers, "employment", "job_ready_1_5")
        if isinstance(ready, (int, float)) and ready <= 2:
            priorities.append("Build employment readiness step by step")
        else:
            priorities.append("Apply to 3 fair-chance employers this week")

    if _has(answers, "health_meds", "meds_status", "Need refill in next 2 weeks"):
        immediate.append("Refill your medications this week")
    if _has(answers, "health_meds", "has_insurance", "no") or _has(answers, "health_meds", "has_insurance", "unsure"):
        priorities.append("Check Medicaid eligibility")

    if _has(answers, "support_system", "has_trust_person", "yes"):
        strengths.append("You have someone you trust you can call.")
    else:
        priorities.append("Add trusted people to your Support Circle")

    if _has(answers, "financial", "bank_account_status", "No") or _has(answers, "financial", "bank_account_status", "Had one — closed"):
        priorities.append("Open a second-chance bank account")

    ranked = _val(answers, "financial", "priority_ranking") or []
    if isinstance(ranked, list) and ranked:
        ranked_top = [f"You said start with: {r}" for r in ranked[:3]]
    else:
        ranked_top = []

    return {
        "strengths": strengths[:8],
        "immediate": immediate[:5],
        "priorities": priorities[:6],
        "participant_ranked_top3": ranked_top,
    }


# =============================================================================
#  ASSESSMENTS — Work Style · Values · Interests · Workforce Preference
# =============================================================================
ASSESSMENT_SCHEMAS = {
    "work_style": {
        "id": "work_style",
        "title": "Work Style",
        "description": "How you tend to work best — no right or wrong answers.",
        "questions": [
            {"key": "solo_team", "label": "I do my best work when I am…",
             "type": "choice", "options": ["Working on my own", "In a small team", "In a busy group"]},
            {"key": "structure", "label": "I do better when the day is…",
             "type": "choice", "options": ["Highly structured", "Loosely structured", "Flexible / changing"]},
            {"key": "hands_on", "label": "I'd rather be…",
             "type": "choice", "options": ["Hands-on with tools or materials", "At a desk / computer", "A mix of both"]},
            {"key": "people_tasks", "label": "I get more energy from…",
             "type": "choice", "options": ["Helping people directly", "Solving tasks / puzzles"]},
            {"key": "routine", "label": "I prefer work that has…",
             "type": "choice", "options": ["A steady routine", "A mix of routine and variety", "Lots of variety"]},
            {"key": "indoor_outdoor", "label": "I'd rather work…",
             "type": "choice", "options": ["Mostly indoors", "Mostly outdoors", "Either is fine"]},
            {"key": "leadership", "label": "Taking the lead on a small group is…",
             "type": "scale_1_5", "hint": "1 = avoid, 5 = eager"},
            {"key": "pace", "label": "I do best at a…",
             "type": "choice", "options": ["Calm, steady pace", "Moderate pace", "Fast pace"]},
            {"key": "problem_solve", "label": "I solve problems best by…",
             "type": "choice", "options": ["Following a clear procedure", "Trying things until it works", "Talking it through with someone"]},
            {"key": "communication", "label": "When I need to explain something, I prefer…",
             "type": "choice", "options": ["In writing", "In person / verbal", "Showing / demonstrating"]},
        ],
    },
    "values": {
        "id": "values",
        "title": "Values",
        "description": "Pick the six values that matter most to you right now.",
        "questions": [
            {"key": "top_values", "label": "Choose your top 6 (from the list)",
             "type": "multi_select_max_6",
             "options": ["Stability", "Income", "Advancement", "Family time",
                         "Helping others", "Independence", "Creativity",
                         "Security", "Learning", "Leadership", "Flexibility", "Purpose"]},
            {"key": "top_3_rank", "label": "Of those six, rank your top 3 in order",
             "type": "rank_top_3",
             "options": ["Stability", "Income", "Advancement", "Family time",
                         "Helping others", "Independence", "Creativity",
                         "Security", "Learning", "Leadership", "Flexibility", "Purpose"]},
        ],
    },
    "interests": {
        "id": "interests",
        "title": "Interests",
        "description": "Broad categories of activities you enjoy or would try.",
        "questions": [
            {"key": "interest_families", "label": "Which of these appeal to you? (choose all that apply)",
             "type": "multi_select",
             "options": ["Mechanical / building / repairing",
                         "Care / service / people-facing",
                         "Creative / making things",
                         "Technical / computers / data",
                         "Outdoor / physical work",
                         "Business / sales",
                         "Administrative / detail work",
                         "Analysis / information"]},
        ],
    },
    "workforce": {
        "id": "workforce",
        "title": "Workforce Preferences",
        "description": "Practical filters for what a job would need to fit your life.",
        "questions": [
            {"key": "environment", "label": "Preferred work environment",
             "type": "choice", "options": ["Indoor", "Outdoor", "Either"]},
            {"key": "schedule", "label": "Best schedule for me",
             "type": "choice", "options": ["Day shift", "Evenings", "Overnight", "Rotating", "Any"]},
            {"key": "physical", "label": "Physical activity level I want",
             "type": "choice", "options": ["Sit-down", "Light activity", "On my feet", "Physically demanding"]},
            {"key": "customer_contact", "label": "Customer contact",
             "type": "choice", "options": ["Direct customer contact is fine", "Occasional is fine", "Prefer none"]},
            {"key": "team_size", "label": "Team size",
             "type": "choice", "options": ["Solo", "Small team", "Large team"]},
            {"key": "training_ok", "label": "Willingness to complete training or a certification",
             "type": "scale_1_5"},
            {"key": "transport_limit", "label": "Transportation limits",
             "type": "choice", "options": ["Have reliable transportation", "Public transit only", "Limited — must be nearby"]},
            {"key": "shift_pref", "label": "Shift length preference",
             "type": "choice", "options": ["4-hour", "8-hour", "10–12-hour", "Any"]},
            {"key": "career_vs_now", "label": "Right now I'm focused on…",
             "type": "choice", "options": ["An immediate paycheck", "A career path", "Both — need income while I build"]},
            {"key": "credential_ok", "label": "Would you pursue a short credential (weeks to months)?",
             "type": "yes_no_unsure"},
        ],
    },
}


class AssessmentAnswer(BaseModel):
    assessment_id: str
    key: str
    value: Any


def _score_work_style(a: dict) -> dict:
    tags = []
    if a.get("solo_team") == "Working on my own": tags.append("Independent worker")
    if a.get("solo_team") == "In a busy group": tags.append("Thrives in a team")
    if a.get("structure") == "Highly structured": tags.append("Prefers clear structure")
    if a.get("structure") == "Flexible / changing": tags.append("Adaptable to change")
    if a.get("hands_on") == "Hands-on with tools or materials": tags.append("Hands-on")
    if a.get("hands_on") == "At a desk / computer": tags.append("Detail / desk-based")
    if a.get("people_tasks") == "Helping people directly": tags.append("People-first")
    if a.get("people_tasks") == "Solving tasks / puzzles": tags.append("Task-first")
    if a.get("routine") == "Lots of variety": tags.append("Enjoys variety")
    if a.get("indoor_outdoor") == "Mostly outdoors": tags.append("Outdoor-oriented")
    lead = a.get("leadership")
    if isinstance(lead, (int, float)) and lead >= 4: tags.append("Comfortable leading")
    return {"themes": tags[:6]}


def _score_values(a: dict) -> dict:
    top = a.get("top_values") or []
    rank = a.get("top_3_rank") or []
    if isinstance(top, list) and isinstance(rank, list):
        # Keep only rank items that are in the top-6 selection
        rank = [r for r in rank if r in top][:3]
    return {"top_values": top[:6] if isinstance(top, list) else [], "top_3": rank}


def _score_interests(a: dict) -> dict:
    fams = a.get("interest_families") or []
    if not isinstance(fams, list): fams = []
    fit = {
        "Mechanical / building / repairing": ["Construction", "Skilled trades", "Auto repair", "Facilities"],
        "Care / service / people-facing": ["CNA / caregiver", "Peer support", "Food service", "Retail"],
        "Creative / making things": ["Warehouse art programs", "Culinary", "Barbering / cosmetology"],
        "Technical / computers / data": ["Data entry", "IT support", "Help desk"],
        "Outdoor / physical work": ["Landscaping", "Warehouse", "Trucking / driving"],
        "Business / sales": ["Retail sales", "Customer service"],
        "Administrative / detail work": ["Office admin", "Filing / records"],
        "Analysis / information": ["Research assistant", "Bookkeeping basics"],
    }
    example_paths = []
    for fam in fams:
        example_paths.extend(fit.get(fam, [])[:2])
    # dedupe, preserve order
    seen = set(); dedup = []
    for p in example_paths:
        if p not in seen: seen.add(p); dedup.append(p)
    return {"families": fams, "example_paths": dedup[:8]}


def _score_workforce(a: dict) -> dict:
    filters = {k: v for k, v in a.items() if v is not None}
    ready = a.get("training_ok")
    starter_dirs = []
    if a.get("physical") in ("On my feet", "Physically demanding"):
        starter_dirs.append("Warehouse / logistics")
    if a.get("customer_contact") in ("Direct customer contact is fine", "Occasional is fine"):
        starter_dirs.append("Retail / customer service")
    if isinstance(ready, (int, float)) and ready >= 4:
        starter_dirs.append("Short-credential paths (CDL-A, forklift, food handler)")
    if a.get("transport_limit") == "Limited — must be nearby":
        starter_dirs.append("Neighborhood-based work")
    return {"filters": filters, "starter_directions": starter_dirs[:6]}


def _score(aid: str, answers: dict) -> dict:
    if aid == "work_style":  return _score_work_style(answers)
    if aid == "values":      return _score_values(answers)
    if aid == "interests":   return _score_interests(answers)
    if aid == "workforce":   return _score_workforce(answers)
    return {}


# =============================================================================
#  EMPLOYMENT READINESS gating
# =============================================================================
# Three categories per user requirement:
#  - "verifiable": server checks a concrete condition (assessment done, doc uploaded, etc.)
#  - "evidence":   requires document evidence via existing document flow
#  - "attest":     participant-attested (ordinary life task, no artificial barriers)
EREADINESS_CATALOG = [
    {"key": "career_exploration",
     "title": "Career exploration — complete the 4 self-assessments",
     "kind": "verifiable",
     "condition": "assessments_all_done"},
    {"key": "job_search_strategies",
     "title": "Learn job-search strategies (Resume + basics)",
     "kind": "verifiable",
     # Matches the existing seeded course "Resume for Fair-Chance Employers" or any lesson
     # whose title contains "job search"
     "condition": "lesson_title:resume|job search"},
    {"key": "resume",
     "title": "Create or upload your resume",
     "kind": "evidence",
     "condition": "document_type:resume"},
    {"key": "interview_prep",
     "title": "Interview preparation",
     "kind": "verifiable",
     # Matches seeded course "Interview Basics"
     "condition": "lesson_title:interview"},
    {"key": "professional_communication",
     "title": "Professional communication basics",
     "kind": "verifiable",
     # Matches "Digital Basics" (professional email) or any 'communication' lesson
     "condition": "lesson_title:communication|digital basics|email"},
    {"key": "workplace_expectations",
     "title": "Workplace expectations knowledge check",
     "kind": "verifiable",
     "condition": "quiz_passed:workplace_expectations"},
    {"key": "certifications",
     "title": "Add a certification or credential (optional but recommended)",
     "kind": "evidence",
     "condition": "document_type:training_certificate"},
    {"key": "reliable_transport",
     "title": "Reliable transportation plan",
     "kind": "attest",
     "condition": None},
    {"key": "work_clothing",
     "title": "Interview-appropriate clothing on hand",
     "kind": "attest",
     "condition": None},
    {"key": "references_ready",
     "title": "Two professional references identified",
     "kind": "attest",
     "condition": None},
]


class AttestIn(BaseModel):
    attested: bool = True
    note: Optional[str] = None


async def _evaluate_ereadiness(uid: str) -> list[dict]:
    """Evaluate each catalog item's live state and upsert into ereadiness_progress."""
    # Assessments completed?
    ares = await db.assessment_results.find({"participant_user_id": uid}, {"_id": 0}).to_list(20)
    completed_aids = {r["assessment_id"] for r in ares}
    all_assess = completed_aids >= set(ASSESSMENT_SCHEMAS.keys())

    # Lessons viewed — reuse the existing `lesson_progress` collection.
    # A lesson counts as "viewed" when either completed=True or progress>=90.
    completed_lesson_ids: set[str] = set()
    try:
        progs = await db.lesson_progress.find(
            {"user_id": uid, "$or": [{"completed": True}, {"progress": {"$gte": 90}}]},
            {"_id": 0}).to_list(500)
        for p in progs:
            if p.get("lesson_id"):
                completed_lesson_ids.add(p["lesson_id"])
    except Exception:
        pass
    completed_lesson_titles_lc: set[str] = set()
    if completed_lesson_ids:
        try:
            lessons_cur = await db.lessons.find(
                {"id": {"$in": list(completed_lesson_ids)}}, {"_id": 0, "title": 1, "course_id": 1}).to_list(500)
            course_ids = {l.get("course_id") for l in lessons_cur if l.get("course_id")}
            for l in lessons_cur:
                if l.get("title"):
                    completed_lesson_titles_lc.add(l["title"].lower())
            # ALSO pull the parent course titles so "Interview Basics" is matchable when
            # only a sub-lesson (e.g. "Common questions") was completed.
            if course_ids:
                courses_cur = await db.courses.find(
                    {"id": {"$in": list(course_ids)}}, {"_id": 0, "title": 1}).to_list(500)
                for c in courses_cur:
                    if c.get("title"):
                        completed_lesson_titles_lc.add(c["title"].lower())
        except Exception:
            pass

    # Quizzes passed
    quizzes_passed: set[str] = set()
    try:
        quizzes = await db.quiz_results.find({"user_id": uid, "passed": True}, {"_id": 0}).to_list(200)
        for q in quizzes:
            if q.get("quiz_id"): quizzes_passed.add(q["quiz_id"])
    except Exception:
        pass

    # Documents by type
    doc_types = set()
    try:
        docs = await db.documents.find({"user_id": uid, "is_deleted": False},
                                       {"_id": 0, "document_type": 1}).to_list(500)
        for d in docs:
            if d.get("document_type"): doc_types.add(d["document_type"])
    except Exception:
        pass

    # Existing progress (participant attestations survive here)
    prev = {p["item_key"]: p for p in await db.ereadiness_progress.find(
        {"participant_user_id": uid}, {"_id": 0}).to_list(200)}

    out = []
    for item in EREADINESS_CATALOG:
        state = "not_started"
        evidence = None
        cond = item.get("condition") or ""
        if item["kind"] == "verifiable":
            if cond == "assessments_all_done" and all_assess:
                state = "completed"; evidence = {"assessments_done": sorted(completed_aids)}
            elif cond.startswith("lesson_viewed:") and cond.split(":", 1)[1] in completed_lesson_ids:
                state = "completed"; evidence = {"lesson": cond.split(":", 1)[1]}
            elif cond.startswith("lesson_title:"):
                # Any completed lesson whose title contains ANY of the pipe-separated keywords.
                needles = [n.strip().lower() for n in cond.split(":", 1)[1].split("|") if n.strip()]
                hit = next((t for t in completed_lesson_titles_lc
                            if any(n in t for n in needles)), None)
                if hit:
                    state = "completed"; evidence = {"matched_lesson_title": hit}
            elif cond.startswith("quiz_passed:") and cond.split(":", 1)[1] in quizzes_passed:
                state = "completed"; evidence = {"quiz": cond.split(":", 1)[1]}
            elif cond == "assessments_all_done" and completed_aids:
                state = "in_progress"
                evidence = {"assessments_done": sorted(completed_aids)}
        elif item["kind"] == "evidence":
            wanted = cond.split(":", 1)[1] if ":" in cond else ""
            if wanted and wanted in doc_types:
                state = "completed"; evidence = {"document_type": wanted}
            elif "resume" in doc_types and item["key"] == "resume":
                state = "completed"; evidence = {"document_type": "resume"}
        elif item["kind"] == "attest":
            p = prev.get(item["key"])
            if p and p.get("attested"):
                state = "completed"
                evidence = {"attested_at": p.get("attested_at"), "note": p.get("note")}

        row = {
            "item_key": item["key"],
            "title": item["title"],
            "kind": item["kind"],
            "state": state,
            "evidence": evidence,
            "updated_at": now_iso(),
        }
        await db.ereadiness_progress.update_one(
            {"participant_user_id": uid, "item_key": item["key"]},
            {"$set": {**row, "participant_user_id": uid,
                      "attested": (prev.get(item["key"]) or {}).get("attested", False),
                      "attested_at": (prev.get(item["key"]) or {}).get("attested_at"),
                      "note": (prev.get(item["key"]) or {}).get("note"),
                      "created_at": (prev.get(item["key"]) or {}).get("created_at") or now_iso()}},
            upsert=True,
        )
        out.append(row)
    return out


# =============================================================================
#  AFFIRMATIONS
# =============================================================================
AFFIRMATIONS = [
    "You do not have to rebuild everything today. Choose the next right step.",
    "Progress counts even when it happens one document, one appointment, or one decision at a time.",
    "Your past is information. It does not have to be your destination.",
    "Small consistent action outperforms occasional big effort.",
    "Asking for help is still taking action.",
    "You are allowed to build something different from what came before.",
    "Stability is built one decision at a time.",
    "You do not have to solve everything today. Choose the next thing.",
    "One completed step is still movement.",
    "The version of you that is showing up right now is enough for today.",
    "Every requirement you meet is a door that opens the next one.",
    "You are already doing something most people never try — starting over.",
    "Grace and accountability can live in the same day.",
    "Setback is not the same as failure. Adjust and keep moving.",
    "Your future is a series of small choices you can make one at a time.",
    "There is no rush that requires you to skip the basics.",
    "The people who succeed at reentry are the ones who ask questions early.",
    "You can pause. You cannot quit yourself.",
    "You are the author of the next chapter — one sentence a day is still writing.",
    "Doing hard things while tired is what building a life looks like.",
    "You do not have to feel ready to begin.",
    "It is okay to celebrate a paid bill, a kept appointment, a completed form.",
    "Rebuilding is not a race. Keep your own pace.",
    "One boundary held is one relationship protected.",
    "You do not have to explain your whole story to move forward with one step.",
    "You are worth the follow-through you are giving yourself.",
    "Every check-in you make on time is proof of a new pattern.",
    "You are choosing something different today. That matters.",
    "Momentum is built by the tenth attempt, not the first.",
    "The best time to start something small was already. The next best time is now.",
]


def _affirmation_for(date: _dt.date) -> str:
    idx = (date.toordinal()) % len(AFFIRMATIONS)
    return AFFIRMATIONS[idx]


# =============================================================================
#  HUB VISITS (continue-where-you-left-off)
# =============================================================================
class HubVisitIn(BaseModel):
    key: str          # section key or route slug
    label: str
    route: str


# =============================================================================
#  REGISTER
# =============================================================================
def register(_db, _api_router, _current_user, _require_role, _now_iso, _new_id, _audit_fn, _staff_can):
    global db, api_router, current_user, require_role, now_iso, new_id, _audit, _staff_can_access_participant
    db = _db; api_router = _api_router; current_user = _current_user
    require_role = _require_role; now_iso = _now_iso; new_id = _new_id
    _audit = _audit_fn; _staff_can_access_participant = _staff_can

    # One-time hardening for hub_visits: race-safe unique compound index +
    # de-dup of any pre-existing duplicate rows. Runs once at import time.
    async def _harden_hub_visits():
        try:
            # De-dup existing (participant_user_id, key) groups, keeping the most
            # recent last_visited_at document.
            pipeline = [
                {"$group": {
                    "_id": {"u": "$participant_user_id", "k": "$key"},
                    "docs": {"$push": {"_id": "$_id", "ts": "$last_visited_at"}},
                    "n": {"$sum": 1},
                }},
                {"$match": {"n": {"$gt": 1}}},
            ]
            async for grp in db.hub_visits.aggregate(pipeline):
                sorted_docs = sorted(grp["docs"], key=lambda d: d.get("ts") or "", reverse=True)
                stale = [d["_id"] for d in sorted_docs[1:]]
                if stale:
                    await db.hub_visits.delete_many({"_id": {"$in": stale}})
            await db.hub_visits.create_index(
                [("participant_user_id", 1), ("key", 1)], unique=True, name="uniq_uid_key",
            )
        except Exception:
            logger.exception("hub_visits hardening failed (non-fatal)")

    import asyncio as _asyncio
    try:
        _asyncio.get_event_loop().create_task(_harden_hub_visits())
    except Exception:
        pass

    # -------- Full Path Forward Blueprint --------
    @api_router.get("/blueprint-intake/schema")
    async def bp_schema(user: dict = Depends(current_user)):
        return {"sections": [
            {"id": s["id"], "title": s["title"], "eyebrow": s.get("eyebrow"),
             "questions": s["questions"]}
            for s in FULL_BLUEPRINT_SCHEMA
        ]}

    @api_router.get("/blueprint-intake/state")
    async def bp_state(user: dict = Depends(current_user)):
        await _carry_forward_from_intake(user["user_id"])
        prog = await _bp_progress(user["user_id"])
        answers = await db.blueprint_full_responses.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(500)
        return {"progress": prog, "answers": answers}

    @api_router.put("/blueprint-intake/answer")
    async def bp_answer(body: FullBlueprintAnswer, user: dict = Depends(current_user)):
        section = next((s for s in FULL_BLUEPRINT_SCHEMA if s["id"] == body.section), None)
        if not section: raise HTTPException(400, "Unknown section")
        q = next((q for q in section["questions"] if q["key"] == body.key), None)
        if not q: raise HTTPException(400, "Unknown question")
        if body.meta and body.meta not in _ALLOWED_META:
            raise HTTPException(400, "Invalid meta")
        await db.blueprint_full_responses.update_one(
            {"participant_user_id": user["user_id"], "section": body.section, "key": body.key},
            {"$set": {"id": new_id("bpr_"), "participant_user_id": user["user_id"],
                      "section": body.section, "key": body.key,
                      "value": body.value, "meta": body.meta,
                      "source": "participant", "updated_at": now_iso()}},
            upsert=True,
        )
        total = _total_questions()
        answered = await db.blueprint_full_responses.count_documents(
            {"participant_user_id": user["user_id"]})
        await db.blueprint_full_progress.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {"pct": round(answered / total * 100),
                      "current_section": body.section,
                      "last_activity_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True, "pct": round(answered / total * 100)}

    @api_router.post("/blueprint-intake/complete")
    async def bp_complete(user: dict = Depends(current_user)):
        await db.blueprint_full_progress.update_one(
            {"participant_user_id": user["user_id"]},
            {"$set": {"completed_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True, "summary": await _summary_for(user["user_id"])}

    async def _summary_for(uid: str) -> dict:
        rows = await db.blueprint_full_responses.find(
            {"participant_user_id": uid}, {"_id": 0}).to_list(500)
        by_key = {(r["section"], r["key"]): r for r in rows}
        return _summarize(by_key)

    @api_router.get("/blueprint-intake/summary")
    async def bp_summary(user: dict = Depends(current_user)):
        return await _summary_for(user["user_id"])

    # -------- Assessments --------
    @api_router.get("/assessments/catalog")
    async def assess_catalog(user: dict = Depends(current_user)):
        results = await db.assessment_results.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0, "assessment_id": 1, "completed_at": 1}).to_list(20)
        done = {r["assessment_id"]: r for r in results}
        return {"assessments": [
            {"id": a["id"], "title": a["title"], "description": a["description"],
             "question_count": len(a["questions"]),
             "completed_at": done.get(a["id"], {}).get("completed_at")}
            for a in ASSESSMENT_SCHEMAS.values()
        ]}

    @api_router.get("/assessments/schema/{assessment_id}")
    async def assess_schema(assessment_id: str, user: dict = Depends(current_user)):
        a = ASSESSMENT_SCHEMAS.get(assessment_id)
        if not a: raise HTTPException(404, "Unknown assessment")
        return a

    @api_router.get("/assessments/state/{assessment_id}")
    async def assess_state(assessment_id: str, user: dict = Depends(current_user)):
        if assessment_id not in ASSESSMENT_SCHEMAS: raise HTTPException(404, "Unknown assessment")
        answers = await db.assessment_responses.find(
            {"participant_user_id": user["user_id"], "assessment_id": assessment_id},
            {"_id": 0}).to_list(50)
        result = await db.assessment_results.find_one(
            {"participant_user_id": user["user_id"], "assessment_id": assessment_id},
            {"_id": 0})
        return {"answers": answers, "result": result}

    @api_router.put("/assessments/answer")
    async def assess_answer(body: AssessmentAnswer, user: dict = Depends(current_user)):
        schema = ASSESSMENT_SCHEMAS.get(body.assessment_id)
        if not schema: raise HTTPException(400, "Unknown assessment")
        if not any(q["key"] == body.key for q in schema["questions"]):
            raise HTTPException(400, "Unknown question")
        await db.assessment_responses.update_one(
            {"participant_user_id": user["user_id"],
             "assessment_id": body.assessment_id, "key": body.key},
            {"$set": {"id": new_id("ar_"), "participant_user_id": user["user_id"],
                      "assessment_id": body.assessment_id, "key": body.key,
                      "value": body.value, "updated_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True}

    @api_router.post("/assessments/complete/{assessment_id}")
    async def assess_complete(assessment_id: str, user: dict = Depends(current_user)):
        schema = ASSESSMENT_SCHEMAS.get(assessment_id)
        if not schema: raise HTTPException(400, "Unknown assessment")
        answers = await db.assessment_responses.find(
            {"participant_user_id": user["user_id"], "assessment_id": assessment_id},
            {"_id": 0}).to_list(50)
        answered_keys = {r["key"] for r in answers}
        required = {q["key"] for q in schema["questions"]}
        missing = required - answered_keys
        if missing:
            raise HTTPException(400, f"Missing answers: {sorted(missing)}")
        by_key = {r["key"]: r.get("value") for r in answers}
        scoring = _score(assessment_id, by_key)
        result = {
            "id": new_id("ares_"),
            "participant_user_id": user["user_id"],
            "assessment_id": assessment_id,
            "scoring": scoring,
            "completed_at": now_iso(),
            "created_at": now_iso(),
        }
        await db.assessment_results.update_one(
            {"participant_user_id": user["user_id"], "assessment_id": assessment_id},
            {"$set": result}, upsert=True,
        )
        # Refresh employment readiness — career_exploration flips to completed when all 4 done
        await _evaluate_ereadiness(user["user_id"])
        return {"ok": True, "result": result}

    @api_router.get("/assessments/results")
    async def assess_results(user: dict = Depends(current_user)):
        rows = await db.assessment_results.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).to_list(20)
        return {"results": rows}

    # -------- Employment Readiness --------
    @api_router.get("/ereadiness/progress")
    async def ereadiness_progress(user: dict = Depends(current_user)):
        rows = await _evaluate_ereadiness(user["user_id"])
        done = sum(1 for r in rows if r["state"] == "completed")
        return {"items": rows, "total": len(rows), "completed": done,
                "pct": round(done / max(1, len(rows)) * 100)}

    @api_router.post("/ereadiness/attest/{item_key}")
    async def ereadiness_attest(item_key: str, body: AttestIn, user: dict = Depends(current_user)):
        item = next((i for i in EREADINESS_CATALOG if i["key"] == item_key), None)
        if not item: raise HTTPException(404, "Unknown item")
        if item["kind"] != "attest":
            raise HTTPException(400, "This item cannot be self-attested — real evidence is required")
        await db.ereadiness_progress.update_one(
            {"participant_user_id": user["user_id"], "item_key": item_key},
            {"$set": {"participant_user_id": user["user_id"], "item_key": item_key,
                      "attested": bool(body.attested),
                      "attested_at": now_iso() if body.attested else None,
                      "note": body.note, "updated_at": now_iso()},
             "$setOnInsert": {"created_at": now_iso()}},
            upsert=True,
        )
        # Re-evaluate to update state row consistently
        rows = await _evaluate_ereadiness(user["user_id"])
        return {"ok": True, "items": rows}

    @api_router.post("/ereadiness/refresh")
    async def ereadiness_refresh(user: dict = Depends(current_user)):
        return {"items": await _evaluate_ereadiness(user["user_id"])}

    # Staff-side visibility (percentage only, not private answers)
    @api_router.get("/staff/participants/{enrollment_id}/ereadiness")
    async def staff_ereadiness(enrollment_id: str,
                                user: dict = Depends(require_role("super_admin", "program_admin", "program_staff"))):
        en = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
        if not en: raise HTTPException(404, "Enrollment not found")
        if not await _staff_can_access_participant(user, en["participant_user_id"]):
            raise HTTPException(403, "Out of scope")
        rows = await _evaluate_ereadiness(en["participant_user_id"])
        done = sum(1 for r in rows if r["state"] == "completed")
        # Strip evidence bodies for staff — keep state + title + kind only.
        stripped = [{"item_key": r["item_key"], "title": r["title"],
                     "kind": r["kind"], "state": r["state"]} for r in rows]
        return {"items": stripped, "total": len(rows), "completed": done,
                "pct": round(done / max(1, len(rows)) * 100)}

    # -------- Affirmations --------
    @api_router.get("/affirmations/today")
    async def affirmation_today(user: dict = Depends(current_user)):
        today = _dt.date.today()
        return {"date": today.isoformat(),
                "text": _affirmation_for(today),
                "total": len(AFFIRMATIONS)}

    # -------- Hub visits (continue-where-you-left-off) --------
    @api_router.post("/hub-visits")
    async def hub_visit_upsert(body: HubVisitIn, user: dict = Depends(current_user)):
        await db.hub_visits.update_one(
            {"participant_user_id": user["user_id"], "key": body.key},
            {"$set": {"participant_user_id": user["user_id"],
                      "key": body.key, "label": body.label,
                      "route": body.route, "last_visited_at": now_iso()},
             "$setOnInsert": {"id": new_id("hv_"), "created_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True}

    @api_router.get("/hub-visits/recent")
    async def hub_visits_recent(user: dict = Depends(current_user)):
        rows = await db.hub_visits.find(
            {"participant_user_id": user["user_id"]}, {"_id": 0}).sort("last_visited_at", -1).limit(5).to_list(5)
        return {"visits": rows}
