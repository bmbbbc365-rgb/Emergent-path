"""Production authorization boundaries for participant-owned information."""
import uuid

import requests

from conftest import API


def _fresh_participant():
    email = f"privacy_{uuid.uuid4().hex[:10]}@example.com"
    response = requests.post(
        f"{API}/auth/register",
        json={"email": email, "password": "Privacy1!", "name": "Privacy Tester"},
        timeout=30,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    return {"user_id": data["user_id"], "headers": {"Authorization": f"Bearer {data['session_token']}"}}


class TestStaffBoundaryRegression:
    def test_participant_cannot_open_staff_or_audit_surfaces(self):
        participant = _fresh_participant()
        for path in ("/staff/caseload", "/admin/journey", "/audit/events", "/invitations"):
            response = requests.get(f"{API}{path}", headers=participant["headers"], timeout=30)
            assert response.status_code == 403, f"{path} returned {response.status_code}: {response.text}"

    def test_staff_detail_contract_excludes_private_collections(self, client):
        caseload = client.get(f"{API}/staff/caseload", timeout=30)
        assert caseload.status_code == 200, caseload.text
        rows = caseload.json()
        if not rows:
            return
        detail = client.get(f"{API}/staff/participants/{rows[0]['enrollment']['id']}", timeout=30)
        assert detail.status_code == 200, detail.text
        payload = detail.json()
        forbidden = {"journal", "journal_entries", "health", "medications", "conditions", "wellness_logs", "support_circle", "support_contacts"}
        assert forbidden.isdisjoint(payload.keys()), payload.keys()

    def test_returned_evidence_requires_a_reason(self, client):
        caseload = client.get(f"{API}/staff/caseload", timeout=30)
        assert caseload.status_code == 200, caseload.text
        rows = caseload.json()
        if not rows:
            return
        detail = client.get(f"{API}/staff/participants/{rows[0]['enrollment']['id']}", timeout=30).json()
        if not detail.get("requirements"):
            return
        req_id = detail["requirements"][0]["id"]
        response = client.post(
            f"{API}/staff/requirements/{req_id}/verify",
            json={"decision": "returned", "reason": "   "},
            timeout=30,
        )
        assert response.status_code == 400, response.text
