#!/usr/bin/env sh
# Creates deploy/vps/.env with fresh random secrets. Run once on the server.
# Never overwrites an existing file: the database and sessions depend on it.
set -e
cd "$(dirname "$0")"
if [ -f .env ]; then
  echo "deploy/vps/.env already exists; leaving it unchanged."
  exit 0
fi
secret() { openssl rand -hex 32; }
# Readable demo passwords: letters, digits and one symbol, 16 characters.
password() { echo "$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | cut -c1-14)@9"; }
umask 077
cat > .env <<ENV
PUBLIC_DOMAIN=mekhla.digital
RESERVED_SUBDOMAINS=admin,api,colis,staging,www,send,rsend,rentify,rentify-api,rentify-commerce,rentify-auth,rentify-seller,rentify-market,rentify-admin
AUTO_APPROVE_SELLERS=true
MYSQL_ROOT_PASSWORD=$(secret)
MYSQL_APP_PASSWORD=$(secret)
JWT_SECRET=$(secret)
JWT_REFRESH_SECRET=$(secret)
COOKIE_SECRET=$(secret)
SESSION_SECRET=$(secret)
SERVICE_TO_SERVICE_TOKEN=$(secret)
PAYMENT_CONFIG_ENCRYPTION_KEY=$(openssl rand -base64 32)
SEED_ADMIN_PASSWORD=$(password)
SEED_MERCHANT_PASSWORD=$(password)
SEED_STAFF_PASSWORD=$(password)
SEED_CUSTOMER_PASSWORD=$(password)
SEED_STORE_PASSWORD=$(password)
ENV
echo "Created deploy/vps/.env (readable only by $(whoami))."
