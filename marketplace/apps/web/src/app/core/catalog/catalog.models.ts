/**
 * Catalog domain types.
 *
 * These mirror the shape the API is expected to return, so swapping the mock
 * data in `core/data/*` for real HTTP calls should not require touching any
 * component. Keep `id` a string for that reason — Mongo returns `_id` strings.
 */

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** Null until real imagery exists; the UI renders a labelled placeholder. */
  image: string | null;
  /**
   * Extra shots of the same item, shown as thumbnails beside the main image.
   * Optional so the bundled fixtures, which predate it, still type-check.
   */
  images?: string[];
  /** Alternate finishes; picking one swaps the main image. */
  variants?: { label: string; image: string }[];
  price: number;
  /** Original price when the item is discounted. */
  compareAtPrice?: number;
  categorySlug: string;
  categoryName: string;
  /** Second level, e.g. "Bowls & Plates". Null until a seller sets one. */
  subcategory: string | null;
  subcategorySlug: string | null;
  sellerName: string;
  storeId: string;
  rating: number;
  reviewCount: number;
  stock: number;
  status: StockStatus;
  description: string;
  /** Drives the Best Sellers section. */
  soldCount: number;
  /** ISO date; drives the New Arrivals section. */
  createdAt: string;
  /** Marketing groupings used by the homepage collection rows. */
  collections: string[];
}

export interface Subcategory {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
  /**
   * One-word label for places where the full name does not fit — the category
   * nav row once it starts scrolling, and the home page tiles on a phone.
   * Falls back to `name` where a category is already short enough.
   */
  shortName?: string;
  description: string;
  /** Longer line for the category landing page banner. */
  tagline: string;
  /** Icon name understood by `shared/icon.component`. */
  icon: string;
  /** Placeholder caption until real banner imagery exists. */
  banner: string;
  subcategories: Subcategory[];
}

export interface Store {
  id: string;
  slug?: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  categoryName: string;
  description: string;
  tagline?: string;
  announcement?: string;
  theme?: 'FOREST' | 'CLAY' | 'GOLD' | 'MIDNIGHT';
  phoneNumber?: string;
  showContact?: boolean;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  featuredProductIds?: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
}

/** A cart line joined with its product, ready to render. */
export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export type ProductSort =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'rating'
  | 'newest';

export interface ProductQuery {
  search?: string;
  category?: string;
  subcategory?: string;
  collection?: string;
  storeId?: string;
  /** Inclusive price bounds. */
  priceMin?: number;
  priceMax?: number;
  /** Minimum star rating, e.g. 4 for "4 stars & up". */
  minRating?: number;
  /** Hide anything a buyer cannot actually order right now. */
  inStockOnly?: boolean;
  /** Only items marked down from a compareAtPrice. */
  onSaleOnly?: boolean;
  sort?: ProductSort;
}
