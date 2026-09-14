#!/usr/bin/env bash
# Per-boot startup for the Nowshera Events local stack.
# Brings up PostgreSQL, the GoTrue auth server, and the nginx /auth/v1 proxy.
# Idempotent: safe to run repeatedly; skips services that are already up.
# The FastAPI backend and Vite frontend run as environment "terminals".
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GOTRUE_HOME="$HOME/gotrue"

ensure_env_files() {
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
}

start_postgres() {
  sudo service postgresql start
  for _ in $(seq 1 30); do
    if sudo -u postgres pg_isready -q; then return 0; fi
    sleep 1
  done
  echo "PostgreSQL did not become ready" >&2
  return 1
}

start_gotrue() {
  if curl -fsS http://127.0.0.1:9998/health >/dev/null 2>&1; then
    echo "GoTrue already running"
    return 0
  fi
  ( cd "$GOTRUE_HOME" \
      && set -a && . ./gotrue.env && set +a \
      && nohup ./auth serve >/tmp/gotrue.log 2>&1 & )
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:9998/health >/dev/null 2>&1; then
      echo "GoTrue is up"
      return 0
    fi
    sleep 1
  done
  echo "GoTrue did not become ready; see /tmp/gotrue.log" >&2
  return 1
}

start_nginx() {
  sudo cp "$REPO_ROOT/.cursor/nginx/gotrue-proxy.conf" /etc/nginx/conf.d/gotrue-proxy.conf
  sudo nginx -t
  if sudo service nginx status >/dev/null 2>&1 && pgrep -x nginx >/dev/null 2>&1; then
    sudo service nginx reload
  else
    sudo service nginx start
  fi
}

main() {
  ensure_env_files
  start_postgres
  start_gotrue
  start_nginx
  echo "Local stack is up: Postgres:5432  GoTrue:9998  Auth proxy:9999"
  if [ "${1:-}" = "--services-only" ]; then
    return 0
  fi
}

main "$@"
