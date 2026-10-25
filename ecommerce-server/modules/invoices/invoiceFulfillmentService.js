// ecommerce-server/modules/invoices/invoiceFulfillmentService.js
// P3-INV-002 Slice 5: Canonical invoice fulfillment, reservation, edit, and cancellation service.
// Enforces explicit reservation policies, single-effect stock mutations, fulfilled invoice immutability,
// store ownership isolation, and single-source mutual exclusion with POS.

const { randomUUID } = require('node:crypto');
const { sequelize } = require('../../config/db');
const {
  Invoice,
  Order,
  OrderItem,
  Payment,
  ShippingDetail,
  Product,
  ProductVariant,
  StoreAccess,
  WebsiteData,
} = require('../../models');
const { inventoryLedgerService } = require('../inventory');
const { legacyWebsiteCompatibilityService } = require('../orders');
const { resolveLegacyItemToSku } = legacyWebsiteCompatibilityService;
const { InvoiceDomainError, INVOICE_ERROR_CODES } = require('./invoiceErrors');

function safeTxOption(tx) {
  if (tx && (tx.id || tx.uuid)) return { transaction: tx };
  return {};
}

/**
 * Resolves an invoice line item to a canonical Store and SKU.
 * Rejects cross-store products with 403 Forbidden.
 */
async function resolveInvoiceItem(item, storeId, txOption = {}) {
  let skuId = null;
  let targetModel = null;
  let resolvedProduct = null;
  let resolvedVariant = null;

  // 1. Barcode resolution within store scope
  if (item.barcode) {
    if (typeof ProductVariant?.findOne === 'function') {
      resolvedVariant = await ProductVariant.findOne({
        where: { storeId, barcode: item.barcode },
        ...txOption,
      });
    }
    if (resolvedVariant) {
      skuId = resolvedVariant.id;
      targetModel = resolvedVariant;
      resolvedProduct = await Product.findByPk(resolvedVariant.productId, txOption);
    } else {
      resolvedProduct = await Product.findOne({
        where: { storeId, barcode: item.barcode },
        ...txOption,
      });
      if (resolvedProduct) {
        skuId = resolvedProduct.id;
        targetModel = resolvedProduct;
      }
    }

    if (!targetModel) {
      throw new InvoiceDomainError(
        `Barcode "${item.barcode}" not found in Store ${storeId}`,
        INVOICE_ERROR_CODES.INVOICE_NOT_FOUND,
        404
      );
    }
  }

  // 2. Product ID and Variant ID resolution
  if (!skuId && item.productId) {
    resolvedProduct = await Product.findByPk(item.productId, txOption);
    if (!resolvedProduct) {
      throw new InvoiceDomainError(
        `Product ${item.productId} not found`,
        INVOICE_ERROR_CODES.INVOICE_NOT_FOUND,
        404
      );
    }

    // Tenant isolation: Product MUST belong to the store
    if (resolvedProduct.storeId && resolvedProduct.storeId !== storeId) {
      throw new InvoiceDomainError(
        `Product ${item.productId} does not belong to Store ${storeId}`,
        INVOICE_ERROR_CODES.CROSS_STORE_ITEM_PROHIBITED,
        403
      );
    }

    if (item.variantId) {
      if (typeof ProductVariant?.findByPk === 'function') {
        resolvedVariant = await ProductVariant.findByPk(item.variantId, txOption);
      } else if (resolvedProduct.ProductVariants?.length) {
        resolvedVariant = resolvedProduct.ProductVariants.find((v) => v.id === item.variantId);
      }

      if (!resolvedVariant) {
        throw new InvoiceDomainError(
          `Variant ${item.variantId} not found for Product ${item.productId}`,
          INVOICE_ERROR_CODES.INVOICE_NOT_FOUND,
          404
        );
      }

      if (resolvedVariant.storeId && resolvedVariant.storeId !== storeId) {
        throw new InvoiceDomainError(
          `Variant ${item.variantId} does not belong to Store ${storeId}`,
          INVOICE_ERROR_CODES.CROSS_STORE_ITEM_PROHIBITED,
          403
        );
      }

      skuId = resolvedVariant.id;
      targetModel = resolvedVariant;
    } else {
      // Resolve through canonical SKU resolution
      const resolved = await resolveLegacyItemToSku(
        { productId: item.productId, storeId },
        txOption
      );
      skuId = resolved.skuId;
      resolvedVariant = resolved.variant;
      resolvedProduct = resolved.product;
      targetModel = resolved.variant || resolved.product;
    }
  }

  if (!skuId) {
    skuId = String(item.productId || item.skuId || randomUUID());
  }

  const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
  const price = parseFloat(item.price) || (resolvedVariant?.price || resolvedProduct?.price) || 0;
  const name = item.name || resolvedProduct?.name || 'Item';

  return {
    skuId,
    productId: resolvedProduct?.id || item.productId,
    variantId: resolvedVariant?.id || item.variantId || null,
    name,
    quantity,
    price,
    product: resolvedProduct,
    variant: resolvedVariant,
    targetModel,
  };
}

