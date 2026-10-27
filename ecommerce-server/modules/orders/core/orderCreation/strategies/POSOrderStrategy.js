// strategies/POSOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');

function safeTxOption(tx) {
  if (tx && (tx.id || tx.uuid)) return { transaction: tx };
  return {};
}

class POSOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { websiteId, storeId, items, paymentMethod, cashierId, customerInfo, currency = 'USD', checkoutKey } = orderData;
    const txOption = safeTxOption(transaction);

    // 1. Resolve item identity (barcode and/or productId/variantId) strictly within Store scope
    const resolvedItems = await this.resolvePosItems(items, storeId, transaction);

    // 2. Validate products using niche strategy
    await this.validateOrderItems(resolvedItems, transaction);

    // 3. Calculate totals using niche strategy
    const totals = this.nicheStrategy.calculateOrderTotals(
      resolvedItems,
      'pos',
      {},
      currency
    );

    const normalizedMethod = String(paymentMethod || '').toLowerCase();
    const isImmediatePayment = ['cash', 'card', 'credit_card', 'debit_card'].includes(normalizedMethod);

    // 4. Create customer record for POS if provided
    let customer = null;
    if (customerInfo?.email) {
      customer = await this.findOrCreateCustomer(customerInfo, websiteId, storeId, transaction);
    }

    // 5. Create order (stockDeducted begins false and is flipped only upon successful deduction)
    const order = await this.createOrderRecord({
      websiteId: websiteId || null,
      storeId: storeId || null,
      checkoutKey: checkoutKey || null,
      orderType: "pos",
      salesChannel: "pos",
      customerId: customer?.id,
      status: isImmediatePayment ? 'completed' : 'pending',
      deliveryStatus: isImmediatePayment ? 'delivered' : 'pending',
      cashierId,
      stockDeducted: false,
      customerInfo,
      currency,
      ...totals
    }, totals, transaction);

    // 6. Create order items with snapshots
    const orderItems = await this.createOrderItems(order.id, resolvedItems, transaction, currency);

    // 7. Deduct inventory for immediate payments (cash, card)
    if (isImmediatePayment && !order.stockDeducted) {
      await this.deductPosInventory(order, resolvedItems, cashierId, transaction);
      await order.update({
        status: 'completed',
        deliveryStatus: 'delivered',
        stockDeducted: true,
      }, { ...txOption, byStateMachine: true });
    }

    // 8. Process payment
    let payment;
    const isKHQR = ['khqr', 'wallet', 'bakong'].includes(normalizedMethod);

    try {
      payment = await this.paymentProcessor.process(
        order,
        paymentMethod,
        orderData.merchantConfig,
        transaction,
        currency
      );

      // If automated gateway marked payment completed immediately, deduct stock exactly once
      if (payment?.status === 'completed' && !order.stockDeducted) {
        await this.deductPosInventory(order, resolvedItems, cashierId, transaction);
        await order.update({
          status: 'completed',
          deliveryStatus: 'delivered',
          stockDeducted: true,
        }, { ...txOption, byStateMachine: true });
      }
    } catch (procErr) {
      if (isKHQR) {
        // Fallback for POS counter-stand QR when merchant has no automated Bakong API credentials configured
        const PaymentModel = this.models?.Payment || require('../../../../../models').Payment;
        if (PaymentModel && typeof PaymentModel.create === 'function') {
          payment = await PaymentModel.create(
            {
              orderId: order.id,
              amount: order.totalAmount,
              paymentMethod: 'WALLET',
              status: 'completed',
              transactionData: {
                posData: {
                  terminalId: "POS_TERMINAL_1",
                  method: "KHQR_COUNTER",
                  timestamp: new Date(),
                },
              },
              currency: currency || 'USD',
            },
            txOption
          );

          if (!order.stockDeducted) {
            await this.deductPosInventory(order, resolvedItems, cashierId, transaction);
            await order.update({
              status: 'completed',
              deliveryStatus: 'delivered',
              stockDeducted: true,
            }, { ...txOption, byStateMachine: true });
          }
        } else {
          throw procErr;
        }
      } else {
        throw procErr;
      }
    }

    // 9. Process niche-specific logic
    await this.nicheStrategy.processNicheSpecific(order, orderItems, transaction);

    // Ensure inventory deduction and status alignment if payment is completed
    if (!order.stockDeducted && payment && (payment.status === 'completed' || isImmediatePayment)) {
      await this.deductPosInventory(order, resolvedItems, cashierId, transaction);
      await order.update({
        status: 'completed',
        deliveryStatus: 'delivered',
        stockDeducted: true,
      }, { ...txOption, byStateMachine: true });
    }

    // 10. Create invoice
    const invoice = await this.createInvoice(
      order,
      payment,
      transaction,
      customerInfo
    );

    // Return view payload
    return {
      order: order.toJSON(),
      payment: payment ? payment.toJSON() : null,
      invoice: invoice ? invoice.toJSON() : null,
      orderItems: orderItems.map(item => item.toJSON()),
      khqrData: payment?.transactionData?.rawQR ? {
        rawQR: payment.transactionData.rawQR,
        md5Hash: payment.transactionData.md5Hash,
        deeplink: payment.transactionData.qrCodeUrl,
      } : null,
    };
  }

  /**
   * Resolves barcodes and products strictly within Store scope.
   * Cross-store barcodes or products are rejected.
   */
  async resolvePosItems(items, storeId, transaction) {
    const { Product, ProductVariant } = this.models;
    const txOption = safeTxOption(transaction);

    if (!Array.isArray(items) || items.length === 0) {
      const err = new Error('Order items are required');
      err.statusCode = 400;
      throw err;
    }

    const resolved = [];
    for (const item of items) {
      let product = null;
      let variant = null;

      if (item.barcode) {
        const cleanBarcode = String(item.barcode).trim();
        const whereClause = { barcode: cleanBarcode };
        if (storeId) whereClause.storeId = storeId;

        if (typeof ProductVariant?.findOne === 'function') {
          variant = await ProductVariant.findOne({
            where: whereClause,
            include: [{ model: Product, as: 'Product' }],
            ...txOption,
          }).catch(() => null);
        }

        if (variant) {
          product = variant.Product || (typeof Product?.findByPk === 'function' ? await Product.findByPk(variant.productId, txOption).catch(() => null) : null);
        } else if (typeof Product?.findOne === 'function') {
          product = await Product.findOne({
            where: whereClause,
            ...txOption,
          }).catch(() => null);
          if (product && typeof ProductVariant?.findOne === 'function') {
            variant = await ProductVariant.findOne({
              where: { productId: product.id, isDefault: true },
              ...txOption,
            }).catch(() => null) || await ProductVariant.findOne({
              where: { productId: product.id },
              ...txOption,
            }).catch(() => null);
          }
        }

        if (!product) {
          const err = new Error(`Item with barcode "${cleanBarcode}" not found in this store`);
          err.statusCode = 404;
          throw err;
        }
      } else if (item.productId) {
        if (typeof Product?.findByPk === 'function') {
          product = await Product.findByPk(item.productId, txOption);
        }
        if (!product) {
          const err = new Error(`Product "${item.productId}" not found`);
          err.statusCode = 404;
          throw err;
        }
        if (storeId && product.storeId && product.storeId !== storeId) {
          const err = new Error(`Product "${item.productId}" does not belong to store "${storeId}"`);
          err.statusCode = 403;
          throw err;
        }

        if (item.variantId) {
          if (typeof ProductVariant?.findByPk === 'function') {
            variant = await ProductVariant.findByPk(item.variantId, txOption).catch(() => null);
          }
          if (!variant && Array.isArray(product.ProductVariants)) {
            variant = product.ProductVariants.find(v => v.id === item.variantId);
          }
          if (!variant) {
            const err = new Error(`Variant "${item.variantId}" not found`);
            err.statusCode = 404;
            throw err;
          }
          if (storeId && variant.storeId && variant.storeId !== storeId) {
            const err = new Error(`Variant "${item.variantId}" does not belong to store "${storeId}"`);
            err.statusCode = 403;
            throw err;
          }
        } else {
          if (typeof ProductVariant?.findOne === 'function') {
            variant = await ProductVariant.findOne({
              where: { productId: product.id, isDefault: true },
              ...txOption,
            }).catch(() => null) || await ProductVariant.findOne({
              where: { productId: product.id },
              ...txOption,
            }).catch(() => null);
          }
          if (!variant && Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0) {
            variant = product.ProductVariants.find(v => v.isDefault) || product.ProductVariants[0];
          }
        }
      } else {
        const err = new Error('Each item must provide a productId or barcode');
        err.statusCode = 400;
        throw err;
      }

      const qty = Number(item.quantity) || 1;
      if (qty <= 0) {
        const err = new Error('Item quantity must be greater than zero');
        err.statusCode = 400;
        throw err;
      }

      resolved.push({
        ...item,
        productId: product.id,
        variantId: variant?.id || null,
        sku: variant?.sku || product.sku || '',
        barcode: variant?.barcode || product.barcode || item.barcode || null,
        name: item.name || product.name,
        price: item.price !== undefined ? item.price : (variant?.price || product.price),
        quantity: qty,
      });
    }

    return resolved;
  }

  /**
   * Deducts inventory through the canonical inventory ledger service.
   * Single-effect idempotency guaranteed by idempotencyKey.
   */
  async deductPosInventory(order, items, cashierId, transaction) {
    const { inventoryLedgerService } = require('../../../../inventory');
    const { Product, ProductVariant } = this.models;
    const storeId = order.storeId;
    const currency = order.currency || 'USD';
    const txOption = safeTxOption(transaction);

    // Deterministically sort items by productId / skuId to avoid transaction deadlocks
    const sortedItems = [...items].sort((a, b) =>
      String(a.productId || a.sku || a.barcode).localeCompare(String(b.productId || b.sku || b.barcode))
    );

    for (const item of sortedItems) {
      let variant = null;
      let product = null;

      if (item.variantId && typeof ProductVariant?.findByPk === 'function') {
        variant = await ProductVariant.findByPk(item.variantId, txOption).catch(() => null);
      }
      if (item.productId && typeof Product?.findByPk === 'function') {
        product = await Product.findByPk(item.productId, txOption).catch(() => null);
      }
      if (!variant && product) {
        if (typeof ProductVariant?.findOne === 'function') {
          variant = await ProductVariant.findOne({ where: { productId: product.id, isDefault: true }, ...txOption }).catch(() => null) ||
                    await ProductVariant.findOne({ where: { productId: product.id }, ...txOption }).catch(() => null);
        }
        if (!variant && Array.isArray(product.ProductVariants) && product.ProductVariants.length > 0) {
          variant = product.ProductVariants.find(v => v.isDefault) || product.ProductVariants[0];
        }
      }

      const skuId = variant?.id || item.variantId || product?.defaultSkuId || item.productId;
      const effectiveStoreId = storeId || variant?.storeId || product?.storeId;

      // 1. Mutate canonical balance via inventoryLedgerService
      try {
        await inventoryLedgerService.ensureBalance(
          { storeId: effectiveStoreId, skuId, variant, product },
          txOption
        );

        const idempotencyKey = `pos-deduct-${order.id}-${skuId}`;
        await inventoryLedgerService.mutateBalance({
          storeId: effectiveStoreId,
          skuId,
          changeOnHand: -Number(item.quantity || 1),
          changeReserved: 0,
          reasonCode: 'pos_sale',
          sourceType: effectiveStoreId ? 'pos_order' : 'legacy_website_pos_order',
          sourceId: order.id,
          actor: { id: cashierId || effectiveStoreId, type: 'staff' },
          idempotencyKey,
          monetaryContext: {
            orderId: order.id,
            storeId: effectiveStoreId,
            salesChannel: 'pos',
            currency,
            itemPrice: item.price,
          },
          notes: `POS sale deduction (storeId: ${effectiveStoreId}, orderId: ${order.id})`,
        }, txOption);
      } catch (invErr) {
        if (invErr.name === 'InsufficientStockError' || invErr.statusCode === 409 || invErr.code === 'INSUFFICIENT_STOCK') {
          throw invErr;
        }
      }

      // 2. Update model compatibility projection (for in-memory callers and unit tests)
      const targetModel = variant || product;
      if (targetModel && typeof targetModel.update === 'function') {
        const nextStock = Math.max(0, (targetModel.stockQuantity || 0) - Number(item.quantity || 1));
        const nextStatus = nextStock === 0 && targetModel.status === 'active' ? 'out_of_stock' : targetModel.status;
        await targetModel.update({
          stockQuantity: nextStock,
          status: nextStatus,
        }, txOption).catch(() => {});
      }
    }
  }

  async findOrCreateCustomer(customerInfo, websiteId, storeId, transaction) {
    const { Customer } = this.models;
    const { Op } = require('sequelize');
    const txOption = safeTxOption(transaction);

    const targetStoreId = websiteId || storeId;
    let customer = null;
    if (targetStoreId && typeof Customer?.findOne === 'function') {
      const conditions = [];
      if (websiteId) conditions.push({ storeId: websiteId });
      if (storeId) {
        conditions.push({ storeId });
        conditions.push({ tenantStoreId: storeId });
      }
      customer = await Customer.findOne({
        where: { email: customerInfo.email, [Op.or]: conditions },
        ...txOption,
      }).catch(() => null);
    }

    if (!customer && typeof Customer?.create === 'function') {
      customer = await Customer.create({
        storeId: websiteId || storeId,
        tenantStoreId: storeId || null,
        email: customerInfo.email,
        name: customerInfo.name || 'POS Customer',
        phoneNumber: customerInfo.phone,
        shippingAddress: customerInfo.addresses || [],
      }, txOption).catch(() => null);
    }

    return customer;
  }

  async createInvoice(order, payment, transaction, customerInfo = {}) {
    const invoiceNumber = this.generateInvoiceNumber();
    const txOption = safeTxOption(transaction);

    return await this.models.Invoice.create({
      websiteId: order.websiteId || null,
      storeId: order.storeId || null,
      orderId: order.id,
      paymentId: payment ? payment.id : null,
      invoiceNumber,
      status: payment?.status === 'completed' ? 'paid' : 'sent',
      customerName: customerInfo.name || order.customerInfo?.name || 'POS Customer',
      customerEmail: customerInfo.email || order.customerInfo?.email,
      subtotal: order.subtotal,
      tax: order.taxTotal || 0,
      discount: order.discountTotal || 0,
      total: order.totalAmount,
      currency: order.currency,
    }, txOption);
  }

  generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `POS-INV-${timestamp}-${random}`;
  }

  getOrderType() {
    return 'pos';
  }
}

module.exports = POSOrderStrategy;
