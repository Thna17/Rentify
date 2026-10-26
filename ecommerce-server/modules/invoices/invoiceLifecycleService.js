// modules/invoices/invoiceLifecycleService.js
// P4-INV-001: Authoritative invoice and quote lifecycle service.
// Enforces:
// 1. Quote vs. Invoice vs. Order domain semantics.
// 2. Strict legal state transitions and state machine validation.
// 3. Canonical stock reservation and deduction timing.
// 4. Non-double-deduction invariants across omnichannel and POS orders.
// 5. Stock replenishment on refund/cancellation.
// 6. Payment/receipt evidence tracking.
// 7. Separation from Rentify subscription invoices.

const { Invoice, Order, OrderItem, Payment, Product, ProductVariant, StoreAccess, WebsiteData, Customer } = require('../../models');
const { changeStock } = require('../inventory').sharedStockService;
const { sequelize } = require('../../config/db');

// Authoritative Invoice Lifecycle States
const INVOICE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  VOID: 'void',
  REFUNDED: 'refunded',
});

// Legal State Transition Matrix
const LEGAL_TRANSITIONS = Object.freeze({
  [INVOICE_STATUSES.DRAFT]: [
    INVOICE_STATUSES.SENT,
    INVOICE_STATUSES.CANCELLED,
    INVOICE_STATUSES.VOID,
  ],
  [INVOICE_STATUSES.SENT]: [
    INVOICE_STATUSES.PAID,
    INVOICE_STATUSES.PARTIALLY_PAID,
    INVOICE_STATUSES.OVERDUE,
    INVOICE_STATUSES.CANCELLED,
    INVOICE_STATUSES.VOID,
  ],
  [INVOICE_STATUSES.PENDING]: [
    INVOICE_STATUSES.SENT,
    INVOICE_STATUSES.PAID,
    INVOICE_STATUSES.PARTIALLY_PAID,
    INVOICE_STATUSES.OVERDUE,
    INVOICE_STATUSES.CANCELLED,
    INVOICE_STATUSES.VOID,
  ],
  [INVOICE_STATUSES.PARTIALLY_PAID]: [
    INVOICE_STATUSES.PAID,
    INVOICE_STATUSES.CANCELLED,
    INVOICE_STATUSES.VOID,
  ],
  [INVOICE_STATUSES.OVERDUE]: [
    INVOICE_STATUSES.PAID,
    INVOICE_STATUSES.PARTIALLY_PAID,
    INVOICE_STATUSES.CANCELLED,
    INVOICE_STATUSES.VOID,
  ],
  [INVOICE_STATUSES.PAID]: [
    INVOICE_STATUSES.REFUNDED,
  ],
  [INVOICE_STATUSES.CANCELLED]: [], // Terminal state
  [INVOICE_STATUSES.VOID]: [],      // Terminal state
  [INVOICE_STATUSES.REFUNDED]: [],  // Terminal state
});

function canTransition(currentStatus, targetStatus) {
  if (!currentStatus || !targetStatus) return false;
  if (currentStatus === targetStatus) return true; // Idempotent no-op
  const allowed = LEGAL_TRANSITIONS[currentStatus];
  return Array.isArray(allowed) && allowed.includes(targetStatus);
}

function generateInvoiceNumber(prefix = 'INV') {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function parseDecimal(val, fallback = 0) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
}

/**
 * Creates a non-binding Quote for a customer.
 * Invariant: Quotes produce ZERO stock reservation and ZERO stock deduction.
 */
