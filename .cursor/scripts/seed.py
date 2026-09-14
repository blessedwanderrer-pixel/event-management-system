#!/usr/bin/env python3
"""Idempotent local development seed data.

Creates a demo admin, a demo attendee, and a handful of events (including the
"Nowshera Tech Meetup" that the Playwright suite expects). Safe to run many
times: users that already exist are skipped and events are matched by title.

Reads DATABASE_URL / SUPABASE_URL from backend/.env (falling back to env vars).
"""
import os
import sys
from pathlib import Path

import httpx
import psycopg

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / "backend" / ".env"


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


load_env(ENV_FILE)

DATABASE_URL = os.environ["DATABASE_URL"]
SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://127.0.0.1:9999")

DEMO_USERS = [
    {"email": "admin@example.com", "password": "password123", "full_name": "Ayesha Admin", "role": "admin"},
    {"email": "attendee@example.com", "password": "password123", "full_name": "Adnan Attendee", "role": "attendee"},
]

EVENTS = [
    {
        "title": "Nowshera Tech Meetup",
        "description": "A relaxed evening of talks and networking for local builders and makers.",
        "days_out": 21, "time": "18:30:00", "location": "Nowshera Innovation Hub", "capacity": 80, "status": "published",
    },
    {
        "title": "Community Book Club",
        "description": "This month we discuss contemporary South Asian fiction over chai.",
        "days_out": 10, "time": "17:00:00", "location": "City Library, Main Hall", "capacity": 30, "status": "draft",
    },
    {
        "title": "Startup Pitch Night",
        "description": "Early-stage founders pitch to a friendly room of peers and mentors.",
        "days_out": 35, "time": "19:00:00", "location": "Riverside Coworking", "capacity": 120, "status": "draft",
    },
    {
        "title": "Winter Charity Gala",
        "description": "A formal fundraising dinner supporting local education initiatives.",
        "days_out": 60, "time": "20:00:00", "location": "Grand Ballroom", "capacity": 200, "status": "draft",
    },
]


def seed_users() -> None:
    signup_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/signup"
    with httpx.Client(timeout=15) as client:
        for user in DEMO_USERS:
            resp = client.post(signup_url, json={
                "email": user["email"],
                "password": user["password"],
                "data": {"full_name": user["full_name"]},
            })
            if resp.status_code < 400:
                print(f"  created auth user {user['email']}")
            else:
                print(f"  auth user {user['email']} already present (status {resp.status_code})")


def seed_roles_and_events() -> None:
    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            for user in DEMO_USERS:
                cur.execute(
                    "UPDATE public.profiles SET role = %s WHERE email = %s",
                    (user["role"], user["email"]),
                )
            for event in EVENTS:
                cur.execute(
                    "SELECT 1 FROM public.events WHERE title = %s",
                    (event["title"],),
                )
                if cur.fetchone():
                    print(f"  event '{event['title']}' already present")
                    continue
                cur.execute(
                    """
                    INSERT INTO public.events
                        (title, description, event_date, event_time, location, capacity, status)
                    VALUES
                        (%s, %s, (CURRENT_DATE + %s * INTERVAL '1 day')::date, %s, %s, %s, %s)
                    """,
                    (
                        event["title"], event["description"], event["days_out"],
                        event["time"], event["location"], event["capacity"], event["status"],
                    ),
                )
                print(f"  created event '{event['title']}' ({event['status']})")


def main() -> int:
    print("Seeding demo users...")
    seed_users()
    print("Seeding roles and events...")
    seed_roles_and_events()
    print("Seed complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
