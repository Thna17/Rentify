import { CommerceApiClient, ApiClientConfig } from './generated';
import { getCommerceApiBaseUrl, defaultApiClientConfig } from './config';

export const createCommerceClient = (overrideConfig: Partial<ApiClientConfig> = {}): CommerceApiClient => {
  return new CommerceApiClient({
    baseUrl: getCommerceApiBaseUrl(),
    ...defaultApiClientConfig,
    ...overrideConfig,
  });
};

export const commerceClient = createCommerceClient();
