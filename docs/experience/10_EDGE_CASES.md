# 10 — Edge Cases (each row → a test)

Test type: **U** unit/component · **I** API integration (existing `test/integration`, `test/security`) · **E** Playwright at 360px + 1280px (EN; KM where marked) · **M** manual on real device.
GJ = golden journey it protects. Name tests with the id, e.g. `marketplace/M-074-double-submit.spec.ts`.

## Marketplace discovery (M‑001…M‑044)
| ID | Case | Expected | Test | GJ |
|---|---|---|---|---|
| M‑001 | Home with almost no data (new environment) | Sections with too little data hidden; no fake items; categories + Sell CTA still render | E | 1 |
| M‑002 | Home API partially fails | Only that section hidden; page renders | E | — |
| M‑003 | Khmer UI at 360px | No text overflow; tiles wrap ≤ 3 lines | E(km) | — |
| M‑004 | Banner swipe | Manual only, no autoplay; reduced motion respected | E | — |
| M‑005 | Category with < 4 purchasable products | Not shown on home strip | U | — |
| M‑006 | Deals rail with no compare‑at products | Rail hidden | U | — |
| M‑010 | Zero search results | Recovery UI, never blank | E | — |
| M‑011 | Khmer query | Matches KM names | I | — |
| M‑012 | Filters + back button | URL state restores filters, loaded pages and scroll | E | — |
| M‑013 | Invalid filter in URL | Dropped silently | U | — |
| M‑014 | Out‑of‑stock toggle off | Shows OOS items greyed, not purchasable | E | — |
| M‑015 | Store suspended while results cached | Item disappears on refresh; PDP 404 | I | 5 |
| M‑016 | Very long query / special chars | Truncate 100, safe | U | — |
| M‑017 | Search exact store name | Store suggestion first | U | — |
| M‑018 | Load more after last page | Button hidden, "You've seen all n" | U | — |
| M‑019 | Slow 3G | Skeletons, no CLS > 0.1 | M | — |
| M‑020 | Product with variants | Picker resolves to `ProductVariant`; price/stock/image per variant | E | 2 |
| M‑021 | Invalid variant combo | Disabled chip | U | — |
| M‑022 | Sold‑out variant selected | Price shown, "Out of stock", Add disabled | E | 3 |
| M‑023 | Product not purchasable (eligibility reason) | Reason copy, no Add button | E | — |
| M‑024 | Seller pending approval | Product not public (404) | I | 1 |
| M‑025 | Marketplace switch off by merchant | Product 404 on marketplace, still on storefront | I+E | 2 |
| M‑026 | Price changes while on PDP | Add uses server price; toast shows new price | E | — |
| M‑027 | Qty > available | Stepper caps with reason | U | — |
| M‑028 | Double‑tap Add | One add | E | — |
| M‑029 | Add when cart API down | Rollback optimistic badge + retry toast | E | — |
| M‑030 | Image fails | Placeholder; others fine | E | — |
| M‑031 | Share on iOS Safari 15 | Web Share or copy fallback | M | — |
| M‑032 | Store contact | Only public contact shown; no owner email/phone leak | I | — |
| M‑033 | Description with HTML/script | Sanitized | U | — |
| M‑034 | `?variant=` invalid | Default variant | U | — |
| M‑040 | Store with website | "Visit website" opens hosted subdomain | E | 2 |
| M‑041 | Store without website | No website link | E | 1 |
| M‑042 | Suspended store page | Unavailable message, no products | E | 5 |
| M‑043 | Store with 1 product | Page still useful (about/policies) | E | 1 |
| M‑044 | Store policy text missing | Shows platform default return rule (DEC‑008) labeled as Rentify minimum | U | 4 |

