from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_home_route():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "success"


def test_openapi_contains_protected_surfaces():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/auth/me" in paths
    assert "/registrations/me" in paths
    assert "/admin/reports/summary" in paths


def test_protected_routes_require_authentication():
    for path in ("/auth/me", "/profile/me", "/registrations/me", "/admin/reports/summary"):
        response = client.get(path)
        assert response.status_code == 401, path
