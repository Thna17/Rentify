import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';


const isLocal = () =>
  globalThis.location?.hostname === 'localhost' || globalThis.location?.hostname === '127.0.0.1';
const runtime = () => globalThis.window?.__RENTIFY_MARKETPLACE__;
const base = (value: string | undefined, fallback: string) =>
  (value || (isLocal() ? fallback : '')).replace(/\/+$/, '');

export interface RentifyProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: string;
  compareAtPrice?: string | null;
  category: string;
  images: { url: string }[];
  stockQuantity: number;
}

export interface RentifyStore {
  id: string;
  name: string;
  slug: string;
  primaryCategory: string;
}

export interface BuyerSession {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  isVerified: boolean;
}

export interface StoreCart {
  id: string;
  storeId: string;
  items: { productId: string; quantity: number; currentPrice: string | null; available: boolean }[];
  subtotal: string;
  deliveryFee: string | null;
  totalAmount: string | null;
  checkoutReady: boolean;
  issues: string[];
}

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  status: string;
  deliveryStatus: string;
  subtotal: string;
  deliveryFee: string;
  totalAmount: string;
  items: { productId: string; name: string; quantity: number; total: string }[];
  payment: { status: string; amountDue: string; collectedAmount: string; refundedAmount: string } | null;
}

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  storeId?: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  storeId: string;
  buyerUserId: string;
  buyerName: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
}

export interface ProductReviewSummary {
  total: number;
  average: number;
  distribution: { [stars: number]: number };
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  summary: ProductReviewSummary;
}

@Injectable({ providedIn: 'root' })
export class RentifyMarketplaceService {
  private readonly http = inject(HttpClient);

  get core(): string {
    return base(runtime()?.coreApiUrl, 'http://localhost:3001');
  }

  get commerce(): string {
    return base(runtime()?.commerceApiUrl, 'http://localhost:4001');
  }

  get auth(): string {
    return base(runtime()?.authUrl, 'http://localhost:4300');
  }

  get merchantDashboard(): string {
    return base(runtime()?.merchantDashboardUrl, 'http://localhost:4400');
  }

  get configured(): boolean {
    return Boolean(this.core && this.commerce && this.auth);
  }

  session(): Observable<{ user: BuyerSession }> {
    return this.http.get<{ user: BuyerSession }>(`${this.core}/api/auth/session`);
  }

  products(
    pageOrQuery: number | ProductQueryOptions = 1,
  ): Observable<{ products: RentifyProduct[]; total: number; page: number; limit: number }> {
    let params = new HttpParams();
    if (typeof pageOrQuery === 'number') {
      params = params.set('page', pageOrQuery).set('limit', 24);
    } else {
      params = params.set('page', pageOrQuery.page ?? 1).set('limit', pageOrQuery.limit ?? 24);
      if (pageOrQuery.category) params = params.set('category', pageOrQuery.category);
      if (pageOrQuery.search) params = params.set('search', pageOrQuery.search);
      if (pageOrQuery.storeId) params = params.set('storeId', pageOrQuery.storeId);
    }
    return this.http.get<{ products: RentifyProduct[]; total: number; page: number; limit: number }>(
      `${this.commerce}/api/marketplace/products`,
      { params },
    );
  }

  product(id: string): Observable<RentifyProduct> {
    return this.http.get<RentifyProduct>(`${this.commerce}/api/marketplace/products/${id}`);
  }

  stores(ids: string[]): Observable<{ data: RentifyStore[] }> {
    return this.http.get<{ data: RentifyStore[] }>(`${this.core}/api/stores/public`, {
      params: new HttpParams().set('ids', ids.join(',')),
    });
  }

  store(id: string): Observable<{ data: RentifyStore }> {
    return this.http.get<{ data: RentifyStore }>(`${this.core}/api/stores/public/${id}`);
  }

  myStore(): Observable<{ store: RentifyStore | null }> {
    return this.http.get<{ store: RentifyStore | null }>(`${this.core}/api/stores/mine`);
  }

  carts(): Observable<{ carts: StoreCart[] }> {
    return this.http.get<{ carts: StoreCart[] }>(`${this.commerce}/api/marketplace/cart`);
  }

  setQuantity(storeId: string, productId: string, quantity: number): Observable<{ carts: StoreCart[] }> {
    return this.http.put<{ carts: StoreCart[] }>(
      `${this.commerce}/api/marketplace/cart/${storeId}/items/${productId}`,
      { quantity },
    );
  }

  addItem(productId: string, quantity = 1, storeId?: string, variantId?: string): Observable<{ carts: StoreCart[] }> {
    return this.http.post<{ carts: StoreCart[] }>(
      `${this.commerce}/api/marketplace/cart/items`,
      { productId, quantity, storeId, variantId },
    );
  }

  removeItem(storeId: string, productId: string): Observable<{ carts: StoreCart[] }> {
    return this.http.delete<{ carts: StoreCart[] }>(
      `${this.commerce}/api/marketplace/cart/${storeId}/items/${productId}`,
    );
  }

  clearCart(storeId?: string): Observable<{ carts: StoreCart[] }> {
    const url = storeId
      ? `${this.commerce}/api/marketplace/cart/${storeId}`
      : `${this.commerce}/api/marketplace/cart`;
    return this.http.delete<{ carts: StoreCart[] }>(url);
  }

  mergeCart(): Observable<{ carts: StoreCart[] }> {
    return this.http.post<{ carts: StoreCart[] }>(
      `${this.commerce}/api/marketplace/cart/merge`,
      {},
    );
  }

  checkout(
    storeId: string,
    expectedTotalAmount: string,
    name: string,
    phone: string,
    address: string,
    key: string,
  ): Observable<{ order: MarketplaceOrder }> {
    return this.http.post<{ order: MarketplaceOrder }>(
      `${this.commerce}/api/marketplace/checkout`,
      {
        storeId,
        expectedTotalAmount,
        customerInfo: { name, phone },
        shippingInfo: { address },
      },
      { headers: { 'Idempotency-Key': key } },
    );
  }

  orders(): Observable<{ orders: MarketplaceOrder[] }> {
    return this.http.get<{ orders: MarketplaceOrder[] }>(`${this.commerce}/api/marketplace/my-orders`);
  }

  reviews(productId: string): Observable<ProductReviewsResponse> {
    return this.http.get<ProductReviewsResponse>(
      `${this.commerce}/api/marketplace/products/${productId}/reviews`,
    );
  }

  submitReview(
    productId: string,
    rating: number,
    comment: string,
  ): Observable<{ review: ProductReview; summary: ProductReviewSummary }> {
    return this.http.post<{ review: ProductReview; summary: ProductReviewSummary }>(
      `${this.commerce}/api/marketplace/products/${productId}/reviews`,
      { rating, comment },
    );
  }

  report(orderId: string, type: 'complaint' | 'return_requested', reason: string, key: string) {
    return this.http.post(
      `${this.commerce}/api/marketplace/my-orders/${orderId}/reports/${type}`,
      { reason },
      { headers: { 'Idempotency-Key': key } },
    );
  }

  logout() {
    return this.http.post(`${this.core}/api/auth/logout`, {});
  }

  authLink(
    path: 'login' | 'signup' | 'register' | 'forgot-password' | 'reset-password' = 'login',
    customReturnUrl?: string,
  ) {
    const targetUrl = customReturnUrl || (globalThis.location ? globalThis.location.href : '/');
    const returnUrl = encodeURIComponent(targetUrl);
    const segment = path === 'login' ? '' : path === 'register' ? 'signup' : path;
    return `${this.auth}/${segment}?returnUrl=${returnUrl}`;
  }
}
