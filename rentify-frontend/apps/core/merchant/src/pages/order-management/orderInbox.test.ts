import { describe, it, expect } from 'vitest';
import { canMarkOnlineDelivered, countByTab, paymentKind, workTab } from './orderModel';

// Shapes follow Commerce's orderProjection (GET /api/stores/:storeId/orders).
const order = (overrides: Record<string, any> = {}) => ({
  id: 'o1',
  channel: 'marketplace',
  status: 'pending',
  fulfillmentStatus: 'pending',
  payment: { method: 'COD', status: 'pending', codState: 'due_on_delivery', amountDue: '10.00' },
  reports: [],
  allowedActions: [],
  ...overrides,
});

describe('Orders inbox (redesign M3–M5)', () => {
  describe('workTab', () => {
    it('puts cancelled orders in Cancelled', () => {
      expect(workTab(order({ status: 'cancelled' }))).toBe('cancelled');
    });

    it('puts orders with buyer reports or a failed delivery in Problems', () => {
      expect(workTab(order({ reports: [{ id: 'r', type: 'return_requested' }] }))).toBe('problems');
      expect(workTab(order({ fulfillmentStatus: 'failed', allowedActions: [{ code: 'retry_delivery' }] }))).toBe('problems');
    });

    it('uses the actions Commerce allows for COD delivery orders', () => {
      expect(workTab(order({ allowedActions: [{ code: 'delivered' }, { code: 'delivery_failed' }] }))).toBe('deliver');
      expect(workTab(order({ fulfillmentStatus: 'delivered', allowedActions: [{ code: 'collect_cod' }] }))).toBe('cash');
    });

    it('never invents a "confirm" step: a COD order without actions is not To deliver', () => {
      expect(workTab(order({ status: 'completed', fulfillmentStatus: 'delivered',
        payment: { method: 'COD', status: 'paid', codState: 'collected' } }))).toBe('done');
    });

    it('keeps a KHQR order whose payment is still pending in Waiting for payment', () => {
      const khqr = order({ channel: 'storefront', payment: { method: 'khqr', status: 'pending', codState: 'not_applicable' } });
      expect(workTab(khqr)).toBe('waiting');
      expect(canMarkOnlineDelivered(khqr)).toBe(false);
    });

    it('puts a KHQR order paid but not delivered in To deliver, and never in Cash to collect', () => {
      const paid = order({ channel: 'storefront', payment: { method: 'khqr', status: 'completed', codState: 'not_applicable' } });
      expect(workTab(paid)).toBe('deliver');
      expect(canMarkOnlineDelivered(paid)).toBe(true);
      expect(workTab({ ...paid, status: 'completed', fulfillmentStatus: 'delivered' })).toBe('done');
    });

    it('keeps an unfinished order without actions under To deliver, not Done', () => {
      expect(workTab(order({ fulfillmentStatus: 'unfulfilled' }))).toBe('deliver');
      expect(workTab(order({ channel: 'pos', status: 'completed', payment: { method: 'cash', status: 'completed' } }))).toBe('done');
    });

    it('counts every order in exactly one tab', () => {
      const counts = countByTab([
        order({ allowedActions: [{ code: 'delivered' }] }),
        order({ status: 'cancelled' }),
        order({ channel: 'storefront', payment: { method: 'khqr', status: 'pending' } }),
      ]);
      expect(counts).toEqual({ deliver: 1, cash: 0, waiting: 1, problems: 0, done: 0, cancelled: 1 });
    });
  });

  describe('paymentKind', () => {
    it('says "paid" only when Commerce recorded the payment as paid', () => {
      expect(paymentKind(order({ payment: { method: 'khqr', status: 'pending' } }))).toBe('online_waiting');
      expect(paymentKind(order({ payment: { method: 'khqr', status: 'completed' } }))).toBe('online_paid');
      expect(paymentKind(order({ payment: { method: 'cutluy', status: 'paid' } }))).toBe('online_paid');
      expect(paymentKind(order({ payment: { method: 'khqr', status: 'failed' } }))).toBe('online_failed');
    });

    it('reads cash on delivery from the COD state', () => {
      expect(paymentKind(order())).toBe('cod_due');
      expect(paymentKind(order({ payment: { method: 'COD', status: 'paid', codState: 'collected' } }))).toBe('cod_collected');
      expect(paymentKind(order({ payment: { method: 'COD', status: 'refunded', codState: 'refunded' } }))).toBe('cod_refunded');
    });

    it('handles orders with no payment record', () => {
      expect(paymentKind(order({ payment: { method: null, status: 'not_recorded' } }))).toBe('none');
    });
  });
});
