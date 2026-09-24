# Shared marketplace catalog contract

**Status (2026-09-24):** Commerce is the Product and stock authority. Existing
Rentify Stores and Products supply both storefront and marketplace views.
KhmerCraft's MongoDB catalog has no data and is not a migration source.
Normal Angular development routes now use Rentify APIs.

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

The Store owner route stamps `storeId` from the authorized Core projection and
links `websiteId` only if the Store has a Website. Product ID, price, and stock
are shared across both channels. A Product's `marketplaceCategory` is its
specific marketplace taxonomy key; Website `categoryId` organizes merchant
storefront collections. Null `marketplaceVisibility` inherits the Store's
default-on `marketplaceEnabled`; explicit `true` or `false` overrides it.

Public marketplace reads require an active Store, approved seller status,
pilot entitlement, reviewed primary Store category, active Product, valid
Product marketplace category, and effective marketplace visibility. Checkout
also checks current stock and price. In local development Core grants approved
status to pending Stores only after verified contact and primary category
checks when `DEV_MARKETPLACE_AUTO_APPROVAL=true`. Rejected and suspended
sellers remain blocked; production review is separate.

## Rentify data checks

1. Compare Core Stores and Websites with Commerce StoreAccess and WebsiteData
   using `node scripts/cutover-projection-audit.mjs`; resolve missing, stale,
   orphaned, or pending projections.
2. Count existing Rentify Products by Store, Website, publication state,
   marketplace category, visibility override, price, and stock. Report each
   Product blocked from marketplace discovery and why. Existing Websites had
   no dependable marketplace primary category during backfill, so merchants
   must choose one instead of receiving a guessed value.
3. Exercise create/edit/archive and stock changes for a marketplace-only
   Store and a Website-linked Store. Check the same Product ID, price, and
   stock on both eligible surfaces. Verify opt-outs and draft/archived
   Products disappear from public reads without erasing merchant records.
4. Rehearse browser credentials, CORS, and public API origins on localhost and
   the intended owned HTTPS hosts. Angular normal routes must make no calls
   to the KhmerCraft API.

The archived KhmerCraft API remains reference code only. The designed Angular
marketplace screens use an adapter for Rentify's public Product response,
which is smaller than the old Mongo-shaped `ApiProduct` contract.
