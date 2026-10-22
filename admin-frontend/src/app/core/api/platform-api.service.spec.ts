import { TestBed } from '@angular/core/testing';
import { PlatformApiService, resolveAdminApiConfig } from './platform-api.service';
import { CoreApiClient, CommerceApiClient } from './generated';

describe('PlatformApiService (admin-frontend)', () => {
  let service: PlatformApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformApiService],
    });
    service = TestBed.inject(PlatformApiService);
  });

  afterEach(() => {
    delete window.__RENTIFY_ADMIN__;
  });

  it('instantiates typed Core and Commerce API clients for admin console', () => {
    expect(service.core).toBeInstanceOf(CoreApiClient);
    expect(service.commerce).toBeInstanceOf(CommerceApiClient);
  });

  it('centralizes base URLs from window.__RENTIFY_ADMIN__ or defaults to localhost', () => {
    const defaultConfig = resolveAdminApiConfig();
    expect(defaultConfig.coreBaseUrl).toBe('http://localhost:3001');
    expect(defaultConfig.commerceBaseUrl).toBe('http://localhost:4001');

    window.__RENTIFY_ADMIN__ = {
      coreApiUrl: 'https://core.admin.rentify.local/',
      commerceApiUrl: 'https://commerce.admin.rentify.local/',
    };

    const runtimeConfig = resolveAdminApiConfig();
    expect(runtimeConfig.coreBaseUrl).toBe('https://core.admin.rentify.local');
    expect(runtimeConfig.commerceBaseUrl).toBe('https://commerce.admin.rentify.local');
  });

  it('invokes typed admin overview with credentials and correlation ID', async () => {
    let capturedOptions: any = null;
    const mockTransport = {
      request: async <T>(opts: any) => {
        capturedOptions = opts;
        return {
          data: { data: { storeCount: 12, activeStores: 10 } } as unknown as T,
          status: 200,
          statusText: 'OK',
          headers: { 'x-correlation-id': 'admin-cid-002' },
          correlationId: 'admin-cid-002',
        };
      },
    };

    const customCore = new CoreApiClient(mockTransport);
    const res = await customCore.getAdminOverview({ correlationId: 'req-admin-test' });

    expect(capturedOptions.path).toBe('/admin/operations/overview');
    expect(capturedOptions.method).toBe('GET');
    expect(capturedOptions.correlationId).toBe('req-admin-test');
    expect(res.data.data?.storeCount).toBe(12);
  });
});
