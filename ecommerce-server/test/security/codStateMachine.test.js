'use strict';

// test/security/codStateMachine.test.js
// Exhaustive verification of P3-COD-001 Cash On Delivery (COD) payment & refund state machine.
// Verifies legal transitions, decoupled states, idempotency, math limits, evidence requirements,
// merchant liability, non-custody, and ledger reconciliation.

if (!process.env.DB_PORT) process.env.DB_PORT = '3308';
if (!process.env.DB_USER) process.env.DB_USER = 'root';
if (process.env.DB_PASSWORD === undefined || process.env.DB_PASSWORD === 'Hangbrathna10') process.env.DB_PASSWORD = '';
if (!process.env.DB_NAME || process.env.DB_NAME === 'ecommerce_db') process.env.DB_NAME = 'rentify_ecommerce_test';

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize } = require('../../config/db');
const { Order, Payment, OrderEvent, StoreAccess } = require('../../models');
const {
  codStateMachineService,
  COD_ERROR_CODES,
  CodStateError,
} = require('../../modules/payments');
const {
  COD_STATES,
  LEGAL_TRANSITIONS,
  ALLOWED_COLLECTION_METHODS,
  ALLOWED_REFUND_METHODS,
  collectCodPayment,
  refundCodPayment,
  failCodPayment,
  cancelCodPayment,
  reconcileCodPayment,
} = codStateMachineService;

// Test fixtures helper
async function createOrderFixture({
  amount = '50.00',
  currency = 'USD',
  deliveryStatus = 'pending',
  orderStatus = 'pending',
  initialPaymentStatus = COD_STATES.PENDING,
  initialCollected = '0.00',
  initialRefunded = '0.00',
} = {}) {
  const storeId = randomUUID();
  const orderId = randomUUID();
  const actorId = randomUUID();
  const buyerId = randomUUID();

  // Create store access
  await StoreAccess.create({
    storeId,
    ownerUserId: actorId,
    primaryCategory: 'crafts',
    marketplaceApprovalStatus: 'approved',
    status: 'active',
  }).catch(() => {});

  // Create order
  const order = await Order.create({
    id: orderId,
    orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    storeId,
    buyerId,
    salesChannel: 'marketplace',
    deliveryStatus,
    status: orderStatus,
    subtotal: amount,
    totalAmount: amount,
    shippingFee: 0,
    currency,
    checkoutKey: `chk-${randomUUID()}`,
  });

  // Create payment
  const payment = await Payment.create({
    id: randomUUID(),
    orderId,
    storeId,
    amount,
    currency,
    paymentMethod: 'COD',
    status: initialPaymentStatus,
    collectedAmount: initialCollected,
    refundedAmount: initialRefunded,
  });

  return { storeId, orderId, actorId, buyerId, order, payment, amount, currency };
}

async function cleanupFixture({ storeId, orderId }) {
  try {
    await OrderEvent.destroy({ where: { orderId } });
    await Payment.destroy({ where: { orderId } });
    await Order.destroy({ where: { id: orderId } });
    if (storeId) {
      await StoreAccess.destroy({ where: { storeId } }).catch(() => {});
    }
  } catch {
    // Ignore cleanup errors
  }
}

test('COD constants and transitions are well-defined and frozen', () => {
  assert.equal(COD_STATES.PENDING, 'pending');
  assert.equal(COD_STATES.COLLECTED, 'collected');
  assert.equal(COD_STATES.PARTIALLY_REFUNDED, 'partially_refunded');
  assert.equal(COD_STATES.REFUNDED, 'refunded');
  assert.equal(COD_STATES.FAILED, 'failed');
  assert.equal(COD_STATES.CANCELLED, 'cancelled');

  assert.deepEqual(ALLOWED_COLLECTION_METHODS, ['cash', 'courier_cod', 'merchant_cod']);
  assert.deepEqual(ALLOWED_REFUND_METHODS, ['cash', 'bakong']);

  assert.ok(Array.isArray(LEGAL_TRANSITIONS[COD_STATES.PENDING]));
  assert.ok(Array.isArray(LEGAL_TRANSITIONS[COD_STATES.COLLECTED]));
  assert.ok(Array.isArray(LEGAL_TRANSITIONS[COD_STATES.PARTIALLY_REFUNDED]));
  assert.deepEqual(LEGAL_TRANSITIONS[COD_STATES.REFUNDED], []);
  assert.deepEqual(LEGAL_TRANSITIONS[COD_STATES.CANCELLED], []);
});

