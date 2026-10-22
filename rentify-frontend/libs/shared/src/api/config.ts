import { RENTIFY_API_BASE, ECOMMERCE_API_ROOT } from '../config/urls';

export const getCoreApiBaseUrl = (): string => {
  return (RENTIFY_API_BASE || 'http://localhost:3001').replace(/\/+$/, '');
};

export const getCommerceApiBaseUrl = (): string => {
  return (ECOMMERCE_API_ROOT || 'http://localhost:4001').replace(/\/+$/, '');
};

export const defaultApiClientConfig = {
  credentials: 'include' as RequestCredentials,
  getCorrelationId: () =>
    `client-react-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
};
