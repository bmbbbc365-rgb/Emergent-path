import os
import re
from pathlib import Path

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")


@pytest.fixture(scope="module")
def creds():
    content = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    email = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?email(?:\*\*)?\s*:\s*`?([^`\s]+)', content)
    pwd = re.search(r'(?im)^\s*(?:[-*]\s*)?(?:\*\*)?password(?:\*\*)?\s*:\s*`?([^`\s]+)', content)
    assert email and pwd
    return {"email": email.group(1), "password": pwd.group(1)}


@pytest.fixture(scope="module")
def client(creds):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=30)
    if r.status_code != 200:
        pytest.fail(f"login failed {r.status_code}: {r.text[:300]}")
    token = r.json().get("token") or r.json().get("access_token")
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# Bridge suggestions: must return >= 3 items for fully-seeded owner
def test_bridge_suggestions_min_three(client):
    r = client.get(f"{BASE_URL}/api/bridge/suggestions", timeout=30)
    assert r.status_code == 200, r.text[:300]
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 3, f"only {len(data)} suggestions: {data}"
    assert len(set(data)) == len(data), f"duplicate suggestions: {data}"
    assert all(isinstance(x, str) and x.strip() for x in data)


# Regression: dashboard summary still renders data for the owner
def test_dashboard_summary(client):
    r = client.get(f"{BASE_URL}/api/dashboard/summary", timeout=30)
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    for key in ["required", "requirements", "employment", "benefits", "health"]:
        assert key in d, f"missing {key} in {list(d.keys())}"