## Cart & checkout (M‑050…M‑089)
| ID | Case | Expected | Test | GJ |
|---|---|---|---|---|
| M‑050 | Items from 3 stores | 3 groups, each with own fee & total and own Checkout | E | 1 |
| M‑051 | Guest adds then signs in | Merge, no duplicates, quantities capped | E | — |
| M‑052 | Price changed since add | Line shows old → new | E | — |
| M‑053 | Qty above available | Reduced + warning | E | 3 |
| M‑054 | Item out of stock | Greyed, excluded, must remove before that group checks out | E | 3 |
| M‑055 | Store becomes unavailable | Group disabled with reason; other groups unaffected | E | 5 |
| M‑056 | Store fee changed | New fee shown; checkout requires reconfirm | E | — |
| M‑057 | Free delivery store | "Free delivery" chip, $0 in totals | U | — |
| M‑058 | Remove line + Undo | Restored within 5s | E | — |
| M‑059 | Cart > 50 lines | Performance OK; virtualized list | U | — |
| M‑060 | Cart in 2 tabs | Both reflect server state on focus | E | — |
| M‑061 | After checkout of one store | Other groups remain; banner "n stores left" | E | 1 |
| M‑062 | Variant disabled after add | Line unavailable | I | — |
| M‑070 | Checkout signed out | Inline sign‑in; typed data kept | E | 1 |
| M‑071 | Phone unverified | Must verify OTP before placing | E | — |
| M‑072 | New address invalid | Field errors | E | — |
| M‑073 | COD acknowledgement not ticked | Place disabled with hint | E | 1 |
| M‑074 | Double submit | One order via Idempotency‑Key (UUID) | E+I | 1 |
| M‑075 | Timeout after submit | Re‑query same key; no duplicate | E | 1 |
| M‑076 | Quote changed at place | Diff dialog, reconfirm | E | — |
| M‑077 | Stock gone at place (race) | 409 OUT_OF_STOCK, update cart | I+E | 3 |
| M‑078 | Store suspended at place | STORE_UNAVAILABLE | I | 5 |
| M‑079 | Refresh confirmation page | Same content (refresh‑safe) | E | 1 |
| M‑080 | Back button after order | Doesn't resubmit; cart group gone | E | — |
| M‑081 | Cart from custom domain storefront | Redirect to hosted checkout with cart | E | 2 |
| M‑082 | Online payment UI | Not present in R1 (DEC‑026) | E | — |
| M‑083 | Very long Khmer address | Saved fully; merchant sees full text | E(km) | — |
| M‑084 | Saved addresses = 10 | "Add new" blocked with message | U | — |
| M‑085 | Buyer is also merchant of that store | Allowed? → **Open**: default block "You can't order from your own store" | U | — |
| M‑086 | Note > 300 chars | Counter + block | U | — |
| M‑087 | 360px with keyboard open | Place button reachable; no overlap | M | — |
| M‑088 | Screen reader | All fields labeled; errors announced | M | — |
| M‑089 | Network offline on checkout | Banner; Place disabled | E | — |

## Orders & problems (M‑090…M‑099)
| ID | Case | Expected | Test | GJ |
|---|---|---|---|---|
| M‑090 | Another buyer's order URL | 404 (no leak) | I | — |
| M‑091 | Cancel before delivery | Allowed per contract; stock restored | I+E | — |
| M‑092 | Cancel after delivered | Not offered; report instead | E | — |
| M‑093 | Report within 7 days | Form available; evidence required for damaged/defective/wrong | E | 4 |
| M‑094 | Report after 7 days | Disabled with date | E | 4 |
| M‑095 | Evidence upload wrong type/too big/spoofed | Rejected with copy (magic bytes) | I | 4 |
| M‑096 | Report twice same type | Blocked | I | 4 |
| M‑097 | Store misses 48 business h | Escalate button + admin queue | I | 4 |
| M‑098 | Refund recorded by store | Buyer sees amount/method/reference; can confirm | E | 4 |
| M‑099 | Timeline with failed then retried delivery | Events in order, correct labels | E | 1 |

