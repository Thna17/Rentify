import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
export async function campaignRequest(path: string, body?: unknown) {
  const response = await fetch(`${ECOMMERCE_API_ROOT}/api${path}`, {
    credentials: 'include',
    ...(body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Unable to complete this request');
  return data;
}