async function createQuote({
  storeId,
  websiteId,
  customerInfo = {},
  items = [],
  currency = 'USD',
  notes = '',
  expiryDays = 14,
  staffId = null,
}) {
  if (!storeId && !websiteId) {
    const err = new Error('storeId or websiteId is required to create a quote');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Quote must contain at least one line item');
    err.statusCode = 400;
    throw err;
  }

  // Calculate pricing snapshot
  let subtotal = 0;
  const quoteItems = [];
  for (const item of items) {
    const product = await Product.findByPk(item.productId);
    if (!product) {
      const err = new Error(`Product ${item.productId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const variant = item.variantId ? await ProductVariant.findByPk(item.variantId) : null;
    const unitPrice = parseDecimal(item.price ?? (variant?.price || product.price || 0));
    const qty = parseInt(item.quantity, 10) || 1;
    const lineTotal = parseDecimal(unitPrice * qty);
    subtotal += lineTotal;

    quoteItems.push({
      productId: product.id,
      variantId: variant?.id || null,
      name: variant ? `${product.name} (${variant.title || variant.sku})` : product.name,
      sku: variant?.sku || product.sku || '',
      price: unitPrice,
      quantity: qty,
      total: lineTotal,
    });
  }

  const quoteNumber = generateInvoiceNumber('QTE');
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + expiryDays);

  // Quotes are stored as draft invoices tagged as quotes
  const quote = {
    id: `qte-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    quoteNumber,
    isQuote: true,
    invoiceDomain: 'merchant_commerce', // Distinct from Rentify subscription invoices
    storeId: storeId || null,
    websiteId: websiteId || null,
    status: INVOICE_STATUSES.DRAFT,
    customerName: customerInfo.name || 'Valued Customer',
    customerEmail: customerInfo.email || null,
    customerPhone: customerInfo.phone || null,
    subtotal: parseDecimal(subtotal),
    tax: 0,
    discount: 0,
    total: parseDecimal(subtotal),
    currency,
    items: quoteItems,
    notes,
    createdBy: staffId,
    expiresAt: expiryDate.toISOString(),
    createdAt: new Date().toISOString(),
    stockEffect: 'NONE', // Explains clearly: non-binding, zero stock deducted or reserved
  };

  return quote;
}

/**
 * Creates a formal commercial Invoice.
 * If immediate payment is selected (e.g. at POS counter), stock is deducted.
 * If deferred payment (sent / pending), stock is NOT deducted until payment confirmation.
 */
async function createInvoice({
  storeId,
  websiteId,
  customerInfo = {},
  items = [],
  paymentMethod = 'cash',
  isImmediatePayment = false,
  dueDate = null,
  currency = 'USD',
  notes = '',
  staffId = null,
  transaction: existingTx = null,
}) {
  if (!storeId && !websiteId) {
    const err = new Error('storeId or websiteId is required to create an invoice');
    err.statusCode = 400;
    throw err;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Invoice must contain at least one line item');
    err.statusCode = 400;
    throw err;
  }

  const tx = existingTx || (await sequelize.transaction());
  const isInternalTx = !existingTx;

  try {
    // 1. Calculate items subtotal and snapshot
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction: tx });
      if (!product) {
        const err = new Error(`Product ${item.productId} not found`);
        err.statusCode = 404;
        throw err;
      }
      const variant = item.variantId ? await ProductVariant.findByPk(item.variantId, { transaction: tx }) : null;
      const unitPrice = parseDecimal(item.price ?? (variant?.price || product.price || 0));
      const qty = parseInt(item.quantity, 10) || 1;
      const lineTotal = parseDecimal(unitPrice * qty);
      subtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        variantId: variant?.id || null,
        name: variant ? `${product.name} (${variant.title || variant.sku})` : product.name,
        sku: variant?.sku || product.sku || '',
        price: unitPrice,
        quantity: qty,
        total: lineTotal,
        trackInventory: variant ? variant.trackInventory : product.trackInventory,
      });
    }

    const totalAmount = parseDecimal(subtotal);
    const invoiceNumber = generateInvoiceNumber('INV');
    const orderNumber = generateInvoiceNumber('ORD-INV');

    // 2. Create canonical Order record
    const order = await Order.create({
      storeId: storeId || null,
      websiteId: websiteId || null,
      orderNumber,
      orderType: 'manual',
      salesChannel: 'invoice',
      status: isImmediatePayment ? 'completed' : 'pending',
      deliveryStatus: isImmediatePayment ? 'delivered' : 'pending',
      stockDeducted: isImmediatePayment,
      customerInfo,
      currency,
      subtotal: totalAmount,
      totalAmount,
      notes,
    }, { transaction: tx });

    // 3. Create OrderItems
    for (const item of validatedItems) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        sku: item.sku,
        name: item.name,
      }, { transaction: tx });
    }

    // 4. Update inventory if immediate payment
    if (isImmediatePayment) {
      for (const item of validatedItems) {
        if (item.trackInventory) {
          await changeStock(item.productId, -item.quantity, tx, item.variantId);
        }
      }
    }

    // 5. Create Payment record
    const payment = await Payment.create({
      orderId: order.id,
      amount: totalAmount,
      paymentMethod: String(paymentMethod).toUpperCase(),
      status: isImmediatePayment ? 'completed' : 'pending',
      currency,
      transactionData: {
        method: paymentMethod,
        invoiceNumber,
        recordedBy: staffId || 'staff',
        recordedAt: new Date().toISOString(),
      },
    }, { transaction: tx });

    // 6. Create authoritative Invoice record
    const invoiceStatus = isImmediatePayment ? INVOICE_STATUSES.PAID : INVOICE_STATUSES.SENT;
    const invoice = await Invoice.create({
      storeId: storeId || null,
      websiteId: websiteId || null,
      orderId: order.id,
      paymentId: payment.id,
      invoiceNumber,
      dueDate: dueDate || null,
      status: invoiceStatus,
      notes,
    }, { transaction: tx });

    if (isInternalTx) await tx.commit();

    return {
      success: true,
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      order: order.toJSON ? order.toJSON() : order,
      payment: payment.toJSON ? payment.toJSON() : payment,
      items: validatedItems,
      stockDeducted: isImmediatePayment,
      stockEffect: isImmediatePayment ? 'DEDUCTED' : 'AWAITING_PAYMENT',
    };
  } catch (error) {
    if (isInternalTx && tx) {
      try { await tx.rollback(); } catch {}
    }
    throw error;
  }
}

