import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { API_URL } from './api.config';

export type SellerPlan = 'STARTER' | 'STANDARD' | 'PREMIUM';

export interface SellerApplication {
  id: string;
  storeName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt?: string;
}

export interface SellerStore {
  id: string;
  slug: string;
  storeName: string;
  storeDescription?: string;
  storeTagline?: string;
  announcement?: string;
  theme?: StoreTheme;
  showContact?: boolean;
  featuredProductIds?: string[];
  category?: string;
  location?: string;
  phoneNumber?: string;
  subscriptionPlan?: SellerPlan;
  verificationStatus?: string;
}

export type StoreTheme = 'FOREST' | 'CLAY' | 'GOLD' | 'MIDNIGHT';

export interface UpdateStorefrontPayload {
  storeName?: string;
  storeDescription?: string;
  storeTagline?: string;
  announcement?: string;
  theme?: StoreTheme;
  showContact?: boolean;
  featuredProductIds?: string[];
  location?: string;
  phoneNumber?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

export interface CreateStorePayload {
  storeName: string;
  storeDescription?: string;
  category?: string;
  location?: string;
  phoneNumber?: string;
  subscriptionPlan: SellerPlan;
  paymentMethod: 'FREE' | 'ABA';
}

export interface DashboardMetrics {
  pendingOrders: number;
  inTransit: number;
  completed30d: number;
  revenueMtd: number;
}

export interface SellerOrderDTO {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerPhone: string;
  deliveryInfo: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  myItems: any[];
  myTotal: number;
}

export interface OrdersDashboardResponse {
  metrics: DashboardMetrics;
  orders: SellerOrderDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StoreSubcategoryDTO {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sortOrder: number;
}

export interface StoreCategoryDTO {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  visible: boolean;
  sortOrder: number;
  subcategories: StoreSubcategoryDTO[];
}

@Injectable({ providedIn: 'root' })
export class SellerService {
  private readonly http = inject(HttpClient);

  /**
   * Seller applications awaiting review. ADMIN-only on the server
   * (sellers.routes.ts), so a non-admin calling this gets a 403.
   */
  listSellerApplications() {
    return this.http.get<SellerApplication[]>(`${API_URL}/sellers/apply`);
  }

  getMyStores() {
    return this.http.get<SellerStore[]>(`${API_URL}/sellers/my-stores`);
  }

  createStore(data: CreateStorePayload) {
    return this.http.post<SellerStore>(`${API_URL}/sellers/my-stores`, data);
  }

  getStoreOrders(storeId: string) {
    return this.http.get<OrdersDashboardResponse>(
      `${API_URL}/sellers/my-stores/${storeId}/orders`
    );
  }

  getStoreProfile(storeId: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}`);
  }

  updateStoreProfile(storeId: string, data: UpdateStorefrontPayload) {
    return this.http.put<SellerStore>(`${API_URL}/sellers/my-stores/${storeId}/profile`, data);
  }

  getStoreReviews(storeId: string) {
    return this.http.get<any>(`${API_URL}/sellers/my-stores/${storeId}/reviews`);
  }

  getStoreProducts(storeId: string) {
    // The authenticated endpoint enforces ownership and also returns drafts
    // and archived listings. A public sellerId query can never safely power
    // a seller's management dashboard.
    return this.http.get<any>(`${API_URL}/products/mine`, { params: { storeId } });
  }

  createProduct(data: any) {
    return this.http.post<any>(`${API_URL}/products`, data);
  }

  updateProduct(productId: string, data: any) {
    return this.http.patch<any>(`${API_URL}/products/${productId}`, data);
  }

  deleteProduct(productId: string) {
    return this.http.delete<any>(`${API_URL}/products/${productId}`);
  }

  // ------------------------------------------------------- store categories

  getStoreCategories(storeId: string) {
    return this.http
      .get<{ categories: StoreCategoryDTO[] }>(`${API_URL}/store-categories/my-stores/${storeId}`)
      .pipe(map((response) => response.categories));
  }

  createStoreCategory(storeId: string, data: { name: string; description?: string; imageUrl?: string }) {
    return this.http.post<StoreCategoryDTO>(`${API_URL}/store-categories/my-stores/${storeId}`, data);
  }

  updateStoreCategory(
    storeId: string,
    categoryId: string,
    data: Partial<{ name: string; description: string | null; imageUrl: string | null; visible: boolean }>,
  ) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}`,
      data,
    );
  }

  reorderStoreCategories(storeId: string, orderedIds: string[]) {
    return this.http
      .patch<{ categories: StoreCategoryDTO[] }>(
        `${API_URL}/store-categories/my-stores/${storeId}/reorder`,
        { orderedIds },
      )
      .pipe(map((response) => response.categories));
  }

  deleteStoreCategory(storeId: string, categoryId: string) {
    return this.http.delete<void>(`${API_URL}/store-categories/my-stores/${storeId}/${categoryId}`);
  }

  addStoreSubcategory(storeId: string, categoryId: string, name: string) {
    return this.http.post<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories`,
      { name },
    );
  }

  updateStoreSubcategory(
    storeId: string,
    categoryId: string,
    subcategoryId: string,
    data: Partial<{ name: string; visible: boolean }>,
  ) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/${subcategoryId}`,
      data,
    );
  }

  reorderStoreSubcategories(storeId: string, categoryId: string, orderedIds: string[]) {
    return this.http.patch<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/reorder`,
      { orderedIds },
    );
  }

  deleteStoreSubcategory(storeId: string, categoryId: string, subcategoryId: string) {
    return this.http.delete<StoreCategoryDTO>(
      `${API_URL}/store-categories/my-stores/${storeId}/${categoryId}/subcategories/${subcategoryId}`,
    );
  }
}
