import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OperationsComponent } from './operations.component';
import { PlatformOperationsService } from '../services/platform-operations.service';

const route = (section: string) => ({
  snapshot: { data: { section }, queryParamMap: { get: () => null } },
});

describe('OperationsComponent', () => {
  it('shows live source counts without treating COD orders as revenue', () => {
    const api = {
      core: (resource: string) => of(resource === 'overview'
        ? { data: { storeCount: 6, activeStores: 6, pendingSellers: 1, websiteCount: 2,
          userCount: 24, activeSubscriptions: 2, pendingPlanPayments: 0 } }
        : { data: [], total: 0, page: 1, limit: 5 }),
      commerce: () => of({ data: { productCount: 36, marketplaceOrders: 5,
        openMarketplaceOrders: 2, buyerReports: 1 } }),
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('dashboard') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Marketplace orders');
    expect(text).toContain('Catalog products');
    expect(text).toContain('Online marketplace settlement');
    expect(text).not.toContain('8.5% Commission');
  });

  it('requires every seller check before enabling approval', () => {
    const store = { id: 'store-1', name: 'Aura', owner: { isVerified: true },
      primaryCategory: 'Beauty', needsCategoryReview: false,
      sellerApplication: { responsibleName: 'Maly' } };
    const api = {
      core: () => of({ data: [store], total: 1, page: 1, limit: 20 }),
      reviewHistory: () => of({ data: { reviews: [] } }),
      reviewSeller: () => of({}),
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('stores') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openStore(store);
    expect(component.canApprove(store)).toBe(false);
    for (const key of ['accountVerified', 'identityReviewed', 'storeDetailsReviewed',
      'sampleProductReviewed', 'fulfillmentReviewed', 'restrictedProductsReviewed']) {
      component.setCheck(key, true);
    }
    expect(component.canApprove(store)).toBe(true);
  });
});