/**
 * Records payment against an issued invoice.
 * STRICT NON-DOUBLE-DEDUCTION INVARIANT:
 * If order.stockDeducted is already true (e.g. from POS or previous settlement),
 * stock deduction is SKIPPED. Stock is decremented if and only if !order.stockDeducted.
 */
async function recordPayment({
  invoiceId,
  storeId,
  paymentMethod = 'cash',
  transactionReference = '',
  amountPaid = null,
  staffId = null,
  transaction: existingTx = null,
}) {
  const tx = existingTx || (await sequelize.transaction());
  const isInternalTx = !existingTx;

  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: Order,
          include: [{ model: OrderItem, include: [Product] }],
        },
        { model: Payment },
      ],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (storeId && invoice.storeId && invoice.storeId !== storeId) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    // State machine check
    if (invoice.status === INVOICE_STATUSES.PAID) {
      // Idempotent replay: already paid, do not re-deduct stock or re-charge
      if (isInternalTx) await tx.commit();
      return {
        success: true,
        idempotentReplay: true,
        message: 'Invoice is already marked as paid',
        invoice: invoice.toJSON ? invoice.toJSON() : invoice,
        stockDeducted: false,
      };
    }

    if (!canTransition(invoice.status, INVOICE_STATUSES.PAID)) {
      const err = new Error(`Cannot record payment on invoice with status "${invoice.status}"`);
      err.statusCode = 409;
      throw err;
    }

    const order = invoice.Order;
    if (!order) {
      const err = new Error('Associated Order record missing');
      err.statusCode = 500;
      throw err;
    }

    // Authoritative Stock Deduction Check
    let stockWasDeducted = false;
    if (!order.stockDeducted) {
      // Order has not yet deducted stock: perform canonical inventory deduction now
      const orderItems = order.OrderItems || [];
      for (const item of orderItems) {
        if (item.productId && item.quantity > 0) {
          const product = item.Product || (await Product.findByPk(item.productId, { transaction: tx }));
          if (product?.trackInventory) {
            await changeStock(item.productId, -item.quantity, tx, item.variantId || null);
          }
        }
      }
      await order.update({ stockDeducted: true, status: 'completed' }, { transaction: tx });
      stockWasDeducted = true;
    } else {
      // Invariant: Already deducted (e.g. POS order), do NOT double-deduct!
      stockWasDeducted = false;
    }

    // Update payment record
    const effectiveAmount = parseDecimal(amountPaid ?? order.totalAmount);
    let payment = invoice.Payment;
    if (payment) {
      await payment.update({
        status: 'completed',
        amount: effectiveAmount,
        paymentMethod: String(paymentMethod).toUpperCase(),
        transactionData: {
          ...(payment.transactionData || {}),
          method: paymentMethod,
          transactionReference,
          paidAt: new Date().toISOString(),
          recordedBy: staffId || 'staff',
        },
      }, { transaction: tx });
    } else {
      payment = await Payment.create({
        orderId: order.id,
        amount: effectiveAmount,
        paymentMethod: String(paymentMethod).toUpperCase(),
        status: 'completed',
        currency: order.currency || 'USD',
        transactionData: {
          method: paymentMethod,
          transactionReference,
          paidAt: new Date().toISOString(),
          recordedBy: staffId || 'staff',
        },
      }, { transaction: tx });
    }

    // Update invoice status to PAID
    await invoice.update({
      status: INVOICE_STATUSES.PAID,
      paymentId: payment.id,
    }, { transaction: tx });

    if (isInternalTx) await tx.commit();

    return {
      success: true,
      message: 'Payment successfully recorded and invoice marked as paid',
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      order: order.toJSON ? order.toJSON() : order,
      payment: payment.toJSON ? payment.toJSON() : payment,
      stockDeductedNow: stockWasDeducted,
      stockState: 'DEDUCTED',
    };
  } catch (error) {
    if (isInternalTx && tx) {
      try { await tx.rollback(); } catch {}
    }
    throw error;
  }
}

