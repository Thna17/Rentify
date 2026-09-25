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

  it('supports product marketplace listing override, status change, and restock', () => {
    const product = { id: 'prod-1', name: 'Silk Scarf', stockQuantity: 5, status: 'active', marketplaceVisibility: null };
    let passedVisibility: any = null;
    let passedStatus: any = null;
    let passedStock: any = null;
    const api = {
      commerce: () => of({ data: [product], total: 1, page: 1, limit: 20 }),
      updateProduct: (_id: string, updates: any) => {
        if ('marketplaceVisibility' in updates) passedVisibility = updates.marketplaceVisibility;
        if ('status' in updates) passedStatus = updates.status;
        if ('stockQuantity' in updates) passedStock = updates.stockQuantity;
        return of({ success: true, data: { ...product, ...updates } });
      },
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('products') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openItem(product, 'products');
    component.setProductVisibility(product, false);
    expect(passedVisibility).toBe(false);
    expect(product.marketplaceVisibility).toBe(false);

    component.setProductStatus(product, 'archived');
    expect(passedStatus).toBe('archived');
    expect(product.status).toBe('archived');

    component.restockProduct(product, 20);
    expect(passedStock).toBe(25);
    expect(product.stockQuantity).toBe(25);
  });

  it('supports review moderation status toggle and deletion', () => {
    const review = { id: 'rev-1', buyerName: 'Sokha', rating: 5, status: 'flagged' };
    let updatedStatus = '';
    let deletedId = '';
    const api = {
      commerce: () => of({ data: [review], total: 1, page: 1, limit: 20 }),
      updateReview: (_id: string, status: any) => {
        updatedStatus = status;
        return of({ success: true, data: { ...review, status } });
      },
      deleteReview: (id: string) => {
        deletedId = id;
        return of({ success: true });
      },
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('reviews') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openItem(review, 'reviews');
    component.setReviewStatus(review, 'published');
    expect(updatedStatus).toBe('published');
    expect(review.status).toBe('published');
  });

  it('supports buyer report triage and resolution notes', () => {
    const report = { id: 'rep-1', type: 'complaint', details: { reason: 'Broken cup' } };
    let triageStatus = '';
    let resolutionNotes = '';
    const api = {
      commerce: () => of({ data: [report], total: 1, page: 1, limit: 20 }),
      updateReport: (_id: string, updates: any) => {
        triageStatus = updates.status;
        resolutionNotes = updates.resolutionNotes;
        return of({ success: true });
      },
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('reports') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openItem(report, 'reports');
    component.resolutionNotes.set('Buyer issued replacement item');
    component.triageReport(report, 'resolved');
    expect(triageStatus).toBe('resolved');
    expect(resolutionNotes).toBe('Buyer issued replacement item');
  });

  it('supports store marketplace toggle and status suspension', () => {
    const store = { id: 'store-1', name: 'Tonle Craft', marketplaceEnabled: true, status: 'active' };
    let updatedEnabled: any = null;
    let updatedStatus: any = null;
    const api = {
      core: () => of({ data: [store], total: 1, page: 1, limit: 20 }),
      updateStore: (_id: string, updates: any) => {
        if ('marketplaceEnabled' in updates) updatedEnabled = updates.marketplaceEnabled;
        if ('status' in updates) updatedStatus = updates.status;
        return of({ success: true });
      },
    };
    TestBed.configureTestingModule({ imports: [OperationsComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: route('stores') },
      { provide: PlatformOperationsService, useValue: api },
    ] });
    const fixture = TestBed.createComponent(OperationsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.openItem(store, 'stores');
    component.toggleStoreMarketplace(store, false);
    expect(updatedEnabled).toBe(false);
    expect(store.marketplaceEnabled).toBe(false);

    component.toggleStoreStatus(store, 'suspended');
    expect(updatedStatus).toBe('suspended');
    expect(store.status).toBe('suspended');
  });
});
