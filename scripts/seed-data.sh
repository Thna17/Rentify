#!/usr/bin/env sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_root"

printf '%s\n' "🌱 Seeding Rentify Core & Commerce databases inside Docker..."

docker compose run --rm core-migrate npm run db:seed
docker compose run --rm commerce-migrate npm run db:seed

printf '%s\n' "✅ Seeding complete!"
