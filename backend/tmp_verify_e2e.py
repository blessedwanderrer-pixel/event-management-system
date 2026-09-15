"""Live end-to-end verification against the running local API + Supabase.

Uses existing confirmed test accounts. Does not print tokens or passwords.
"""

from __future__ import annotations

import json
import sys
import uuid
from datetime import date, timedelta
from typing import Any

import httpx

API = "http://127.0.0.1:8000"
PASSWORD = "VerifyPass123!"
ATTENDEE_A = "attendee.a@test.example"
ATTENDEE_B = "attendee.b@test.example"
ADMIN = "admin.test@example.com"

results: list[tuple[str, str, str]] = []


def record(case: str, status: str, detail: str) -> None:
    results.append((case, status, detail))
    print(f"[{status}] {case} — {detail}")


def client() -> httpx.Client:
    return httpx.Client(base_url=API, timeout=30.0)


def login(email: str, password: str) -> dict[str, Any] | None:
    response = httpx.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30.0)
    if response.status_code != 200:
        return None
    return response.json().get("session")


def auth_headers(session: dict[str, Any]) -> dict[str, str]:
    return {"Authorization": f"Bearer {session['access_token']}"}


def main() -> int:
    with client() as http:
        health = http.get("/health")
        record("LOCAL health", "PASS" if health.status_code == 200 else "FAIL", health.text[:120])

        events = http.get("/events/")
        event_list = events.json() if events.status_code == 200 else []
        record(
            "LOCAL public events",
            "PASS" if events.status_code == 200 and isinstance(event_list, list) else "FAIL",
            f"count={len(event_list) if isinstance(event_list, list) else 'n/a'}",
        )

        # --- Signup attempt (may be rate-limited) ---
        suffix = uuid.uuid4().hex[:8]
        signup_email = f"e2e.verify.{suffix}@mailinator.com"
        signup = http.post(
            "/auth/signup",
            json={
                "full_name": f"E2E User {suffix}",
                "email": signup_email,
                "password": PASSWORD,
            },
        )
        if signup.status_code == 201:
            record("1 SIGN UP create", "PASS", "account created via /auth/signup")
            dup = http.post(
                "/auth/signup",
                json={"full_name": "Dup", "email": signup_email, "password": PASSWORD},
            )
            record(
                "1 SIGN UP duplicate",
                "PASS" if dup.status_code in {400, 409} else "FAIL",
                f"status={dup.status_code} detail={dup.json().get('detail') if dup.headers.get('content-type','').startswith('application/json') else dup.text[:80]}",
            )
        elif signup.status_code == 429:
            record(
                "1 SIGN UP create",
                "BLOCKED",
                f"Supabase email/auth rate limit: {signup.json().get('detail', signup.text)[:120]}",
            )
            record("1 SIGN UP duplicate", "SKIP", "blocked by signup rate limit")
        else:
            detail = signup.json().get("detail") if signup.headers.get("content-type", "").startswith("application/json") else signup.text
            status = "BLOCKED" if "rate limit" in str(detail).lower() or "too many" in str(detail).lower() else "FAIL"
            record("1 SIGN UP create", status, f"status={signup.status_code} detail={detail}")
            record("1 SIGN UP duplicate", "BLOCKED" if status == "BLOCKED" else "SKIP", "depends on successful signup")

        # --- Login ---
        bad = http.post("/auth/login", json={"email": ATTENDEE_A, "password": "wrong-password-xyz"})
        record(
            "2 LOGIN wrong password",
            "PASS" if bad.status_code == 401 else "FAIL",
            f"status={bad.status_code} detail={bad.json().get('detail')}",
        )

        session_a = login(ATTENDEE_A, PASSWORD)
        if not session_a:
            record("2 LOGIN correct credentials", "FAIL", "attendee A login failed")
            print(json.dumps(results, indent=2))
            return 1
        record("2 LOGIN correct credentials", "PASS", "attendee A session issued")

        me = http.get("/auth/me", headers=auth_headers(session_a))
        me_ok = me.status_code == 200 and me.json().get("email", "").lower() == ATTENDEE_A
        record("2 LOGIN /auth/me", "PASS" if me_ok else "FAIL", f"status={me.status_code} body={me.text[:160]}")

        # Session refresh persistence proxy
        if session_a.get("refresh_token"):
            refreshed = http.post("/auth/refresh", json={"refresh_token": session_a["refresh_token"]})
            refresh_ok = refreshed.status_code == 200 and bool(refreshed.json().get("session", {}).get("access_token"))
            if refresh_ok:
                session_a = refreshed.json()["session"]
            record("2 LOGIN session refresh", "PASS" if refresh_ok else "FAIL", f"status={refreshed.status_code}")
        else:
            record("2 LOGIN session refresh", "FAIL", "no refresh_token returned")

        # --- Change name ---
        new_name = f"Attendee A {uuid.uuid4().hex[:6]}"
        name_resp = http.patch("/profile/me", headers=auth_headers(session_a), json={"full_name": new_name})
        name_ok = name_resp.status_code == 200 and name_resp.json().get("full_name") == new_name
        record("7 CHANGE NAME", "PASS" if name_ok else "FAIL", f"status={name_resp.status_code} body={name_resp.text[:160]}")
        me2 = http.get("/auth/me", headers=auth_headers(session_a))
        record(
            "7 CHANGE NAME persists",
            "PASS" if me2.status_code == 200 and me2.json().get("full_name") == new_name else "FAIL",
            f"me={me2.text[:120]}",
        )

        # --- Change password ---
        changed = http.post(
            "/auth/change-password",
            headers=auth_headers(session_a),
            json={"current_password": PASSWORD, "new_password": PASSWORD + "x"},
        )
        if changed.status_code == 200:
            old_login = login(ATTENDEE_A, PASSWORD)
            new_login = login(ATTENDEE_A, PASSWORD + "x")
            record(
                "5 CHANGE PASSWORD",
                "PASS" if old_login is None and new_login is not None else "FAIL",
                f"old_works={bool(old_login)} new_works={bool(new_login)}",
            )
            # restore password for later cases
            if new_login:
                restore = http.post(
                    "/auth/change-password",
                    headers=auth_headers(new_login),
                    json={"current_password": PASSWORD + "x", "new_password": PASSWORD},
                )
                session_a = login(ATTENDEE_A, PASSWORD) or new_login
                record(
                    "5 CHANGE PASSWORD restore",
                    "PASS" if restore.status_code == 200 and session_a else "FAIL",
                    f"restore={restore.status_code}",
                )
        else:
            record("5 CHANGE PASSWORD", "FAIL", f"status={changed.status_code} detail={changed.text[:160]}")

        # --- Change email request (confirmation may be required / rate limited) ---
        pending_email = f"attendee.a.pending.{uuid.uuid4().hex[:6]}@example.com"
        email_change = http.post(
            "/auth/change-email",
            headers=auth_headers(session_a),
            json={"email": pending_email},
        )
        if email_change.status_code == 200:
            payload = email_change.json()
            record(
                "6 CHANGE EMAIL request",
                "PASS",
                f"requires_confirmation={payload.get('requires_confirmation')} message={payload.get('message')}",
            )
            if payload.get("requires_confirmation"):
                record(
                    "6 CHANGE EMAIL confirmation",
                    "BLOCKED",
                    "Supabase requires email confirmation; inbox/delivery not automatable here",
                )
        else:
            detail = email_change.text[:200]
            status = "BLOCKED" if email_change.status_code == 429 or "rate" in detail.lower() or "too many" in detail.lower() else "FAIL"
            record("6 CHANGE EMAIL request", status, f"status={email_change.status_code} detail={detail}")
            record("6 CHANGE EMAIL confirmation", "SKIP", "request did not succeed")

        # --- Forgot password request ---
        forgot = http.post("/auth/forgot-password", json={"email": ATTENDEE_A})
        if forgot.status_code == 200:
            record("4 FORGOT PASSWORD request", "PASS", forgot.json().get("message", "ok"))
            record(
                "4 FORGOT PASSWORD email/link/login",
                "BLOCKED",
                "Reset email delivery + link click cannot be completed without inbox access / may hit rate limits",
            )
        else:
            record("4 FORGOT PASSWORD request", "FAIL", forgot.text[:160])
            record("4 FORGOT PASSWORD email/link/login", "SKIP", "request failed")

        # --- Logout ---
        out = http.post("/auth/logout", headers=auth_headers(session_a))
        # after logout, token may still validate until expiry depending on Supabase logout semantics;
        # frontend clears local session. Verify protected route without token.
        no_token = http.get("/auth/me")
        record("3 LOGOUT endpoint", "PASS" if out.status_code == 200 else "FAIL", f"status={out.status_code}")
        record(
            "3 LOGOUT protected without token",
            "PASS" if no_token.status_code == 401 else "FAIL",
            f"status={no_token.status_code}",
        )

        # re-login for event flows
        session_a = login(ATTENDEE_A, PASSWORD)
        session_b = login(ATTENDEE_B, PASSWORD)
        session_admin = login(ADMIN, PASSWORD)
        if not session_a or not session_b or not session_admin:
            record("PREREQ re-login", "FAIL", f"A={bool(session_a)} B={bool(session_b)} admin={bool(session_admin)}")
            print_summary()
            return 1
        record("PREREQ re-login", "PASS", "attendee A/B and admin authenticated")

        # Admin cannot be accessed by attendee
        admin_block = http.get("/admin/reports/summary", headers=auth_headers(session_a))
        record(
            "10 SECURITY attendee admin API",
            "PASS" if admin_block.status_code == 403 else "FAIL",
            f"status={admin_block.status_code}",
        )
        create_block = http.post(
            "/admin/events",
            headers=auth_headers(session_a),
            json={
                "title": "Should fail",
                "description": "x",
                "event_date": (date.today() + timedelta(days=20)).isoformat(),
                "event_time": "12:00:00",
                "location": "Nowshera",
                "capacity": 5,
                "status": "draft",
            },
        )
        record(
            "10 SECURITY attendee create event",
            "PASS" if create_block.status_code == 403 else "FAIL",
            f"status={create_block.status_code}",
        )

        # --- Admin create/publish ---
        event_title = f"E2E Verify {uuid.uuid4().hex[:8]}"
        created = http.post(
            "/admin/events",
            headers=auth_headers(session_admin),
            json={
                "title": event_title,
                "description": "Verification event",
                "event_date": (date.today() + timedelta(days=21)).isoformat(),
                "event_time": "15:30:00",
                "location": "Nowshera Community Hall",
                "capacity": 2,
                "status": "draft",
            },
        )
        if created.status_code != 201:
            record("9 ADMIN create event", "FAIL", created.text[:200])
            print_summary()
            return 1
        event = created.json()
        event_id = event["id"]
        record("9 ADMIN create event", "PASS", f"id={event_id}")

        # draft hidden from public list
        public_before = http.get("/events/").json()
        hidden = all(item.get("id") != event_id for item in public_before)
        record("9 ADMIN draft hidden", "PASS" if hidden else "FAIL", f"hidden={hidden}")

        published = http.post(f"/admin/events/{event_id}/publish", headers=auth_headers(session_admin))
        record("9 ADMIN publish", "PASS" if published.status_code == 200 else "FAIL", published.text[:120])

        updated = http.put(
            f"/admin/events/{event_id}",
            headers=auth_headers(session_admin),
            json={
                "title": event_title + " Updated",
                "description": "Updated description",
                "event_date": event["event_date"],
                "event_time": event["event_time"],
                "location": event["location"],
                "capacity": 2,
                "status": "published",
            },
        )
        record("9 ADMIN update", "PASS" if updated.status_code == 200 else "FAIL", updated.text[:120])

        dashboard = http.get("/admin/reports/summary", headers=auth_headers(session_admin))
        dash_ok = dashboard.status_code == 200 and "available_places" in dashboard.json()
        record("9 ADMIN dashboard", "PASS" if dash_ok else "FAIL", dashboard.text[:160])

        # --- Attendee register flow ---
        public_after = http.get("/events/").json()
        visible = any(item.get("id") == event_id for item in public_after)
        record("8 ATTENDEE browse/publish visible", "PASS" if visible else "FAIL", f"visible={visible}")

        detail = http.get(f"/events/{event_id}")
        record("8 ATTENDEE event details", "PASS" if detail.status_code == 200 else "FAIL", detail.text[:120])

        reg_a = http.post(f"/registrations?event_id={event_id}", headers=auth_headers(session_a))
        record(
            "8 ATTENDEE register",
            "PASS" if reg_a.status_code == 201 else "FAIL",
            reg_a.text[:180],
        )
        registration_a_id = reg_a.json().get("id") if reg_a.status_code == 201 else None

        dup_reg = http.post(f"/registrations?event_id={event_id}", headers=auth_headers(session_a))
        record(
            "8 ATTENDEE duplicate register",
            "PASS" if dup_reg.status_code == 409 else "FAIL",
            dup_reg.text[:160],
        )

        # fill remaining capacity with B, then C should fail if capacity 2
        reg_b = http.post(f"/registrations?event_id={event_id}", headers=auth_headers(session_b))
        record("8 ATTENDEE B register", "PASS" if reg_b.status_code == 201 else "FAIL", reg_b.text[:120])

        # full event: try A again already registered; need a third user OR reuse after cancel
        # use admin token against registration? better: cancel B, verify capacity frees, re-register B
        if reg_b.status_code == 201:
            full_probe_email_login = None  # no third account; validate full by checking spots
            spots = http.get(f"/events/{event_id}").json().get("available_spots")
            record("8 ATTENDEE capacity after 2 regs", "PASS" if spots == 0 else "FAIL", f"available_spots={spots}")

        # Cross-user registration access: A lists only own
        mine = http.get("/registrations/me", headers=auth_headers(session_a))
        mine_ok = mine.status_code == 200 and all(item.get("event_id") for item in mine.json())
        only_own = True
        if mine.status_code == 200 and registration_a_id:
            only_own = any(item.get("id") == registration_a_id for item in mine.json())
        record("8 ATTENDEE my registrations", "PASS" if mine_ok and only_own else "FAIL", mine.text[:160])

        # Cancel A registration and verify spot frees
        if registration_a_id:
            cancel = http.post(f"/registrations/{registration_a_id}/cancel", headers=auth_headers(session_a))
            spots_after = http.get(f"/events/{event_id}").json().get("available_spots")
            record(
                "8 ATTENDEE cancel frees capacity",
                "PASS" if cancel.status_code == 200 and spots_after == 1 else "FAIL",
                f"cancel={cancel.status_code} spots={spots_after}",
            )
        else:
            record("8 ATTENDEE cancel frees capacity", "FAIL", "no registration id")

        # Attendees list for admin
        attendees = http.get(f"/admin/events/{event_id}/attendees?status_filter=active", headers=auth_headers(session_admin))
        active_count = len(attendees.json()) if attendees.status_code == 200 else -1
        record(
            "9 ADMIN attendees list",
            "PASS" if attendees.status_code == 200 and active_count == 1 else "FAIL",
            f"status={attendees.status_code} active_count={active_count}",
        )

        # Complete/cancel registration lock
        complete = http.post(f"/admin/events/{event_id}/complete", headers=auth_headers(session_admin))
        record("9 ADMIN complete event", "PASS" if complete.status_code == 200 else "FAIL", complete.text[:120])
        reg_after_complete = http.post(f"/registrations?event_id={event_id}", headers=auth_headers(session_a))
        record(
            "9 ADMIN completed blocks registration",
            "PASS" if reg_after_complete.status_code == 409 else "FAIL",
            reg_after_complete.text[:160],
        )

        # Security: A cannot cancel B's registration
        session_b = login(ATTENDEE_B, PASSWORD)
        session_a = login(ATTENDEE_A, PASSWORD)
        # recreate published event for cross cancel
        created2 = http.post(
            "/admin/events",
            headers=auth_headers(session_admin),
            json={
                "title": f"E2E Security {uuid.uuid4().hex[:6]}",
                "description": "sec",
                "event_date": (date.today() + timedelta(days=25)).isoformat(),
                "event_time": "11:00:00",
                "location": "Nowshera",
                "capacity": 5,
                "status": "published",
            },
        )
        if created2.status_code == 201:
            eid2 = created2.json()["id"]
            http.post(f"/admin/events/{eid2}/publish", headers=auth_headers(session_admin))
            # if already published via create status published
            rb = http.post(f"/registrations?event_id={eid2}", headers=auth_headers(session_b))
            bid = rb.json().get("id") if rb.status_code == 201 else None
            if bid:
                steal = http.post(f"/registrations/{bid}/cancel", headers=auth_headers(session_a))
                record(
                    "10 SECURITY cancel someone else registration",
                    "PASS" if steal.status_code in {403, 404} else "FAIL",
                    f"status={steal.status_code} body={steal.text[:120]}",
                )
            else:
                record("10 SECURITY cancel someone else registration", "FAIL", f"B register failed: {rb.text[:120]}")
            http.post(f"/admin/events/{eid2}/cancel", headers=auth_headers(session_admin))
        else:
            record("10 SECURITY cancel someone else registration", "FAIL", created2.text[:120])

    print_summary()
    fails = sum(1 for _, status, _ in results if status == "FAIL")
    return 1 if fails else 0


def print_summary() -> None:
    print("\n=== SUMMARY ===")
    for case, status, detail in results:
        print(f"{status:8} | {case} | {detail}")
    print(
        "PASS={0} FAIL={1} BLOCKED={2} SKIP={3}".format(
            sum(s == "PASS" for _, s, _ in results),
            sum(s == "FAIL" for _, s, _ in results),
            sum(s == "BLOCKED" for _, s, _ in results),
            sum(s == "SKIP" for _, s, _ in results),
        )
    )


if __name__ == "__main__":
    sys.exit(main())
