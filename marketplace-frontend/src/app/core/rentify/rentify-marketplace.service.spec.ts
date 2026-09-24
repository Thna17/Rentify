import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RentifyMarketplaceService } from './rentify-marketplace.service';

describe('RentifyMarketplaceService', () => {
  let service: RentifyMarketplaceService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RentifyMarketplaceService,
      ],
    });
    service = TestBed.inject(RentifyMarketplaceService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    delete window.__RENTIFY_MARKETPLACE__;
  });

  it('provides default fallback URLs on localhost', () => {
    expect(service.core).toBe('http://localhost:3001');
    expect(service.commerce).toBe('http://localhost:4001');
    expect(service.auth).toBe('http://localhost:4300');
    expect(service.merchantDashboard).toBe('http://localhost:4400');
    expect(service.adminDashboard).toBe('http://localhost:4800');
    expect(service.configured).toBe(true);
  });

  it('reads runtime configuration dynamically when present', () => {
    window.__RENTIFY_MARKETPLACE__ = {
      coreApiUrl: 'https://core.rentify.local/',
      commerceApiUrl: 'https://commerce.rentify.local/',
      authUrl: 'https://auth.rentify.local/',
      merchantDashboardUrl: 'https://merchant.rentify.local/',
      adminDashboardUrl: 'https://admin.rentify.local/',
    };

    expect(service.core).toBe('https://core.rentify.local');
    expect(service.commerce).toBe('https://commerce.rentify.local');
    expect(service.auth).toBe('https://auth.rentify.local');
    expect(service.merchantDashboard).toBe('https://merchant.rentify.local');
    expect(service.adminDashboard).toBe('https://admin.rentify.local');
    expect(service.configured).toBe(true);
  });

  it('calls session endpoint', () => {
    let result: unknown;
    service.session().subscribe((res) => { result = res; });

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/session');
    expect(req.request.method).toBe('GET');
    req.flush({ user: { id: 'user-1', name: 'Buyer', email: 'b@test.local', phoneNumber: null, isVerified: true } });

    expect(result).toEqual({ user: { id: 'user-1', name: 'Buyer', email: 'b@test.local', phoneNumber: null, isVerified: true } });
  });

  it('calls products list with pagination params', () => {
    service.products(2).subscribe();

    const req = httpTesting.expectOne((r) =>
      r.url === 'http://localhost:4001/api/marketplace/products' &&
      r.params.get('page') === '2' &&
      r.params.get('limit') === '24'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ products: [], total: 0, page: 2, limit: 24 });
  });

  it('calls product detail endpoint', () => {
    service.product('prod-123').subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/products/prod-123');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'prod-123', name: 'Test Product' });
  });

  it('calls public stores endpoint with comma-separated IDs', () => {
    service.stores(['store-1', 'store-2']).subscribe();

    const req = httpTesting.expectOne((r) =>
      r.url === 'http://localhost:3001/api/stores/public' &&
      r.params.get('ids') === 'store-1,store-2'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ data: [] });
  });

  it('calls carts endpoint', () => {
    service.carts().subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/cart');
    expect(req.request.method).toBe('GET');
    req.flush({ carts: [] });
  });

  it('updates item quantity in store cart', () => {
    service.setQuantity('store-1', 'prod-1', 3).subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/cart/store-1/items/prod-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ quantity: 3 });
    req.flush({ carts: [] });
  });

  it('sends checkout request with idempotency key header', () => {
    service.checkout('store-1', '25.00', 'Buyer', '+85512345678', 'Phnom Penh', 'key-abc-123').subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/checkout');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-abc-123');
    expect(req.request.body).toEqual({
      storeId: 'store-1',
      expectedTotalAmount: '25.00',
      customerInfo: { name: 'Buyer', phone: '+85512345678' },
      shippingInfo: { address: 'Phnom Penh' },
    });
    req.flush({ order: { id: 'ord-1', orderNumber: 'ORD-001' } });
  });

  it('calls orders list endpoint', () => {
    service.orders().subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/my-orders');
    expect(req.request.method).toBe('GET');
    req.flush({ orders: [] });
  });

  it('submits an order report with idempotency key header', () => {
    service.report('ord-1', 'complaint', 'Damaged goods', 'key-rpt-1').subscribe();

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/my-orders/ord-1/reports/complaint');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Idempotency-Key')).toBe('key-rpt-1');
    expect(req.request.body).toEqual({ reason: 'Damaged goods' });
    req.flush({ success: true });
  });

  it('calls logout endpoint', () => {
    service.logout().subscribe();

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ok: true });
  });

  it('calls product reviews endpoint', () => {
    let result: unknown;
    service.reviews('prod-123').subscribe((res) => { result = res; });

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/products/prod-123/reviews');
    expect(req.request.method).toBe('GET');
    req.flush({ reviews: [], summary: { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });

    expect(result).toEqual({ reviews: [], summary: { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } });
  });

  it('submits a product review with rating and comment', () => {
    let result: unknown;
    service.submitReview('prod-123', 5, 'Exceptional craftsmanship!').subscribe((res) => { result = res; });

    const req = httpTesting.expectOne('http://localhost:4001/api/marketplace/products/prod-123/reviews');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rating: 5, comment: 'Exceptional craftsmanship!' });
    req.flush({
      review: { id: 'rev-1', rating: 5, comment: 'Exceptional craftsmanship!' },
      summary: { total: 1, average: 5, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    });

    expect(result).toEqual({
      review: { id: 'rev-1', rating: 5, comment: 'Exceptional craftsmanship!' },
      summary: { total: 1, average: 5, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
    });
  });

  it('builds auth link for login and signup with returnUrl', () => {
    const loginLink = service.authLink('login');
    const signupLink = service.authLink('signup');
    const registerLink = service.authLink('register', 'http://localhost:4500/seller/dashboard');
    const forgotLink = service.authLink('forgot-password', 'http://localhost:4500/profile');

    expect(loginLink).toContain('http://localhost:4300/?returnUrl=');
    expect(signupLink).toContain('http://localhost:4300/signup?returnUrl=');
    expect(registerLink).toBe('http://localhost:4300/signup?returnUrl=http%3A%2F%2Flocalhost%3A4500%2Fseller%2Fdashboard');
    expect(forgotLink).toBe('http://localhost:4300/forgot-password?returnUrl=http%3A%2F%2Flocalhost%3A4500%2Fprofile');
  });
});
