"""Batch A — Universal Resource Registry (resources_v2) API tests."""
import requests
import pytest


# ---------- module: resources_v2 — pathways ----------
def test_pathways(client, api):
    r = client.get(f"{api}/resources/pathways")
    assert r.status_code == 200
    data = r.json()
    keys = [p["key"] for p in data["pathways"]]
    assert len(keys) == 8
    for k in ["get-stable", "get-healthy", "get-organized", "get-to-work",
              "rebuild-money", "rebuild-life", "build-future", "know-where"]:
        assert k in keys
    assert all(p.get("label") and p.get("accent") for p in data["pathways"])


# ---------- module: resources_v2 — list shape (RICH) ----------
def test_list_resources_rich_shape(client, api):
    r = client.get(f"{api}/resources")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict), f"GET /api/resources must return {{resources, count}} but returned {type(data).__name__} — legacy handler still shadows the new route"
    assert "resources" in data and "count" in data
    assert data["count"] >= 40, f"expected ~40 seeded resources, got {data['count']}"
    row = data["resources"][0]
    for f in ["id", "title", "kind", "summary", "region", "disclaimer_type", "pathways", "saved"]:
        assert f in row
    assert "_id" not in row


def test_list_filter_kind(client, api):
    for kind in ["learn", "tool", "support"]:
        r = client.get(f"{api}/resources", params={"kind": kind})
        assert r.status_code == 200
        rows = r.json()["resources"] if isinstance(r.json(), dict) else []
        assert len(rows) > 0, f"no rows for kind={kind}"
        assert all(x["kind"] == kind for x in rows)


def test_list_filter_pathway(client, api):
    r = client.get(f"{api}/resources", params={"pathway": "get-to-work"})
    assert r.status_code == 200
    rows = r.json()["resources"]
    assert len(rows) >= 3
    assert all("get-to-work" in x["pathways"] for x in rows)


def test_list_search_211(client, api):
    r = client.get(f"{api}/resources", params={"q": "211"})
    assert r.status_code == 200
    rows = r.json()["resources"]
    assert any("211" in x["title"] for x in rows), [x["title"] for x in rows]


def test_list_crisis_category(client, api):
    r = client.get(f"{api}/resources", params={"category": "crisis"})
    assert r.status_code == 200
    rows = r.json()["resources"]
    assert len(rows) >= 1
    assert all(x["category"] == "crisis" for x in rows)


def test_list_region_arkansas(client, api):
    r = client.get(f"{api}/resources", params={"region": "arkansas"})
    assert r.status_code == 200
    rows = r.json()["resources"]
    assert len(rows) >= 5
    assert all(x["region"] == "arkansas" for x in rows)


def test_list_requires_auth(anon, api):
    r = anon.get(f"{api}/resources")
    assert r.status_code in (401, 403), f"unauthenticated GET /api/resources returned {r.status_code}"


# ---------- module: resources_v2 — detail ----------
def _first_id(client, api, **params):
    r = client.get(f"{api}/resources", params=params)
    body = r.json()
    rows = body["resources"] if isinstance(body, dict) else body
    assert rows, f"no resources for {params}"
    return rows[0]["id"]


def test_detail_and_404(client, api):
    rid = _first_id(client, api, q="211")
    r = client.get(f"{api}/resources/{rid}")
    assert r.status_code == 200
    d = r.json()
    assert d["id"] == rid
    assert "saved" in d
    assert client.get(f"{api}/resources/res_does_not_exist").status_code == 404


# ---------- module: resources_v2 — save / unsave persistence ----------
def test_save_unsave_flow(client, api):
    rid = _first_id(client, api, q="211")
    assert client.post(f"{api}/resources/{rid}/save").json()["saved"] is True
    # persistence via detail
    assert client.get(f"{api}/resources/{rid}").json()["saved"] is True
    # appears on saved list
    saved = client.get(f"{api}/resources/saved").json()["resources"]
    assert rid in [x["id"] for x in saved]
    # decorated in list
    lst = client.get(f"{api}/resources", params={"q": "211"}).json()["resources"]
    assert next(x for x in lst if x["id"] == rid)["saved"] is True
    # unsave
    assert client.delete(f"{api}/resources/{rid}/save").json()["saved"] is False
    assert client.get(f"{api}/resources/{rid}").json()["saved"] is False
    saved = client.get(f"{api}/resources/saved").json()["resources"]
    assert rid not in [x["id"] for x in saved]


def test_save_404_unknown(client, api):
    assert client.post(f"{api}/resources/nope_123/save").status_code == 404


# ---------- module: resources_v2 — admin CRUD perms ----------
@pytest.fixture(scope="module")
def participant_client(api):
    s = requests.Session()
    r = s.post(f"{api}/auth/login", json={"email": "otheruser@example.com", "password": "Otherpass1!"}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"secondary participant login unavailable: {r.status_code}")
    s.headers.update({"Authorization": f"Bearer {r.json()['session_token']}"})
    return s


def test_admin_create_forbidden_for_participant(participant_client, api):
    r = participant_client.post(f"{api}/admin/resources", json={
        "title": "TEST_should_not_exist", "kind": "learn", "summary": "x"})
    assert r.status_code in (401, 403), f"participant got {r.status_code}"


def test_admin_create_update_as_super_admin(client, api):
    payload = {"title": "TEST_QA Resource", "kind": "learn", "summary": "QA seed",
               "pathways": ["get-stable"], "region": "arkansas", "disclaimer_type": "legal",
               "url": "https://example.com", "category": "community"}
    r = client.post(f"{api}/admin/resources", json=payload)
    assert r.status_code == 200, r.text[:300]
    rid = r.json()["id"]
    try:
        got = client.get(f"{api}/resources/{rid}")
        assert got.status_code == 200
        assert got.json()["title"] == "TEST_QA Resource"
        assert got.json()["disclaimer_type"] == "legal"
        # PATCH
        p = client.patch(f"{api}/admin/resources/{rid}", json={"summary": "QA seed updated"})
        assert p.status_code == 200
        assert client.get(f"{api}/resources/{rid}").json()["summary"] == "QA seed updated"
        # invalid kind
        bad = client.post(f"{api}/admin/resources", json={**payload, "title": "TEST_bad", "kind": "bogus"})
        assert bad.status_code == 400
        badp = client.post(f"{api}/admin/resources", json={**payload, "title": "TEST_bad2", "pathways": ["nope"]})
        assert badp.status_code == 400
    finally:
        client.patch(f"{api}/admin/resources/{rid}", json={"active": False})


# ---------- regression: legacy consumers ----------
def test_education_key_areas_still_works(client, api):
    r = client.get(f"{api}/education/key-areas")
    assert r.status_code == 200
    data = r.json()
    rows = data if isinstance(data, list) else data.get("areas") or data.get("key_areas")
    assert rows, data


@pytest.mark.parametrize("path", [
    "/me", "/dashboard/v2", "/assessments", "/journal/entries",
    "/blueprint/full/questions", "/sections/employment-readiness",
])
def test_core_endpoints_smoke(client, api, path):
    r = client.get(f"{api}{path}")
    assert r.status_code in (200, 404), f"{path} -> {r.status_code} {r.text[:200]}"
    if r.status_code == 404:
        pytest.skip(f"{path} not implemented")
