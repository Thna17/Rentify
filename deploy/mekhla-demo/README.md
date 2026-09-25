# Storefront demo on mekhla.digital

Published stores open at `https://<store-name>.mekhla.digital` (for example
`https://aura-botanicals.mekhla.digital`) while Rentify itself runs on this
machine.

| Piece | Where it runs | Address |
| --- | --- | --- |
| Storefront app (both templates) | Cloudflare Worker `rentify-storefront` | `https://<store>.mekhla.digital` |
| Core API (store lookup only) | This machine, through Cloudflare Tunnel `rentify-demo` | `https://rentify-api.mekhla.digital` |
| Commerce API (catalog and guest cart only) | This machine, through the same tunnel | `https://rentify-commerce.mekhla.digital` |
| Onboarding, merchant dashboard, sign-in | This machine | `http://localhost:4200`, `:4400`, `:4300` |

The tunnel forwards only the requests a public storefront makes
([cloudflared.yml](cloudflared.yml)); sign-in, merchant, admin, order and
payment endpoints answer 404, because the local demo accounts use passwords
from the repository seed. Checkout is therefore not part of this demo, and a
store's sign-in link opens `localhost`, so it only works on this machine.

The existing `admin`, `api`, `colis`, `staging`, `www`, `send` and `rsend`
subdomains keep their own DNS records and are reserved: no store can take
those names, and the Worker passes their traffic through unchanged.

## One-time setup

1. **Tunnel** (uses the `cloudflared` login already on this machine):

   ```sh
   cloudflared tunnel create rentify-demo
   cloudflared tunnel route dns rentify-demo rentify-api.mekhla.digital
   cloudflared tunnel route dns rentify-demo rentify-commerce.mekhla.digital
   ```

   If `route dns` reports an authentication error, the local `cloudflared`
   login belongs to another domain. Add the two records in the dashboard
   instead: type `CNAME`, names `rentify-api` and `rentify-commerce`, target
   `<tunnel id>.cfargotunnel.com` (the id printed by `tunnel create`), **Proxied**.

2. **Wildcard DNS record** in the Cloudflare dashboard (mekhla.digital → DNS →
   Records → Add record): type `AAAA`, name `*`, IPv6 address `100::`,
   proxy status **Proxied**. Explicit records such as `admin` and `api` take
   precedence over it. Cloudflare's free certificate covers `*.mekhla.digital`.

3. **Worker**: sign in once with `npx wrangler@4 login`, then from
   `rentify-frontend`:

   ```sh
   npm run deploy:storefront:mekhla
   ```

   This builds the storefront against the tunnel addresses and deploys the
   Worker with the route `*.mekhla.digital/*`. Re-run it after changing a
   template.

## Each demo session

From the repository root:

```sh
docker compose -f compose.yaml -f compose.mekhla.yaml up -d
cloudflared tunnel --config deploy/mekhla-demo/cloudflared.yml run rentify-demo
```

Publish a store from onboarding (`http://localhost:4200`) or open an existing
one, e.g. `https://aura-botanicals.mekhla.digital`. To return to purely local
development, run `docker compose up -d` without the override; stores then open
at `http://<store>.localhost:4900` again.

## Removing the demo

Delete the Worker (`npx wrangler@4 delete --config rentify-frontend/apps/storefront/cloudflare/wrangler.jsonc`),
the `*` DNS record, and the tunnel (`cloudflared tunnel delete rentify-demo`)
with its two DNS records.
