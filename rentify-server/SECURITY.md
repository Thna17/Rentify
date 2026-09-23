# Security

## Environment variables

Keep all values out of Git. `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, `SESSION_SECRET`, `SERVICE_TO_SERVICE_TOKEN`, `VERCEL_TOKEN`, Cloudinary credentials, OAuth credentials, SMTP credentials, Telegram credentials, and Bakong credentials are server secrets. See `.env.example` for the complete names.

## Trust boundaries

Browsers authenticate with HttpOnly Core cookies. Core owns user, role, and website ownership. E-commerce accepts synchronized website writes only from Core with `x-rentify-service-token`; the same high-entropy token must be configured in both services. Payment-provider credentials are stored only by E-commerce and are never returned by an API response.

The four-identity model, controlled-subdomain cookie rules, and independent
custom-domain authorization-code handoff are defined in
[`docs/adr/0001-identity-and-cross-domain-sso.md`](docs/adr/0001-identity-and-cross-domain-sso.md).

## Protected route groups

`/api/admin` and package mutations require an authenticated Core admin. Website theme, content, upload, deployment, color-palette, and merchant Telegram routes require the website owner (or an admin). Core deploy synchronization to E-commerce is service-to-service only.
