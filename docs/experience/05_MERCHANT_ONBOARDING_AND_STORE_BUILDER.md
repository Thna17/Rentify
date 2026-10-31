# 05 — Merchant Onboarding, Seller Application & Store Builder

Goal (blueprint §5.1): **sign‑up → first purchasable product in ≤ 15 minutes on a phone**, and never leave a merchant at an
unexplained dead end. Activation = published purchasable product + first completed order.

```
Sign up → verify phone → choose path → Store basics → (template + website)? → first product
       → Launch checklist (home) → submit seller application → approval → products live on marketplace → first order
```

---

## 1. Sign up (React `apps/core/auth` + onboarding wizard)
- Methods: **Phone + OTP** (default) · **Telegram** (existing Core widget flow for platform accounts) · Email + password.
- Fields: full name, phone (+855, OTP verified), email (optional at sign‑up; required before seller application — DEC‑007 checklist needs verified email).
- Terms + merchant COD responsibility acknowledgement (one checkbox, link to policy).
- Already have an account (buyer)? → "Use this account to sell" (same identity — identity‑subject‑model; merchant role added, no second account).
- Edge: O‑001…O‑008.

## 2. Wizard (progress dots, each step saved on Next; resume on any device)

**Step 1 — How do you want to sell?** Two big cards (outcome language):
- **Sell on Rentify Market** — "List products in the marketplace. No website needed. Free pilot: up to 25 products." (DEC‑015)
- **Get my own website + marketplace** — "Beautiful store at yourname.rentifystore.shop. Products also appear in the marketplace. 14‑day free trial." (DEC‑016)
- Small text: "You can add a website later without re‑entering products."

**Step 2 — Your store:** Store name (EN, optional KM) with live availability check of subdomain slug if website path · primary category (marketplace taxonomy; required) · province/city · pickup/operating location (text) · public contact (phone and/or Telegram username) · logo (optional now).

**Step 3 — Delivery & policies (prefilled defaults, editable):** delivery fee per order (default $1.50, can be $0 "Free delivery" — DEC‑004) · delivery area text ("Phnom Penh only", "All provinces via J&T") · usual delivery time text · return policy (default text per DEC‑008, merchant can be more generous) · opening hours (optional).

**Step 4 (website path only) — Pick a look:** templates gallery filtered by recommendation from primary category (never forced): Template 1 Beauty/Skincare, Template 2 Tech/Editorial, Template 3 Café/Menu. Each card: live preview link, mobile thumbnail, "Best for". Pick brand color + font pair (02 §8) → instant preview.

