import { describe, expect, test, vi } from 'vitest';
import worker, { isStoreHost } from '../../cloudflare/worker.js';

const env = {
  HOSTED_STOREFRONT_DOMAIN: 'mekhla.digital',
  HOSTED_STOREFRONT_RESERVED: 'admin,api,colis,staging,www,rentify-api,rentify-commerce',
  ASSETS: { fetch: vi.fn(async () => new Response('storefront')) },
};

describe('storefront Worker', () => {
  test('recognises store subdomains only', () => {
    expect(isStoreHost('aura-botanicals.mekhla.digital', env)).toBe(true);
    for (const host of ['api.mekhla.digital', 'rentify-api.mekhla.digital', 'staging.mekhla.digital', 'mekhla.digital', 'a.b.mekhla.digital', 'aura.example.com']) {
      expect(isStoreHost(host, env)).toBe(false);
    }
  });

  test('serves the app for stores and passes other hostnames through', async () => {
    const passThrough = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('origin'));
    expect(await (await worker.fetch(new Request('https://aura.mekhla.digital/products'), env)).text()).toBe('storefront');
    expect(await (await worker.fetch(new Request('https://api.mekhla.digital/v1'), env)).text()).toBe('origin');
    expect(passThrough).toHaveBeenCalledTimes(1);
    passThrough.mockRestore();
  });
});
