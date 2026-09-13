import getpass
import os
import re
from datetime import date, timedelta
from typing import Any, Callable
from uuid import UUID, uuid4

from dotenv import load_dotenv
from supabase import Client, create_client


TEST_FILE_PATH = os.path.abspath(__file__)
print(f"RUNNING_RLS_TEST_FILE={TEST_FILE_PATH}")
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL or SUPABASE_KEY is missing")

results: list[tuple[str, str, str]] = []
attendee_a_diagnostic: dict[str, Any] = {}


def new_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def record(name: str, passed: bool, reason: str) -> None:
    status = "PASS" if passed is True else "FAIL"
    results.append((status, name, reason))
    print(f"[{status}] {name} - {reason}")


def skip(name: str, reason: str) -> None:
    results.append(("SKIP", name, reason))
    print(f"[SKIP] {name} - {reason}")


def operation(call: Callable[[], Any]) -> tuple[Any | None, Exception | None]:
    try:
        return call(), None
    except Exception as error:
        return None, error


def safe_text(value: Any) -> str:
    text = str(value or "")
    text = re.sub(r"(?i)(authorization|apikey|api_key|token|password|secret|key)\s*[:=]\s*[^,;\s]+", r"\1=[REDACTED]", text)
    text = re.sub(r"(?i)bearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", text)
    text = re.sub(r"(?i)(postgres(?:ql)?://)[^\s]+", r"\1[REDACTED]", text)
    return text[:300]


def response_error(response: Any) -> Any:
    return getattr(response, "error", None) if response is not None else None


def data_of(response: Any) -> list[dict[str, Any]]:
    data = getattr(response, "data", None)
    if data is None:
        return []
    return data if isinstance(data, list) else [data]


def failure_reason(response: Any = None, error: Exception | None = None, fallback: str = "operation failed") -> str:
    parts: list[str] = []
    if error is not None:
        parts.append(f"exception={type(error).__name__}")
        for attribute in ("status_code", "code", "message", "details", "hint"):
            value = getattr(error, attribute, None)
            if value:
                parts.append(f"{attribute}={safe_text(value)}")
    api_error = response_error(response)
    if api_error is not None:
        parts.append("response_error=" + safe_text(api_error))
        for attribute in ("status_code", "code", "message", "details", "hint"):
            value = getattr(api_error, attribute, None)
            if value:
                parts.append(f"{attribute}={safe_text(value)}")
    return "; ".join(dict.fromkeys(parts)) or fallback


def sign_out(client: Client) -> None:
    operation(client.auth.sign_out)


def login(client: Client, email: str, password: str) -> tuple[bool, Any, str]:
    response, error = operation(
        lambda: client.auth.sign_in_with_password({"email": email, "password": password})
    )
    session = getattr(response, "session", None) if response is not None else None
    if error is not None or session is None:
        return False, None, failure_reason(error=error, fallback="login failed")
    return True, response, "authenticated session established"


def authenticated_identity(client: Client, expected_email: str) -> tuple[dict[str, Any] | None, str]:
    user_response, error = operation(client.auth.get_user)
    user = getattr(user_response, "user", None) if user_response is not None else None
    user_id = str(getattr(user, "id", "")) if user is not None else ""
    user_email = str(getattr(user, "email", "")) if user is not None else ""
    if error is not None or not user_id or user_email.lower() != expected_email.lower():
        return None, failure_reason(error=error, fallback="authenticated identity could not be verified")
    profile_response, error = operation(
        lambda: client.table("profiles")
        .select("id, full_name, email, role")
        .eq("id", user_id)
        .execute()
    )
    profiles = data_of(profile_response)
    if error is not None or response_error(profile_response) is not None or not profiles:
        return None, failure_reason(profile_response, error, "authenticated profile was not returned")
    profile = profiles[0]
    if str(profile.get("id")) != user_id:
        return None, "profile UUID did not match authenticated user UUID"
    return {"id": user_id, "email": user_email, "profile": profile}, "authenticated identity verified"