**Step 5 — Add your first product (quick add):** photos (camera first on mobile, up to 8) · name · price · stock · category (suggested from store's primary category) · short description. Variants and details can come later. "Add another" or "Finish".

**Step 6 — Done:** "Your store is ready" + what's next: (a) marketplace: "Submit for review to start selling on Rentify Market" (b) website: "Publish your website" + preview link. → lands on Home with the Launch checklist.

Wizard edge cases: O‑010…O‑022 (back navigation, slug taken, image upload fail, leaving mid‑way, duplicate store creation prevention — one Store per owner).

## 3. Launch checklist (Merchant Home, Shopify setup‑guide pattern)
Persistent card at top of Home until done (dismissible after completion only; "Show setup guide" in Help menu).
Progress "3 of 7 done". Each step: title, why, action button, status (✓ done / ! needs fix / ○ todo), expandable.

| # | Step | Done when | Applies |
|---|---|---|---|
| 1 | Verify your phone | phone verified | all |
| 2 | Verify your email | email verified | all |
| 3 | Complete store profile (logo, description, contact, location) | required fields present | all |
| 4 | Set delivery & return policy | policy saved | all |
| 5 | Add 1 product with photo, price, stock | ≥ 1 publishable product | all |
| 6 | Submit seller application | application submitted | marketplace |
| 7 | Publish your website | Website `active` | website path |
| 8 | Connect Telegram for order alerts | merchant Telegram linked | all (recommended) |
| 9 | Share your store | share kit used once | all (recommended) |

## 4. Seller application & review status (Core seller‑application endpoints)
**Merchant view `/marketplace`:**
- Status banner: Not submitted · **Pending review** ("Usually reviewed within 1 business day") · **Needs changes** (reviewer notes per item, "Fix and resubmit") · **Approved** (date, "Your products are live on Rentify Market") · **Rejected** (reason, appeal via Help) · **Suspended** (reason, what it affects: marketplace only vs platform‑wide).
- Checklist mirror of admin's 7 points (DEC‑007): verified phone · verified email · responsible person / identity (upload ID or business registration; stored privately; show "Only Rentify reviewers can see this") · store name & primary category · operating/pickup location · customer contact method · ≥ 1 clear product with price & stock · accept COD/return/refund responsibility. Each line ✓ / missing with a Fix link.
- "Preview my store page" (marketplace store page as buyers will see it).
- While pending: products can be prepared; marketplace listing shows "Waiting for approval" on each product's channel row; storefront (if any) can already sell (platform‑architecture: seller access by channel).
- Listing is automatic in every environment (DEC-028, supersedes the seller application before selling); the statuses above remain for admin moderation after listing.

## 5. Online store (website) management `/online-store`
Overview card: status (Draft / Published / Suspended / Grace period), URL `name.rentifystore.shop` (copy, open, QR), template name, last published, buttons **Customize** · **Preview** · **Publish/Unpublish**.
Sections: Domain (hosted subdomain; custom domain connect flow [R1.x]: enter domain → DNS records shown (CNAME/TXT) → "Check connection" → verified; banner explains browse‑only checkout rule DEC‑003) · Pages (About, Contact, Policies auto‑built from store data) · Navigation menu · SEO (title, description, social image) · Template switch (preview before switch; content mapping warning).
No website yet → "Add a website" CTA starts wizard Step 4 with the existing Store and products (no re‑entry).

## 6. Store builder / customizer `/online-store/editor` (full screen) — **[R1.x]** replaces field‑list editors (D9)
**Layout desktop:** left panel (sections list / settings), center live preview iframe (device toggle: mobile 375 / tablet / desktop), top bar (Back, page selector Home/Product/Collection, Undo/Redo, Save draft status "Saved", **Publish**).
**Mobile:** preview full screen; bottom sheet with sections; Publish in top bar.

**Model:** a page = ordered list of **sections** from the template's allowed section types; each section has typed fields (text with length limits, image https, product/collection picker, toggle). Built on the existing `storefront-content` allowlist — new section types require adding fields to Core's allowlist first (`storefrontContentFields.js`).
Section types by template (examples): Hero (image, heading, subheading, button → collection/product) · Featured products (collection or category, count) · Featured collection grid · Image + text · Testimonials (merchant‑written, labeled) · Menu list (Template 3) · Visit us / opening hours (Template 3) · Newsletter → Telegram channel link · FAQ · Announcement bar.
Interactions: add section (+ between sections), drag to reorder (with up/down buttons alternative — WCAG 2.5.7), hide/show, duplicate, delete (undo). Click on preview element selects its section. Theme panel: brand color, background, fonts, corners, logo, favicon. Contrast warnings inline.
**Draft vs published:** edits save to draft automatically (debounced); **Publish** pushes live and clears cache; "Discard changes" restores published. Concurrent editor (owner on phone + staff) → version conflict screen "Someone else published changes — reload".
Edge: B‑001…B‑015.

### On‑site owner tools (existing)
Keep the owner toolbar on the live store but make it a thin bar: "You're viewing your store · Edit in builder · Add product · Dashboard". Editing happens in one place (the builder) to avoid two editors.

## 7. Add a channel later
- Marketplace‑only → website: `/online-store` "Add a website" → template + theme → publish; plan upgrade prompt (Starter) with trial.
- Website‑only (opted out of marketplace) → Marketplace: toggle store default ON → if not approved, start application.
- Store‑level marketplace default switch + per‑product override (platform‑architecture) with the visibility explainer (06 §3.4).
