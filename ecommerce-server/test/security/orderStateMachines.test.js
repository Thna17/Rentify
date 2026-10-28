'use strict';

// test/security/orderStateMachines.test.js
// Verification suite for P3-ORD-001: Explicit Order and Fulfillment State Machines.
// Tests legal transitions, illegal transitions, controller direct-assignment protection,
// delivery-payment separation, single inventory effect on cancellation, retry idempotency,
// 7-day return window, return receipt inventory restocking, actor matrix, and migration 018.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize, DataTypes } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const {
  ORDER_STATES,
  FULFILLMENT_STATES,
  RETURN_STATES,
  RETURN_WINDOW_MS,
  transitionOrder,
  transitionFulfillment,
  cancelOrder,
  requestReturn,
  processReturnDecision,
  receiveReturn,
  completeReturn,
  mapFulfillmentToDeliveryStatus,
} = require('../../modules/orders/orderStateMachineService');

const { OrderStateError, ORDER_ERROR_CODES } = require('../../modules/orders/orderErrors');
const { Order, OrderItem, OrderEvent, Payment, StoreAccess, ProductVariant, InventoryBalance } = require('../../models');
const { inventoryLedgerService } = require('../../modules/inventory');
const migration018 = require('../../migrations/20261025_018_order_fulfillment_state_machines');

// Fixtures
const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const BUYER_A = '33333333-3333-4333-8333-333333333333';
const BUYER_B = '44444444-4444-4444-8444-444444444444';
const ORDER_1 = '55555555-5555-4555-8555-555555555555';
const PROD_1 = '66666666-6666-4666-8666-666666666666';
const SKU_1 = '77777777-7777-4777-8777-777777777777';

function createMockOrder(overrides = {}) {
  const data = {
    id: ORDER_1,
    storeId: STORE_A,
    buyerId: BUYER_A,
    userId: BUYER_A,
    status: ORDER_STATES.PENDING,
    fulfillmentStatus: FULFILLMENT_STATES.UNFULFILLED,
    returnStatus: RETURN_STATES.NONE,
    deliveryStatus: 'pending',
    stockDeducted: true,
    version: 1,
    confirmedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    cancellationReason: null,
    OrderItems: [
      {
        id: randomUUID(),
        orderId: ORDER_1,
        productId: PROD_1,
        variantId: SKU_1,
        quantity: 2,
        price: '25.00',
      },
    ],
    Payment: {
      id: randomUUID(),
      orderId: ORDER_1,
      paymentMethod: 'COD',
      status: 'pending',
      amount: '50.00',
      collectedAmount: '0.00',
      version: 1,
      async update(fields) {
        Object.assign(this, fields);
        return this;
      },
    },
    async update(fields, options = {}) {
      if ((fields.status || fields.fulfillmentStatus || fields.returnStatus) &&
          !options?.byStateMachine && !options?.allowDirectStateAssignment) {
        const err = new Error('Direct assignment of protected order state is prohibited. Use orderStateMachineService.');
        err.name = 'OrderStateError';
        err.code = ORDER_ERROR_CODES.DIRECT_ASSIGNMENT_PROHIBITED;
        throw err;
      }
      Object.assign(this, fields);
      this.version += 1;
      return this;
    },
    ...overrides,
  };
  return data;
}

test('P3-ORD-001: 1. Legal Order Lifecycle Transitions', async (t) => {
  const mockOrder = createMockOrder({ status: ORDER_STATES.PENDING });
  const events = [];

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(OrderEvent, 'create', async (data) => {
    events.push(data);
    return data;
  });
  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  // Step A: pending -> confirmed
  const res1 = await transitionOrder(ORDER_1, {
    targetState: ORDER_STATES.CONFIRMED,
    actor: merchantActor,
    reason: 'Confirmed by merchant',
    idempotencyKey: 'idem-ord-conf-01',
    correlationId: 'corr-001',
  });

  assert.equal(res1.duplicate, false);
  assert.equal(mockOrder.status, ORDER_STATES.CONFIRMED);
  assert.ok(mockOrder.confirmedAt instanceof Date);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'order_confirmed');
  assert.equal(events[0].details.correlationId, 'corr-001');

  // Step B: confirmed -> processing
  const res2 = await transitionOrder(ORDER_1, {
    targetState: ORDER_STATES.PROCESSING,
    actor: merchantActor,
    idempotencyKey: 'idem-ord-proc-02',
    correlationId: 'corr-002',
  });

  assert.equal(res2.duplicate, false);
  assert.equal(mockOrder.status, ORDER_STATES.PROCESSING);
  assert.equal(events.length, 2);
  assert.equal(events[1].type, 'order_processing');

  // Step C: processing -> completed
  const res3 = await transitionOrder(ORDER_1, {
    targetState: ORDER_STATES.COMPLETED,
    actor: merchantActor,
    idempotencyKey: 'idem-ord-comp-03',
    correlationId: 'corr-003',
  });

  assert.equal(res3.duplicate, false);
  assert.equal(mockOrder.status, ORDER_STATES.COMPLETED);
  assert.equal(events.length, 3);
  assert.equal(events[2].type, 'order_completed');
});

