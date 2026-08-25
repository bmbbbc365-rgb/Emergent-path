"""Tests for Batch A follow-up: server-scored quizzes, video-watch progress,
private journal, and automatic Employment Readiness gate flipping.
"""
import io
import uuid

import pytest
import requests

from conftest import API


def _fresh_user():
    email = f"batchB_{uuid.uuid4().hex[:10]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "BatchB1!", "name": "Batch B"}, timeout=30)
    assert r.status_code == 200
    return {"email": email, "token": r.json()["session_token"], "user_id": r.json()["user_id"]}


def _auth(u):
    return {"Authorization": f"Bearer {u['token']}"}


class TestQuizzes:
    def test_public_quiz_hides_correct_answers(self, token):
        r = requests.get(f"{API}/quizzes/workplace_expectations",
                         headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200
        q = r.json()["quiz"]
        assert q["id"] == "workplace_expectations"
        assert len(q["questions"]) >= 5
        for qi in q["questions"]:
            assert "answer" not in qi, "public quiz must not leak correct answers"

    def test_submit_and_pass_flips_ereadiness(self):
        u = _fresh_user()
        # Submit all-correct answers (indexes hardcoded to match QUIZ_BANK)
        # Q1 -> B (1), Q2 -> B (1), Q3 -> C (2), Q4 -> B (1), Q5 -> C (2)
        payload = {"answers": {"0": 1, "1": 1, "2": 2, "3": 1, "4": 2}}
        r = requests.post(f"{API}/quizzes/workplace_expectations/submit",
                          headers=_auth(u), json=payload, timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["result"]["passed"] is True
        assert d["result"]["score_pct"] == 100
        assert len(d["feedback"]) == 5

        # Ereadiness should now show workplace_expectations completed
        rp = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30).json()
        items = {i["item_key"]: i for i in rp["items"]}
        assert items["workplace_expectations"]["state"] == "completed"

    def test_submit_partial_does_not_flip(self):
        u = _fresh_user()
        # All wrong answers
        payload = {"answers": {"0": 0, "1": 0, "2": 0, "3": 0, "4": 0}}
        r = requests.post(f"{API}/quizzes/workplace_expectations/submit",
                          headers=_auth(u), json=payload, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["result"]["passed"] is False
        rp = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30).json()
        items = {i["item_key"]: i for i in rp["items"]}
        assert items["workplace_expectations"]["state"] != "completed"


class TestVideoWatchProgress:
    def test_watch_percent_only_moves_forward_and_auto_completes(self):
        u = _fresh_user()
        # Get a real lesson id from the seeded library
        courses = requests.get(f"{API}/education/courses", headers=_auth(u), timeout=30).json()
        assert courses, "seed courses must exist"
        cid = courses[0]["id"]
        detail = requests.get(f"{API}/education/course/{cid}", headers=_auth(u), timeout=30).json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]

        # First ping: 45%
        r = requests.post(f"{API}/education/lesson-progress-percent", headers=_auth(u),
                          json={"lesson_id": lesson_id, "percent_viewed": 45}, timeout=30)
        assert r.status_code == 200
        assert r.json()["progress"] == 45
        assert r.json()["completed"] is False

        # Scrub back to 10 — earned progress should NOT decrease
        r = requests.post(f"{API}/education/lesson-progress-percent", headers=_auth(u),
                          json={"lesson_id": lesson_id, "percent_viewed": 10}, timeout=30)
        assert r.json()["progress"] == 45

        # Cross 90 — auto-complete
        r = requests.post(f"{API}/education/lesson-progress-percent", headers=_auth(u),
                          json={"lesson_id": lesson_id, "percent_viewed": 92}, timeout=30)
        assert r.json()["progress"] == 92
        assert r.json()["completed"] is True


class TestEreadinessLessonTitleGating:
    def test_interview_lesson_completion_flips_gate(self):
        u = _fresh_user()
        # Find the "Interview Basics" course/lesson and mark it completed
        courses = requests.get(f"{API}/education/courses", headers=_auth(u), timeout=30).json()
        interview_c = next((c for c in courses if "interview" in c["title"].lower()), None)
        assert interview_c, "Interview Basics course must exist in the seed"
        detail = requests.get(f"{API}/education/course/{interview_c['id']}", headers=_auth(u), timeout=30).json()
        lesson_id = detail["modules"][0]["lessons"][0]["id"]

        # Legacy endpoint marks completed
        r = requests.post(f"{API}/education/lesson-progress", headers=_auth(u),
                          json={"lesson_id": lesson_id, "progress": 100, "completed": True}, timeout=30)
        assert r.status_code == 200

        # Ereadiness should show interview_prep completed via lesson_title match
        rp = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30).json()
        items = {i["item_key"]: i for i in rp["items"]}
        assert items["interview_prep"]["state"] == "completed"


class TestJournal:
    def test_create_list_delete_isolated(self):
        u1 = _fresh_user()
        u2 = _fresh_user()

        # u1 creates entries
        r = requests.post(f"{API}/journal/entries", headers=_auth(u1),
                          json={"body": "Kept my appointment today.", "mood": 4}, timeout=30)
        assert r.status_code == 200
        e1 = r.json()
        assert e1["body"].startswith("Kept my appointment")

        # u1 lists — sees 1
        rl = requests.get(f"{API}/journal/entries", headers=_auth(u1), timeout=30).json()
        assert rl["total"] == 1
        assert rl["entries"][0]["mood"] == 4

        # u2 must NOT see u1's entries
        rl2 = requests.get(f"{API}/journal/entries", headers=_auth(u2), timeout=30).json()
        assert rl2["total"] == 0

        # u2 cannot delete u1's entry
        r = requests.delete(f"{API}/journal/entries/{e1['id']}", headers=_auth(u2), timeout=30)
        assert r.status_code == 404

        # u1 deletes their own → gone
        r = requests.delete(f"{API}/journal/entries/{e1['id']}", headers=_auth(u1), timeout=30)
        assert r.status_code == 200
        rl = requests.get(f"{API}/journal/entries", headers=_auth(u1), timeout=30).json()
        assert rl["total"] == 0

    def test_empty_body_rejected(self):
        u = _fresh_user()
        r = requests.post(f"{API}/journal/entries", headers=_auth(u),
                          json={"body": "   "}, timeout=30)
        assert r.status_code == 400

    def test_mood_bounds(self):
        u = _fresh_user()
        r = requests.post(f"{API}/journal/entries", headers=_auth(u),
                          json={"body": "test", "mood": 9}, timeout=30)
        assert r.status_code == 400
