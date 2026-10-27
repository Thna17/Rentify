import { describe, expect, it } from 'vitest';
import { productEditorCopy } from './productEditorCopy';
import { blankProduct, editorStateFor, productPayload } from './productEditorModel';

describe('P4-MER-003 product editor model', () => {
  it('builds one authoritative simple SKU payload', () => {
    const form = blankProduct();
    form.name = 'Canvas bag'; form.marketplaceCategory = 'Other';
    form.variants[0] = { ...form.variants[0], sku: 'bag-001', price: '12.50', stockQuantity: '4' };
    expect(productPayload(form)).toMatchObject({
      name: 'Canvas bag', price: 12.5, stockQuantity: 4,
      variants: [{ sku: 'bag-001', price: 12.5, stockQuantity: 4, optionValues: {} }],
    });
  });

  it('derives product price and stock from enabled variants without discarding versions', () => {
    const form = blankProduct();
    form.name = 'T-shirt'; form.marketplaceCategory = 'Clothing'; form.version = 7;
    form.variants = [
      { id: 's', expectedVersion: 2, sku: 'SHIRT-S', price: '10', stockQuantity: '2', optionName: 'Size', optionValue: 'S', status: 'active' },
      { id: 'm', expectedVersion: 4, sku: 'SHIRT-M', price: '12', stockQuantity: '9', optionName: 'Size', optionValue: 'M', status: 'disabled' },
    ];
    const payload = productPayload(form);
    expect(payload).toMatchObject({ expectedVersion: 7, replaceVariants: true, price: 10, stockQuantity: 2 });
    expect(payload.variants).toHaveLength(2);
    expect(payload.variants[0]).toMatchObject({ id: 's', expectedVersion: 2, optionValues: { Size: 'S' } });
  });

  it('maps forbidden, conflict, timeout, offline-safe fallback states', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    expect(editorStateFor({ status: 403 })).toBe('forbidden');
    expect(editorStateFor({ status: 409 })).toBe('conflict');
    expect(editorStateFor(new DOMException('late', 'TimeoutError'))).toBe('timeout');
    expect(editorStateFor(new Error('unknown'))).toBe('error');
  });

  it('ships complete English and Khmer editor copy', () => {
    expect(Object.keys(productEditorCopy.en)).toEqual(Object.keys(productEditorCopy.kh));
    expect(productEditorCopy.kh.createTitle).toContain('ផលិតផល');
  });
});
