import { CoreApiClient, ApiClientConfig } from './generated';
import { getCoreApiBaseUrl, defaultApiClientConfig } from './config';

export const createCoreClient = (overrideConfig: Partial<ApiClientConfig> = {}): CoreApiClient => {
  return new CoreApiClient({
    baseUrl: getCoreApiBaseUrl(),
    ...defaultApiClientConfig,
    ...overrideConfig,
  });
};

export const coreClient = createCoreClient();
