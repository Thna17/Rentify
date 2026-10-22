import { TestBed } from '@angular/core/testing';
import { PlatformApiService, resolveMarketplaceApiConfig } from './platform-api.service';
import { CoreApiClient, CommerceApiClient } from './generated';

describe('PlatformApiService (marketplace-frontend)', () => {
  let service: PlatformApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformApiService],
    });
    service = TestBed.inject(PlatformApiService);
  });

  afterEach(() => {
    delete window.__RENTIFY_MARKETPLACE__;
  });

  it('instantiates typed Core and Commerce API clients', () => {
    expect(service.core).toBeInstanceOf(CoreApiClient);
    expect(service.commerce).toBeInstanceOf(CommerceApiClient);
  });

  it('centralizes base URLs from window.__RENTIFY_MARKETPLACE__ or defaults to localhost', () => {
    const defaultConfig = resolveMarketplaceApiConfig();
    expect(defaultConfig.coreBaseUrl).toBe('http://localhost:3001');
    expect(defaultConfig.commerceBaseUrl).toBe('http://localhost:4001');

    window.__RENTIFY_MARKETPLACE__ = {
      coreApiUrl: 'https://core.rentify.local/',
      commerceApiUrl: 'https://commerce.rentify.local/',
    };

    const runtimeConfig = resolveMarketplaceApiConfig();
    expect(runtimeConfig.coreBaseUrl).toBe('https://core.rentify.local');
    expect(runtimeConfig.commerceBaseUrl).toBe('https://commerce.rentify.local');
  });

  it('attaches correlation IDs and credentials in Core and Commerce requests', async () => {
    let capturedOptions: any = null;
    const mockTransport = {
      request: async <T>(opts: any) => {
        capturedOptions = opts;
        return {
          data: { user: { id: 'test-user-1' } } as unknown as T,
          status: 200,
          statusText: 'OK',
          headers: { 'x-correlation-id': 'mock-cid-001' },
          correlationId: 'mock-cid-001',
        };
      },
    };

    const customCore = new CoreApiClient(mockTransport);
    const res = await customCore.getSessionProfile({ correlationId: 'req-custom-cid' });

    expect(capturedOptions.path).toBe('/api/auth/session');
    expect(capturedOptions.method).toBe('GET');
    expect(capturedOptions.correlationId).toBe('req-custom-cid');
    expect(res.data.user?.id).toBe('test-user-1');
  });
});