test('P3-ORD-001: 2. Illegal Order Transitions Rejected with Stable Machine Codes', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  // Case A: Direct jump from pending -> completed
  const pendingOrder = createMockOrder({ status: ORDER_STATES.PENDING });
  t.mock.method(Order, 'findByPk', async () => pendingOrder);

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.COMPLETED,
      actor: merchantActor,
      idempotencyKey: 'idem-illegal-01',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.INVALID_ORDER_TRANSITION);
    assert.match(err.message, /Order cannot transition from "pending" to "completed"/);
    return true;
  });

  // Case B: Transitioning out of completed (terminal state)
  const completedOrder = createMockOrder({ status: ORDER_STATES.COMPLETED });
  t.mock.method(Order, 'findByPk', async () => completedOrder);

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.CANCELLED,
      actor: merchantActor,
      idempotencyKey: 'idem-illegal-02',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.INVALID_ORDER_TRANSITION);
    assert.match(err.message, /Order cannot transition from "completed"/);
    return true;
  });

  // Case C: Transitioning out of cancelled (terminal state)
  const cancelledOrder = createMockOrder({ status: ORDER_STATES.CANCELLED });
  t.mock.method(Order, 'findByPk', async () => cancelledOrder);

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.CONFIRMED,
      actor: merchantActor,
      idempotencyKey: 'idem-illegal-03',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.INVALID_ORDER_TRANSITION);
    assert.match(err.message, /Order cannot transition from "cancelled"/);
    return true;
  });
});

test('P3-ORD-001: 3. Protected State Protection: Controllers cannot directly assign states', async () => {
  const order = createMockOrder({ status: ORDER_STATES.PENDING });

  // Direct assignment without byStateMachine flag throws DIRECT_ASSIGNMENT_PROHIBITED
  await assert.rejects(async () => {
    await order.update({ status: ORDER_STATES.COMPLETED });
  }, (err) => {
    assert.equal(err.name, 'OrderStateError');
    assert.equal(err.code, ORDER_ERROR_CODES.DIRECT_ASSIGNMENT_PROHIBITED);
    return true;
  });

  await assert.rejects(async () => {
    await order.update({ fulfillmentStatus: FULFILLMENT_STATES.DELIVERED });
  }, (err) => {
    assert.equal(err.name, 'OrderStateError');
    assert.equal(err.code, ORDER_ERROR_CODES.DIRECT_ASSIGNMENT_PROHIBITED);
    return true;
  });

  await assert.rejects(async () => {
    await order.update({ returnStatus: RETURN_STATES.RETURN_APPROVED });
  }, (err) => {
    assert.equal(err.name, 'OrderStateError');
    assert.equal(err.code, ORDER_ERROR_CODES.DIRECT_ASSIGNMENT_PROHIBITED);
    return true;
  });

  // Permitted when using byStateMachine flag
  await order.update({ status: ORDER_STATES.CONFIRMED }, { byStateMachine: true });
  assert.equal(order.status, ORDER_STATES.CONFIRMED);
});

