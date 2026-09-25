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
});
