# ADR 0002: One buyer identity across the marketplace and storefronts

**Status:** Proposed for custom domains, 2026-09-24. The hosted subdomain pilot
uses Core buyer identity behind default-off flags. Custom-domain protocol,
hosting, and legacy migration still require design review and testing.

## Context

Today Commerce stores Customers with a `storeId` and issues storefront customer
cookies for one host. The accepted
[ADR 0001](../../rentify-server/docs/adr/0001-identity-and-cross-domain-sso.md)
deliberately keeps customer accounts separate by storefront. The new product
direction is one buyer account usable in the Rentify marketplace and on every
merchant storefront, including unrelated custom domains. This decision will
supersede ADR 0001's customer identity boundary when it is implemented; its
merchant, admin, staff, and cookie-safety rules remain relevant.

## Proposed model

- One central Rentify buyer subject (`buyerId`) authenticates the person.
  Core identity is the proposed authority, subject to a schema and role audit.
  Buyer identity must remain distinct from merchant/staff authorization even
  if one person can hold multiple roles.
- Commerce links orders, reviews, and buyer-facing history to `buyerId`.
  A per-Store customer profile may hold store-specific preferences, consent,
  loyalty, and delivery details, but it is not a second login account.
- Central marketplace order history may show that buyer's own orders across
  Stores. A merchant storefront shows that buyer's orders for its Store only.
  Merchants cannot read a buyer's activity with other Stores.
- Guest checkout and account linking need explicit contracts; matching email
  text alone never proves two records belong to the same person.

## Sign-in across domains

For the hackathon, storefront buyer checkout is limited to Rentify-hosted
subdomains. The provisional parent is `rentifystore.shop`, which is not yet
owned or deployed. A hosted storefront uses the Core buyer cookie scoped to
the owned parent, and the auth app returns to that exact HTTPS storefront
origin. The APIs accept only one-label hosted subdomains for credentialed
CORS and return URLs when `HOSTED_STOREFRONT_DOMAIN` is configured. Browser
verification on the real domain remains a release gate. A merchant custom
domain stays outside this pilot.

1. On the marketplace's own host, the buyer signs in through central Rentify
   authentication and receives a secure, HTTP-only session for that host.
2. On a merchant custom domain, the storefront redirects to central Rentify
   auth with an exact registered return URI, a Store/Website client identity,
   transaction-bound `state`, and PKCE.
3. After sign-in, central auth returns a short-lived, single-use code. A
   trusted callback on the merchant domain exchanges it server-to-server,
   checks the expected Store/Website and return URI, then sets a secure,
   HTTP-only, host-only session cookie on that domain.
4. The storefront uses that local session for Commerce requests. Central
   cookies and refresh tokens are never sent to the merchant domain. A buyer
   already signed in centrally can complete the handoff without registering
   again, although the browser still performs a redirect.

The current Vite storefronts are static. They require a domain-local backend
or edge callback/proxy for the code exchange and cookie setting; an API hosted
only on a different domain cannot set the custom domain's host-only cookie.
Register and verify custom domains before allowing redirect URIs. Use exact
URI matching, one-time code consumption, short expiry, PKCE, and CSRF
protection. Current OAuth security guidance is
[RFC 9700](https://www.rfc-editor.org/info/rfc9700/); browser application
guidance is [RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html).

## Session and data boundaries

- Sessions are per host. Logging out of one storefront clears that local
  session; an explicit global logout revokes central and linked sessions.
- Every Commerce customer request checks `buyerId` and the current Store or
  Website context. A valid buyer login alone does not authorize access to
  another buyer's order or a merchant's customer list.
- Store-specific marketing consent, loyalty, and contact visibility remain
  scoped to that Store. Shared profile fields and addresses require a separate
  privacy and consent decision.
- Legacy KhmerCraft Buyer and Commerce Customer rows need an ID map and a
  verified claim/reset flow. Do not auto-merge them by email, replay existing
  refresh tokens, or reuse domain cookies.

## Release gate

Before central buyer sign-in is enabled on custom domains, prove registered
redirect enforcement, one-time code use, session rotation and logout,
cross-Store order isolation, legacy account linking, and custom-domain
cookie behavior in staging. Update ADR 0001 and this ADR to **Accepted** only
when the protocol and hosting design are complete.

## Release 1 Browse-Only Custom-Domain Boundary (P2-HOST-003)

Under the approved Release 1 architecture, custom merchant domains are strictly
**browse-only**:
- Custom domains may only access approved public catalog browsing endpoints (products, categories, store details).
- Direct buyer authentication and domain-local sessions on custom domains are disabled. Central cookies and refresh tokens are never issued or forwarded to custom domains.
- Direct cart mutations and checkout on custom domains are disabled. Checkout occurs strictly on verified hosted storefront subdomains under `rentifystore.shop` (`<subdomain>.rentifystore.shop`).
- The OAuth 2.0 / PKCE authorization-code handoff proposed in this document remains unimplemented until separately reviewed, proved, and approved in a post-Release 1 phase.
- Host boundary enforcement in Core (`rentify-server`) and Commerce (`ecommerce-server`) strictly inspects trusted request headers (`Origin`, `Referer`, `Host`) and rejects unauthorized write, cart, checkout, order history, and auth requests with safe denial codes:
  - `CUSTOM_DOMAIN_BROWSE_ONLY`
  - `CUSTOM_DOMAIN_AUTH_DISABLED`
  - `CUSTOM_DOMAIN_CHECKOUT_DISABLED`
  - `CUSTOM_DOMAIN_CART_DISABLED`
- Responses to blocked actions provide the verified hosted storefront URL for safe navigation without open-redirect vectors or credential leakage.
