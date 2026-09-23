# ADR 0001: Identity boundaries and cross-domain SSO

**Status:** Accepted  
**Date:** 2026-09-22

## Context

Rentify serves a central platform, merchant workspaces, staff users, and
customer storefronts. A browser cookie can only be shared by hosts below the
same registrable parent domain. It cannot be shared safely with an unrelated
merchant custom domain such as `shop.example.com`.

## Decision

### Identity types

| Identity | System of record | Authentication boundary | Tenant boundary |
| --- | --- | --- | --- |
| Platform admin | Core API `User` with `admin` role | Central Rentify authentication | All platform resources, only through explicit admin routes |
| Merchant | Core API `User` | Central Rentify authentication | Own `Website.userId` and its linked commerce data |
| Staff | Core API `Staff` | Central Rentify authentication | Inviting merchant and permitted website(s) only |
| Storefront customer | Commerce API `Customer` | The individual storefront host | Customer account and orders for its `websiteId` only |

Merchant, admin, and staff authentication is Rentify SSO. A staff token is
not an administrator token; its permissions and merchant relationship are
checked for each tenant-scoped request. A customer account is not a merchant
or staff identity.

### Authorization matrix

`Own` means the target website belongs to the authenticated merchant. `Perm`
means the staff permission and its merchant/website relationship must both
pass. `Public` has no authenticated identity. Customer operations additionally
require the account and storefront `websiteId` to match.

| Resource / action | Admin | Merchant | Staff | Customer | Public |
| --- | --- | --- | --- | --- | --- |
| Platform users, templates, packages | Allow | Deny | Deny | Deny | Deny |
| Website settings, theme, content, deployment | Allow | Own | Perm | Deny | Deny |
| Products and inventory write | Allow | Own | Perm | Deny | Deny |
| Products and catalog read | Allow | Own | Perm | Customer storefront | Public storefront only |
| Orders, invoices, POS write | Allow | Own | Perm | Create/cancel own order only where enabled | Checkout only |
| Order and invoice reporting | Allow | Own | Perm | Own order only | Deny |
| Payment configuration and provider credentials | Allow | Own, write-only secret fields | Perm only when explicitly granted | Deny | Deny |
| Analytics | Allow | Own | Perm | Deny | Deny |
| Staff invitations and access changes | Allow | Own | Perm only when explicitly granted | Deny | Deny |
| Customer profile/session | Deny by default | Deny | Deny | Own storefront account | Deny |

Every commerce mutation receives a `websiteId` and must apply the service's
website-access middleware before accessing data. ID-only lookups are not
authorization.

### Cookie boundaries

`COOKIE_DOMAIN` is optional and is only permitted for a parent domain owned
and operated by Rentify (for example `.rentify.example`). It may support SSO
between controlled Rentify subdomains such as central auth, merchant dashboard,
and API. Production cookies are secure, HTTP-only, and use an appropriate
SameSite policy.

Storefront customer cookies are always **host-only**. The Commerce API removes
`COOKIE_DOMAIN` for `Customer` cookies, including refresh and logout paths.
This prevents a central SSO configuration from accidentally extending a
customer session to another merchant storefront.

Never configure `COOKIE_DOMAIN` to a merchant's independent custom domain.

### Independent custom-domain handoff

Cookies are not the SSO transport for independent domains. If a custom domain
needs a central Rentify sign-in handoff, use this authorization-code flow:

1. The custom-domain application registers exact HTTPS redirect URIs, a
   `client_id`, and a server-side token-exchange credential with Rentify.
2. It redirects the browser to central Rentify Auth with `client_id`, exact
   registered `redirect_uri`, `state`, and PKCE `code_challenge`.
3. Rentify authenticates the merchant/admin/staff, checks role and tenant
   entitlement, then issues a one-time authorization code with a maximum
   lifetime of 60 seconds.
4. The custom-domain backend exchanges the code, redirect URI, client
   credential, and PKCE verifier server-to-server. It sets its own host-only
   session cookie.
5. The code is consumed atomically and cannot be reused. Central Rentify
   cookies and refresh tokens never leave the controlled Rentify domain.

This is the required design for future custom-domain workspace access. Customer
sessions do not use this handoff; they remain local to the storefront.

### Redirect policy

The Core API validates `returnUrl`/legacy `returnDomain` navigation hints
against exact origins from the configured Rentify URLs and
`AUTH_RETURN_URL_ALLOWLIST`. The frontend independently applies the same
exact-origin check before navigating. Unparseable values and arbitrary custom
domains are rejected or fall back to the configured marketing URL.

Custom domains must use a pre-registered redirect URI in the code flow above;
they cannot be admitted by accepting a request-supplied `returnDomain`.

### Session lifecycle

- Access tokens are short lived (15 minutes). Refresh tokens are stored as
  hashes and rotate on each successful refresh; an old refresh token is no
  longer valid after rotation.
- Logout revokes the stored refresh token and clears the matching cookie scope.
- Password reset tokens and OTPs are single-use and expire. Password reset
  invalidates active refresh state.
- Staff invitations use random, expiring acceptance tokens. On acceptance the
  token is cleared and the staff member gets only the inviter's configured
  permissions.
- Authentication telemetry must record event type and opaque IDs only; never
  log passwords, OTPs, access tokens, refresh tokens, payment credentials, or
  full request bodies.

## Consequences

There is one central SSO authority for workforce identities and a separate,
tenant-scoped customer session for every storefront. This requires explicit
return-URL registration for custom domains, but removes the unsafe assumption
that a browser cookie can cross unrelated domains.

## Verification

Run the security suites from each API repository:

```sh
npm run test:security
```

The Core suite covers role/tenant middleware and return-URL allowlisting. The
Commerce suite covers tenant access and customer cookie scope. End-to-end
coverage must exercise refresh rotation, logout, password reset, OTP, staff
invitation acceptance, and the future one-time code exchange before releasing
custom-domain SSO.
