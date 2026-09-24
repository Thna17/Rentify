import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api.config';
import {
  ApiCart,
  ApiCreatedOrder,
  ApiCreateProductInput,
  ApiDeliveryInfo,
  ApiMyProductList,
  ApiOrder,
  ApiOrderList,
  ApiPaywayCheckoutSession,
  ApiProduct,
  ApiProductDetail,
  ApiProductList,
  ApiSellerOrder,
  ApiStore,
  ApiStoreList,
  OrderStatus,
  PaymentMethod,
} from './api.models';

export interface ProductQuery {
  search?: string;
  category?: string;
  storeId?: string;
  location?: string;
  collection?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

/**
 * Thin HTTP layer over the commerce API.
 *
 * Deliberately does no caching or state-keeping: CartService owns cart state,
 * components own their own page state. This just speaks HTTP, so there is one
 * place to look when a URL or a payload shape changes.
 *
 * The session cookie is attached by authInterceptor (app.config.ts), which
 * sets withCredentials on every outgoing request — so it is not repeated here.
 */
@Injectable({ providedIn: 'root' })
export class CommerceApiService {
  private readonly http = inject(HttpClient);

  // ------------------------------------------------------------- products
  listProducts(query: ProductQuery = {}): Observable<ApiProductList> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<ApiProductList>(`${API_URL}/products`, { params });
  }

  /** Accepts a Mongo id or a slug — the server resolves both. */
  getProduct(idOrSlug: string): Observable<ApiProductDetail> {
    return this.http.get<ApiProductDetail>(
      `${API_URL}/products/${encodeURIComponent(idOrSlug)}`,
    );
  }

  /** SELLER/ADMIN only — the server stamps ownership from the session. */
  createProduct(input: ApiCreateProductInput): Observable<ApiProduct> {
    return this.http.post<ApiProduct>(`${API_URL}/products`, input);
  }

  /** The signed-in seller's own listings, drafts and archived included. */
  myProducts(page = 1, limit = 20, storeId?: string): Observable<ApiMyProductList> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (storeId) params = params.set('storeId', storeId);
    return this.http.get<ApiMyProductList>(`${API_URL}/products/mine`, {
      params,
    });
  }

  // -------------------------------------------------------------- stores
  listStores(page = 1, limit = 20): Observable<ApiStoreList> {
    return this.http.get<ApiStoreList>(`${API_URL}/sellers/stores`, {
      params: new HttpParams().set('page', page).set('limit', limit),
    });
  }

  getStore(storeId: string): Observable<ApiStore> {
    return this.http.get<ApiStore>(
      `${API_URL}/sellers/stores/${encodeURIComponent(storeId)}`,
    );
  }

  // ----------------------------------------------------------------- cart
  getCart(): Observable<ApiCart> {
    return this.http.get<ApiCart>(`${API_URL}/cart`);
  }

  addToCart(productId: string, quantity = 1): Observable<ApiCart> {
    return this.http.post<ApiCart>(
      `${API_URL}/cart/items`,
      { productId, quantity },
    );
  }

  updateCartItem(itemId: string, quantity: number): Observable<ApiCart> {
    return this.http.patch<ApiCart>(
      `${API_URL}/cart/items/${itemId}`,
      { quantity },
    );
  }

  removeCartItem(itemId: string): Observable<ApiCart> {
    return this.http.delete<ApiCart>(
      `${API_URL}/cart/items/${itemId}`,
    );
  }

  clearCart(): Observable<ApiCart> {
    return this.http.delete<ApiCart>(`${API_URL}/cart/clear`);
  }

  // --------------------------------------------------------------- orders
  createOrder(
    deliveryInfo: ApiDeliveryInfo,
    paymentMethod: PaymentMethod,
  ): Observable<ApiCreatedOrder> {
    // No totals are sent: the server recomputes them and rejects any attempt
    // to supply one.
    return this.http.post<ApiCreatedOrder>(
      `${API_URL}/orders`,
      { deliveryInfo, paymentMethod },
    );
  }

  myOrders(page = 1, limit = 10): Observable<ApiOrderList> {
    return this.http.get<ApiOrderList>(`${API_URL}/orders/my-orders`, {
      params: new HttpParams().set('page', page).set('limit', limit),
    });
  }

  getOrder(idOrNumber: string): Observable<ApiOrder> {
    return this.http.get<ApiOrder>(
      `${API_URL}/orders/${encodeURIComponent(idOrNumber)}`,
    );
  }

  // -------------------------------------------------------------- payments
  /** Fields to auto-submit, as a form POST, to `checkoutUrl` — see payments.service.ts. */
  createPaywayCheckout(orderId: string): Observable<ApiPaywayCheckoutSession> {
    return this.http.post<ApiPaywayCheckoutSession>(
      `${API_URL}/payments/aba-payway/checkout`,
      { orderId },
    );
  }

  // ---------------------------------------------------------- seller desk
  sellerOrders(
    page = 1,
    limit = 20,
    status?: OrderStatus,
  ): Observable<ApiOrderList<ApiSellerOrder>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiOrderList<ApiSellerOrder>>(
      `${API_URL}/orders/seller`,
      { params },
    );
  }

  /** Accept, reject, ship, deliver and cancel all go through here. */
  setOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
  ): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(
      `${API_URL}/orders/${orderId}/status`,
      note ? { status, note } : { status },
    );
  }
}
