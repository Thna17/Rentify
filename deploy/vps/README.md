# Rentify on the shared VPS

Rentify runs as its own Docker Compose project (`rentify`) in `~/apps/rentify`,
next to other applications on the machine. It publishes no host ports: MySQL
and Redis stay on the project's private network, and the public reaches the
apps only through the Cloudflare Tunnel container. Other projects' containers,
ports, volumes, Caddy and the host `cloudflared` service are not touched.

| Address | What |
| --- | --- |
| `https://rentify.mekhla.digital` | Marketing site and store onboarding |
| `https://rentify-auth.mekhla.digital` | Sign-in and sign-up |
| `https://rentify-seller.mekhla.digital` | Merchant dashboard |
| `https://rentify-market.mekhla.digital` | Marketplace |
| `https://rentify-admin.mekhla.digital` | Platform administration |
| `https://rentify-api.mekhla.digital` | Core API |
| `https://rentify-commerce.mekhla.digital` | Commerce API |
| `https://<store>.mekhla.digital` | Published stores (Cloudflare Worker, `rentify-frontend/apps/storefront/cloudflare`) |

## Files on the server (not in git)

- `deploy/vps/.env` — generated once by `setup-env.sh`: database passwords,
  JWT/cookie secrets, payment-config key and the demo accounts' passwords.
  Keep it: the database and existing sessions depend on it.
- `deploy/vps/secrets.env` — third-party accounts: `SMTP_USER`/`SMTP_PASS`
  (sign-up codes), `CLOUDINARY_*` (image uploads), `BAKONG_*` (KHQR).
- `deploy/vps/cloudflared/credentials.json` — the `rentify-demo` tunnel.

## DNS (Cloudflare, mekhla.digital)

`CNAME` → `cdfeeebe-4e2d-45ba-8645-a3ccf2289e71.cfargotunnel.com`, **Proxied**, for
`rentify`, `rentify-auth`, `rentify-seller`, `rentify-market`, `rentify-admin`,
`rentify-api` and `rentify-commerce`, plus `AAAA *` → `100::` Proxied for stores.
Only one machine should run the `rentify-demo` tunnel at a time.

## Deploy or update

From the repository on your computer:

```sh
rsync -az --delete -e "ssh -i ~/.ssh/kt25_vps" \
  --exclude node_modules --exclude dist --exclude .git --exclude .nx --exclude .angular \
  --exclude '.env' --exclude '.env.*' --exclude logs --exclude uploads \
  --exclude deploy/vps/.env --exclude deploy/vps/secrets.env --exclude deploy/vps/cloudflared/credentials.json \
  ./ brathna@100.98.97.8:apps/rentify/
```

On the server:

```sh
cd ~/apps/rentify
sh deploy/vps/setup-env.sh          # first time only; never overwrites
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env up -d --build
```

Migrations and the seed run on every start (`core-migrate`, `commerce-migrate`)
before the APIs. After changing a template, also redeploy the stores Worker
from your computer: `cd rentify-frontend && npm run deploy:storefront:mekhla`.

## Check and operate

```sh
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env ps
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env logs -f core-api ecommerce-api tunnel
docker compose -f deploy/vps/compose.yaml --env-file deploy/vps/.env down     # stop; data volumes are kept
```

Demo account passwords are the `SEED_*_PASSWORD` values in `deploy/vps/.env`
(admin `admin@rentify.local`, merchants `merchant@rentify.local` and
`tech.merchant@rentify.local`).