test('Legal transition: pending -> collected with physical cash evidence', async () => {
  const fixture = await createOrderFixture({ amount: '45.00' });
  const { storeId, orderId, actorId } = fixture;
  const eventKey = randomUUID();

  try {
    const res = await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey,
      amount: '45.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-12345', voucherNumber: 'V-001' },
      notes: 'Customer paid exact cash',
    });

    assert.equal(res.duplicate, false);
    assert.equal(res.payment.status, COD_STATES.COLLECTED);
    assert.equal(res.payment.collectedAmount, '45.00');
    assert.equal(res.payment.collectorId, actorId);
    assert.ok(res.payment.collectedAt);
    assert.ok(res.payment.paidAt);

    // Non-custody and merchant liability invariant
    assert.equal(res.payment.transactionData.collection.liabilityParty, 'merchant');
    assert.equal(res.payment.transactionData.collection.escrowClaimed, false);
    assert.equal(res.payment.transactionData.collection.evidence.receiptRef, 'REC-12345');

    // Immutable OrderEvent verification
    assert.equal(res.event.type, 'collect_cod');
    assert.equal(res.event.amount, '45.00');
    assert.equal(res.event.details.liabilityParty, 'merchant');
    assert.equal(res.event.details.escrowClaimed, false);
    assert.equal(res.event.details.newStatus, COD_STATES.COLLECTED);
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Legal transition: pending -> collected with courier reference', async () => {
  const fixture = await createOrderFixture({ amount: '20.00' });
  const { storeId, orderId, actorId } = fixture;
  const eventKey = randomUUID();

  try {
    const res = await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey,
      amount: '20.00',
      method: 'courier_cod',
      evidence: { courierReference: 'CR-VET-98765' },
    });

    assert.equal(res.payment.status, COD_STATES.COLLECTED);
    assert.equal(res.payment.transactionData.collection.method, 'courier_cod');
    assert.equal(res.payment.transactionData.collection.evidence.courierReference, 'CR-VET-98765');
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Legal transitions: partial refunds accumulate safely and transition to refunded upon full amount', async () => {
  const fixture = await createOrderFixture({ amount: '100.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    // 1. Collect 100.00
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '100.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-100' },
    });

    // 2. First partial refund: 30.00 with cash voucher
    const refund1 = await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '30.00',
      method: 'cash',
      evidence: { voucherNumber: 'VOUCH-001' },
      reason: 'Damaged item line 1',
    });

    assert.equal(refund1.payment.status, COD_STATES.PARTIALLY_REFUNDED);
    assert.equal(refund1.payment.refundedAmount, '30.00');
    assert.equal(refund1.event.details.cumulativeRefunded, '30.00');
    assert.equal(refund1.event.details.liabilityParty, 'merchant');
    assert.equal(refund1.event.details.escrowClaimed, false);

    // 3. Second partial refund: 40.00 with Bakong transfer ref
    const refund2 = await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '40.00',
      method: 'bakong',
      evidence: { transferRef: 'BAKONG-TXN-777888' },
      reason: 'Out of stock item line 2',
    });

    assert.equal(refund2.payment.status, COD_STATES.PARTIALLY_REFUNDED);
    assert.equal(refund2.payment.refundedAmount, '70.00');
    assert.equal(refund2.event.details.cumulativeRefunded, '70.00');

    // 4. Final partial refund: 30.00 completing 100.00 -> status transitions to refunded
    const refund3 = await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '30.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-FINAL-30' },
      reason: 'Return balance',
    });

    assert.equal(refund3.payment.status, COD_STATES.REFUNDED);
    assert.equal(refund3.payment.refundedAmount, '100.00');
    assert.equal(refund3.event.details.newStatus, COD_STATES.REFUNDED);

    // Verify refund history array stored in transactionData
    const updatedPayment = await Payment.findOne({ where: { orderId } });
    assert.equal(updatedPayment.transactionData.refunds.length, 3);
    assert.equal(updatedPayment.transactionData.refunds[0].amount, '30.00');
    assert.equal(updatedPayment.transactionData.refunds[1].amount, '40.00');
    assert.equal(updatedPayment.transactionData.refunds[2].amount, '30.00');
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Legal transition: collected -> refunded directly on full refund', async () => {
  const fixture = await createOrderFixture({ amount: '60.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '60.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-60' },
    });

    const refund = await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '60.00',
      method: 'bakong',
      evidence: { transactionHash: '0xabc123456789' },
      reason: 'Full order return',
    });

    assert.equal(refund.payment.status, COD_STATES.REFUNDED);
    assert.equal(refund.payment.refundedAmount, '60.00');
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Legal transition: pending -> failed and pending -> cancelled', async () => {
  const fixture1 = await createOrderFixture({ amount: '25.00' });
  const fixture2 = await createOrderFixture({ amount: '35.00' });

  try {
    // failCodPayment
    const failRes = await failCodPayment({
      orderId: fixture1.orderId,
      storeId: fixture1.storeId,
      actorId: fixture1.actorId,
      eventKey: randomUUID(),
      reason: 'Customer refused delivery',
    });
    assert.equal(failRes.payment.status, COD_STATES.FAILED);
    assert.equal(failRes.event.type, 'fail_cod');

    // cancelCodPayment
    const cancelRes = await cancelCodPayment({
      orderId: fixture2.orderId,
      storeId: fixture2.storeId,
      actorId: fixture2.actorId,
      eventKey: randomUUID(),
      reason: 'Buyer cancelled before dispatch',
    });
    assert.equal(cancelRes.payment.status, COD_STATES.CANCELLED);
    assert.equal(cancelRes.event.type, 'cancel_cod');
  } finally {
    await cleanupFixture(fixture1);
    await cleanupFixture(fixture2);
  }
});

