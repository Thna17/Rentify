import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PlatformOperationsService } from './platform-operations.service';

describe('PlatformOperationsService', () => {
  let service: PlatformOperationsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PlatformOperationsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps Store and seller review requests on Core', () => {
    service.core('stores', { page: 2, limit: 20, applicationStatus: 'pending' }).subscribe();
    const list = http.expectOne((r) => r.url === 'http://localhost:3001/admin/operations/stores');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('applicationStatus')).toBe('pending');
    list.flush({ data: [], total: 0, page: 2, limit: 20 });

    service.reviewSeller('store-1', 'approved', { accountVerified: true }, '').subscribe();
    const review = http.expectOne('http://localhost:3001/admin/stores/store-1/seller-review');
    expect(review.request.method).toBe('POST');
    expect(review.request.body.decision).toBe('approved');
    review.flush({});
  });

  it('reads order facts from Commerce', () => {
    service.commerce('orders', { channel: 'marketplace', storeId: 'store-1' }).subscribe();
    const request = http.expectOne((r) => r.url ===
      'http://localhost:4001/api/admin/operations/orders');
    expect(request.request.params.get('channel')).toBe('marketplace');
    expect(request.request.params.get('storeId')).toBe('store-1');
    request.flush({ data: [], total: 0, page: 1, limit: 20 });
  });

  it('sends product, review, and report mutations to Commerce and store updates to Core', () => {
    service.updateStore('store-1', { marketplaceEnabled: false, status: 'suspended' }).subscribe();
    const storeReq = http.expectOne('http://localhost:3001/admin/operations/stores/store-1');
    expect(storeReq.request.method).toBe('PATCH');
    expect(storeReq.request.body.marketplaceEnabled).toBe(false);
    storeReq.flush({ success: true });

    service.updateProduct('prod-1', { marketplaceVisibility: false, status: 'archived' }).subscribe();
    const prodReq = http.expectOne('http://localhost:4001/api/admin/operations/products/prod-1');
    expect(prodReq.request.method).toBe('PATCH');
    expect(prodReq.request.body.marketplaceVisibility).toBe(false);
    prodReq.flush({ success: true });

    service.updateReview('rev-1', 'published').subscribe();
    const revReq = http.expectOne('http://localhost:4001/api/admin/operations/reviews/rev-1');
    expect(revReq.request.method).toBe('PATCH');
    expect(revReq.request.body.status).toBe('published');
    revReq.flush({ success: true });

    service.deleteReview('rev-1').subscribe();
    const delReq = http.expectOne('http://localhost:4001/api/admin/operations/reviews/rev-1');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ success: true });

    service.updateReport('rep-1', { status: 'resolved', resolutionNotes: 'Resolved' }).subscribe();
    const repReq = http.expectOne('http://localhost:4001/api/admin/operations/reports/rep-1');
    expect(repReq.request.method).toBe('PATCH');
    expect(repReq.request.body.status).toBe('resolved');
    repReq.flush({ success: true });
  });
});