def own_registrations(client: Client) -> tuple[list[dict[str, Any]] | None, str]:
    response, error = operation(
        lambda: client.table("registrations")
        .select("id, user_id, event_id, status")
        .execute()
    )
    if error is not None or response_error(response) is not None:
        return None, failure_reason(response, error, "registration query failed")
    return data_of(response), "registration query succeeded"


def test_attendee(email: str, password: str) -> dict[str, Any]:
    client = new_client()
    login_ok, _, login_reason = login(client, email, password)
    if email == "attendee.a@test.example":
        print(f"DEBUG_ATTENDEE_A_LOGIN_RESULT={login_ok}")
        print(f"DEBUG_ATTENDEE_A_SESSION={login_ok}")
    record(f"{email} login", login_ok, login_reason)
    if not login_ok:
        skip(f"{email} own profile read", "prerequisite login failed")
        skip(f"{email} registrations are own-only", "prerequisite login failed")
        sign_out(client)
        return {"client": None, "identity": None, "registrations": []}

    identity, identity_reason = authenticated_identity(client, email)
    profile_ok = identity is not None
    record(f"{email} own profile read", profile_ok, identity_reason if profile_ok else identity_reason)
    if not profile_ok:
        skip(f"{email} registrations are own-only", "prerequisite profile read failed")
        sign_out(client)
        return {"client": None, "identity": None, "registrations": []}

    registrations, registration_reason = own_registrations(client)
    own_only = registrations is not None and all(
        str(row.get("user_id")) == identity["id"] for row in registrations
    )
    record(
        f"{email} registrations are own-only",
        own_only,
        "registration query succeeded; all rows belong to authenticated user"
        if own_only
        else registration_reason if registrations is None else "returned row belongs to another user",
    )
    return {"client": client, "identity": identity, "registrations": registrations or []}


def create_registration_fixture(
    attendee_b: dict[str, Any],
    attendee_b_email: str,
    password: str,
    admin_email: str,
) -> dict[str, str] | None:
    if attendee_b["identity"] is None:
        skip("Create Attendee B registration fixture", "Attendee B authentication prerequisite failed")
        return None

    admin_client = new_client()
    login_ok, _, reason = login(admin_client, admin_email, password)
    if not login_ok:
        record("Create Attendee B registration fixture", False, f"admin fixture login failed: {reason}")
        sign_out(admin_client)
        return None
    event_response, error = operation(
        lambda: admin_client.table("events")
        .insert({
            "title": f"RLS registration fixture {uuid4().hex[:8]}",
            "description": "Temporary RLS registration fixture",
            "event_date": (date.today() + timedelta(days=30)).isoformat(),
            "event_time": "12:00:00",
            "location": "RLS test fixture",
            "capacity": 2,
            "status": "published",
        })
        .select("id")
        .execute()
    )
    created = data_of(event_response)
    event_id = created[0].get("id") if created else None
    sign_out(admin_client)
    if error is not None or response_error(event_response) is not None or not event_id:
        record("Create Attendee B registration fixture", False, failure_reason(event_response, error, "admin event fixture was not created"))
        return None

    attendee_b_client = new_client()
    login_ok, _, reason = login(attendee_b_client, attendee_b_email, password)
    if not login_ok:
        record("Create Attendee B registration fixture", False, f"Attendee B fixture login failed: {reason}")
        sign_out(attendee_b_client)
        cleanup_client = new_client()
        if login(cleanup_client, admin_email, password)[0]:
            operation(lambda: cleanup_client.table("events").delete().eq("id", event_id).execute())
        sign_out(cleanup_client)
        return None

    registration_response, error = operation(
        lambda: attendee_b_client.table("registrations")
        .insert({"user_id": attendee_b["identity"]["id"], "event_id": event_id, "status": "active"})
        .select("id, user_id, event_id, status")
        .execute()
    )
    created_registration = data_of(registration_response)
    registration_id = created_registration[0].get("id") if created_registration else None
    sign_out(attendee_b_client)
    if error is not None or response_error(registration_response) is not None or not registration_id:
        record("Create Attendee B registration fixture", False, failure_reason(registration_response, error, "registration fixture was not created"))
        return None
    record("Create Attendee B registration fixture", True, "temporary event and registration created")
    return {"event_id": str(event_id), "registration_id": str(registration_id)}


