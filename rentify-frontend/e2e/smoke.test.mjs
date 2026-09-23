import test from 'node:test';
import assert from 'node:assert/strict';

const storefrontUrl = process.env.STOREFRONT_SMOKE_URL;

test('merchant-to-storefront smoke journey', { skip: !storefrontUrl && 'Set STOREFRONT_SMOKE_URL for a deployed or local test stack.' }, async () => {
  const response = await fetch(storefrontUrl, { redirect: 'error' });
  assert.equal(response.ok, true, `storefront returned ${response.status}`);
  const html = await response.text();
  assert.match(html, /<div id="root">/i);
});

test('smoke test inputs are explicit and never use production credentials', () => {
  assert.equal(Boolean(process.env.SMOKE_MERCHANT_EMAIL && process.env.SMOKE_MERCHANT_PASSWORD), false,
    'provide credentials only through the CI secret store when extending authenticated smoke coverage');
});
