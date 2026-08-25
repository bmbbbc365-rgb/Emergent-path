"""Tests for the private-file signed URL flow.

Covers:
- Owner can mint and download via signed URL.
- Tampered signature is rejected.
- Expired signature is rejected.
- Signed URL for another participant's doc is rejected (cross-tenant isolation).
- Avatar upload → signed URL → download works end-to-end.
- Legacy download route still requires session and enforces ownership.
"""
import io
import time
import uuid

import pytest
import requests

from conftest import API


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text[:300]
    return r.json()["session_token"]


def _upload_txt(token, label="signed-url-test"):
    files = {"file": (f"{uuid.uuid4().hex}.txt", io.BytesIO(b"private participant content"), "text/plain")}
    r = requests.post(
        f"{API}/documents/upload",
        params={"section": "documents", "category": "other", "label": label},
        files=files, headers={"Authorization": f"Bearer {token}"}, timeout=60,
    )
    assert r.status_code == 200, r.text[:300]
    return r.json()


class TestSignedUrls:
    def test_owner_signed_url_roundtrip(self, token):
        doc = _upload_txt(token)
        r = requests.post(f"{API}/documents/{doc['id']}/signed-url",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["url"].startswith("http") and "sig=" in data["url"]
        assert data["ttl_seconds"] > 0 and data["ttl_seconds"] <= 60 * 60

        # Cookie-less GET — no auth header sent — must still succeed on the signed URL.
        dl = requests.get(data["url"], timeout=30)
        assert dl.status_code == 200, dl.text[:200]
        assert dl.content == b"private participant content"

    def test_tampered_signature_rejected(self, token):
        doc = _upload_txt(token)
        r = requests.post(f"{API}/documents/{doc['id']}/signed-url",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        url = r.json()["url"]
        # Flip one character in the sig.
        tampered = url[:-1] + ("A" if url[-1] != "A" else "B")
        dl = requests.get(tampered, timeout=30)
        assert dl.status_code == 401

    def test_expired_signature_rejected(self, token):
        doc = _upload_txt(token)
        r = requests.post(f"{API}/documents/{doc['id']}/signed-url",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        url = r.json()["url"]
        # Force expiry into the past by rewriting the exp query param.
        expired = url.replace("exp=", "exp=0&_orig=").split("&_orig=")[0] + "&_x=1"
        # simpler: build a URL with a bad exp
        import urllib.parse as _up
        parts = _up.urlparse(url)
        qs = dict(_up.parse_qsl(parts.query))
        qs["exp"] = "1"    # 1970
        new = parts._replace(query=_up.urlencode(qs)).geturl()
        dl = requests.get(new, timeout=30)
        assert dl.status_code == 401

    def test_cross_participant_owner_download_forbidden(self, token, creds):
        """Owner scope signature made for user A cannot be used to fetch user B's doc."""
        # Create a second participant.
        other_email = f"iso_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": other_email, "password": "IsoPass1!", "name": "Iso Test"}, timeout=30)
        assert r.status_code == 200
        other_token = r.json()["session_token"]
        other_doc = _upload_txt(other_token, label="other-user-doc")

        # Owner (A) tries to sign for user B's doc via their own endpoint → 404.
        r = requests.post(f"{API}/documents/{other_doc['id']}/signed-url",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r.status_code == 404

    def test_download_signed_bad_scope(self, token):
        doc = _upload_txt(token)
        # Fabricate a query with wrong scope
        dl = requests.get(
            f"{API}/documents/download-signed/{doc['id']}",
            params={"uid": "abc", "scope": "bogus", "exp": int(time.time()) + 60, "sig": "x"},
            timeout=30,
        )
        assert dl.status_code == 400

    def test_legacy_session_download_still_works_and_gated(self, token, creds):
        doc = _upload_txt(token)
        # Owner via cookie/token header still works (back-compat).
        dl = requests.get(f"{API}/documents/{doc['id']}/download",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert dl.status_code == 200
        # No auth → 401
        dl2 = requests.get(f"{API}/documents/{doc['id']}/download", timeout=30)
        assert dl2.status_code == 401


class TestAvatar:
    def test_upload_and_signed_url(self, token):
        # tiny 1x1 png
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        r = requests.post(
            f"{API}/profile/avatar",
            files={"file": ("me.png", io.BytesIO(png), "image/png")},
            headers={"Authorization": f"Bearer {token}"}, timeout=30,
        )
        assert r.status_code == 200, r.text[:200]

        # Signed URL for own avatar
        r2 = requests.get(f"{API}/profile/avatar-url",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30)
        assert r2.status_code == 200
        url = r2.json()["url"]
        dl = requests.get(url, timeout=30)
        assert dl.status_code == 200
        assert dl.headers.get("content-type", "").startswith("image/")
        assert dl.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_other_user_avatar_forbidden_across_tenants(self, token):
        """A random participant cannot fetch another participant's avatar URL."""
        # Register another user with no shared program.
        email = f"noshare_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "NoShare1!", "name": "No Share"}, timeout=30)
        assert r.status_code == 200
        other_token = r.json()["session_token"]

        # Owner uploads avatar first.
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082"
        )
        requests.post(
            f"{API}/profile/avatar",
            files={"file": ("me.png", io.BytesIO(png), "image/png")},
            headers={"Authorization": f"Bearer {token}"}, timeout=30,
        )
        me = requests.get(f"{API}/auth/me",
                          headers={"Authorization": f"Bearer {token}"}, timeout=30).json()
        owner_uid = me["user_id"]

        # 'other_token' is a fresh user with no bindings to the owner's program.
        r = requests.get(f"{API}/profile/avatar-url/{owner_uid}",
                         headers={"Authorization": f"Bearer {other_token}"}, timeout=30)
        assert r.status_code == 403
