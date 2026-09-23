# Security

## Environment variables

Keep all values out of Git. `SERVICE_TO_SERVICE_TOKEN`, `PAYMENT_CONFIG_ENCRYPTION_KEY`, database, cookie, JWT, payment-provider, SMTP, and Telegram values are secrets. See `.env.example` for names. `PAYMENT_CONFIG_ENCRYPTION_KEY` must be a base64-encoded 32-byte key.

## Trust boundaries

Core is the source of truth for merchant identity and synchronizes website records using `x-rentify-service-token`. E-commerce uses the synchronized `WebsiteData.userId` to enforce tenant ownership. Payment credentials are AES-256-GCM encrypted at rest and stripped from every browser response. After setting `PAYMENT_CONFIG_ENCRYPTION_KEY`, run `npm run security:migrate-payment-configs` once to encrypt existing legacy payment configurations.

## Protected route groups

Payment configuration, merchant order actions, and product mutations require an authenticated website owner or assigned staff member. `/api/website-data` writes require service authentication; public storefront traffic does not receive provider credentials.