## Merchant onboarding & builder (O, B)
| ID | Case | Expected | Test |
|---|---|---|---|
| O‑001 | Phone already registered as buyer | "Use this account to sell" (same identity) | I+E |
| O‑002 | OTP not received | Resend timer, Telegram alternative | E |
| O‑003 | Telegram sign‑up with unshared phone | Ask to share phone in bot | M |
| O‑004 | Email not verified at application | Checklist item blocks submit with Fix link | E |
| O‑005 | Rate‑limited OTP | Countdown | E |
| O‑006 | Return URL to foreign host | Ignored (Core policy) | I |
| O‑007 | Staff invitation link expired/used | Clear message + ask owner to resend | I |
| O‑008 | Merchant opens wizard on second device | Resumes at saved step | E |
| O‑010 | Second store creation attempt | Blocked: one Store per owner (R1) | I |
| O‑011 | Subdomain taken | Live suggestion alternatives | E |
| O‑012 | Store name Khmer only | Allowed; slug from transliteration or manual | U |
| O‑013 | Logo upload fails | Retry; can skip | E |
| O‑014 | Back from step 5 to step 1 | Data kept | E |
| O‑015 | Switch path after choosing website | Allowed before publish; website draft removed with confirm | E |
| O‑016 | Free Pilot product limit reached | Upgrade sheet; never silent | E |
| O‑017 | Primary category restricted (DEC‑006) | Explain; cannot submit to marketplace | U |
| O‑018 | Quick add without photo | Draft only; publish requires photo | U |
| O‑019 | Needs‑changes → resubmit | Only flagged items editable highlighted; resubmit enabled after fix | E |
| O‑020 | Dev auto approval on | Same UI states | E |
| O‑021 | Approved then suspended | Banner explains scope | E |
| O‑022 | Launch checklist completion | Card collapses; restorable from Help | E |
| B‑001 | Template content field missing for old website | Builder offers to add section (creates content rows) | I |
| B‑002 | Unsupported label | Rejected by Core allowlist; UI never sends it | I |
| B‑003 | Non‑https image URL | Rejected with copy | I |
| B‑004 | Brand color fails contrast | Warning + auto adjust on live store | U |
| B‑005 | Two editors publish | Version conflict screen | I+E |
| B‑006 | Unpublished changes + leave | "Discard or keep draft" prompt | E |
| B‑007 | Publish while in grace period | Locked (DEC‑018) with Pay now | E |
| B‑008 | Template switch | Preview first; unmapped sections warned | E |
| B‑009 | Drag reorder via keyboard | Up/down buttons work | E |
| B‑010 | Mobile builder | Sections bottom sheet usable at 360px | M |
| B‑011 | Cache after publish | Live store updates (cache cleared) | I |
| B‑012 | Custom domain DNS not verified | Status "Not connected yet" + recheck | E |
| B‑013 | Custom domain checkout | Redirect to hosted subdomain | E |
| B‑014 | Owner toolbar visible to shopper | Never (owner‑access check) | I |
| B‑015 | Very long hero text KM | Length limit + preview fits | U |

## Merchant workspace (W)
| ID | Case | Expected | Test |
|---|---|---|---|
| W‑001 | Staff without orders permission | Orders nav hidden; deep link → BlockedState | I+E |
| W‑002 | Staff grants permission they lack | Blocked (non‑escalation) | I |
| W‑003 | Deactivated staff mid‑session | Next request 401, sessions revoked | I |
| W‑004 | Merchant B opens Merchant A order | 403/404, security audit | I |
| W‑010 | Product save conflict | Conflict screen | I+E |
| W‑011 | Delete product with orders | Archive only | I |
| W‑012 | Variant price 0 or negative | Validation | U |
| W‑013 | Duplicate SKU | Validation | I |
| W‑014 | Image magic bytes mismatch | Rejected | I |
| W‑015 | Visibility explainer reasons | Each reason code has copy + fix link | U |
| W‑016 | Moderated product | Banner with reason; storefront unaffected if marketplace‑only moderation | E |
| W‑017 | CSV import with bad rows [R1.x] | Preview + error report; nothing written until confirm | I |
| W‑020 | Stock adjust without reason | Blocked | U |
| W‑021 | Stock to negative | Blocked by ledger | I |
| W‑030 | Mark delivered twice | Idempotent (event key) | I |
| W‑031 | Delivery failed → cancel | Stock restored once; order cancelled | I |
| W‑032 | Delivery failed → retry → delivered | Correct sequence | I |
| W‑033 | Record cash before delivered | Not allowed (409) | I |
| W‑034 | Cash amount differs from total | Requires note; recorded as is | I |
| W‑035 | Two staff record cash simultaneously | One succeeds; other sees updated | I |
| W‑036 | Cancel with collected cash | Not allowed via delivery_failed | I |
| W‑037 | Refund > paid | Rejected | I |
| W‑038 | Partial refund | Payment stays paid; refunded amount shown | I |
| W‑039 | POS order appears in inbox | Channel chip POS, completed | E |
| W‑040 | Invoice order in inbox | Channel chip Invoice | E |
| W‑041 | New order arrives while list open | Toast + list update | E |
| W‑042 | Order detail at 360px | Next‑action bar reachable | M |
| W‑043 | Print packing slip | Correct snapshot data | M |
| W‑044 | Buyer phone masking | Full number only with permission | I |
| W‑045 | Case reply after deadline | Allowed; case already escalated shows admin note | E |
| W‑046 | Decline return without reason | Blocked | U |
| W‑047 | Inspect returned defective | Not restocked unless chosen | I |
| W‑048 | Grace period | Edits locked, orders workable | E |
| W‑049 | Suspended | Read‑only 90 days; actions disabled with reason | E |

