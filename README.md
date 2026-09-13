# Nowshera Events Co.

A full-stack event registration and management system for discovering events, reserving seats, and managing a published event calendar.

## Current stack

- Frontend: React, React Router, Vite
- Backend: FastAPI, SQLAlchemy, Pydantic
- Data and auth: PostgreSQL and Supabase Auth

## Features

- Public upcoming-event discovery and event details
- Supabase signup/login with email-confirmation-aware responses
- Verified bearer-token authentication and profile lookup
- Attendee registration and cancellation
- Transactional event-row locking for capacity checks
- Admin event creation, editing, publishing, completion, and cancellation
- Admin attendee lists and real dashboard summary metrics
- Protected routes and responsive states for loading, empty, and error conditions

## Structure

```text
backend/
  api/auth.py          Authentication and current profile
  api/events.py        Public event discovery
  api/registrations.py Attendee registration workflows
  api/profiles.py      Profile read/update
  api/admin.py         Admin events, attendees, reports
  dependencies.py      Bearer token and role dependencies
  models.py            SQLAlchemy models
frontend/
  src/App.jsx          Routes and product UI
  src/api.js           Central API client
  src/styles.css       Responsive design system
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- A Supabase project with the `profiles`, `events`, and `registrations` tables
- Supabase Auth profile trigger and RLS policies configured according to the project PRD

## Environment

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_KEY`. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`.

Never commit either `.env` file. The checked-in `.gitignore` excludes them.

## Run locally

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. API documentation is available at `http://127.0.0.1:8000/docs`.

Backend smoke tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest
```

Browser smoke tests (with the frontend and backend already running):

```powershell
cd frontend
npm install
npx playwright install chromium
npm run test:e2e
```

## Admin setup

Create an account through the normal signup flow, then assign `role = 'admin'` for that profile through an authorized Supabase database process. There is no public endpoint that accepts or changes a role.

## API overview

- `GET /events/`, `GET /events/{event_id}`
- `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`
- `POST /registrations?event_id=...`, `GET /registrations/me`, `POST /registrations/{id}/cancel`
- `GET/PATCH /profile/me`
- `GET/POST /admin/events`, `GET/PUT /admin/events/{id}`
- `POST /admin/events/{id}/publish|complete|cancel`
- `GET /admin/events/{id}/attendees`
- `GET /admin/reports/summary`

## Verification

Backend modules compile with the project virtual environment. Backend smoke tests currently pass `3 passed`. The captured Playwright route/live-data suite passes `13 passed`; it covers public routes, protected redirects, `/admin`, event discovery/filtering, and mobile overflow. The frontend production build passes without warnings.

## Deployment

- Render/Railway: use `render.yaml` or run `uvicorn main:app --host 0.0.0.0 --port $PORT` from `backend/`.
- Vercel: deploy `frontend/`; `vercel.json` preserves React Router deep links.
- Set `VITE_API_URL` to the deployed HTTPS backend URL.
- Set `FRONTEND_ORIGINS` to the exact deployed HTTPS frontend origin.
- Configure Supabase Site URL, confirmation redirect, and reset redirect to the exact deployed frontend URLs.
- Never put `DATABASE_URL` or a service-role key in frontend variables.

## Known limitations

- Supabase dashboard URL configuration, the auth trigger, and live RLS verification still require applying the checked-in migration in `supabase/migrations`.
- Full real-account auth, admin, and registration journey tests require separate fake Supabase test accounts and provider access.
- Password reset requires adding the exact local and production redirect URLs to Supabase Auth URL Configuration.
- No production deployment has been claimed or verified from this workspace; Render and Vercel manifests are prepared in `render.yaml` and `frontend/vercel.json`.