test('Decoupled states invariant: delivery never automatically collects payment', async () => {
  const fixture = await createOrderFixture({ amount: '80.00', deliveryStatus: 'pending' });
  const { orderId } = fixture;

  try {
    // Simulate order delivery fulfillment
    await fixture.order.update({
      deliveryStatus: 'delivered',
      fulfillmentStatus: 'delivered',
      deliveredAt: new Date(),
    }, { byStateMachine: true });

    // Payment must remain strictly pending
    const payment = await Payment.findOne({ where: { orderId } });
    assert.equal(payment.status, COD_STATES.PENDING);
    assert.equal(Number(payment.collectedAmount), 0);
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Decoupled states invariant: return request never means refund executed', async () => {
  const fixture = await createOrderFixture({
    amount: '50.00',
    initialPaymentStatus: COD_STATES.COLLECTED,
    initialCollected: '50.00',
  });
  const { orderId } = fixture;

  try {
    // Simulate return request approval on order
    await fixture.order.update({
      returnStatus: 'approved',
    }, { byStateMachine: true });

    // Payment remains collected; NO refund is executed without confirmed merchant payout evidence
    const payment = await Payment.findOne({ where: { orderId } });
    assert.equal(payment.status, COD_STATES.COLLECTED);
    assert.equal(Number(payment.refundedAmount), 0);
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Illegal transition: cannot refund uncollected COD payment', async () => {
  const fixture = await createOrderFixture({ amount: '30.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '10.00',
        method: 'cash',
        evidence: { receiptRef: 'REF-001' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.UNCOLLECTED_PAYMENT);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Illegal transition: cannot collect already collected payment', async () => {
  const fixture = await createOrderFixture({ amount: '40.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '40.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-1' },
    });

    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '40.00',
        method: 'cash',
        evidence: { receiptRef: 'REC-2' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.ALREADY_COLLECTED);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Illegal transition: cannot refund once already fully refunded', async () => {
  const fixture = await createOrderFixture({ amount: '25.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '25.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-25' },
    });

    await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '25.00',
      method: 'cash',
      evidence: { voucherNumber: 'V-25' },
    });

    // Attempt refunding after fully refunded
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '5.00',
        method: 'cash',
        evidence: { voucherNumber: 'V-EXTRA' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.ALREADY_FULLY_REFUNDED);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Illegal transitions: cannot fail or cancel collected payment', async () => {
  const fixture = await createOrderFixture({ amount: '50.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '50.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-50' },
    });

    await assert.rejects(
      failCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        reason: 'Failed delivery',
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.CANNOT_FAIL_COLLECTED);
        return true;
      }
    );

    await assert.rejects(
      cancelCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        reason: 'Cancelled',
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.CANNOT_CANCEL_COLLECTED);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Evidence requirements: collection evidence is strictly mandatory', async () => {
  const fixture = await createOrderFixture({ amount: '30.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    // Missing evidence
    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '30.00',
        method: 'cash',
        evidence: null,
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.EVIDENCE_REQUIRED);
        return true;
      }
    );

    // Empty string evidence
    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '30.00',
        method: 'cash',
        evidence: '   ',
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.EVIDENCE_REQUIRED);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Evidence requirements: refund requires confirmed payout evidence per method', async () => {
  const fixture = await createOrderFixture({ amount: '70.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '70.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-70' },
    });

    // Cash refund missing receipt/voucher
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '10.00',
        method: 'cash',
        evidence: {},
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.PAYOUT_EVIDENCE_REQUIRED);
        return true;
      }
    );

    // Bakong refund missing transactionHash/transferRef
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '10.00',
        method: 'bakong',
        evidence: { notes: 'Paid via bank' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.PAYOUT_EVIDENCE_REQUIRED);
        return true;
      }
    );

    // Unsupported refund method (e.g. credit card / cutluy)
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '10.00',
        method: 'credit_card',
        evidence: { txnId: 'cc-123' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.INVALID_METHOD);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Amount math limits: collected amount must match amount due exactly', async () => {
  const fixture = await createOrderFixture({ amount: '50.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    // Underpayment
    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '40.00',
        method: 'cash',
        evidence: { receiptRef: 'REC-40' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.INVALID_AMOUNT);
        return true;
      }
    );

    // Overpayment
    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '60.00',
        method: 'cash',
        evidence: { receiptRef: 'REC-60' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.INVALID_AMOUNT);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Amount math limits: refund cannot exceed collected amount', async () => {
  const fixture = await createOrderFixture({ amount: '50.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '50.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-50' },
    });

    // Exceeds total collected
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '50.01',
        method: 'cash',
        evidence: { receiptRef: 'REF-OVER' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.REFUND_EXCEEDS_COLLECTED);
        return true;
      }
    );

    // Partial refund of 30.00
    await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '30.00',
      method: 'cash',
      evidence: { receiptRef: 'REF-30' },
    });

    // Subsequent refund of 25.00 exceeds remaining 20.00
    await assert.rejects(
      refundCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: randomUUID(),
        amount: '25.00',
        method: 'cash',
        evidence: { receiptRef: 'REF-EXCEED-REMAINING' },
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.REFUND_EXCEEDS_COLLECTED);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Idempotency and Replay: identical retries have exactly one effect', async () => {
  const fixture = await createOrderFixture({ amount: '40.00' });
  const { storeId, orderId, actorId } = fixture;
  const collectionKey = randomUUID();
  const collectedAt = new Date('2026-10-25T12:00:00Z');

  try {
    // Initial call
    const res1 = await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: collectionKey,
      amount: '40.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-IDEM' },
      collectedAt,
    });
    assert.equal(res1.duplicate, false);

    // Exact replay with same eventKey and payload
    const res2 = await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: collectionKey,
      amount: '40.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-IDEM' },
      collectedAt,
    });
    assert.equal(res2.duplicate, true);
    assert.equal(res2.payment.status, COD_STATES.COLLECTED);

    // Only 1 OrderEvent should exist for this key
    const count = await OrderEvent.count({ where: { eventKey: collectionKey } });
    assert.equal(count, 1);

    // Replay with DIFFERENT parameters throws IDEMPOTENCY_CONFLICT (409)
    await assert.rejects(
      collectCodPayment({
        orderId,
        storeId,
        actorId,
        eventKey: collectionKey,
        amount: '40.00',
        method: 'courier_cod', // Mismatched method
        evidence: { receiptRef: 'REC-DIFFERENT' },
        collectedAt,
      }),
      (err) => {
        assert.ok(err instanceof CodStateError);
        assert.equal(err.code, COD_ERROR_CODES.IDEMPOTENCY_CONFLICT);
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  } finally {
    await cleanupFixture(fixture);
  }
});