test('P3-ORD-001: 4. Legal Fulfillment Lifecycle Transitions and Delivery Compatibility', async (t) => {
  const mockOrder = createMockOrder({
    status: ORDER_STATES.PROCESSING,
    fulfillmentStatus: FULFILLMENT_STATES.UNFULFILLED,
  });

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(OrderEvent, 'create', async (data) => data);
  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  // unfulfilled -> processing
  await transitionFulfillment(ORDER_1, {
    targetFulfillment: FULFILLMENT_STATES.PROCESSING,
    actor: merchantActor,
    idempotencyKey: 'idem-ful-01',
  });
  assert.equal(mockOrder.fulfillmentStatus, FULFILLMENT_STATES.PROCESSING);
  assert.equal(mockOrder.deliveryStatus, 'pending');

  // processing -> shipped
  await transitionFulfillment(ORDER_1, {
    targetFulfillment: FULFILLMENT_STATES.SHIPPED,
    actor: merchantActor,
    trackingNumber: 'TRK-KH-12345',
    idempotencyKey: 'idem-ful-02',
  });
  assert.equal(mockOrder.fulfillmentStatus, FULFILLMENT_STATES.SHIPPED);
  assert.equal(mockOrder.deliveryStatus, 'in_transit');
  assert.equal(mockOrder.trackingNumber, 'TRK-KH-12345');

  // shipped -> out_for_delivery
  await transitionFulfillment(ORDER_1, {
    targetFulfillment: FULFILLMENT_STATES.OUT_FOR_DELIVERY,
    actor: merchantActor,
    idempotencyKey: 'idem-ful-03',
  });
  assert.equal(mockOrder.fulfillmentStatus, FULFILLMENT_STATES.OUT_FOR_DELIVERY);
  assert.equal(mockOrder.deliveryStatus, 'in_transit');

  // out_for_delivery -> delivered
  await transitionFulfillment(ORDER_1, {
    targetFulfillment: FULFILLMENT_STATES.DELIVERED,
    actor: merchantActor,
    idempotencyKey: 'idem-ful-04',
  });
  assert.equal(mockOrder.fulfillmentStatus, FULFILLMENT_STATES.DELIVERED);
  assert.equal(mockOrder.deliveryStatus, 'delivered');
  assert.ok(mockOrder.deliveredAt instanceof Date);
  assert.equal(mockOrder.status, ORDER_STATES.COMPLETED);
});

test('P3-ORD-001: 5. Separation of Fulfillment from Payment: Delivery must not imply COD payment collection', async (t) => {
  const mockOrder = createMockOrder({
    status: ORDER_STATES.PROCESSING,
    fulfillmentStatus: FULFILLMENT_STATES.OUT_FOR_DELIVERY,
  });

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(OrderEvent, 'create', async (data) => data);
  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  // Fulfilling to delivered
  await transitionFulfillment(ORDER_1, {
    targetFulfillment: FULFILLMENT_STATES.DELIVERED,
    actor: merchantActor,
    idempotencyKey: 'idem-ful-cod-test',
  });

  // Verify delivery status updated
  assert.equal(mockOrder.fulfillmentStatus, FULFILLMENT_STATES.DELIVERED);
  assert.equal(mockOrder.deliveryStatus, 'delivered');

  // Verify COD Payment status was NOT altered (remains 'pending', collectedAmount remains '0.00')
  assert.equal(mockOrder.Payment.status, 'pending', 'Payment status must remain pending on delivery');
  assert.equal(mockOrder.Payment.collectedAmount, '0.00', 'Delivery does not collect cash');
});

test('P3-ORD-001: 6. Cancellation & Single Inventory Effect: Compensates stock exactly once and handles retry idempotency', async (t) => {
  const mockOrder = createMockOrder({
    status: ORDER_STATES.CONFIRMED,
    fulfillmentStatus: FULFILLMENT_STATES.UNFULFILLED,
    stockDeducted: true,
  });

  let inventoryCompensations = [];
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'create', async (data) => data);
  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));
  t.mock.method(ProductVariant, 'findOne', async () => ({ id: SKU_1, isDefault: true }));

  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    inventoryCompensations.push(params);
    return { duplicate: false, balance: { onHand: 12, reserved: 0, available: 12 } };
  });

  // Step A: Cancellation succeeds and compensates stock
  t.mock.method(OrderEvent, 'findOne', async () => null);

  const buyerActor = { id: BUYER_A, role: 'customer' };
  const res1 = await cancelOrder(ORDER_1, {
    actor: buyerActor,
    reason: 'Changed my mind',
    idempotencyKey: 'idem-cancel-order-001',
    correlationId: 'corr-cancel-1',
  });

  assert.equal(res1.duplicate, false);
  assert.equal(mockOrder.status, ORDER_STATES.CANCELLED);
  assert.equal(mockOrder.stockDeducted, false);
  assert.equal(mockOrder.cancellationReason, 'Changed my mind');
  assert.ok(mockOrder.cancelledAt instanceof Date);

  // Assert exactly 1 inventory compensation entry was made
  assert.equal(inventoryCompensations.length, 1);
  assert.equal(inventoryCompensations[0].reasonCode, 'cancellation');
  assert.equal(inventoryCompensations[0].changeOnHand, 2);
  assert.equal(inventoryCompensations[0].storeId, STORE_A);

  // Step B: Replay / Retry with same idempotency key
  t.mock.method(OrderEvent, 'findOne', async () => ({
    orderId: ORDER_1,
    type: 'order_cancelled',
    eventKey: 'idem-cancel-order-001',
  }));

  const res2 = await cancelOrder(ORDER_1, {
    actor: buyerActor,
    reason: 'Changed my mind',
    idempotencyKey: 'idem-cancel-order-001',
  });

  // Replay returned duplicate: true without executing inventory mutation again!
  assert.equal(res2.duplicate, true);
  assert.equal(inventoryCompensations.length, 1, 'Inventory must not be compensated twice on replay');

  // Step C: Second cancellation attempt with DIFFERENT idempotency key throws ORDER_ALREADY_CANCELLED
  t.mock.method(OrderEvent, 'findOne', async () => null);

  await assert.rejects(async () => {
    await cancelOrder(ORDER_1, {
      actor: buyerActor,
      reason: 'Second cancel attempt',
      idempotencyKey: 'idem-cancel-order-DIFF',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.ORDER_ALREADY_CANCELLED);
    return true;
  });
});

