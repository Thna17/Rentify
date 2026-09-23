# Catalog migration contract

**Status: partial implementation, 2026-09-23.** Commerce is the target Product
and stock authority. The relocated KhmerCraft Mongo catalog and Angular
marketplace remain live together until a cohort can use one catalog and one
checkout writer. This document records the mapping and switch checks; it does
not authorize a traffic switch.

The owner confirmed there is no KhmerCraft data to import for the hackathon
release. The source-to-target mapping below is retained for a future real-data
cutover; no empty import or invented historical records are needed now.

## Current Commerce contract

| Operation | Route | Authorization |
| --- | --- | --- |
| List marketplace categories | `GET /api/marketplace/categories` | Public |
| List eligible marketplace products | `GET /api/marketplace/products` | Public |
| Read eligible marketplace product | `GET /api/marketplace/products/:productId` | Public |
| List Store products, including drafts | `GET /api/stores/:storeId/products` | Store owner or permitted staff |
| Create Store product | `POST /api/stores/:storeId/products` | Store owner or permitted staff |
| Update Store product | `PATCH /api/stores/:storeId/products/:productId` | Store owner or permitted staff; expected version required |
| Read Website products, including drafts | `GET /api/product/:websiteId/manage/products` | Website owner or permitted staff |

The Store owner route stamps `storeId` from the authorized Store projection.
It links `websiteId` only when that Store has a Website. Product `id`, price,
and stock are shared across both channels. A Product has one specific
`marketplaceCategory`; Website `categoryId` is merchant storefront
organization. Null `marketplaceVisibility` inherits `Store.marketplaceEnabled`;
`true` and `false` override it. Seller approval and Store suspension always
win over either visibility setting. Draft, archived, and uncategorized
Products cannot appear in public marketplace queries. The free pilot
entitlement is the hackathon rule, not final subscription pricing.

## KhmerCraft source to Rentify target

| Source | Target and transformation | Required check |
| --- | --- | --- |
| Mongo `Store._id`, `userId` | Core `Store.id`, `ownerUserId`; persist source-to-target ID map | Verified owner link; one Store per owner; slug collision report |
| `Store.category`, `verificationStatus`, seller application | Core primary category and seller review history | Explicit category review; never infer approval from a label alone |
| Mongo `Product._id`, `sellerId`, `sellerUserId` | Commerce `Product.id`, `storeId`; persist source-to-target ID map | Every listed Product has exactly one mapped Store and owner |
| `Product.category` and `subcategory` | Controlled marketplace taxonomy key and optional subcategory | Explicit mapping table; unknown values queue for review |
| `storeCategoryId`, `storeSubcategoryId` | Store-owned Website collection/category map | Preserve hierarchy and visibility; never use as marketplace taxonomy |
| `price`, `compareAtPrice`, `stock`, `status` | Commerce money, shared stock, and publication | Price in cents and stock counts agree; `ACTIVE/DRAFT/ARCHIVED` map explicitly |
| `image`, `images`, `thumbnail`, variant images | Managed object files and URLs | Decode data URLs offline, checksum bytes, verify access before pointer switch |
| Presentation `variants` | Commerce display-variant mapping | Do not create separate sellable stock for these variants |
| Reviews and rating aggregates | Order-linked review import and derived aggregates | Verified buyer and order mapping; approved/flagged state preserved |

The legacy marketplace category tree in
`marketplace/apps/web/src/app/core/data/categories.data.ts` and the initial
Commerce category list are different. A cohort cannot move until every active
source category/subcategory has a reviewed destination key and the Angular
filter tree consumes the same mapping. Unmapped records stay quarantined;
they are never silently assigned to `Other`.

## Cutover sequence for each cohort

1. Export source records with counts, ID maps, snapshots, and checksums.
   Dry-run import without changing live readers. Record rejected rows.
2. Import and reconcile Store, Product, stock, image, variant, and review
   references. Re-run safely to prove idempotence. Compare public listing
   sets, prices, categories, images, and search results.
3. Rehearse API origins, `credentials: include`, and host-only buyer cookies
   on localhost and intended production domains. A cross-domain browser
   session needs the agreed auth callback design.
4. Move marketplace cart and checkout for that cohort to Commerce with
   atomic stock control and one-Store orders. Freeze legacy Product writes,
   replay the audited final delta, and only then switch Angular reads.
5. Monitor mismatches and restore a prior reader only after replaying an
   audited delta from the active writer. Keep one writer throughout.

The current Angular `CommerceApiService` expects Mongo-shaped `ApiProduct`
fields and `/api/products` on the old API. Commerce's new public response is
intentionally smaller; its adapter and checkout must be built together before
the Angular URL changes. A future real-data import will also need a source
export and target image bucket.
