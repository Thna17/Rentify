/**
 * Wire types for the commerce API.
 *
 * These mirror the server's response shapes exactly. Components should keep
 * using the domain types in core/catalog/catalog.models where possible; these
 * exist so the mapping happens in one place instead of being guessed at each
 * call site.
 */

export type ApiStockStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  subcategory: string | null;
  sellerId: string | null;
  sellerName: string;
  storeName: string | null;
  location: string;
  image: string | null;
  images: string[];
  variants?: { label: string; image: string }[];
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  status: ApiStockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStore {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  rating: number;
  reviewCount: number;
  categoryName: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  tagline: string | null;
  announcement: string | null;
  theme: 'FOREST' | 'CLAY' | 'GOLD' | 'MIDNIGHT';
  phoneNumber: string | null;
  showContact: boolean;
  featuredProductIds: string[];
}

export interface ApiStoreList {
  stores: ApiStore[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiProductDetail extends ApiProduct {
  relatedProducts: ApiProduct[];
}

export interface ApiProductList {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  appliedFilters: Record<string, string | number | null>;
}

/** GET /api/products/mine has no filter echo — it's always "everything I own". */
export interface ApiMyProductList {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Mirrors createProductSchema on the server. Ownership fields (sellerName,
 * sellerUserId) are deliberately absent — the server stamps those from the
 * session, and rejects a payload that tries to send them.
 */
export interface ApiCreateProductInput {
  name: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory?: string;
  location?: string;
  image?: string;
  images?: string[];
  stock: number;
  status: ApiStockStatus;
  storeId?: string;
}

export interface ApiCartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  sellerId: string | null;
  sellerName: string;
  storeName: string | null;
  price: number;
  quantity: number;
  subtotal: number;
  stock: number;
  status: ApiStockStatus;
}

export interface ApiCart {
  id: string;
  userId: string;
  items: ApiCartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'COD' | 'ABA_PAYWAY' | 'ABA_DEMO' | 'STRIPE_SANDBOX';

export interface ApiDeliveryInfo {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  note?: string;
}

export interface ApiOrderItem {
  productId: string;
  productName: string;
  productImage: string | null;
  sellerId: string | null;
  sellerUserId: string | null;
  sellerName: string;
  storeName: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ApiStatusEvent {
  status: OrderStatus;
  at: string;
  by: 'BUYER' | 'SELLER' | 'ADMIN' | 'SYSTEM';
  note: string | null;
}

export interface ApiOrder {
  id: string;
  orderNumber: string;
  buyerId: string;
  buyerName: string;
  buyerPhone: string;
  items: ApiOrderItem[];
  deliveryInfo: ApiDeliveryInfo;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  hasPaymentTranId: boolean;
  orderStatus: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  statusHistory: ApiStatusEvent[];
  createdAt: string;
  updatedAt: string;
}

/** What the web app POSTs, as an auto-submitted form, to hand the buyer off to PayWay. */
export interface ApiPaywayCheckoutSession {
  checkoutUrl: string;
  fields: Record<string, string>;
}

/** A seller's view adds their own share of a possibly multi-seller order. */
export interface ApiSellerOrder extends ApiOrder {
  myItems: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
  myTotal: number;
  availableActions: OrderStatus[];
}

export interface ApiOrderList<T = ApiOrder> {
  orders: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiCreatedOrder {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  createdAt: string;
  message: string;
  order: ApiOrder;
}