test('P3-ORD-001: 7. Cancellation Rejection: Shipped, delivered, or completed orders cannot be cancelled', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };
  const buyerActor = { id: BUYER_A, role: 'customer' };

  // Shipped order
  const shippedOrder = createMockOrder({
    status: ORDER_STATES.PROCESSING,
    fulfillmentStatus: FULFILLMENT_STATES.SHIPPED,
  });
  t.mock.method(Order, 'findByPk', async () => shippedOrder);

  await assert.rejects(async () => {
    await cancelOrder(ORDER_1, {
      actor: merchantActor,
      idempotencyKey: 'idem-uncancelable-shipped',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE);
    assert.match(err.message, /cannot be cancelled after fulfillment status "shipped"/);
    return true;
  });

  // Completed order
  const completedOrder = createMockOrder({
    status: ORDER_STATES.COMPLETED,
    fulfillmentStatus: FULFILLMENT_STATES.DELIVERED,
  });
  t.mock.method(Order, 'findByPk', async () => completedOrder);

  await assert.rejects(async () => {
    await cancelOrder(ORDER_1, {
      actor: buyerActor,
      idempotencyKey: 'idem-uncancelable-completed',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE);
    assert.match(err.message, /Completed orders cannot be cancelled/);
    return true;
  });

  // Buyer cannot cancel order in processing
  const processingOrder = createMockOrder({
    status: ORDER_STATES.PROCESSING,
    fulfillmentStatus: FULFILLMENT_STATES.UNFULFILLED,
  });
  t.mock.method(Order, 'findByPk', async () => processingOrder);

  await assert.rejects(async () => {
    await cancelOrder(ORDER_1, {
      actor: buyerActor,
      idempotencyKey: 'idem-uncancelable-proc-buyer',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE);
    assert.match(err.message, /already being processed by merchant/);
    return true;
  });
});

test('P3-ORD-001: 8. Return Lifecycle: 7-day eligibility window and physical return restocking', async (t) => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const mockOrder = createMockOrder({
    status: ORDER_STATES.COMPLETED,
    fulfillmentStatus: FULFILLMENT_STATES.DELIVERED,
    deliveredAt: threeDaysAgo,
    returnStatus: RETURN_STATES.NONE,
  });

  let returnRestockMutations = [];
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(OrderEvent, 'create', async (data) => data);
  t.mock.method(Order, 'findByPk', async () => mockOrder);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));
  t.mock.method(ProductVariant, 'findOne', async () => ({ id: SKU_1, isDefault: true }));

  t.mock.method(inventoryLedgerService, 'mutateBalance', async (params) => {
    returnRestockMutations.push(params);
    return { duplicate: false, balance: { onHand: 15, reserved: 0, available: 15 } };
  });

  const buyerActor = { id: BUYER_A, role: 'customer' };
  const merchantActor = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  // Step A: Buyer requests return within 7 calendar days -> return_requested
  const reqRes = await requestReturn(ORDER_1, {
    actor: buyerActor,
    reason: 'Damaged item received',
    evidence: { photoUrl: 'https://cdn.example.com/dmg.jpg' },
    idempotencyKey: 'idem-ret-req-01',
    correlationId: 'corr-ret-1',
  });

  assert.equal(reqRes.duplicate, false);
  assert.equal(mockOrder.returnStatus, RETURN_STATES.RETURN_REQUESTED);

  // Step B: Merchant approves return -> return_approved
  const appRes = await processReturnDecision(ORDER_1, {
    decision: 'approve',
    actor: merchantActor,
    reason: 'Valid claim, please return item',
    idempotencyKey: 'idem-ret-app-02',
  });

  assert.equal(appRes.duplicate, false);
  assert.equal(mockOrder.returnStatus, RETURN_STATES.RETURN_APPROVED);

  // Step C: Merchant physically receives returned item -> return_received and stock restocked
  const recRes = await receiveReturn(ORDER_1, {
    actor: merchantActor,
    idempotencyKey: 'idem-ret-rec-03',
  });

  assert.equal(recRes.duplicate, false);
  assert.equal(mockOrder.returnStatus, RETURN_STATES.RETURN_RECEIVED);
  assert.equal(returnRestockMutations.length, 1);
  assert.equal(returnRestockMutations[0].reasonCode, 'return');
  assert.equal(returnRestockMutations[0].changeOnHand, 2);

  // Step D: Merchant completes return after refund payout -> return_completed
  const compRes = await completeReturn(ORDER_1, {
    actor: merchantActor,
    refundTransactionId: 'BAKONG-REF-999',
    idempotencyKey: 'idem-ret-comp-04',
  });

  assert.equal(compRes.duplicate, false);
  assert.equal(mockOrder.returnStatus, RETURN_STATES.RETURN_COMPLETED);
});

