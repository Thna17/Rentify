import { describe, expect, it, vi } from 'vitest';
import { actionLabel, actionRisk, channelLabel, eventLabel, loadStateFor, orderCopy, statusLabel } from './orderOperationsModel';

describe('merchant order operations presentation contract', () => {
  it('covers every channel, action, and recovery state in English and Khmer', () => {
    for (const locale of ['en', 'kh']) {
      const copy = orderCopy(locale);
      for (const channel of ['marketplace', 'storefront', 'pos', 'invoice']) expect(channelLabel(channel, locale)).toBeTruthy();
      for (const action of ['delivered', 'delivery_failed', 'retry_delivery', 'collect_cod', 'confirm_refund'] as const) {
        expect(actionLabel(action, locale)).toBeTruthy();
        expect(actionRisk(action, locale)).toBeTruthy();
      }
      for (const status of ['pending', 'paid', 'fulfilled', 'failed']) expect(statusLabel(status, locale)).toBeTruthy();
      for (const event of ['order_created', 'complaint', 'return_requested', 'collect_cod']) expect(eventLabel(event, locale)).toBeTruthy();
      for (const key of ['loading', 'empty', 'forbidden', 'timeout', 'offline', 'error', 'conflictBody'] as const) expect(copy[key]).toBeTruthy();
    }
    expect(orderCopy('kh').title).not.toBe(orderCopy('en').title);
    expect(statusLabel('fulfilled', 'kh')).not.toBe(statusLabel('fulfilled', 'en'));
    expect(eventLabel('complaint', 'kh')).not.toBe(eventLabel('complaint', 'en'));
  });

  it('distinguishes forbidden, conflict, timeout, offline, and generic failures', () => {
    expect(loadStateFor({ status: 403 })).toBe('forbidden');
    expect(loadStateFor({ status: 409 })).toBe('conflict');
    expect(loadStateFor(new DOMException('late', 'TimeoutError'))).toBe('timeout');
    vi.stubGlobal('navigator', { onLine: false });
    expect(loadStateFor(new Error('network'))).toBe('offline');
    vi.stubGlobal('navigator', { onLine: true });
    expect(loadStateFor(new Error('server'))).toBe('error');
    vi.unstubAllGlobals();
  });
});
