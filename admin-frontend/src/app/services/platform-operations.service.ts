import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { RentifyAdminService } from '../core/rentify/rentify-admin.service';

export interface Page<T> { data: T[]; total: number; page: number; limit: number }
export type Section = 'stores' | 'users' | 'websites' | 'templates' | 'subscriptions' |
  'packages' | 'plan-payments' | 'products' | 'orders' | 'payments' |
  'reviews' | 'reports' | 'billing';

@Injectable({ providedIn: 'root' })
export class PlatformOperationsService {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(RentifyAdminService);
  private params(query: Record<string, string | number | undefined>) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, value);
    }
    return params;
  }
  core<T>(resource: string, query: Record<string, string | number | undefined> = {}) {
    return this.http.get<T>(`${this.urls.core}/admin/operations/${resource}`, { params: this.params(query) });
  }
  commerce<T>(resource: string, query: Record<string, string | number | undefined> = {}) {
    return this.http.get<T>(`${this.urls.commerce}/api/admin/operations/${resource}`,
      { params: this.params(query) });
  }
  reviewHistory(storeId: string) {
    return this.http.get<{ data: { reviews: any[] } }>(
      `${this.urls.core}/admin/stores/${storeId}/seller-application`);
  }
  reviewSeller(storeId: string, decision: string, checklist: Record<string, boolean>, reason: string) {
    return this.http.post(`${this.urls.core}/admin/stores/${storeId}/seller-review`,
      { decision, checklist, reason });
  }
}