## Storefront (S) & POS (P)
| ID | Case | Expected | Test |
|---|---|---|---|
| S‑001 | Draft website URL | 404 to public; preview for owner | I |
| S‑002 | Suspended store | Offline page | E |
| S‑003 | Shared stock with marketplace | Purchase on one channel updates other immediately | I (GJ2) |
| S‑004 | Template sections empty | Hidden, no placeholders | E |
| S‑005 | Theme contrast auto‑adjust | Readable | U |
| S‑006 | Language toggle | Full content switches | E(km) |
| S‑007 | Checkout on custom domain | Redirect to hosted | E |
| P‑001 | Final unit race (POS vs online) | POS wins if first; online gets 409; and vice versa | I+E (GJ3) |
| P‑002 | Online sold last unit while on ticket | Modal remove line | E |
| P‑003 | Offline cash sale | Queued; synced in order | E (GJ3) |
| P‑004 | Offline sale conflicts on sync | STOCK_OVERDRAFT_ALERT to manager | I |
| P‑005 | Scanner unknown barcode | "Not found" + search | E |
| P‑006 | Variant product tapped | Variant sheet | E |
| P‑007 | Cash change calc USD | Correct | U |
| P‑008 | KHR tendered helper | ៛100 rounding display | U |
| P‑009 | Receipt print failure | Retry + share link | M |
| P‑010 | Staff without pos permission | Blocked | I |
| P‑011 | Line discount without permission | Disabled | U |
| P‑012 | Refund at counter | Permission + reason + restock choice | I |
| P‑013 | 360px phone POS | Tabs layout usable | M |
| P‑014 | Double tap Charge | One order (idempotent) | I |
| P‑015 | Session expires mid‑ticket | Re‑auth keeps ticket | E |
| P‑016 | Product archived while on ticket | Line invalid on charge | I |
| P‑017 | Large catalog (> 100) | Search + pagination | E |
| P‑018 | Non‑cash method | Hidden unless allowed by DEC‑026/027 config | U |
| P‑019 | Shift close over/short [R1.x] | Reason required | E |
| P‑020 | Reprint old receipt | Same snapshot | E |

## Admin (A)
| ID | Case | Expected | Test |
|---|---|---|---|
| A‑001 | Approve with failed checklist item | Blocked unless overridden with reason (maker‑checker) | I |
| A‑002 | Needs changes notes | Delivered to merchant per item | E |
| A‑003 | Two reviewers open same application | Assignment lock / version conflict | I |
| A‑004 | Identity document access | Logged; watermark; no default download | I |
| A‑005 | Duplicate phone/ID across stores | Flag shown | I |
| A‑006 | Platform suspension | Maker‑checker; both channels stop | I |
| A‑007 | Marketplace‑only suspension | Storefront unaffected | I |
| A‑008 | Step‑up re‑auth older than 15 min | Prompt TOTP | E |
| A‑009 | Escalated case SLA | Appears in queue at deadline | I |
| A‑010 | Admin attempts to refund COD | Not possible; guidance only (DEC‑010) | U |

## Cross‑cutting (X)
| ID | Case | Expected | Test |
|---|---|---|---|
| X‑001 | Missing Khmer key | CI missing‑key gate fails | U |
| X‑002 | Contrast regression | `verify:tokens` fails | U |
| X‑003 | Axe critical on golden journeys | CI fails | E |
| X‑004 | 200 % zoom | No horizontal scroll | M |
| X‑005 | Reduced motion | No transforms | E |
| X‑006 | Correlation ID on error | Shown as small ref | E |
| X‑007 | Dark mode (admin/merchant) | Tokens readable | E |
| X‑008 | Session refresh race | 60s grace prevents sign‑out | I |
| X‑009 | Analytics before consent | No events | E |
| X‑010 | Times shown | Asia/Phnom_Penh everywhere (incl. café "open now" — note current device‑time issue) | U |