def test_cross_user_security(attendee_a: dict[str, Any], attendee_b: dict[str, Any], password: str, attendee_a_email: str) -> None:
    if attendee_a["identity"] is None:
        for name in (
            "Attendee A cannot read Attendee B profile",
            "Attendee A cannot read Attendee B registrations",
            "Attendee A cannot update Attendee B registration",
            "Attendee A cannot escalate own role to admin",
            "Attendee A cannot insert an event",
        ):
            skip(name, "Attendee A authentication prerequisite failed")
        return
    if attendee_b["identity"] is None:
        for name in (
            "Attendee A cannot read Attendee B profile",
            "Attendee A cannot read Attendee B registrations",
            "Attendee A cannot update Attendee B registration",
        ):
            skip(name, "Attendee B authentication prerequisite failed")

    client = attendee_a["client"]
    b_identity = attendee_b["identity"]
    if client is None:
        return
    a_identity, identity_reason = authenticated_identity(client, attendee_a_email)
    if a_identity is None:
        for name in (
            "Attendee A cannot escalate own role to admin",
            "Attendee A cannot insert an event",
        ):
            skip(name, "Attendee A identity verification failed")
        return
    attendee_a_diagnostic.update(
        {
            "authenticated_user_matches_expected": a_identity["id"] == attendee_a["identity"]["id"],
            "authenticated_user_id": a_identity["id"],
            "profile_id": a_identity["profile"].get("id"),
            "profile_email": a_identity["profile"].get("email"),
            "profile_role_before_test": a_identity["profile"].get("role"),
            "private_is_admin": "not queried; private schema is not required",
        }
    )
    print("ATTENDEE_A_DIAGNOSTIC")
    print(f"expected_email={attendee_a_email}")
    print(f"authenticated_user_id={a_identity['id']}")
    print(f"profile_id={a_identity['profile'].get('id')}")
    print(f"profile_email={a_identity['profile'].get('email')}")
    print(f"profile_role={a_identity['profile'].get('role')}")
    print("private_is_admin=not queried; private schema is not required")
    if a_identity["id"] != attendee_a["identity"]["id"]:
        for name in (
            "Attendee A cannot escalate own role to admin",
            "Attendee A cannot insert an event",
        ):
            record(name, False, "authenticated UUID changed between test sections")
        return

    if b_identity is not None:
        response, error = operation(lambda: client.table("profiles").select("id").eq("id", b_identity["id"]).execute())
        denied = error is not None or response_error(response) is not None
        record("Attendee A cannot read Attendee B profile", denied or not data_of(response), "access denied" if denied else "no rows returned" if not data_of(response) else "B profile was returned")

        response, error = operation(lambda: client.table("registrations").select("id, user_id").eq("user_id", b_identity["id"]).execute())
        denied = error is not None or response_error(response) is not None
        record("Attendee A cannot read Attendee B registrations", denied or not data_of(response), "access denied" if denied else "no rows returned" if not data_of(response) else "B registration was returned")

    b_registrations = attendee_b["registrations"]
    if b_identity is not None and not b_registrations:
        skip("Attendee A cannot update Attendee B registration", "Attendee B has no registration fixture")
    elif b_identity is not None:
        response, error = operation(lambda: client.table("registrations").update({"status": "cancelled"}).eq("id", b_registrations[0]["id"]).execute())
        denied = error is not None or response_error(response) is not None
        record("Attendee A cannot update Attendee B registration", denied or not data_of(response), "access denied" if denied else "no rows affected" if not data_of(response) else "B registration was modified")

    role_before = a_identity["profile"].get("role")
    if role_before != "attendee":
        record("Attendee A cannot escalate own role to admin", False, "authenticated profile role was not attendee before test")
    else:
        response, error = operation(lambda: client.table("profiles").update({"role": "admin"}).eq("id", a_identity["id"]).execute())
        authoritative_result, verify_error = operation(lambda: authenticated_identity(client, attendee_a_email))
        authoritative = None
        authoritative_reason = "authoritative verification failed"
        if verify_error is None and isinstance(authoritative_result, tuple) and len(authoritative_result) == 2:
            authoritative, authoritative_reason = authoritative_result
        role_unchanged = (
            isinstance(authoritative, dict)
            and isinstance(authoritative.get("profile"), dict)
            and authoritative["profile"].get("role") == "attendee"
        )
        denied = error is not None or response_error(response) is not None
        attendee_a_diagnostic["role_update_denied"] = denied
        attendee_a_diagnostic["role_update_rows"] = len(data_of(response))
        attendee_a_diagnostic["role_after_update"] = authoritative["profile"].get("role") if role_unchanged else "error"
        record("Attendee A cannot escalate own role to admin", role_unchanged and (denied or not data_of(response)), "access denied and role remains attendee" if role_unchanged and denied else "no rows and role remains attendee" if role_unchanged and not data_of(response) else failure_reason(response, error or verify_error, authoritative_reason))

    response, error = operation(lambda: client.table("events").insert({"title": f"RLS attendee insert test {uuid4().hex[:8]}", "description": "Temporary RLS security test event", "event_date": (date.today() + timedelta(days=30)).isoformat(), "event_time": "12:00:00", "location": "RLS test fixture", "capacity": 1, "status": "draft"}).execute())
    denied = error is not None or response_error(response) is not None
    created = data_of(response)
    created_event_id = created[0].get("id") if created else None
    attendee_a_diagnostic["event_insert_denied"] = denied
    attendee_a_diagnostic["event_created"] = bool(created_event_id)
    attendee_a_diagnostic["event_id"] = created_event_id
    if created_event_id:
        cleanup_client = new_client()
        cleanup_ok, _, _ = login(cleanup_client, "admin.test@example.com", password)
        cleanup_result = False
        if cleanup_ok:
            cleanup_response, cleanup_error = operation(lambda: cleanup_client.table("events").delete().eq("id", created_event_id).execute())
            cleanup_result = cleanup_error is None and response_error(cleanup_response) is None
        sign_out(cleanup_client)
        attendee_a_diagnostic["event_cleanup"] = cleanup_result
    record("Attendee A cannot insert an event", denied and not created_event_id, "access denied" if denied and not created_event_id else "operation succeeded and event was created")


