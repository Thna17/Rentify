#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[deploy] %s\n' "$*"
}

error() {
  printf '[deploy:error] %s\n' "$*" >&2
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Missing required command: $1"
    exit 1
  fi
}

APP_DIR="${APP_DIR:-$(pwd)}"
COMPOSE_FILE="${APP_DIR}/deploy/vps/compose.yaml"
ENV_FILE="${APP_DIR}/deploy/vps/.env"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-180}"

require_cmd docker
require_cmd curl

cd "$APP_DIR"

log "Target app directory: $APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  error "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  error "Missing deploy environment file: $ENV_FILE"
  exit 1
fi

# Create backup of environment file
backup_path="${ENV_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$backup_path"
log "Backed up environment to $backup_path"

log "Validating docker compose configuration..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config -q

log "Rebuilding and starting Rentify stack..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build --remove-orphans

wait_for_container_health() {
  local container_name="$1"
  local timeout="$2"
  local start_time
  start_time="$(date +%s)"

  log "Waiting for container $container_name to become healthy (timeout: ${timeout}s)..."

  while true; do
    local health_status
    health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_name" 2>/dev/null || true)"

    if [[ "$health_status" == "healthy" || "$health_status" == "running" ]]; then
      log "$container_name is $health_status"
      return 0
    fi

    if (( "$(date +%s)" - start_time >= timeout )); then
      error "Timed out waiting for $container_name to become healthy (current: $health_status)"
      log "Recent logs from $container_name:"
      docker logs --tail=100 "$container_name" || true
      return 1
    fi

    sleep 4
  done
}

# Wait for core and ecommerce APIs to pass health checks
wait_for_container_health "rentify-core-api-1" "$HEALTH_TIMEOUT"
wait_for_container_health "rentify-ecommerce-api-1" "$HEALTH_TIMEOUT"

log "Testing internal container health endpoints..."
if docker exec rentify-web-1 wget -qO- http://core-api:3001/health >/dev/null 2>&1; then
  log "Core API internal endpoint: OK"
else
  error "Core API internal endpoint failed!"
  docker logs --tail=50 rentify-core-api-1 || true
  exit 1
fi

if docker exec rentify-web-1 wget -qO- http://ecommerce-api:4001/health >/dev/null 2>&1; then
  log "Commerce API internal endpoint: OK"
else
  error "Commerce API internal endpoint failed!"
  docker logs --tail=50 rentify-ecommerce-api-1 || true
  exit 1
fi

log "Current stack status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

log "Rentify deployment completed successfully!"
