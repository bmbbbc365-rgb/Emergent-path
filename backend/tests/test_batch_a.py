"""Batch A backend tests — Full Blueprint, Assessments, Employment Readiness gating,
Affirmations, and Hub Visits.

Runs against the live preview backend via REACT_APP_BACKEND_URL."""
import io
import uuid

import pytest
import requests

from conftest import API


def _fresh_user():
    email = f"batchA_{uuid.uuid4().hex[:10]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "BatchA1!", "name": "Batch A"}, timeout=30)
    assert r.status_code == 200, r.text[:200]
    return {"email": email, "token": r.json()["session_token"], "user_id": r.json()["user_id"]}


def _auth(u):
    return {"Authorization": f"Bearer {u['token']}"}


class TestFullBlueprint:
    def test_schema_has_13_sections_and_30ish_questions(self, token):
        r = requests.get(f"{API}/blueprint-intake/schema", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text
        sections = r.json()["sections"]
        assert len(sections) == 13
        total_q = sum(len(s["questions"]) for s in sections)
        assert total_q >= 28 and total_q <= 32, f"expected ~30 questions, got {total_q}"

    def test_state_starts_at_zero_and_progress_advances(self):
        u = _fresh_user()
        s = requests.get(f"{API}/blueprint-intake/state", headers=_auth(u), timeout=30).json()
        assert s["progress"]["pct"] == 0
        r = requests.put(f"{API}/blueprint-intake/answer",
                         headers=_auth(u),
                         json={"section": "immediate", "key": "housing_safe_tonight", "value": "yes"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["pct"] > 0
        s2 = requests.get(f"{API}/blueprint-intake/state", headers=_auth(u), timeout=30).json()
        assert s2["progress"]["pct"] > 0
        assert len(s2["answers"]) == 1

    def test_carry_forward_from_intake(self):
        u = _fresh_user()
        # Answer the Quick Check-In first
        requests.put(f"{API}/onboarding/answer", headers=_auth(u),
                     json={"section": "immediate", "key": "housing_safe_tonight", "value": "yes"}, timeout=30)
        # Now load Full Blueprint state — should carry it forward
        s = requests.get(f"{API}/blueprint-intake/state", headers=_auth(u), timeout=30).json()
        carried = [a for a in s["answers"] if a.get("source") == "carried_from_intake"]
        assert any(a["key"] == "housing_safe_tonight" for a in carried)

    def test_summary_and_completion(self):
        u = _fresh_user()
        # Answer enough to generate a summary
        pairs = [
            ("immediate", "housing_safe_tonight", "yes"),
            ("immediate", "food_two_days", "no"),
            ("housing_stability", "housing_stability_30d", 5),
            ("id_documents", "docs_have", ["Social Security card", "Birth certificate"]),
            ("transportation", "id_status", "State ID"),
            ("employment", "employed_now", "Not employed"),
            ("employment", "job_ready_1_5", 3),
            ("support_system", "has_trust_person", "yes"),
            ("financial", "bank_account_status", "No"),
            ("financial", "priority_ranking", ["Documents / ID", "Housing", "Employment"]),
        ]
        for (sec, key, val) in pairs:
            requests.put(f"{API}/blueprint-intake/answer", headers=_auth(u),
                         json={"section": sec, "key": key, "value": val}, timeout=30)
        r = requests.post(f"{API}/blueprint-intake/complete", headers=_auth(u), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        s = d["summary"]
        assert "strengths" in s and "priorities" in s and "immediate" in s
        assert any("Social Security" in x for x in s["strengths"])
        assert any("Food" in x or "food" in x for x in s["immediate"])
        assert any("bank" in x.lower() for x in s["priorities"])


class TestAssessments:
    def test_catalog_lists_four(self, token):
        r = requests.get(f"{API}/assessments/catalog", headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200
        ids = {a["id"] for a in r.json()["assessments"]}
        assert ids == {"work_style", "values", "interests", "workforce"}

    def test_answer_and_complete_work_style(self):
        u = _fresh_user()
        schema = requests.get(f"{API}/assessments/schema/work_style", headers=_auth(u), timeout=30).json()
        # Answer every question with the first option / a scale value
        for q in schema["questions"]:
            if q["type"] == "choice":
                val = q["options"][0]
            elif q["type"] == "scale_1_5":
                val = 4
            else:
                val = "n/a"
            requests.put(f"{API}/assessments/answer", headers=_auth(u),
                         json={"assessment_id": "work_style", "key": q["key"], "value": val}, timeout=30)
        r = requests.post(f"{API}/assessments/complete/work_style", headers=_auth(u), timeout=30)
        assert r.status_code == 200
        assert "themes" in r.json()["result"]["scoring"]

    def test_complete_fails_when_missing_answers(self):
        u = _fresh_user()
        # No answers at all
        r = requests.post(f"{API}/assessments/complete/work_style", headers=_auth(u), timeout=30)
        assert r.status_code == 400
        assert "Missing" in r.text


class TestEmploymentReadiness:
    def test_progress_starts_all_not_started(self):
        u = _fresh_user()
        r = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert len(d["items"]) >= 8
        assert d["completed"] == 0

    def test_cannot_attest_verifiable_item(self):
        u = _fresh_user()
        r = requests.post(f"{API}/ereadiness/attest/career_exploration",
                          headers=_auth(u), json={"attested": True}, timeout=30)
        assert r.status_code == 400

    def test_attest_allowed_for_attest_items(self):
        u = _fresh_user()
        r = requests.post(f"{API}/ereadiness/attest/reliable_transport",
                          headers=_auth(u), json={"attested": True, "note": "I have a bus pass"}, timeout=30)
        assert r.status_code == 200
        items = {i["item_key"]: i for i in r.json()["items"]}
        assert items["reliable_transport"]["state"] == "completed"

    def test_completing_all_four_assessments_unlocks_career_exploration(self):
        u = _fresh_user()
        # Complete each of the 4 assessments with valid answers
        for aid in ("work_style", "values", "interests", "workforce"):
            schema = requests.get(f"{API}/assessments/schema/{aid}", headers=_auth(u), timeout=30).json()
            for q in schema["questions"]:
                if q["type"] == "choice":
                    val = q["options"][0]
                elif q["type"] == "multi_select" or q["type"] == "multi_select_max_6":
                    val = q["options"][:2]
                elif q["type"] == "rank_top_3":
                    val = q["options"][:3]
                elif q["type"] == "scale_1_5":
                    val = 3
                elif q["type"] == "yes_no_unsure":
                    val = "yes"
                else:
                    val = "n/a"
                requests.put(f"{API}/assessments/answer", headers=_auth(u),
                             json={"assessment_id": aid, "key": q["key"], "value": val}, timeout=30)
            r = requests.post(f"{API}/assessments/complete/{aid}", headers=_auth(u), timeout=30)
            assert r.status_code == 200, r.text[:200]

        r = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30)
        assert r.status_code == 200
        items = {i["item_key"]: i for i in r.json()["items"]}
        assert items["career_exploration"]["state"] == "completed"

    def test_resume_evidence_gate(self):
        u = _fresh_user()
        # Upload a document classified as 'resume' via the plain upload endpoint,
        # then mark its document_type via patch
        files = {"file": (f"{uuid.uuid4().hex}.txt", io.BytesIO(b"a resume"), "text/plain")}
        r = requests.post(f"{API}/documents/upload",
                          params={"section": "documents", "category": "employment", "label": "My Resume"},
                          files=files, headers=_auth(u), timeout=30)
        assert r.status_code == 200
        # The documents collection has no dedicated PATCH to set document_type, but the
        # confirm endpoint does. Use raw update via document type: emulate by inserting via analyze path.
        # Simpler: directly patch section/category via existing PATCH, then set document_type via a mongo-side helper.
        # For test purposes, use the confirm endpoint which accepts document_type.
        doc_id = r.json()["id"]
        c = requests.post(f"{API}/documents/{doc_id}/confirm", headers=_auth(u),
                          json={"document_type": "resume", "category": "employment",
                                "related_sections": ["documents"], "fields": [],
                                "keep_sensitive_field_keys": []}, timeout=30)
        assert c.status_code == 200

        rp = requests.get(f"{API}/ereadiness/progress", headers=_auth(u), timeout=30).json()
        items = {i["item_key"]: i for i in rp["items"]}
        assert items["resume"]["state"] == "completed"


class TestAffirmations:
    def test_today_deterministic(self, token):
        h = {"Authorization": f"Bearer {token}"}
        a1 = requests.get(f"{API}/affirmations/today", headers=h, timeout=30).json()
        a2 = requests.get(f"{API}/affirmations/today", headers=h, timeout=30).json()
        assert a1["text"] == a2["text"]
        assert len(a1["text"]) > 10


class TestHubVisits:
    def test_track_and_recent(self):
        u = _fresh_user()
        for i in range(3):
            requests.post(f"{API}/hub-visits", headers=_auth(u),
                          json={"key": f"housing", "label": "Housing", "route": "/app/living/housing"}, timeout=30)
        requests.post(f"{API}/hub-visits", headers=_auth(u),
                      json={"key": "banking", "label": "Banking", "route": "/app/living/banking"}, timeout=30)
        r = requests.get(f"{API}/hub-visits/recent", headers=_auth(u), timeout=30)
        assert r.status_code == 200
        keys = [v["key"] for v in r.json()["visits"]]
        # Both should be present, most recent first
        assert "banking" in keys and "housing" in keys
        assert keys[0] == "banking"