def test_admin_operations(email: str, password: str) -> None:
    client = new_client()
    login_ok, _, reason = login(client, email, password)
    record("Admin login", login_ok, reason)
    if not login_ok:
        for name in ("Admin own profile confirms admin role", "Admin can insert a draft event", "Admin can update an event", "Admin can read the created event", "Admin can clean up the test event"):
            skip(name, "admin login prerequisite failed")
        sign_out(client)
        return
    identity, identity_reason = authenticated_identity(client, email)
    is_admin = identity is not None and identity["profile"].get("role") == "admin"
    record("Admin own profile confirms admin role", is_admin, "authenticated profile role is admin" if is_admin else identity_reason)
    if not is_admin:
        for name in ("Admin can insert a draft event", "Admin can update an event", "Admin can read the created event", "Admin can clean up the test event"):
            skip(name, "admin role prerequisite failed")
        sign_out(client)
        return

    event_response, error = operation(lambda: client.table("events").insert({"title": f"RLS admin test {uuid4().hex[:8]}", "description": "Temporary admin RLS security test event", "event_date": (date.today() + timedelta(days=30)).isoformat(), "event_time": "12:00:00", "location": "RLS test fixture", "capacity": 2, "status": "draft"}).select("id").execute())
    created = data_of(event_response)
    event_id = created[0].get("id") if created else None
    insert_ok = error is None and response_error(event_response) is None and event_id is not None
    record("Admin can insert a draft event", insert_ok, "event created with ID" if insert_ok else failure_reason(event_response, error, "admin insert returned no event ID"))
    if event_id:
        response, error = operation(lambda: client.table("events").update({"description": "Updated by admin RLS test"}).eq("id", event_id).select("id").execute())
        verify, verify_error = operation(lambda: client.table("events").select("description").eq("id", event_id).execute())
        updated = error is None and response_error(response) is None and bool(data_of(response)) and data_of(verify) and data_of(verify)[0].get("description") == "Updated by admin RLS test"
        record("Admin can update an event", updated, "update verified" if updated else failure_reason(response, error or verify_error, "authoritative update verification failed"))
        response, error = operation(lambda: client.table("events").select("id").eq("id", event_id).execute())
        readable = error is None and response_error(response) is None and bool(data_of(response))
        record("Admin can read the created event", readable, "event returned" if readable else failure_reason(response, error, "admin read returned no event"))
        response, error = operation(lambda: client.table("events").delete().eq("id", event_id).execute())
        verify, verify_error = operation(lambda: client.table("events").select("id").eq("id", event_id).execute())
        removed = error is None and response_error(response) is None and verify_error is None and response_error(verify) is None and not data_of(verify)
        record("Admin can clean up the test event", removed, "event deletion verified" if removed else failure_reason(response, error or verify_error, "authoritative cleanup verification failed"))
    else:
        for name in ("Admin can update an event", "Admin can read the created event", "Admin can clean up the test event"):
            skip(name, "admin insert prerequisite failed")
    sign_out(client)


