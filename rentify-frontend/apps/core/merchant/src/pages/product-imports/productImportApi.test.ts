import { describe, expect, it, vi } from 'vitest';
import { importErrorKey, importStateFor } from './productImportApi';
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

describe('product import localization', () => {
  it('keeps every import key available in English and Khmer', () => {
    const english = en.dashboard.imports;
    const khmer = kh.dashboard.imports;
    expect(Object.keys(khmer).sort()).toEqual(Object.keys(english).sort());
    expect(khmer.title).not.toBe(english.title);
    expect(khmer.status_completed_with_errors).toContain('បានបញ្ចប់');
  });
});