/**
 * Cancels an unpaid invoice.
 * Invariant: Paid invoices cannot be cancelled (must use refund).
 */
async function cancelInvoice({
  invoiceId,
  storeId,
  reason = 'Cancelled by merchant',
  staffId = null,
  transaction: existingTx = null,
}) {
  const tx = existingTx || (await sequelize.transaction());
  const isInternalTx = !existingTx;

  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: Order }],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (storeId && invoice.storeId && invoice.storeId !== storeId) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (!canTransition(invoice.status, INVOICE_STATUSES.CANCELLED)) {
      const err = new Error(
        invoice.status === INVOICE_STATUSES.PAID
          ? 'Paid invoices cannot be cancelled. Please use the refund process.'
          : `Cannot cancel invoice with status "${invoice.status}"`
      );
      err.statusCode = 409;
      throw err;
    }

    const order = invoice.Order;
    if (order && order.status !== 'cancelled') {
      await order.update({ status: 'cancelled', notes: reason }, { transaction: tx });
    }

    await invoice.update({
      status: INVOICE_STATUSES.CANCELLED,
      notes: reason ? `Cancelled: ${reason}` : invoice.notes,
    }, { transaction: tx });

    if (isInternalTx) await tx.commit();

    return {
      success: true,
      message: 'Invoice successfully cancelled',
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    };
  } catch (error) {
    if (isInternalTx && tx) {
      try { await tx.rollback(); } catch {}
    }
    throw error;
  }
}

/**
 * Refunds a paid invoice and replenishes canonical inventory.
 * Invariant: Replenishes stock if and only if order.stockDeducted === true.
 */
async function refundInvoice({
  invoiceId,
  storeId,
  reason = 'Customer return / refund',
  amount = null,
  staffId = null,
  transaction: existingTx = null,
}) {
  const tx = existingTx || (await sequelize.transaction());
  const isInternalTx = !existingTx;

  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: Order,
          include: [{ model: OrderItem, include: [Product] }],
        },
        { model: Payment },
      ],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!invoice) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (storeId && invoice.storeId && invoice.storeId !== storeId) {
      const err = new Error('Invoice not found');
      err.statusCode = 404;
      throw err;
    }

    if (!canTransition(invoice.status, INVOICE_STATUSES.REFUNDED)) {
      const err = new Error(
        invoice.status === INVOICE_STATUSES.REFUNDED
          ? 'Invoice has already been refunded'
          : `Cannot refund invoice with status "${invoice.status}". Only paid invoices are refundable.`
      );
      err.statusCode = 409;
      throw err;
    }

    const order = invoice.Order;
    if (!order) {
      const err = new Error('Associated Order record missing');
      err.statusCode = 500;
      throw err;
    }

    // Replenish stock if it was previously deducted
    let stockWasRestored = false;
    if (order.stockDeducted) {
      const orderItems = order.OrderItems || [];
      for (const item of orderItems) {
        if (item.productId && item.quantity > 0) {
          const product = item.Product || (await Product.findByPk(item.productId, { transaction: tx }));
          if (product?.trackInventory) {
            await changeStock(item.productId, item.quantity, tx, item.variantId || null);
          }
        }
      }
      await order.update({ stockDeducted: false, status: 'refunded' }, { transaction: tx });
      stockWasRestored = true;
    }

    // Update Payment record
    const payment = invoice.Payment;
    if (payment) {
      await payment.update({
        status: 'refunded',
        refundedAmount: parseDecimal(amount ?? order.totalAmount),
        refundedAt: new Date(),
      }, { transaction: tx });
    }

    // Update invoice status to REFUNDED
    await invoice.update({
      status: INVOICE_STATUSES.REFUNDED,
      notes: reason ? `Refunded: ${reason}` : invoice.notes,
    }, { transaction: tx });

    if (isInternalTx) await tx.commit();

    return {
      success: true,
      message: 'Invoice successfully refunded and inventory restored to catalog',
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      stockRestored: stockWasRestored,
      stockState: 'RESTORED',
    };
  } catch (error) {
    if (isInternalTx && tx) {
      try { await tx.rollback(); } catch {}
    }
    throw error;
  }
}

