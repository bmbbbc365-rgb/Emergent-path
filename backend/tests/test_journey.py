"""Graduation Journey backend tests.

Runs against the live preview backend via REACT_APP_BACKEND_URL. Uses fresh
throwaway participant accounts so no seed data is mutated. Admin flows are
covered via the super_admin owner account provided by conftest.token."""
import uuid

import pytest
import requests

from conftest import API


def _fresh():
    email = f"journey_{uuid.uuid4().hex[:10]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "Journey1!", "name": "Journey Tester"},
                      timeout=30)
    assert r.status_code == 200, r.text[:200]
    b = r.json()
    return {"email": email, "token": b["session_token"], "user_id": b["user_id"]}


def _h(u):
    return {"Authorization": f"Bearer {u['token']}"}


def _admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestParticipantState:
    def test_default_state_is_enter(self):
        u = _fresh()
        r = requests.get(f"{API}/journey/state", headers=_h(u), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["stage"] == "enter"
        s = d["state"]
        assert s["welcome_seen"] is False
        assert s["graduation_approved"] is False
        assert s["milestones"] == []
        # Signals present and shaped correctly
        sig = d["signals"]
        for k in ("blueprint_completed", "blueprint_pct", "assessments_completed",
                  "ereadiness_pct", "action_items_completed"):
            assert k in sig

    def test_welcome_seen_persists(self):
        u = _fresh()
        r = requests.post(f"{API}/journey/welcome-seen", headers=_h(u), json={"seen": True}, timeout=30)
        assert r.status_code == 200
        assert r.json()["state"]["welcome_seen"] is True
        # Idempotent + reload keeps it
        r2 = requests.get(f"{API}/journey/state", headers=_h(u), timeout=30)
        assert r2.json()["state"]["welcome_seen"] is True

    def test_transition_locked_without_graduation(self):
        u = _fresh()
        # Attempt to record interest before graduation → 400
        r = requests.post(f"{API}/journey/transition/interest", headers=_h(u),
                          json={"choice": "interested"}, timeout=30)
        assert r.status_code == 400
        # /transition/view is a silent no-op (returns state unchanged)
        r2 = requests.post(f"{API}/journey/transition/view", headers=_h(u), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["state"]["transition_viewed"] is False


class TestAdminGraduation:
    def test_admin_list_includes_participants(self, token):
        r = requests.get(f"{API}/admin/journey", headers=_admin_h(token), timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "participants" in d and isinstance(d["participants"], list)

    def test_unauth_admin_list_forbidden(self):
        u = _fresh()  # ordinary participant, no admin role
        r = requests.get(f"{API}/admin/journey", headers=_h(u), timeout=30)
        assert r.status_code == 403

    def test_full_graduation_flow(self, token):
        u = _fresh()
        uid = u["user_id"]
        # Admin approves graduation
        r = requests.post(f"{API}/admin/journey/{uid}/graduate",
                          headers=_admin_h(token),
                          json={"note": "e2e test"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["state"]["graduation_approved"] is True
        assert d["state"]["graduation_date"] is not None
        assert d["state"]["transition_offered_at"] is not None
        assert d["stage"] == "graduate"

        # Duplicate graduation blocked
        r_dup = requests.post(f"{API}/admin/journey/{uid}/graduate",
                              headers=_admin_h(token), json={}, timeout=30)
        assert r_dup.status_code == 400

        # Participant views transition
        r2 = requests.post(f"{API}/journey/transition/view", headers=_h(u), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["state"]["transition_viewed"] is True
        assert r2.json()["stage"] == "unlock"

        # Participant declines
        r3 = requests.post(f"{API}/journey/transition/interest", headers=_h(u),
                           json={"choice": "not_now"}, timeout=30)
        assert r3.status_code == 200
        assert r3.json()["state"]["interested_in_continuing"] is False
        # Stage stays "unlock" (they've viewed, not interested)
        assert r3.json()["stage"] == "unlock"

        # Participant re-decides: interested
        r4 = requests.post(f"{API}/journey/transition/interest", headers=_h(u),
                           json={"choice": "interested"}, timeout=30)
        assert r4.status_code == 200
        assert r4.json()["state"]["interested_in_continuing"] is True
        assert r4.json()["stage"] == "expand"

        # Admin revoke resets grad but keeps interest as historical record
        r5 = requests.post(f"{API}/admin/journey/{uid}/revoke-graduation",
                           headers=_admin_h(token), timeout=30)
        assert r5.status_code == 200
        st = r5.json()["state"]
        assert st["graduation_approved"] is False
        # With graduation gone, stage should fall back to build (Blueprint isn't complete for a fresh user)
        assert r5.json()["stage"] in ("enter", "build")

    def test_admin_milestone_add_and_remove(self, token):
        u = _fresh()
        uid = u["user_id"]
        r = requests.post(f"{API}/admin/journey/{uid}/milestone",
                          headers=_admin_h(token),
                          json={"key": "employment_secured", "label": "Employment secured",
                                "note": "Full-time role"}, timeout=30)
        assert r.status_code == 200
        milestones = r.json()["state"]["milestones"]
        assert len(milestones) == 1
        mid = milestones[0]["id"]
        # Remove
        r2 = requests.delete(f"{API}/admin/journey/{uid}/milestone/{mid}",
                             headers=_admin_h(token), timeout=30)
        assert r2.status_code == 200
        assert r2.json()["state"]["milestones"] == []

    def test_graduate_unknown_user_404(self, token):
        r = requests.post(f"{API}/admin/journey/user_does_not_exist/graduate",
                          headers=_admin_h(token), json={}, timeout=30)
        assert r.status_code == 404

    def test_participant_cannot_graduate_self(self):
        u = _fresh()
        r = requests.post(f"{API}/admin/journey/{u['user_id']}/graduate",
                          headers=_h(u), json={}, timeout=30)
        assert r.status_code == 403
