# Nowshera Events Co.

A full-stack event registration and management system for discovering events, reserving seats, and managing a published event calendar.

## Current stack

- Frontend: React, React Router, Vite
- Backend: FastAPI, SQLAlchemy, Pydantic
- Data and auth: PostgreSQL and Supabase Auth

## Features

- Public upcoming-event discovery and event details
- Supabase signup/login with email-confirmation-aware responses
- Password reset, authenticated password change, and email-change flows
- Profile account settings for name, email, and password
- Verified bearer-token authentication and profile lookup
- Refresh-token session persistence across page reloads
- Attendee registration and cancellation
- Transactional event-row locking for capacity checks
- Dedicated admin login at `/admin/login` using the same real authentication system
- Role-checked admin access before any admin UI or admin API is granted
- Admin dashboard with summary metrics and event management controls
- Admin event creation, editing, publishing, completion, and cancellation
- Admin attendee lists and report summary metrics via existing backend APIs
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

Copy `backend/.env.example` to `backend/.env` and set backend-only values such as `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_KEY`.

For local frontend development, set `VITE_API_URL` (see `frontend/.env.example` / `frontend/.env.development`) to the local API base URL, for example `http://127.0.0.1:8001`.

Rules:

- Backend secrets stay in backend environment variables only.
- `DATABASE_URL` is never a frontend variable.
- Supabase service-role keys and other secrets are never placed in frontend variables.
- Never commit `.env` files. The checked-in `.gitignore` excludes them.
- Do not put real secret values in this README.

## Run locally

Backend:

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. API documentation is available at `http://127.0.0.1:8001/docs`.

Backend API tests:

```powershell
cd backend
.\venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\venv\Scripts\python.exe -m pytest tests\test_api.py -q
```

RLS security tests (uses real Supabase Auth against shared test accounts):

```powershell
cd backend
$env:RLS_TEST_PASSWORD='your-shared-test-password'
.\venv\Scripts\python.exe test_rls.py
```

Browser smoke tests (with the frontend and backend already running):

```powershell
cd frontend
npm install
npx playwright install chromium
npm run build
npm run test:e2e
```

## Admin access

Admin accounts are ordinary authenticated users whose `profiles.role` is `admin`. Create an account through the normal signup flow, then assign `role = 'admin'` for that profile through an authorized Supabase database process. There is no public endpoint that accepts or changes a role. An email address alone never grants admin access.

### Admin frontend routes

- `/admin/login` — dedicated admin login page
- `/admin/dashboard` — admin control center (summary metrics + event management)
- `/admin/events` — event list and lifecycle actions
- `/admin/events/new`, `/admin/events/:id`, `/admin/events/:id/edit`, `/admin/events/:id/attendees`
- `/admin/reports` — report/summary metrics

Behavior:

- Admin authentication uses the existing real authentication system (`POST /auth/login`) and loads the authenticated profile (`GET /auth/me`).
- The user's actual role from the secure profile/auth path is checked before admin access is granted.
- Unauthenticated users opening protected admin pages are redirected to `/admin/login`.
- Authenticated non-admin users cannot access admin functionality (UI redirects/denies access; backend admin APIs still require admin authorization).

### Admin dashboard capabilities

The admin dashboard and related admin pages support:

- Event creation
- Event editing
- Publishing events
- Completing events
- Cancelling events
- Viewing attendees
- Dashboard/report summary metrics

These use the existing backend admin APIs listed below.

## Test accounts

These labeled test profiles are used for local verification against the live Supabase project. Set the shared password yourself in your local environment; do not commit secrets.

| Role | Email |
|------|-------|
| Attendee A | `attendee.a@test.example` |
| Attendee B | `attendee.b@test.example` |
| Admin | `admin.test@example.com` |

Password: set via your local secrets / `$env:RLS_TEST_PASSWORD` for `test_rls.py`. Never put Supabase keys, database passwords, or JWT secrets in this README.

## API overview

Authentication:

- `POST /auth/signup`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/verify`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/change-password`
- `POST /auth/change-email`

Profile:

- `GET /profile/me`
- `PATCH /profile/me`

Events and registrations:

- `GET /events/`
- `GET /events/{event_id}`
- `POST /registrations?event_id=...`
- `GET /registrations/me`
- `POST /registrations/{registration_id}/cancel`

Admin:

- `GET /admin/events`
- `POST /admin/events`
- `GET /admin/events/{event_id}`
- `PUT /admin/events/{event_id}`
- `POST /admin/events/{event_id}/{action}` where `{action}` is `publish`, `complete`, or `cancel`
- `GET /admin/events/{event_id}/attendees`
- `GET /admin/reports/summary`

On the Vercel deployment, backend routes are also reachable under `/api/...` (for example `/api/auth/login`, `/api/events/`).

## Verification

Latest local verification results:

- Backend pytest (`tests/test_api.py`): **8 passed**
- RLS security tests (`test_rls.py`): **18/18 passed**
- Playwright (`npm run test:e2e`): **30 passed**
- Frontend production build (`npm run build`): **passed**

Local authentication and core event-management flows were exercised against real Supabase test accounts.

Verified flows include:

- Login
- Session persistence
- Logout
- Password change
- Name change
- Attendee event registration
- Registration cancellation
- Capacity protection
- Admin event creation
- Admin event editing
- Admin event publishing
- Admin event completion
- Admin attendee viewing
- RLS cross-user security
- Protected admin access

Fresh signup through Supabase email confirmation, password-reset link completion, and email-change confirmation were not fully proven end-to-end when Supabase Auth email delivery/rate limits blocked those flows. That blocker is email delivery/rate limiting, not an application logic failure by itself.

## Deployment

Live deployment:

- URL: [https://event-management-system-jet-gamma.vercel.app/](https://event-management-system-jet-gamma.vercel.app/)
- Frontend: React + Vite on Vercel
- Backend: FastAPI through the root `vercel.json` multi-service configuration
- Database/Auth: Supabase PostgreSQL + Supabase Auth + RLS

The root `vercel.json` configures `services.frontend` and `services.backend`, with `/api/*`, `/health`, and `/docs` routed to the backend.

Environment notes for Vercel (root project, not a frontend-only deploy):

- Prefer omitting `VITE_API_URL` in production so the browser calls same-origin `/api`.
- Set backend env vars on the Vercel project: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`, `FRONTEND_ORIGINS` (exact production origin), plus redirect helpers such as `PUBLIC_APP_URL`, `AUTH_CONFIRMATION_REDIRECT_URL`, `PASSWORD_RESET_REDIRECT_URL`, and `EMAIL_CHANGE_REDIRECT_URL` when used.
- Configure Supabase Site URL and Auth redirect allowlist for the production origin, including `/auth/callback` and `/reset-password`.
- Never put `DATABASE_URL` or a service-role key in frontend variables.

Deploy from the repository root (where `vercel.json` lives), for example:

```powershell
npx vercel deploy --prod --yes
```

## Production Security Notes

- Enable Supabase leaked-password protection for additional production hardening.
- Keep production secrets out of frontend code and source control.

## Known Limitations

- Supabase email-based authentication can be temporarily affected by Auth email rate limits during repeated signup, password-reset, or email-change requests.
- Email confirmation, password reset, and email-change confirmation depend on Supabase Auth email delivery and redirect configuration.
- Payments, QR check-in, SMS notifications, native mobile applications, advanced seating, and advanced ticket pricing are outside the current project scope.
- The application may require additional infrastructure and optimization for very large production workloads.
