# Homepage featured collections

**Current (2026-11-01):** The three compact homepage cards use the supplied
CardPromotion, Smallcard1 and SmallCard2 artwork without additional text overlays.
Each links to the existing product directory with a shareable `collection` query
parameter and a matching banner, title, filters and product detail links.

- `sale-finds`: canonical products whose compare-at price exceeds their price.
- `lifestyle-finds`: Fashion, Home & Living, and Electronics categories.
- `local-crafts`: the catalog's existing `handmade-crafts` grouping. That grouping
  is category-derived; it is not a verification of manufacturing origin.

Definitions live in `marketplace-frontend/src/app/core/catalog/featured-collections.ts`.
Collections are editorial views, not independent product records. They retain
canonical prices and stock, and do not create discounts or seed products.
Empty collections show the normal no-results state; unrelated products are never
used as a fallback. Artwork's advertised offer does not change product pricing.