/**
 * Resolves all line items for an invoice and sorts them deterministically by skuId.
 */
async function resolveInvoiceItems(items, storeId, txOption = {}) {
  if (!items || items.length === 0) {
    throw new InvoiceDomainError(
      'Invoice must contain at least one item',
      INVOICE_ERROR_CODES.CANNOT_EDIT_FULFILLED_INVOICE,
      400
    );
  }

  const resolved = [];
  for (const item of items) {
    const itemData = await resolveInvoiceItem(item, storeId, txOption);
    resolved.push(itemData);
  }

  // Deterministically sort by skuId to prevent deadlocks
  return resolved.sort((a, b) => String(a.skuId).localeCompare(String(b.skuId)));
}

/**
 * Creates an order and invoice under canonical store scope with explicit reservation policy.
 */
async function createInvoiceOrder(params, options = {}) {
  const {
    storeId,
    websiteId,
    invoiceData = {},
    actor = { id: 'system', role: 'merchant' },
    idempotencyKey = null,
    correlationId = null,
  } = params;

  if (!storeId) {
    throw new InvoiceDomainError('storeId is required', INVOICE_ERROR_CODES.STORE_ACCESS_DENIED, 400);
  }

  const txOption = safeTxOption(options.transaction);

  // 1. Verify store status
  const store = await StoreAccess.findByPk(storeId, txOption).catch(() => null);
  if (store && store.status !== 'active') {
    throw new InvoiceDomainError(
      `Store ${storeId} is not active (status: ${store.status})`,
      INVOICE_ERROR_CODES.STORE_NOT_ACTIVE,
      403
    );
  }

  // 2. Guard against cross-store body override
  if (invoiceData.storeId && invoiceData.storeId !== storeId) {
    throw new InvoiceDomainError(
      'Cross-store body selection prohibited',
      INVOICE_ERROR_CODES.CROSS_STORE_SELECTION_PROHIBITED,
      403
    );
  }

  // 3. Replay detection: check existing invoice/order by checkoutKey or invoiceNumber
  const resolvedInvoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}`;
  const checkoutKey = idempotencyKey ? `inv-${storeId}-${idempotencyKey}` : `inv-${storeId}-${resolvedInvoiceNumber}`;

  const existingOrder = await Order.findOne({
    where: { checkoutKey },
    include: [
      { model: OrderItem },
      { model: Payment },
      { model: Invoice, as: 'Invoice' },
      { model: ShippingDetail, as: 'shippingDetail' },
    ],
    ...txOption,
  }).catch(() => null);

  if (existingOrder) {
    const existingInvoice = existingOrder.Invoice || await Invoice.findOne({
      where: { orderId: existingOrder.id },
      ...txOption,
    }).catch(() => null);

    return {
      order: existingOrder.toJSON ? existingOrder.toJSON() : existingOrder,
      payment: existingOrder.Payment ? (existingOrder.Payment.toJSON ? existingOrder.Payment.toJSON() : existingOrder.Payment) : null,
      invoice: existingInvoice ? (existingInvoice.toJSON ? existingInvoice.toJSON() : existingInvoice) : null,
      orderItems: (existingOrder.OrderItems || []).map((i) => (i.toJSON ? i.toJSON() : i)),
      replayed: true,
    };
  }

  // 4. Resolve items within store scope
  const items = invoiceData.items || [];
  const resolvedItems = await resolveInvoiceItems(items, storeId, txOption);

  // 5. Evaluate lifecycle mode
  const isDraft = Boolean(invoiceData.isDraft || invoiceData.status === 'draft');
  const isImmediate = Boolean(!isDraft && (invoiceData.status === 'paid' || ['cash', 'card'].includes(invoiceData.paymentMethod)));
  const isPending = Boolean(!isDraft && !isImmediate);

  // 6. Calculate authoritative monetary totals (Release 1 policy: tax=0.00, delivery fees belong to merchant)
  let subtotal = 0;
  for (const item of resolvedItems) {
    subtotal += item.price * item.quantity;
  }
  const discountAmount = parseFloat(invoiceData.discountAmount) || 0;
  const shippingFee = parseFloat(invoiceData.shippingFee) || 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);
  const currency = invoiceData.currency || 'USD';

  const orderId = randomUUID();
  const invoiceId = randomUUID();

  // 7. Stock mutations according to explicit reservation policy
  if (isDraft) {
    // Draft invoices: ZERO stock mutations. No reservation, no deduction.
  } else if (isImmediate) {
    // Immediate payment: Deduct on-hand stock immediately
    for (const item of resolvedItems) {
      await inventoryLedgerService.ensureBalance(
        {
          storeId,
          skuId: item.skuId,
          variant: item.variant,
          product: item.product,
        },
        txOption
      );

      const deductKey = `inv-deduct-${orderId}-${item.skuId}`;
      const balance = await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: item.skuId,
          changeOnHand: -item.quantity,
          changeReserved: 0,
          reasonCode: 'invoice_fulfillment',
          sourceType: 'invoice',
          sourceId: invoiceId,
          actor: { id: actor.id, type: actor.role || 'merchant' },
          idempotencyKey: deductKey,
          correlationId,
          notes: `Invoice ${resolvedInvoiceNumber} immediate fulfillment`,
        },
        txOption
      );

      if (item.targetModel && typeof item.targetModel.update === 'function') {
        item.targetModel.stockQuantity = balance.onHand;
        await item.targetModel.update({ stockQuantity: balance.onHand }, txOption).catch(() => {});
      }
    }
  } else if (isPending) {
    // Issued / Pending: Reserve stock
    for (const item of resolvedItems) {
      await inventoryLedgerService.ensureBalance(
        {
          storeId,
          skuId: item.skuId,
          variant: item.variant,
          product: item.product,
        },
        txOption
      );

      const resKey = `inv-res-${orderId}-${item.skuId}`;
      const balance = await inventoryLedgerService.mutateBalance(
        {
          storeId,
          skuId: item.skuId,
          changeOnHand: 0,
          changeReserved: item.quantity,
          reasonCode: 'reservation',
          sourceType: 'invoice',
          sourceId: invoiceId,
          actor: { id: actor.id, type: actor.role || 'merchant' },
          idempotencyKey: resKey,
          correlationId,
          notes: `Invoice ${resolvedInvoiceNumber} reservation`,
        },
        txOption
      );

      if (item.targetModel && typeof item.targetModel.update === 'function') {
        item.targetModel.stockQuantity = balance.available;
        await item.targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
      }
    }
  }

  // 8. Create Order record
  const orderStatus = isImmediate ? 'completed' : (isDraft ? 'pending' : 'pending');
  const fulfillmentStatus = isImmediate ? 'delivered' : 'unfulfilled';
  const stockDeducted = isImmediate;
  const stockReserved = isPending;

  const orderData = {
    id: orderId,
    orderNumber: `ORD-${Date.now()}`,
    websiteId: websiteId || null,
    storeId,
    orderType: 'manual',
    salesChannel: 'storefront',
    paymentMethod: invoiceData.paymentMethod || 'cash',
    status: orderStatus,
    fulfillmentStatus,
    stockDeducted,
    stockReserved,
    checkoutKey,
    subtotal,
    discountTotal: discountAmount,
    taxTotal: 0,
    shippingFee,
    totalAmount,
    currency,
    customerInfo: {
      name: invoiceData.customerName || 'Customer',
      email: invoiceData.customerEmail || null,
      phone: invoiceData.customerPhone || null,
    },
    metadata: {
      invoiceId,
      invoiceNumber: resolvedInvoiceNumber,
      isDraft,
    },
    orderSnapshot: {
      orderId,
      storeId,
      salesChannel: 'storefront',
      currency,
      subtotal,
      discountTotal: discountAmount,
      taxTotal: 0,
      totalAmount,
      snapshotAt: new Date().toISOString(),
    },
  };

  const order = await Order.create(orderData, txOption);

  // 9. Create Shipping Detail if address provided
  await ShippingDetail.create(
    {
      orderId,
      name: invoiceData.customerName || 'Customer',
      phone: invoiceData.customerPhone || null,
      email: invoiceData.customerEmail || null,
      street: invoiceData.address || 'In-Store',
      city: 'Phnom Penh',
      country: 'Cambodia',
    },
    txOption
  ).catch(() => {});

  // 10. Create Order Items
  const createdOrderItems = [];
  for (const item of resolvedItems) {
    const orderItem = await OrderItem.create(
      {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        unitPrice: item.price,
        itemTotal: item.price * item.quantity,
      },
      txOption
    );
    createdOrderItems.push(orderItem);
  }

  // 11. Create Payment record
  const paymentStatus = isImmediate ? 'completed' : 'pending';
  const payment = await Payment.create(
    {
      orderId,
      websiteId: websiteId || null,
      amount: totalAmount,
      paymentMethod: invoiceData.paymentMethod || 'cash',
      paymentGateway: invoiceData.paymentMethod || 'manual',
      status: paymentStatus,
      paidAt: isImmediate ? new Date() : null,
      currency,
    },
    txOption
  );

  // 12. Create Invoice record
  const invoiceStatus = isDraft ? 'draft' : (isImmediate ? 'paid' : 'sent');
  const invoice = await Invoice.create(
    {
      id: invoiceId,
      websiteId: websiteId || null,
      storeId,
      orderId,
      paymentId: payment.id,
      invoiceNumber: resolvedInvoiceNumber,
      dueDate: invoiceData.dueDate || new Date().toISOString().split('T')[0],
      status: invoiceStatus,
      pdfUrl: invoiceData.pdfUrl || null,
      notes: invoiceData.notes || null,
      customerName: invoiceData.customerName || null,
      customerEmail: invoiceData.customerEmail || null,
      subtotal,
      tax: 0,
      discount: discountAmount,
      total: totalAmount,
      currency,
    },
    txOption
  );

  return {
    order: order.toJSON ? order.toJSON() : order,
    payment: payment.toJSON ? payment.toJSON() : payment,
    invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    orderItems: createdOrderItems.map((i) => (i.toJSON ? i.toJSON() : i)),
  };
}

/**
 * Fulfills an invoice, converting reservations into final on-hand deductions.
 * Guarantees exactly one stock deduction effect; repeated calls return idempotently.
 */
async function fulfillInvoice(params, options = {}) {
  const {
    invoiceId,
    storeId,
    actor = { id: 'system', role: 'merchant' },
    idempotencyKey = null,
    correlationId = null,
  } = params;

  const txOption = safeTxOption(options.transaction);

  // 1. Fetch invoice and associated order
  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{
      model: Order,
      include: [{ model: OrderItem }, { model: Payment }],
    }],
    ...txOption,
  });

  if (!invoice) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  // Tenant anti-enumeration check: cross-store invoice access returns 404
  const effectiveStoreId = invoice.storeId || invoice.Order?.storeId;
  if (storeId && effectiveStoreId && storeId !== effectiveStoreId) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const order = invoice.Order;
  if (!order) {
    throw new InvoiceDomainError('Associated order not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  // 2. Idempotency / Single-effect check: already fulfilled cannot deduct twice!
  if (order.stockDeducted && invoice.status === 'paid') {
    return {
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      order: order.toJSON ? order.toJSON() : order,
      alreadyFulfilled: true,
    };
  }

  // 3. State machine checks
  if (order.status === 'cancelled' || invoice.status === 'cancelled') {
    throw new InvoiceDomainError(
      'Cannot fulfill a cancelled invoice',
      INVOICE_ERROR_CODES.CANNOT_FULFILL_CANCELLED_INVOICE,
      409
    );
  }

  if (invoice.status === 'draft') {
    throw new InvoiceDomainError(
      'Cannot fulfill a draft invoice directly. Issue invoice first.',
      INVOICE_ERROR_CODES.CANNOT_FULFILL_DRAFT_INVOICE,
      409
    );
  }

  // 4. Perform stock deduction via canonical inventory ledger
  const items = order.OrderItems || [];
  const sortedItems = [...items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

  for (const item of sortedItems) {
    const resolved = await resolveLegacyItemToSku(
      { productId: item.productId, variantId: item.variantId, storeId: effectiveStoreId },
      txOption
    );

    await inventoryLedgerService.ensureBalance(
      {
        storeId: effectiveStoreId,
        skuId: resolved.skuId,
        variant: resolved.variant,
        product: resolved.product,
      },
      txOption
    );

    const baseKey = idempotencyKey || `inv-fulfill-${invoice.id}-${item.id}`;
    const itemFulfillKey = `${baseKey}-${resolved.skuId}`;

    if (order.stockReserved) {
      // Consumes reservation: onHand -qty, reserved -qty
      const balance = await inventoryLedgerService.mutateBalance(
        {
          storeId: effectiveStoreId,
          skuId: resolved.skuId,
          changeOnHand: -item.quantity,
          changeReserved: -item.quantity,
          reasonCode: 'invoice_fulfillment',
          sourceType: 'invoice',
          sourceId: invoice.id,
          actor: { id: actor.id, type: actor.role || 'merchant' },
          idempotencyKey: itemFulfillKey,
          correlationId,
          notes: `Invoice ${invoice.invoiceNumber} fulfillment from reservation`,
        },
        txOption
      );

      const targetModel = resolved.variant || resolved.product;
      if (targetModel && typeof targetModel.update === 'function') {
        targetModel.stockQuantity = balance.available;
        await targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
      }
    } else {
      // Direct deduction if not previously reserved
      const balance = await inventoryLedgerService.mutateBalance(
        {
          storeId: effectiveStoreId,
          skuId: resolved.skuId,
          changeOnHand: -item.quantity,
          changeReserved: 0,
          reasonCode: 'invoice_fulfillment',
          sourceType: 'invoice',
          sourceId: invoice.id,
          actor: { id: actor.id, type: actor.role || 'merchant' },
          idempotencyKey: itemFulfillKey,
          correlationId,
          notes: `Invoice ${invoice.invoiceNumber} direct fulfillment`,
        },
        txOption
      );

      const targetModel = resolved.variant || resolved.product;
      if (targetModel && typeof targetModel.update === 'function') {
        targetModel.stockQuantity = balance.available;
        await targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
      }
    }
  }

  // 5. Update Order and Invoice records
  await order.update(
    {
      stockDeducted: true,
      stockReserved: false,
      fulfillmentStatus: 'delivered',
      status: 'completed',
    },
    txOption
  );

  await invoice.update(
    {
      status: 'paid',
    },
    txOption
  );

  if (order.Payment && order.Payment.status !== 'completed') {
    await order.Payment.update(
      {
        status: 'completed',
        paidAt: new Date(),
      },
      txOption
    );
  }

  return {
    invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    order: order.toJSON ? order.toJSON() : order,
    fulfilled: true,
  };
}

/**
 * Cancels an invoice and compensates inventory exactly once.
 * Releases reservations for pending invoices, or restores on-hand stock for fulfilled invoices.
 */
async function cancelInvoice(params, options = {}) {
  const {
    invoiceId,
    storeId,
    actor = { id: 'system', role: 'merchant' },
    reason = 'Invoice cancelled',
    idempotencyKey = null,
    correlationId = null,
  } = params;

  const txOption = safeTxOption(options.transaction);

  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{
      model: Order,
      include: [{ model: OrderItem }, { model: Payment }],
    }],
    ...txOption,
  });

  if (!invoice) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const effectiveStoreId = invoice.storeId || invoice.Order?.storeId;
  if (storeId && effectiveStoreId && storeId !== effectiveStoreId) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const order = invoice.Order;

  // Idempotency: already cancelled has exactly one effect
  if (invoice.status === 'cancelled' && (!order || order.status === 'cancelled')) {
    return {
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      order: order ? (order.toJSON ? order.toJSON() : order) : null,
      alreadyCancelled: true,
    };
  }

  if (order) {
    const items = order.OrderItems || [];
    const sortedItems = [...items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

    for (const item of sortedItems) {
      const resolved = await resolveLegacyItemToSku(
        { productId: item.productId, variantId: item.variantId, storeId: effectiveStoreId },
        txOption
      );

      const baseKey = idempotencyKey || `inv-cancel-${invoice.id}-${item.id}`;

      if (order.stockDeducted) {
        // Compensate deducted on-hand stock: onHand +qty, reserved 0
        const itemCancelKey = `${baseKey}-deduct-${resolved.skuId}`;
        const balance = await inventoryLedgerService.mutateBalance(
          {
            storeId: effectiveStoreId,
            skuId: resolved.skuId,
            changeOnHand: item.quantity,
            changeReserved: 0,
            reasonCode: 'cancellation',
            sourceType: 'invoice',
            sourceId: invoice.id,
            actor: { id: actor.id, type: actor.role || 'merchant' },
            idempotencyKey: itemCancelKey,
            correlationId,
            notes: `Invoice ${invoice.invoiceNumber} cancellation compensation`,
          },
          txOption
        );

        const targetModel = resolved.variant || resolved.product;
        if (targetModel && typeof targetModel.update === 'function') {
          targetModel.stockQuantity = balance.available;
          await targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
        }
      } else if (order.stockReserved) {
        // Release active reservation: onHand 0, reserved -qty
        const itemCancelResKey = `${baseKey}-res-${resolved.skuId}`;
        const balance = await inventoryLedgerService.mutateBalance(
          {
            storeId: effectiveStoreId,
            skuId: resolved.skuId,
            changeOnHand: 0,
            changeReserved: -item.quantity,
            reasonCode: 'reservation_release',
            sourceType: 'invoice',
            sourceId: invoice.id,
            actor: { id: actor.id, type: actor.role || 'merchant' },
            idempotencyKey: itemCancelResKey,
            correlationId,
            notes: `Invoice ${invoice.invoiceNumber} reservation release on cancellation`,
          },
          txOption
        );

        const targetModel = resolved.variant || resolved.product;
        if (targetModel && typeof targetModel.update === 'function') {
          targetModel.stockQuantity = balance.available;
          await targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
        }
      }
    }

    await order.update(
      {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
        stockDeducted: false,
        stockReserved: false,
      },
      txOption
    );

    if (order.Payment && order.Payment.status !== 'voided') {
      await order.Payment.update({ status: 'voided' }, txOption).catch(() => {});
    }
  }

  await invoice.update({ status: 'cancelled' }, txOption);

  return {
    invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    order: order ? (order.toJSON ? order.toJSON() : order) : null,
    cancelled: true,
  };
}

/**
 * Updates an invoice and adjusts item reservations.
 * Fulfilled invoices cannot rewrite fulfilled quantities (rejected with 409 Conflict).
 */
async function updateInvoice(params, options = {}) {
  const {
    invoiceId,
    storeId,
    actor = { id: 'system', role: 'merchant' },
    updateData = {},
    idempotencyKey = null,
    correlationId = null,
  } = params;

  const txOption = safeTxOption(options.transaction);

  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{
      model: Order,
      include: [{ model: OrderItem }, { model: Payment }],
    }],
    ...txOption,
  });

  if (!invoice) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const effectiveStoreId = invoice.storeId || invoice.Order?.storeId;
  if (storeId && effectiveStoreId && storeId !== effectiveStoreId) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const order = invoice.Order;

  // 1. Fulfilled invoice immutability enforcement
  if (order?.stockDeducted || invoice.status === 'paid') {
    if (updateData.items && updateData.items.length > 0) {
      throw new InvoiceDomainError(
        'Invoice edits cannot rewrite fulfilled quantities',
        INVOICE_ERROR_CODES.CANNOT_EDIT_FULFILLED_INVOICE,
        409
      );
    }
  }

  if (invoice.status === 'cancelled') {
    throw new InvoiceDomainError(
      'Cannot edit a cancelled invoice',
      INVOICE_ERROR_CODES.CANNOT_EDIT_CANCELLED_INVOICE,
      409
    );
  }

  // 2. Adjust item reservations if items provided on a reserved invoice
  if (updateData.items && updateData.items.length > 0 && order) {
    const isReserved = Boolean(order.stockReserved && !order.stockDeducted);
    const resolvedNewItems = await resolveInvoiceItems(updateData.items, effectiveStoreId, txOption);

    if (isReserved) {
      // Map old reserved items by skuId
      const oldItemsMap = new Map();
      for (const item of (order.OrderItems || [])) {
        const resolved = await resolveLegacyItemToSku(
          { productId: item.productId, variantId: item.variantId, storeId: effectiveStoreId },
          txOption
        );
        oldItemsMap.set(resolved.skuId, {
          item,
          skuId: resolved.skuId,
          quantity: item.quantity,
          product: resolved.product,
          variant: resolved.variant,
        });
      }

      const newItemsMap = new Map();
      for (const item of resolvedNewItems) {
        newItemsMap.set(item.skuId, item);
      }

      // Calculate reservation adjustments
      const allSkuIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);
      for (const skuId of allSkuIds) {
        const oldEntry = oldItemsMap.get(skuId);
        const newEntry = newItemsMap.get(skuId);

        const oldQty = oldEntry ? oldEntry.quantity : 0;
        const newQty = newEntry ? newEntry.quantity : 0;
        const delta = newQty - oldQty;

        if (delta > 0) {
          // Reserve delta: onHand 0, reserved +delta
          await inventoryLedgerService.ensureBalance(
            {
              storeId: effectiveStoreId,
              skuId,
              variant: newEntry?.variant || oldEntry?.variant,
              product: newEntry?.product || oldEntry?.product,
            },
            txOption
          );

          const editResKey = `inv-edit-res-${invoice.id}-${skuId}-${idempotencyKey || Date.now()}`;
          await inventoryLedgerService.mutateBalance(
            {
              storeId: effectiveStoreId,
              skuId,
              changeOnHand: 0,
              changeReserved: delta,
              reasonCode: 'reservation',
              sourceType: 'invoice',
              sourceId: invoice.id,
              actor: { id: actor.id, type: actor.role || 'merchant' },
              idempotencyKey: editResKey,
              correlationId,
              notes: `Invoice ${invoice.invoiceNumber} edit reservation increase`,
            },
            txOption
          );
        } else if (delta < 0) {
          // Release delta: onHand 0, reserved -|delta|
          const releaseQty = Math.abs(delta);
          const editRelKey = `inv-edit-rel-${invoice.id}-${skuId}-${idempotencyKey || Date.now()}`;
          await inventoryLedgerService.mutateBalance(
            {
              storeId: effectiveStoreId,
              skuId,
              changeOnHand: 0,
              changeReserved: -releaseQty,
              reasonCode: 'reservation_release',
              sourceType: 'invoice',
              sourceId: invoice.id,
              actor: { id: actor.id, type: actor.role || 'merchant' },
              idempotencyKey: editRelKey,
              correlationId,
              notes: `Invoice ${invoice.invoiceNumber} edit reservation decrease`,
            },
            txOption
          );
        }
      }
    }

    // Replace order items atomically
    await OrderItem.destroy({ where: { orderId: order.id }, ...txOption });
    let newSubtotal = 0;
    for (const item of resolvedNewItems) {
      newSubtotal += item.price * item.quantity;
      await OrderItem.create(
        {
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          unitPrice: item.price,
          itemTotal: item.price * item.quantity,
        },
        txOption
      );
    }

    const discountAmount = updateData.discountAmount !== undefined ? parseFloat(updateData.discountAmount) : parseFloat(order.discountTotal || 0);
    const shippingFee = updateData.shippingFee !== undefined ? parseFloat(updateData.shippingFee) : parseFloat(order.shippingFee || 0);
    const totalAmount = Math.max(0, newSubtotal - discountAmount + shippingFee);

    await order.update(
      {
        subtotal: newSubtotal,
        discountTotal: discountAmount,
        shippingFee,
        totalAmount,
      },
      txOption
    );

    await invoice.update(
      {
        subtotal: newSubtotal,
        discount: discountAmount,
        total: totalAmount,
      },
      txOption
    );
  }

  // Update other attributes (dueDate, notes, pdfUrl)
  const invoiceUpdates = {};
  if (updateData.dueDate) invoiceUpdates.dueDate = updateData.dueDate;
  if (updateData.notes !== undefined) invoiceUpdates.notes = updateData.notes;
  if (updateData.pdfUrl) invoiceUpdates.pdfUrl = updateData.pdfUrl;

  if (Object.keys(invoiceUpdates).length > 0) {
    await invoice.update(invoiceUpdates, txOption);
  }

  return {
    invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    order: order ? (order.toJSON ? order.toJSON() : order) : null,
    updated: true,
  };
}

/**
 * Issues a draft invoice, converting it to pending and creating inventory reservations.
 */
async function issueDraftInvoice(params, options = {}) {
  const {
    invoiceId,
    storeId,
    actor = { id: 'system', role: 'merchant' },
    idempotencyKey = null,
    correlationId = null,
  } = params;

  const txOption = safeTxOption(options.transaction);

  const invoice = await Invoice.findByPk(invoiceId, {
    include: [{
      model: Order,
      include: [{ model: OrderItem }, { model: Payment }],
    }],
    ...txOption,
  });

  if (!invoice) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const effectiveStoreId = invoice.storeId || invoice.Order?.storeId;
  if (storeId && effectiveStoreId && storeId !== effectiveStoreId) {
    throw new InvoiceDomainError('Invoice not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  const order = invoice.Order;
  if (!order) {
    throw new InvoiceDomainError('Associated order not found', INVOICE_ERROR_CODES.INVOICE_NOT_FOUND, 404);
  }

  // Idempotency: if already issued/sent, return existing
  if (invoice.status !== 'draft') {
    return {
      invoice: invoice.toJSON ? invoice.toJSON() : invoice,
      order: order.toJSON ? order.toJSON() : order,
      alreadyIssued: true,
    };
  }

  // Reserve stock for all items
  const items = order.OrderItems || [];
  const sortedItems = [...items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));

  for (const item of sortedItems) {
    const resolved = await resolveLegacyItemToSku(
      { productId: item.productId, variantId: item.variantId, storeId: effectiveStoreId },
      txOption
    );

    await inventoryLedgerService.ensureBalance(
      {
        storeId: effectiveStoreId,
        skuId: resolved.skuId,
        variant: resolved.variant,
        product: resolved.product,
      },
      txOption
    );

    const issueKey = `inv-issue-${invoice.id}-${item.id}-${idempotencyKey || 'def'}`;
    const balance = await inventoryLedgerService.mutateBalance(
      {
        storeId: effectiveStoreId,
        skuId: resolved.skuId,
        changeOnHand: 0,
        changeReserved: item.quantity,
        reasonCode: 'reservation',
        sourceType: 'invoice',
        sourceId: invoice.id,
        actor: { id: actor.id, type: actor.role || 'merchant' },
        idempotencyKey: issueKey,
        correlationId,
        notes: `Invoice ${invoice.invoiceNumber} issuance reservation`,
      },
      txOption
    );

    const targetModel = resolved.variant || resolved.product;
    if (targetModel && typeof targetModel.update === 'function') {
      targetModel.stockQuantity = balance.available;
      await targetModel.update({ stockQuantity: balance.available }, txOption).catch(() => {});
    }
  }

  await order.update({ stockReserved: true }, txOption);
  await invoice.update({ status: 'sent' }, txOption);

  return {
    invoice: invoice.toJSON ? invoice.toJSON() : invoice,
    order: order.toJSON ? order.toJSON() : order,
    issued: true,
  };
}

module.exports = {
  resolveInvoiceItem,
  resolveInvoiceItems,
  createInvoiceOrder,
  fulfillInvoice,
  cancelInvoice,
  updateInvoice,
  issueDraftInvoice,
};
