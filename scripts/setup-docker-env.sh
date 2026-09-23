#!/usr/bin/env sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
target_file="$project_root/.env.docker"

if [ -e "$target_file" ]; then
  printf '%s\n' ".env.docker already exists; it was not replaced."
  exit 0
fi

if ! command -v openssl >/dev/null 2>&1; then
  printf '%s\n' "openssl is required to generate local development secrets."
  exit 1
fi

umask 077
{
  printf 'MYSQL_ROOT_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'MYSQL_APP_PASSWORD=%s\n' "$(openssl rand -hex 24)"
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'JWT_REFRESH_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'COOKIE_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'SESSION_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'SERVICE_TO_SERVICE_TOKEN=%s\n' "$(openssl rand -hex 32)"
  printf 'PAYMENT_CONFIG_ENCRYPTION_KEY=%s\n' "$(openssl rand -base64 32 | tr -d '\n')"
  printf 'MYSQL_HOST_PORT=%s\n' "3307"
} > "$target_file"

if [ ! -e "$project_root/.env" ]; then
  cp "$target_file" "$project_root/.env"
  printf '%s\n' "Created .env (copy of .env.docker) for direct 'docker compose' commands."
fi

printf '%s\n' "Created .env.docker with local-only generated secrets. Do not commit it."