test('Ledger reconciliation: reconcileCodPayment mathematically audits collection and refund events', async () => {
  const fixture = await createOrderFixture({ amount: '120.00' });
  const { storeId, orderId, actorId } = fixture;

  try {
    // 1. Initial reconciliation before collection
    const report0 = await reconcileCodPayment(orderId);
    assert.equal(report0.reconciled, true);
    assert.equal(report0.status, COD_STATES.PENDING);
    assert.equal(report0.paymentCollected, '0.00');
    assert.equal(report0.eventsCollected, '0.00');
    assert.equal(report0.paymentRefunded, '0.00');
    assert.equal(report0.eventsRefunded, '0.00');
    assert.equal(report0.netCollected, '0.00');

    // 2. Collect 120.00
    await collectCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '120.00',
      method: 'cash',
      evidence: { receiptRef: 'REC-120' },
    });

    const report1 = await reconcileCodPayment(orderId);
    assert.equal(report1.reconciled, true);
    assert.equal(report1.status, COD_STATES.COLLECTED);
    assert.equal(report1.paymentCollected, '120.00');
    assert.equal(report1.eventsCollected, '120.00');
    assert.equal(report1.netCollected, '120.00');

    // 3. Partial refund: 45.00
    await refundCodPayment({
      orderId,
      storeId,
      actorId,
      eventKey: randomUUID(),
      amount: '45.00',
      method: 'bakong',
      evidence: { transactionHash: '0x9999' },
    });

    const report2 = await reconcileCodPayment(orderId);
    assert.equal(report2.reconciled, true);
    assert.equal(report2.status, COD_STATES.PARTIALLY_REFUNDED);
    assert.equal(report2.paymentRefunded, '45.00');
    assert.equal(report2.eventsRefunded, '45.00');
    assert.equal(report2.netCollected, '75.00');

    // 4. Injected tampering: modify Payment record directly and verify reconciliation catches discrepancy
    await Payment.update(
      { collectedAmount: '150.00' },
      { where: { orderId } }
    );

    const reportTampered = await reconcileCodPayment(orderId);
    assert.equal(reportTampered.reconciled, false);
    assert.ok(reportTampered.discrepancies.length > 0);
    assert.ok(reportTampered.discrepancies.some((d) => d.includes('Collected discrepancy')));
  } finally {
    await cleanupFixture(fixture);
  }
});
