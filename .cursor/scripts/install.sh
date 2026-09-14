#!/usr/bin/env bash
# Idempotent development setup for the Nowshera Events full-stack app.
# Provisions a fully self-contained local stack (no external Supabase account):
#   - PostgreSQL (application data + GoTrue "auth" schema)
#   - GoTrue / Supabase Auth server (standalone binary)
#   - nginx reverse proxy exposing GoTrue under /auth/v1
#   - Python backend (FastAPI) virtualenv
#   - React/Vite frontend dependencies + Playwright browser
# Safe to run repeatedly.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS_DIR="$REPO_ROOT/.cursor/scripts"
GOTRUE_HOME="$HOME/gotrue"
GOTRUE_VERSION="v2.197.0"

echo "==> [1/9] Installing system packages"
sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
  postgresql postgresql-contrib nginx-light \
  python3-venv python3-dev libpq-dev build-essential curl xz-utils

echo "==> [2/9] Starting PostgreSQL and configuring database"
sudo service postgresql start
# Wait for the server to accept connections.
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres PASSWORD 'postgres';"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='eventsdb'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE eventsdb;"
fi
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d eventsdb -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA IF NOT EXISTS auth;"

echo "==> [3/9] Installing GoTrue (Supabase Auth) $GOTRUE_VERSION"
if [ ! -x "$GOTRUE_HOME/auth" ]; then
  mkdir -p "$GOTRUE_HOME"
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/auth.tar.xz" \
    "https://github.com/supabase/auth/releases/download/${GOTRUE_VERSION}/auth-${GOTRUE_VERSION}-amd64.tar.xz"
  tar -xf "$tmp/auth.tar.xz" -C "$tmp"
  cp "$tmp/auth" "$GOTRUE_HOME/auth"
  rm -rf "$GOTRUE_HOME/migrations"
  cp -r "$tmp/migrations" "$GOTRUE_HOME/migrations"
  chmod +x "$GOTRUE_HOME/auth"
  rm -rf "$tmp"
fi
cp "$REPO_ROOT/.cursor/gotrue/gotrue.env" "$GOTRUE_HOME/gotrue.env"

echo "==> [4/9] Running GoTrue auth-schema migrations"
( cd "$GOTRUE_HOME" && set -a && . ./gotrue.env && set +a && ./auth migrate )

echo "==> [5/9] Writing local .env files (only if missing)"
if [ ! -f "$REPO_ROOT/backend/.env" ]; then
  cat > "$REPO_ROOT/backend/.env" <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/eventsdb
SUPABASE_URL=http://127.0.0.1:9999
SUPABASE_KEY=local-anon-key
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
AUTH_CONFIRMATION_REDIRECT_URL=http://127.0.0.1:5173/login
PASSWORD_RESET_REDIRECT_URL=http://127.0.0.1:5173/reset-password
EOF
fi
if [ ! -f "$REPO_ROOT/frontend/.env" ]; then
  echo "VITE_API_URL=http://127.0.0.1:8000" > "$REPO_ROOT/frontend/.env"
fi

echo "==> [6/9] Installing backend Python dependencies"
cd "$REPO_ROOT/backend"
if [ ! -x "venv/bin/python" ]; then
  python3 -m venv venv
fi
./venv/bin/python -m pip install --upgrade pip
./venv/bin/python -m pip install -r requirements-dev.txt

echo "==> [7/9] Installing frontend dependencies + Playwright browser"
cd "$REPO_ROOT/frontend"
npm install
npx playwright install --with-deps chromium

echo "==> [8/9] Creating application schema (tables, trigger, index)"
cd "$REPO_ROOT/backend"
# database.py reads backend/.env via python-dotenv; avoid inheriting a stray DATABASE_URL.
env -u DATABASE_URL ./venv/bin/python -c "
from database import engine, Base
import models
Base.metadata.create_all(engine)
print('tables ensured:', list(Base.metadata.tables.keys()))
"
PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d eventsdb -v ON_ERROR_STOP=1 <<'SQL'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email, '@', 1)),
    new.email,
    'attendee'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create unique index if not exists uniq_active_registration
  on public.registrations (user_id, event_id)
  where status = 'active';
SQL

echo "==> [9/9] Seeding demo data (admin, attendee, events)"
# Seeding needs the auth server for user creation; bring it up via start.sh helpers.
"$SCRIPTS_DIR/start.sh" --services-only
cd "$REPO_ROOT"
env -u DATABASE_URL ./backend/venv/bin/python "$SCRIPTS_DIR/seed.py"

echo "==> Install complete."
