import { describe, it, expect } from 'vitest';
import { classifyOrder } from './OrderManagement';

describe('MR2 · Orders Inbox (Screens M3, M4, M4b, M5)', () => {
  describe('Work-state Classification (classifyOrder)', () => {
    it('classifies cancelled orders into cancelled tab', () => {
      const order = { status: 'cancelled', fulfillmentStatus: 'cancelled' };
      expect(classifyOrder(order)).toBe('cancelled');
    });

    it('classifies orders with reports or failed delivery into problems tab', () => {
      const orderWithReport = {
        status: 'processing',
        fulfillmentStatus: 'processing',
        reports: [{ id: 'rep-1', type: 'return_requested' }],
      };
      expect(classifyOrder(orderWithReport)).toBe('problems');

      const orderFailedDelivery = {
        status: 'processing',
        fulfillmentStatus: 'failed',
        reports: [],
      };
      expect(classifyOrder(orderFailedDelivery)).toBe('problems');
    });

    it('classifies new orders into confirm tab', () => {
      const order = { status: 'pending', fulfillmentStatus: 'pending', reports: [] };
      expect(classifyOrder(order)).toBe('confirm');
    });

    it('classifies confirmed and dispatched orders into deliver tab', () => {
      const confirmedOrder = { status: 'processing', fulfillmentStatus: 'confirmed', reports: [] };
      expect(classifyOrder(confirmedOrder)).toBe('deliver');

      const dispatchedOrder = { status: 'processing', fulfillmentStatus: 'dispatched', reports: [] };
      expect(classifyOrder(dispatchedOrder)).toBe('deliver');
    });

    it('classifies delivered COD orders into cash tab', () => {
      const codOrder = {
        status: 'delivered',
        fulfillmentStatus: 'delivered',
        payment: { method: 'cod', status: 'pending', codState: 'pending' },
        reports: [],
      };
      expect(classifyOrder(codOrder)).toBe('cash');
    });

    it('DEC-029: KHQR-paid orders NEVER go into cash tab when delivered', () => {
      const khqrOrder = {
        status: 'delivered',
        fulfillmentStatus: 'delivered',
        payment: { method: 'khqr', status: 'paid', codState: 'none' },
        reports: [],
      };
      // Must go straight to 'done' since online payment was confirmed at checkout
      expect(classifyOrder(khqrOrder)).toBe('done');
      expect(classifyOrder(khqrOrder)).not.toBe('cash');
    });

    it('classifies completed orders into done tab', () => {
      const completedOrder = {
        status: 'completed',
        fulfillmentStatus: 'delivered',
        payment: { method: 'cod', status: 'collected', codState: 'collected' },
        reports: [],
      };
      expect(classifyOrder(completedOrder)).toBe('done');
    });
  });
});
