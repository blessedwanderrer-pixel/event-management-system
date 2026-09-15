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
    assert "/auth/signup" in paths
    assert "/auth/login" in paths
    assert "/auth/forgot-password" in paths
    assert "/auth/reset-password" in paths
    assert "/auth/change-password" in paths
    assert "/auth/change-email" in paths
    assert "/auth/refresh" in paths
    assert "/auth/verify" in paths
    assert "/registrations/me" in paths
    assert "/admin/reports/summary" in paths


def test_protected_routes_require_authentication():
    for path in (
        "/auth/me",
        "/profile/me",
        "/registrations/me",
        "/admin/reports/summary",
        "/auth/change-password",
        "/auth/change-email",
    ):
        method = client.post if path.startswith("/auth/change-") else client.get
        if path.startswith("/auth/change-"):
            response = method(path, json={})
        else:
            response = method(path)
        assert response.status_code in {401, 422}, path


def test_signup_rejects_invalid_email():
    response = client.post(
        "/auth/signup",
        json={
            "full_name": "Test User",
            "email": "not-an-email",
            "password": "password123",
        },
    )
    assert response.status_code == 422


def test_auth_error_detail_does_not_blame_visitor_for_email_rate_limit():
    from api.auth import auth_error_detail

    class FakeError(Exception):
        def __init__(self):
            self.message = "email rate limit exceeded"
            self.code = "over_email_send_rate_limit"
            self.status = 429

    detail = auth_error_detail(FakeError(), "fallback")
    assert "Email delivery is temporarily rate-limited" in detail
    assert "Too many attempts" not in detail


def test_login_rejects_empty_password():
    response = client.post(
        "/auth/login",
        json={
            "email": "someone@example.com",
            "password": "",
        },
    )
    assert response.status_code == 422


def test_event_capacity_rejects_invalid_values():
    from schemas import EventCreate
    import pytest
    from pydantic import ValidationError
    from datetime import date, time, timedelta

    base = {
        "title": "Capacity check",
        "description": "Test",
        "event_date": (date.today() + timedelta(days=7)).isoformat(),
        "event_time": "18:00:00",
        "location": "Nowshera",
        "status": "draft",
    }
    for capacity in (0, -1, 2.5, "2.5"):
        with pytest.raises(ValidationError):
            EventCreate(**base, capacity=capacity)

    event = EventCreate(**base, capacity=10)
    assert event.capacity == 10


def test_admin_routes_require_authentication():
    response = client.post(
        "/admin/events",
        json={
            "title": "Blocked",
            "description": None,
            "event_date": "2030-01-01",
            "event_time": "10:00:00",
            "location": "Nowshera",
            "capacity": 10,
            "status": "draft",
        },
    )
    assert response.status_code == 401
