import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, validateCatalog } from './validate-event-catalog.mjs';

test('Phase 5 analytics catalog is unique, versioned and PII-minimized', () => {
  assert.deepEqual(validateCatalog(loadCatalog()), []);
});

test('validator rejects prohibited properties and duplicate contracts', () => {
  const catalog = loadCatalog();
  const unsafe = structuredClone(catalog);
  unsafe.events[0].allowedProperties.push('email');
  unsafe.events.push(structuredClone(unsafe.events[0]));
  const errors = validateCatalog(unsafe);
  assert.ok(errors.some((error) => error.includes('prohibited property email')));
  assert.ok(errors.some((error) => error.includes('duplicate event contract')));
});