/**
 * Builds an exact, immutable financial and stock snapshot for an invoice.
 */
function buildInvoiceSnapshot(invoice, order, payment) {
  const lineItems = (order?.OrderItems || []).map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: item.name || item.Product?.name || 'Item',
    sku: item.sku || item.Product?.sku || '',
    unitPrice: parseDecimal(item.price),
    quantity: item.quantity,
    totalPrice: parseDecimal(item.total ?? (item.price * item.quantity)),
  }));

  const subtotal = parseDecimal(order?.subtotal ?? lineItems.reduce((s, i) => s + i.totalPrice, 0));
  const tax = parseDecimal(order?.taxTotal || 0);
  const discount = parseDecimal(order?.discountTotal || 0);
  const shipping = parseDecimal(order?.shippingFee || 0);
  const total = parseDecimal(order?.totalAmount ?? (subtotal + tax + shipping - discount));

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    domain: 'merchant_commerce', // Clearly separated from Rentify platform SaaS billing
    isQuote: false,
    storeId: invoice.storeId || order?.storeId,
    orderId: order?.id,
    orderNumber: order?.orderNumber,
    createdAt: invoice.createdAt,
    dueDate: invoice.dueDate,
    customer: {
      name: invoice.customerName || order?.customerInfo?.name || 'Customer',
      email: invoice.customerEmail || order?.customerInfo?.email,
      phone: order?.customerInfo?.phone,
    },
    lineItems,
    totals: {
      subtotal,
      tax,
      discount,
      shipping,
      total,
      currency: order?.currency || 'USD',
    },
    stockState: {
      stockDeducted: Boolean(order?.stockDeducted),
      status: order?.stockDeducted ? 'DEDUCTED' : 'AWAITING_PAYMENT',
    },
    paymentEvidence: payment ? {
      paymentId: payment.id,
      paymentMethod: payment.paymentMethod,
      amount: parseDecimal(payment.amount),
      status: payment.status,
      transactionData: payment.transactionData,
      refundedAmount: payment.refundedAmount ? parseDecimal(payment.refundedAmount) : 0,
      refundedAt: payment.refundedAt,
    } : null,
  };
}

/**
 * Converts a Quote into a formal commercial Invoice.
 */
async function convertQuoteToInvoice({
  quote,
  storeId,
  websiteId,
  paymentMethod = 'cash',
  isImmediatePayment = false,
  dueDate = null,
  staffId = null,
  transaction = null,
}) {
  if (!quote) {
    const err = new Error('Quote data is required to convert to invoice');
    err.statusCode = 400;
    throw err;
  }

  const effectiveStoreId = storeId || quote.storeId;
  const effectiveWebsiteId = websiteId || quote.websiteId;

  return await createInvoice({
    storeId: effectiveStoreId,
    websiteId: effectiveWebsiteId,
    customerInfo: {
      name: quote.customerName,
      email: quote.customerEmail,
      phone: quote.customerPhone,
    },
    items: quote.items || [],
    paymentMethod,
    isImmediatePayment,
    dueDate: dueDate || quote.expiresAt,
    currency: quote.currency || 'USD',
    notes: quote.notes ? `Converted from Quote ${quote.quoteNumber}: ${quote.notes}` : `Converted from Quote ${quote.quoteNumber}`,
    staffId,
    transaction,
  });
}

module.exports = {
  INVOICE_STATUSES,
  LEGAL_TRANSITIONS,
  canTransition,
  generateInvoiceNumber,
  createQuote,
  createInvoice,
  recordPayment,
  cancelInvoice,
  refundInvoice,
  convertQuoteToInvoice,
  buildInvoiceSnapshot,
};
