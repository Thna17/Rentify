import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

declare global {
  interface Window {
    __RENTIFY_MARKETPLACE__?: {
      enabled?: boolean;
      coreApiUrl?: string;
      commerceApiUrl?: string;
      authUrl?: string;
    };
  }
}

const local = globalThis.location?.hostname === 'localhost' || globalThis.location?.hostname === '127.0.0.1';
const runtime = globalThis.window?.__RENTIFY_MARKETPLACE__;
const base = (value: string | undefined, fallback: string) => (value || (local ? fallback : '')).replace(/\/+$/, '');

export interface RentifyProduct {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: string;
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

@Injectable({ providedIn: 'root' })
export class RentifyMarketplaceService {
  private readonly http = inject(HttpClient);
  readonly enabled = runtime?.enabled === true;
  readonly core = base(runtime?.coreApiUrl, 'http://localhost:3001');
  readonly commerce = base(runtime?.commerceApiUrl, 'http://localhost:4001');
  readonly auth = base(runtime?.authUrl, 'http://localhost:4300');
  readonly configured = Boolean(this.core && this.commerce && this.auth);

  session(): Observable<{ user: BuyerSession }> {
    return this.http.get<{ user: BuyerSession }>(`${this.core}/api/auth/session`);
  }

  products(page = 1): Observable<{ products: RentifyProduct[]; total: number; page: number; limit: number }> {
    return this.http.get<{ products: RentifyProduct[]; total: number; page: number; limit: number }>(
      `${this.commerce}/api/marketplace/products`, { params: new HttpParams().set('page', page).set('limit', 24) });
  }

  product(id: string): Observable<RentifyProduct> {
    return this.http.get<RentifyProduct>(`${this.commerce}/api/marketplace/products/${id}`);
  }

  stores(ids: string[]): Observable<{ data: RentifyStore[] }> {
    return this.http.get<{ data: RentifyStore[] }>(`${this.core}/api/stores/public`, {
      params: new HttpParams().set('ids', ids.join(',')),
    });
  }

  carts(): Observable<{ carts: StoreCart[] }> {
    return this.http.get<{ carts: StoreCart[] }>(`${this.commerce}/api/marketplace/cart`);
  }

  setQuantity(storeId: string, productId: string, quantity: number): Observable<{ carts: StoreCart[] }> {
    return this.http.put<{ carts: StoreCart[] }>(
      `${this.commerce}/api/marketplace/cart/${storeId}/items/${productId}`, { quantity });
  }

  checkout(storeId: string, expectedTotalAmount: string, name: string, phone: string, address: string,
    key: string): Observable<{ order: MarketplaceOrder }> {
    return this.http.post<{ order: MarketplaceOrder }>(`${this.commerce}/api/marketplace/checkout`, {
      storeId, expectedTotalAmount, customerInfo: { name, phone }, shippingInfo: { address },
    }, { headers: { 'Idempotency-Key': key } });
  }

  orders(): Observable<{ orders: MarketplaceOrder[] }> {
    return this.http.get<{ orders: MarketplaceOrder[] }>(`${this.commerce}/api/marketplace/my-orders`);
  }

  report(orderId: string, type: 'complaint' | 'return_requested', reason: string, key: string) {
    return this.http.post(`${this.commerce}/api/marketplace/my-orders/${orderId}/reports/${type}`,
      { reason }, { headers: { 'Idempotency-Key': key } });
  }

  logout() { return this.http.post(`${this.core}/api/auth/logout`, {}); }

  authLink(path: 'login' | 'signup') {
    const returnUrl = encodeURIComponent(globalThis.location.href);
    return `${this.auth}/${path === 'login' ? '' : path}?returnUrl=${returnUrl}`;
  }
}
