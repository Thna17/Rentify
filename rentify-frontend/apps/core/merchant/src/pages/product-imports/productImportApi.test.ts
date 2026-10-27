import { describe, expect, it, vi } from 'vitest';
import { commerceClient } from '@rentify/shared/api';
import { importErrorKey, importStateFor, productImportApi } from './productImportApi';
import en from '@rentify/utils/locales/en.json';
import kh from '@rentify/utils/locales/kh.json';

describe('product import recovery state', () => {
  it('distinguishes authorization, conflict, timeout, and offline failures', () => {
    expect(importStateFor({ status: 403 })).toBe('forbidden');
    expect(importStateFor({ status: 409 })).toBe('conflict');
    expect(importStateFor(new DOMException('late', 'TimeoutError'))).toBe('timeout');
    vi.stubGlobal('navigator', { onLine: false });
    expect(importStateFor(new Error('network'))).toBe('offline');
    vi.unstubAllGlobals();
  });

  it('maps server-safe reason codes to localized recovery copy', () => {
    expect(importErrorKey({ code: 'CSV_TOO_LARGE' })).toBe('dashboard.imports.limit_error');
    expect(importErrorKey({ code: 'CSV_HEADERS_INVALID' })).toBe('dashboard.imports.template_error');
    expect(importErrorKey({ code: 'CSV_PARSE_INVALID' })).toBe('dashboard.imports.file_error');
    expect(importErrorKey({ code: 'IDEMPOTENCY_CONFLICT' })).toBe('dashboard.imports.conflict_message');
  });
});

describe('product import client operations', () => {
  it('calls preview with Idempotency-Key header and FormData body', async () => {
    const spy = vi.spyOn(commerceClient, 'request').mockResolvedValueOnce({
      data: {
        job: {
          id: 'job-1', status: 'preview_ready', totalRows: 1, validRows: 1,
          warningRows: 0, errorRows: 0, processedRows: 0, importedRows: 0, failedRows: 0,
          sourceFilename: 'items.csv', templateVersion: '1.0', createdAt: '', updatedAt: '',
        },
      },
    } as any);

    const dummyFile = new File(['name,sku\nItem,SKU1'], 'items.csv', { type: 'text/csv' });
    const result = await productImportApi.preview('store-123', dummyFile, 'idemp-key-xyz');

    expect(result.id).toBe('job-1');
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/stores/store-123/product-imports',
      headers: { 'Idempotency-Key': 'idemp-key-xyz' },
    }));
    spy.mockRestore();
  });

  it('routes start and retry actions to corresponding endpoints', async () => {
    const spy = vi.spyOn(commerceClient, 'request').mockResolvedValue({
      data: {
        job: { id: 'job-1', status: 'queued' },
      },
    } as any);

    await productImportApi.start('store-123', 'job-1', false);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/stores/store-123/product-imports/job-1/start',
    }));

    await productImportApi.start('store-123', 'job-1', true);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({
      method: 'POST',
      path: '/api/stores/store-123/product-imports/job-1/retry',
    }));
    spy.mockRestore();
  });
});

describe('product import localization', () => {
  it('keeps every import key available in English and Khmer', () => {
    const english = en.dashboard.imports;
    const khmer = kh.dashboard.imports;
    expect(Object.keys(khmer).sort()).toEqual(Object.keys(english).sort());
    expect(khmer.title).not.toBe(english.title);
    expect(khmer.status_completed_with_errors).toContain('បានបញ្ចប់');
  });
});
