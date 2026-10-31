# Production Host and Deployment Configuration Validation

**Document ID:** P2-HOST-001
**Status:** Implemented and Enforced
**Release Target:** Rentify Production Release 1
**Companion Documents:** [`docs/decisions/release-1-register.md`](decisions/release-1-register.md), [`docs/platform-architecture.md`](platform-architecture.md), [`docs/identity-subject-model.md`](identity-subject-model.md)

---

## 1. Executive Summary

The Rentify platform enforces a deterministic, automated startup and pre-deployment configuration validator (`tools/host-validator/`). This validator guarantees that every staging and production deployment strictly complies with approved **Release 1 architectural decisions**, eliminates configuration drift, and prevents common critical web vulnerabilities before services accept traffic.

The validation runner executes both as an automated CI repository gate (`npm run verify:hosts` integrated into `npm run verify:repository`) and as an operational deployment verification command for container orchestration, Cloudflare edge routing, and cloud infrastructure pipelines.

---

## 2. Release 1 Architectural Decisions & Policies Enforced

The validator programmatically evaluates configurations against eight core policy domains:

### 2.1 Canonical Public Service Origins & HTTPS Enforcement (DEC-001)
- **Marketplace Apex Domain:** In production, `MARKETPLACE_URL` must strictly resolve to `https://rentifymarket.com` (or `https://www.rentifymarket.com`).
- **HTTPS Enforcement:** In both production and staging, **100% of public service URLs** (`MARKETPLACE_URL`, `AUTH_URL`, `RENTIFY_API_URL`, `ECOMMERCE_API_URL`, `ADMIN_DASHBOARD_URL`, `MERCHANT_DASHBOARD_URL`, `MARKETING_URL`, `STOREFRONT_ORIGIN`) must use the `https://` protocol scheme. Unencrypted `http://` configurations are immediately rejected.
- **Credential Scrubbing:** Public URLs must not contain embedded HTTP Basic credentials (`user:pass@host`).

### 2.2 Owned Hosted Storefront Parent & Pattern (DEC-002)
- **Canonical Hosted Parent:** `HOSTED_STOREFRONT_DOMAIN` must strictly be set to `rentifystore.shop` in production (or `staging.rentifystore.shop` / `rentifystore.shop` in staging).
- **Domain-Only Syntax:** Must be a valid DNS domain name without protocols (`https://`), port numbers (`:443`), or URL paths.
- **Hosted Storefront Pattern:** Merchant storefronts follow the strict pattern `https://<store>.rentifystore.shop`.

### 2.3 Single-Label Hosted Subdomains & Mandatory System Reservations
- **One-Label Invariant:** Storefront subdomains must consist of exactly one DNS label (3–63 characters, lowercase alphanumeric characters and inner hyphens, conforming to RFC 1035). Multi-label subdomains (e.g. `sub.store.rentifystore.shop`) and leading/trailing hyphens are strictly forbidden.
- **Mandatory Reserved Subdomain Names:** System labels cannot be claimed or resolved as merchant storefronts. The validator and runtime origin checkers enforce at least the following mandatory reserved subdomains:
  - `admin`
  - `api`
  - `auth`
  - `billing`
  - `checkout`
  - `mail`
  - `marketplace`
  - `support`
  - Additional infrastructure labels: `www`, `app`, `apps`, `login`, `signin`, `signup`, `account`, `accounts`, `merchant`, `merchants`, `seller`, `sellers`, `market`, `dashboard`, `store`, `stores`, `shop`, `storefront`, `cart`, `pay`, `payment`, `payments`, `invoice`, `email`, `smtp`, `static`, `cdn`, `assets`, `media`, `images`, `help`, `status`, `docs`, `blog`, `news`, `rentify`, `official`, `security`, `test`, `dev`, `staging`, `demo`.
- **Apex Parent Reservation:** The parent domain `rentifystore.shop` cannot be resolved as an individual merchant storefront.

### 2.4 Cookie Domain Isolation & Security Flags (DEC-001)
- **Cross-Storefront Leakage Prevention:** Setting `COOKIE_DOMAIN` to `.rentifystore.shop` or `rentifystore.shop` is strictly prohibited. Doing so would cause cookies to be shared across all merchant storefronts on that parent, allowing malicious storefronts to exfiltrate other merchants' or buyers' session tokens.
- **Host-Only Scoping:** Hosted storefront cookies must remain host-only (domain attribute omitted). Marketplace cookies may specify `rentifymarket.com` or remain host-only.
- **Public Suffix Rejection:** Setting `COOKIE_DOMAIN` to top-level public suffixes (e.g. `.shop`, `.com`) is forbidden.
- **Security Flags:** In production and staging:
  - `secure: true` is mandatory for all session and authentication cookies.
  - `httpOnly: true` is mandatory for all authentication and session tokens.
  - `sameSite: Lax` (or `Strict`) is enforced per DEC-001. `SameSite=None` without `secure: true` is rejected.

