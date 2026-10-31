# Work packet — Store design: switch template and save page layout

Prompt for an agent. Self-contained; read it top to bottom before changing anything.

---

You are working in the Rentify monorepo (`C:\Users\User\rentify`). Read `AGENTS.md` and `CLAUDE.md` first, then the
open item **"Storefront template switch and page layout"** in `docs/notes.md` — it is the contract proposal you are
implementing. The target UX is screen **M18 · Store design** in
`docs/experience/wireframes/rentify-ux-redesign.html` (open it in a browser): template switching and layout saving
work, and one "Publish changes" button saves both.

## Goal

The merchant Store design page (`/customization`, merchant app `apps/core/merchant/src/pages/store-design/`) already
previews the merchant's live store in every template, at desktop and 360 px, and lets them show, hide and reorder
home-page sections. "Use this template" and "Save layout" are disabled because Core has no contract for either.
Build both contracts and turn the buttons on, so shoppers see the template and layout the merchant chose.

## Current state (verified 2026-10-31 — re-check before relying on it)

- `Website.templateId` is set only at creation. The `updateWebsite` mutation in
  `rentify-frontend/libs/apis/src/store/apis/websiteApi.js` sends `PATCH /api/websites/:templateId/:userId`, which
  Core does not route.
- Core website routes: `rentify-server/src/modules/websites/websiteRoutes.js` (e.g.
  `PUT /:websiteId/storefront-content` with `verifyToken, requireWebsiteOwner`); controller `websiteController.js`
  (Commerce sync through `../commerce-sync` `ecommerceSyncService`, merchant cache via `getMerchantCache()`).
- Content fields and validation: `rentify-server/src/modules/websites/storefrontContentFields.js`
  (`validateStorefrontContent`). Templates: `rentify-server/src/models/WebsiteTemplate.js`,
  `src/modules/templates/*`.
- The storefront serves templates by `websiteTemplateId` 1–4 (`rentify-frontend/apps/storefront/src/templates.js`,
  `TEMPLATE_LOADERS`).
- Layout: `rentify-frontend/libs/storefront/src/preview.jsx` — `TEMPLATE_SECTIONS` (section ids per template),
  `serializeLayout` / `normalizeLayout` (comma list, `-id` = hidden), `useSectionLayout(templateId)` used by each
  template's `Home.jsx`. Today it reads the layout only from `?previewLayout=` or the
  `rentify:storefront-preview` postMessage while framed; otherwise each template's default order.
- Until this lands, the merchant's layout draft lives in their browser only.

## Work

### 1. Core: switch template
- `PUT /api/websites/:websiteId/template` with body `{ templateId }`; `verifyToken` + `requireWebsiteOwner`.
- `templateId` must be an existing `WebsiteTemplate` the storefront serves (`websiteTemplateId` 1–4); otherwise 400
  with a stable error code (check existing codes in the websites module first; document any new one).
- Updates `Website.templateId` only. It must **not** touch `WebsiteContents`: store info, logo, contact and social
  links, categories, products and theme stay as they are. Content that only one template reads (e.g. `Menu Title`)
  is kept and simply unused by the others.
- Sync Commerce the same way other website updates do, clear the merchant/website cache, respond
  `{ websiteTemplateId }`.
- Add the route to `docs/security/authorization-matrix.json` if routes are listed there.

### 2. Core: save page layout
- New content field `Page Layout` in `storefrontContentFields.js`. Value: an object keyed by `websiteTemplateId`,
  each a layout string, e.g. `{ "1": "categories,-newArrivals,featured" }`.
- Validation: keys 1–4; each id must be a section id of that template (mirror `TEMPLATE_SECTIONS` on the server —
  one source of truth if feasible, otherwise a test that fails when the two lists differ); no duplicates; the hero
  is always first and cannot be hidden. Unknown ids → 400.
- Saved through the existing `PUT /api/websites/:websiteId/storefront-content`. A layout saved for one template is
  kept when the merchant switches away and comes back.

### 3. Storefront: use the saved layout
- `useSectionLayout(templateId)` uses, in order: preview message/param while framed → saved `Page Layout` for this
  template → template default. Shoppers must never see a preview-only layout.

### 4. Merchant app: turn the buttons on
- Fix `updateWebsite` (or add a `switchTemplate` mutation) to call the new route; invalidate the website query.
- "Use this template" and "Save layout" (or one "Publish changes", per wireframe M18) call the new contracts; show
  saving, success and error-with-retry states; confirm before switching template ("Your products, logo and colours
  stay. Some text only one template uses won't show."). Remove the browser-only draft once saving works.
- All new strings in EN and KM message catalogs.

### 5. Docs
- Move the `docs/notes.md` open item to resolved with the date, routes and tests.

## Out of scope
Sub-categories in templates, translated template names/descriptions, new templates, a full page builder, theme
colour changes (already saved through storefront content).

## Rules
- Branch from `develop`; PRs into `develop`; never merge. Commit trailer and PR footer per repo rules.
- Shared packages (`libs/*`) change only in the packets that own them — say in the PR which lane this is.
- Design tokens only, Lucide icons, 44 px targets, 360 px first, WCAG 2.2 AA (`CLAUDE.md`).
- Verify: `npm run verify:core`, `npm run verify:frontend`, unit tests for both validators and the route
  (owner-only, bad template id, content untouched after switch, invalid layout ids, hero rule), and a Playwright
  check: switch template and reorder a section in the merchant app, then load the storefront unframed and see both.

## Report back
What changed (files), tests run with results, anything left open and why.