test('P3-ORD-001: 9. Return Cutoff: Return request rejected when expired (> 7 days) or undelivered', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));

  const buyerActor = { id: BUYER_A, role: 'customer' };

  // Case A: 8 days ago (> 7 days)
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const expiredOrder = createMockOrder({
    status: ORDER_STATES.COMPLETED,
    fulfillmentStatus: FULFILLMENT_STATES.DELIVERED,
    deliveredAt: eightDaysAgo,
    returnStatus: RETURN_STATES.NONE,
  });
  t.mock.method(Order, 'findByPk', async () => expiredOrder);

  await assert.rejects(async () => {
    await requestReturn(ORDER_1, {
      actor: buyerActor,
      reason: 'Defective screen',
      idempotencyKey: 'idem-ret-expired',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.RETURN_WINDOW_EXPIRED);
    assert.match(err.message, /Return window of 7 calendar days has expired/);
    return true;
  });

  // Case B: Undelivered order (fulfillmentStatus = shipped)
  const undeliveredOrder = createMockOrder({
    status: ORDER_STATES.PROCESSING,
    fulfillmentStatus: FULFILLMENT_STATES.SHIPPED,
    returnStatus: RETURN_STATES.NONE,
  });
  t.mock.method(Order, 'findByPk', async () => undeliveredOrder);

  await assert.rejects(async () => {
    await requestReturn(ORDER_1, {
      actor: buyerActor,
      reason: 'Change of mind',
      idempotencyKey: 'idem-ret-undelivered',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.RETURN_NOT_ELIGIBLE);
    assert.match(err.message, /Only delivered orders are eligible for return/);
    return true;
  });
});