### 2.5 Credentialed CORS Allowlists & Wildcard Prohibition
- **Wildcard Prohibition:** Because Rentify APIs exchange session cookies and authorization headers (`credentials: true`), wildcard origins (`*`) are prohibited by CORS standards and blocked by the validator.
- **Null Origin Prohibition:** Origin `null` is strictly rejected.
- **Origin-Only Formatting:** CORS origins must consist of scheme, host, and optional non-standard port; URL paths in CORS origins are flagged.
- **Production Cleanliness:** In production, no CORS origin may use `http://` or loopback addresses.

### 2.6 Auth Return URL Allowlist & Open Redirect Defense
- **Safe Return URLs:** `AUTH_RETURN_URL_ALLOWLIST` entries must be absolute URLs with `https://`.
- **Open Redirect Guard:** Relative URLs (`/login`), protocol-relative URLs (`//attacker.com`), and non-HTTP schemes (`javascript:`, `data:`) are rejected.
- **Destination Allowlist:** In production and staging, return URLs must point exclusively to approved platform destinations:
  - Canonical marketplace domain (`rentifymarket.com` and approved subdomains)
  - Approved single-label non-reserved storefronts (`*.rentifystore.shop`)
  - Configured core, auth, admin, and merchant dashboard origins.

### 2.7 Environment Separation & Localhost Prohibition
- **Localhost Prohibition:** In production (`NODE_ENV=production`), any appearance of `localhost`, `127.0.0.1`, `0.0.0.0`, or `::1` in any public URL, CORS origin, cookie domain, or return URL fails validation immediately.
- **Explicit Target Separation:** Production deployment requires `NODE_ENV=production`.

### 2.8 Feature Flag Compatibility & Release 1 Decision Gates
- **CutLuy Deferral (DEC-027):** CutLuy QR payments are strictly deferred to Phase 9. `CUTLUY_ENABLED` must be `false` or unset in staging and production.
- **Cash on Delivery (DEC-026):** COD is the sole accepted payment method for Release 1 online checkout. `MARKETPLACE_COD_CHECKOUT_ENABLED` must be `true`.
- **Custom Domain Browse-Only Scope (DEC-003):** Custom domains are browse-only in Release 1; checkout occurs exclusively on `<store>.rentifystore.shop/checkout`. `CUSTOM_DOMAIN_CHECKOUT_ENABLED` must be `false` or unset.

### 2.9 Secret Presence & Zero-Credential Diagnostic Guarantee
- **Mandatory Secrets:** Validates presence of `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, `COOKIE_SECRET`, `INTERNAL_SERVICE_SECRET`, `PAYMENT_CONFIG_ENCRYPTION_KEY`, and `DB_PASSWORD`.
- **Minimum Entropy:** Production secrets must be at least 32 characters in length and cannot match weak placeholders (`password`, `secret`, `changeme`, `admin`, `123456`, `test`).
- **Zero-Credential Guarantee:** The validator, error messages, stack traces, and formatted reports **never print, log, or store secret values**. Secrets are reported strictly by status, length, and redaction tags (`[REDACTED: 64 chars]`).

---

## 3. Tooling and CLI Usage

### 3.1 Repository Gate Command
```bash
# Deterministically validate built-in staging and production fixtures and run unit tests
npm run verify:hosts
```

### 3.2 CLI Validator Options
```bash
# Validate against built-in production-safe fixture
node tools/validate-host-config.js --fixture production

# Validate against built-in staging fixture
node tools/validate-host-config.js --fixture staging

# Validate an external deployment environment file for production
node tools/validate-host-config.js --env-file /path/to/.env.production --target production

# Validate an external environment file for staging
node tools/validate-host-config.js --env-file /path/to/.env.staging --target staging

# Machine-readable JSON output for automated CI/CD pipelines
node tools/validate-host-config.js --fixture production --json
```

---

## 4. Configuration Fixtures and Examples

The repository maintains standard reference fixtures that pass all validation criteria:

- **Staging Fixture:** [`tools/fixtures/config/staging.fixture.js`](../tools/fixtures/config/staging.fixture.js) and [`.env.staging.example`](../tools/fixtures/config/.env.staging.example)
- **Production-Safe Fixture:** [`tools/fixtures/config/production-safe.fixture.js`](../tools/fixtures/config/production-safe.fixture.js) and [`.env.production.example`](../tools/fixtures/config/.env.production.example)

---

## 5. Sample Diagnostic Output

```
================================================================
       RENTIFY HOST & CONFIGURATION VALIDATION REPORT
================================================================
 Target Environment : PRODUCTION
 Status             : PASSED (CONFORMANT)
 Errors Detected    : 0
 Warnings Detected  : 0
----------------------------------------------------------------
 PASSED POLICIES:
   [PASS] Environment Separation & Localhost Prohibition
   [PASS] Public Service Origins (HTTPS & Canonical Domains)
   [PASS] Owned Hosted Storefront Parent (rentifystore.shop)
   [PASS] Cookie Domain Isolation & Security Flags
   [PASS] Credentialed CORS Allowlists & Wildcard Prohibition
   [PASS] Auth Return URL Allowlist & Open Redirect Defense
   [PASS] Feature Flag Compatibility (CutLuy, COD, Custom Domains, Seller KYC)
   [PASS] Secret Presence & Zero-Credential Diagnostic
----------------------------------------------------------------
 Zero-Credential Guarantee: No secret values or sensitive tokens
 are ever printed in this report or stored in logs.
================================================================
```