def cleanup_fixture(fixture: dict[str, str], attendee_b_email: str, admin_email: str, password: str) -> None:
    attendee_client = new_client()
    if login(attendee_client, attendee_b_email, password)[0]:
        operation(
            lambda: attendee_client.table("registrations")
            .update({"status": "cancelled"})
            .eq("id", fixture["registration_id"])
            .execute()
        )
    sign_out(attendee_client)

    admin_client = new_client()
    if login(admin_client, admin_email, password)[0]:
        operation(lambda: admin_client.table("events").delete().eq("id", fixture["event_id"]).execute())
    sign_out(admin_client)


def print_summary() -> None:
    print("\nATTENDEE A DIAGNOSTIC RESULT")
    for key in (
        "authenticated_user_matches_expected",
        "profile_role_before_test",
        "private_is_admin",
        "role_update_denied",
        "role_after_update",
        "event_insert_denied",
        "event_created",
    ):
        print(f"{key}: {attendee_a_diagnostic.get(key, 'error')}")
    print("\nRLS SECURITY TEST SUMMARY")
    print(f"PASS: {sum(status == 'PASS' for status, _, _ in results)}")
    print(f"FAIL: {sum(status == 'FAIL' for status, _, _ in results)}")
    print(f"SKIP: {sum(status == 'SKIP' for status, _, _ in results)}")
    print("\nFAILED TESTS:")
    print("\n".join(f"- {name} — {reason}" for status, name, reason in results if status == "FAIL") or "- None")
    print("\nSKIPPED TESTS:")
    print("\n".join(f"- {name} — {reason}" for status, name, reason in results if status == "SKIP") or "- None")


def main() -> None:
    print("RLS security test. Passwords are entered locally and are never printed.")
    attendee_a_email = "attendee.a@test.example"
    attendee_b_email = "attendee.b@test.example"
    admin_email = "admin.test@example.com"
    password = getpass.getpass("Enter the shared test password: ")
    attendee_a = test_attendee(attendee_a_email, password)
    attendee_b = test_attendee(attendee_b_email, password)
    fixture = create_registration_fixture(attendee_b, attendee_b_email, password, admin_email)
    if fixture:
        attendee_b["registrations"].append({"id": fixture["registration_id"], "user_id": attendee_b["identity"]["id"], "event_id": fixture["event_id"], "status": "active"})
    test_cross_user_security(attendee_a, attendee_b, password, attendee_a_email)
    test_admin_operations(admin_email, password)
    if fixture:
        cleanup_fixture(fixture, attendee_b_email, admin_email, password)
    print_summary()


if __name__ == "__main__":
    main()