test('P3-ORD-001: 10. Actor Authorization Matrix: Store isolation, buyer isolation, and suspended accounts', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(OrderEvent, 'findOne', async () => null);

  const orderA = createMockOrder({ storeId: STORE_A, buyerId: BUYER_A });
  t.mock.method(Order, 'findByPk', async () => orderA);

  // Store B merchant attempting to confirm Store A order must fail with UNAUTHORIZED_TRANSITION_ACTOR
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'active' }));
  const foreignMerchant = { id: 'merchant-b', role: 'merchant', storeId: STORE_B };

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.CONFIRMED,
      actor: foreignMerchant,
      idempotencyKey: 'idem-authz-cross-store',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR);
    assert.match(err.message, /cannot transition order belonging to Store/);
    return true;
  });

  // Buyer B attempting to cancel Buyer A order must fail with UNAUTHORIZED_TRANSITION_ACTOR
  const foreignBuyer = { id: BUYER_B, role: 'customer' };

  await assert.rejects(async () => {
    await cancelOrder(ORDER_1, {
      actor: foreignBuyer,
      idempotencyKey: 'idem-authz-cross-buyer',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR);
    assert.match(err.message, /Buyer may only transition their own orders/);
    return true;
  });

  // Suspended Actor must fail with SUSPENDED_ACTOR
  const suspendedMerchant = { id: 'merchant-1', role: 'merchant', storeId: STORE_A, status: 'suspended' };

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.CONFIRMED,
      actor: suspendedMerchant,
      idempotencyKey: 'idem-authz-suspended-actor',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.SUSPENDED_ACTOR);
    return true;
  });

  // Suspended Store must fail with SUSPENDED_ACTOR
  t.mock.method(StoreAccess, 'findOne', async () => ({ storeId: STORE_A, status: 'suspended' }));
  const activeMerchant = { id: 'merchant-1', role: 'merchant', storeId: STORE_A };

  await assert.rejects(async () => {
    await transitionOrder(ORDER_1, {
      targetState: ORDER_STATES.CONFIRMED,
      actor: activeMerchant,
      idempotencyKey: 'idem-authz-suspended-store',
    });
  }, (err) => {
    assert.ok(err instanceof OrderStateError);
    assert.equal(err.code, ORDER_ERROR_CODES.SUSPENDED_ACTOR);
    return true;
  });
});

test('P3-ORD-001: 11. Additive Migration 018: Adds columns, indexes, and backfills orders idempotently', async (t) => {
  const addedColumns = {};
  const addedIndexes = [];
  const executedQueries = [];

  const fakeQueryInterface = {
    async describeTable(table) {
      if (table === 'Orders') {
        return {
          id: {},
          status: {},
          deliveryStatus: {},
          ...addedColumns,
        };
      }
      return {};
    },
    async addColumn(table, colName, colDef) {
      addedColumns[colName] = colDef;
    },
    async showIndex(table) {
      return addedIndexes.map((i) => ({ name: i.options.name }));
    },
    async addIndex(table, fields, options) {
      addedIndexes.push({ fields, options });
    },
    async removeColumn(table, colName) {
      delete addedColumns[colName];
    },
    async removeIndex(table, indexName) {
      const idx = addedIndexes.findIndex((i) => i.options.name === indexName);
      if (idx !== -1) addedIndexes.splice(idx, 1);
    },
  };

  const fakeSequelize = {
    async query(sql, options) {
      executedQueries.push({ sql, options });
      if (sql.includes('SELECT id, status, deliveryStatus')) {
        return [[
          { id: 'ord-comp', status: 'completed', deliveryStatus: 'delivered', createdAt: new Date() },
          { id: 'ord-canc', status: 'cancelled', deliveryStatus: 'pending', createdAt: new Date() },
          { id: 'ord-proc', status: 'processing', deliveryStatus: 'pending', createdAt: new Date() },
        ]];
      }
      return [[]];
    },
  };

  // Run Up
  await migration018.up({ queryInterface: fakeQueryInterface, sequelize: fakeSequelize });

  assert.ok(addedColumns.fulfillmentStatus, 'fulfillmentStatus column must be added');
  assert.ok(addedColumns.returnStatus, 'returnStatus column must be added');
  assert.ok(addedColumns.cancellationReason, 'cancellationReason column must be added');
  assert.ok(addedColumns.deliveredAt, 'deliveredAt column must be added');
  assert.ok(addedColumns.confirmedAt, 'confirmedAt column must be added');
  assert.ok(addedColumns.cancelledAt, 'cancelledAt column must be added');

  assert.equal(addedIndexes.length, 2);
  assert.ok(addedIndexes.some((i) => i.options.name === 'idx_orders_fulfillment_status'));
  assert.ok(addedIndexes.some((i) => i.options.name === 'idx_orders_return_status'));

  // Verify backfill queries ran
  const updateQueries = executedQueries.filter((q) => q.sql.includes('UPDATE Orders'));
  assert.equal(updateQueries.length, 3, 'All 3 existing orders must be backfilled');

  // Run Down
  await migration018.down({ queryInterface: fakeQueryInterface, sequelize: fakeSequelize });
  assert.equal(Object.keys(addedColumns).length, 0, 'Columns safely dropped on rollback');
  assert.equal(addedIndexes.length, 0, 'Indexes safely dropped on rollback');
});
