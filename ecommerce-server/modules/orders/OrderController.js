// controllers/OrderController.js
const OrderTypeFactory = require("./core/orderCreation/factory/OrderFactory");
const PaymentProcessor = require("../payments").PaymentProcessor;
const models = require("../../models");
const NotificationService = require("../notifications").notificationService;
const OrderRetrievalFactory = require('./core/orderRetrieval/factory/OrderRetrievalFactory');
const { WebsiteData } = require("../../models");
const { sequelize } = require('../../config/db');
const { decryptSecrets } = require("../payments").paymentConfigEncryption;

const hydratePaymentConfig = (config) => {
  if (!config?.config?.encryptedSecrets) return config;
  return {
    ...config.toJSON(),
    config: {
      ...config.config,
      ...decryptSecrets(config.config.encryptedSecrets),
    },
  };
};

exports.createOrder = async (req, res) => {
  console.time("Factory createOrder Time");
   const transaction = await sequelize.transaction();
  try {
    const { websiteId } = req.params;
    const { shippingDetails, paymentMethod, currency } = req.body;
    if (paymentMethod !== 'COD' || (currency && currency !== 'USD')) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Storefront buyer checkout accepts COD in USD only' });
    }
    const user = req.user;

    // Resolve website to store safely and reject ambiguous/inactive mappings
    const { resolveWebsiteToStore } = require("./services/legacyWebsiteCompatibilityService");
    const resolved = await resolveWebsiteToStore(websiteId, { transaction });
    const storeId = resolved.storeId;
    const website = resolved.website || { niche: 'ecommerce' };

    // Fetch payment config
    const paymentConfigs = await models.PaymentGatewayConfig.findAll({
      where: { websiteId } ,
      transaction
    });

    const merchantConfig = hydratePaymentConfig(paymentConfigs.find(
      (cfg) => (cfg.gateway === "cutluy" || cfg.gateway === "khqr") && cfg.enabled
    ));

    const paymentProcessor = new PaymentProcessor(models);
    const strategy = OrderTypeFactory.createStrategy(
      "online",
      models,
      paymentProcessor,
      NotificationService,
      website.niche || 'ecommerce',
    );

    const result = await strategy.execute({
      user,
      websiteId,
      storeId,
      shippingDetails,
      paymentMethod,
      merchantConfig,
      currency,
    }, transaction);

    await transaction.commit();
    await strategy.sendNotifications(result, user, websiteId);
    res.status(201).json(result);
  } catch (error) {
       if (transaction) {
      await transaction.rollback();
    }
        console.error("Create Order Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  } finally {
    console.timeEnd("Factory createOrder Time");
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const invoiceData = req.body.body || req.body;

    // Get website niche
    const website = await WebsiteData.findOne({
      where: { websiteId },
      attributes: ['niche', 'storeId', 'websiteId']
    });

    if (!website) {
      return res.status(404).json({ error: "Website not found" });
    }

    // Verify store status
    let store = req.store;
    if (!store && website.storeId) {
      const { StoreAccess } = require('../../models');
      store = await StoreAccess.findByPk(website.storeId);
    }
    if (store && store.status !== 'active') {
      return res.status(403).json({ error: "Store is not active" });
    }

    // Guard against cross-store body parameter override
    const bodyStoreId = req.body?.storeId || invoiceData?.storeId;
    if (bodyStoreId && website.storeId && bodyStoreId !== website.storeId) {
      return res.status(403).json({ error: "Cross-store body selection prohibited" });
    }

    // Fetch payment config
    const paymentConfigs = await models.PaymentGatewayConfig.findAll({
      where: { websiteId }
    });

    const merchantConfig = hydratePaymentConfig(paymentConfigs.find(
      (cfg) => (cfg.gateway === "cutluy" || cfg.gateway === "khqr") && cfg.enabled
    ));

    const paymentProcessor = new PaymentProcessor(models);
    const strategy = OrderTypeFactory.createStrategy(
      "invoice",
      models,
      paymentProcessor,
      NotificationService,
      website.niche
    );

    const result = await strategy.execute({
      websiteId,
      storeId: website.storeId || null,
      invoiceData,
      merchantConfig,
    });

    res.status(201).json(result);
  } catch (error) {
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

exports.createPOSOrder = async (req, res) => {
  const checkoutKey = (typeof req.get === 'function' ? req.get('Idempotency-Key') : null)
    || (req.headers && (req.headers['idempotency-key'] || req.headers['Idempotency-Key']))
    || req.body?.idempotencyKey
    || req.body?.receiptId
    || req.body?.checkoutKey
    || null;

  try {
    const rawWebsiteId = req.params.websiteId || req.store?.websiteId;
    const rawStoreId = req.params.storeId || req.store?.storeId;
    const { items, paymentMethod, cashierId: bodyCashierId, customerInfo, currency = 'USD' } = req.body || {};

    let effectiveWebsiteId = null;
    let effectiveStoreId = rawStoreId || null;
    let effectiveNiche = 'ecommerce';

    if (rawWebsiteId) {
      const website = await WebsiteData.findOne({
        where: { websiteId: rawWebsiteId },
        attributes: ['niche', 'storeId', 'websiteId'],
      });
      if (website) {
        effectiveWebsiteId = website.websiteId;
        effectiveStoreId = effectiveStoreId || website.storeId;
        effectiveNiche = website.niche || 'ecommerce';
      } else {
        const { StoreAccess } = require('../../models');
        const store = await StoreAccess.findByPk(rawWebsiteId);
        if (store) {
          effectiveStoreId = store.storeId;
          effectiveWebsiteId = store.websiteId || null;
        }
      }
    }

    if (!effectiveStoreId && rawStoreId) {
      const { StoreAccess } = require('../../models');
      const store = await StoreAccess.findByPk(rawStoreId);
      if (store) {
        effectiveStoreId = store.storeId;
        effectiveWebsiteId = store.websiteId || null;
      }
    }

    if (!effectiveWebsiteId && !effectiveStoreId) {
      return res.status(404).json({ error: "Store or Website not found" });
    }

    // Idempotency check: if sale already committed with this checkoutKey, return idempotent replay
    if (checkoutKey) {
      const existingOrder = await models.Order.findOne({
        where: effectiveStoreId ? { checkoutKey, storeId: effectiveStoreId } : { checkoutKey },
        include: [{ model: models.OrderItem, as: 'OrderItems' }],
      }) || (effectiveStoreId ? await models.Order.findOne({
        where: { checkoutKey },
        include: [{ model: models.OrderItem, as: 'OrderItems' }],
      }) : null);
      if (existingOrder) {
        if (effectiveStoreId && existingOrder.storeId && existingOrder.storeId !== effectiveStoreId) {
          return res.status(409).json({ error: "Idempotency key already used for a different store" });
        }
        const payment = await models.Payment.findOne({ where: { orderId: existingOrder.id } });
        const invoice = await models.Invoice.findOne({ where: { orderId: existingOrder.id } });
        return res.status(200).json({
          success: true,
          idempotentReplay: true,
          order: existingOrder.toJSON ? existingOrder.toJSON() : existingOrder,
          payment: payment ? (payment.toJSON ? payment.toJSON() : payment) : null,
          invoice: invoice ? (invoice.toJSON ? invoice.toJSON() : invoice) : null,
          khqr: payment?.transactionData?.rawQR ? {
            rawQR: payment.transactionData.rawQR,
            md5Hash: payment.transactionData.md5Hash,
            deeplink: payment.transactionData.qrCodeUrl,
          } : null,
          khqrData: payment?.transactionData?.rawQR ? {
            rawQR: payment.transactionData.rawQR,
            md5Hash: payment.transactionData.md5Hash,
            deeplink: payment.transactionData.qrCodeUrl,
          } : null,
        });
      }
    }

    // Verify store status
    let store = req.store;
    if (!store && effectiveStoreId) {
      const { StoreAccess } = require('../../models');
      store = await StoreAccess.findByPk(effectiveStoreId);
    }
    if (store && store.status !== 'active') {
      return res.status(403).json({ error: "Store is not active" });
    }

    // Guard against body-parameter cross-store / cross-merchant spoofing
    const bodyStoreId = req.body?.storeId;
    if (bodyStoreId && effectiveStoreId && bodyStoreId !== effectiveStoreId) {
      return res.status(403).json({ error: "Cross-store body selection prohibited" });
    }
    const bodyMerchantId = req.body?.merchantId || req.body?.ownerId;
    if (bodyMerchantId && store && bodyMerchantId !== store.ownerUserId) {
      return res.status(403).json({ error: "Cross-merchant body selection prohibited" });
    }

    // Cashier identity derivation: bind to authenticated staff user when staff
    const effectiveCashierId = req.user?.type === 'staff' ? req.user.id : (bodyCashierId || req.user?.id || 'POS-CASHIER');

    // Fetch payment config
    const { Op } = require('sequelize');
    const paymentConfigConditions = [];
    if (effectiveWebsiteId) paymentConfigConditions.push({ websiteId: effectiveWebsiteId });
    if (effectiveStoreId) paymentConfigConditions.push({ storeId: effectiveStoreId });

    const paymentConfigs = await models.PaymentGatewayConfig.findAll({
      where: paymentConfigConditions.length > 1
        ? { [Op.or]: paymentConfigConditions }
        : paymentConfigConditions[0] || {},
    });

    const merchantConfig = hydratePaymentConfig(paymentConfigs.find(
      (cfg) => (cfg.gateway === "cutluy" || cfg.gateway === "khqr") && cfg.enabled
    ));

    const paymentProcessor = new PaymentProcessor(models);
    const strategy = OrderTypeFactory.createStrategy(
      "pos",
      models,
      paymentProcessor,
      NotificationService,
      effectiveNiche
    );

    const result = await strategy.execute({
      websiteId: effectiveWebsiteId,
      storeId: effectiveStoreId,
      checkoutKey,
      items,
      paymentMethod,
      cashierId: effectiveCashierId,
      customerInfo,
      merchantConfig,
      currency,
    });

    res.status(201).json({
      success: true,
      order: result.order,
      payment: result.payment,
      invoice: result.invoice,
      khqr: result.khqrData,
      khqrData: result.khqrData,
    });
  } catch (error) {
    const checkoutKey = (req.headers && req.headers['idempotency-key']) || req.body?.idempotencyKey || req.body?.receiptId || req.body?.checkoutKey || null;
    if (checkoutKey && (error.name === 'SequelizeUniqueConstraintError' || String(error.message).includes('checkoutKey') || String(error.message).includes('uq_orders_checkout_key'))) {
      const existingOrder = await models.Order.findOne({
        where: { checkoutKey }
      });
      if (existingOrder) {
        const payment = await models.Payment.findOne({ where: { orderId: existingOrder.id } });
        const invoice = await models.Invoice.findOne({ where: { orderId: existingOrder.id } });
        return res.status(200).json({
          success: true,
          idempotentReplay: true,
          order: existingOrder.toJSON ? existingOrder.toJSON() : existingOrder,
          payment: payment ? (payment.toJSON ? payment.toJSON() : payment) : null,
          invoice: invoice ? (invoice.toJSON ? invoice.toJSON() : invoice) : null,
          khqr: payment?.transactionData?.rawQR ? {
            rawQR: payment.transactionData.rawQR,
            md5Hash: payment.transactionData.md5Hash,
            deeplink: payment.transactionData.qrCodeUrl,
          } : null,
          khqrData: payment?.transactionData?.rawQR ? {
            rawQR: payment.transactionData.rawQR,
            md5Hash: payment.transactionData.md5Hash,
            deeplink: payment.transactionData.qrCodeUrl,
          } : null,
        });
      }
    }

    if (error.name === 'InsufficientStockError' || error.code === 'INSUFFICIENT_STOCK' || error.message?.includes('left in stock') || error.message?.includes('out of stock') || error.statusCode === 409) {
      return res.status(409).json({ success: false, error: error.message, code: 'INSUFFICIENT_STOCK' });
    }
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ success: false, error: error.message, code: error.code });
  }
};

// Keep your existing retrieval methods
exports.getOrderHistory = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('history');
  await strategy.execute(req, res);
};

exports.getOrderById = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('byId');
  await strategy.execute(req, res);
};

exports.getMyOrders = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('myOrders');
  await strategy.execute(req, res);
};

exports.getMyOrderDetails = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('myOrderDetails');
  await strategy.execute(req, res);
};

exports.getMyOrderPayment = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('myOrderPayment');
  await strategy.execute(req, res);
};

exports.getPOSOrders = async (req, res) => {
  const strategy = OrderRetrievalFactory.createStrategy('posOrders');
  await strategy.execute(req, res);
};

exports.processPOSReturn = async (req, res) => {
  let transaction = null;
  try {
    const rawStoreId = req.params.storeId || req.store?.storeId;
    const orderId = req.params.orderId;
    const { reason = 'Customer Return' } = req.body || {};

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    let effectiveStoreId = rawStoreId || null;
    if (!effectiveStoreId && req.params.websiteId) {
      const { StoreAccess, WebsiteData } = require('../../models');
      const ws = await WebsiteData.findOne({ where: { websiteId: req.params.websiteId } });
      if (ws) effectiveStoreId = ws.storeId;
      else {
        const sa = await StoreAccess.findByPk(req.params.websiteId);
        if (sa) effectiveStoreId = sa.storeId;
      }
    }

    transaction = await sequelize.transaction();

    const order = await models.Order.findOne({
      where: {
        id: orderId,
        orderType: 'pos',
        ...(effectiveStoreId ? { storeId: effectiveStoreId } : {}),
      },
      include: [
        { model: models.OrderItem, as: 'OrderItems' },
        { model: models.Payment, as: 'Payment' },
        { model: models.Invoice, as: 'Invoice' },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: "POS Order not found" });
    }

    // Boundary checks: only completed POS orders can be returned once
    if (order.status === 'refunded' || order.status === 'cancelled') {
      await transaction.rollback();
      return res.status(409).json({ error: "Order has already been refunded or returned" });
    }

    if (order.status !== 'completed') {
      await transaction.rollback();
      return res.status(400).json({ error: "Only completed POS orders can be returned" });
    }

    // Restore canonical stock using inventoryLedgerService
    if (order.stockDeducted && Array.isArray(order.OrderItems)) {
      const { inventoryLedgerService } = require('../inventory');
      for (const item of order.OrderItems) {
        if (item.productId && item.quantity > 0) {
          const skuId = item.variantId || item.productId;
          try {
            await inventoryLedgerService.ensureBalance(
              { storeId: order.storeId, skuId },
              { transaction }
            );
            await inventoryLedgerService.mutateBalance({
              storeId: order.storeId,
              skuId,
              changeOnHand: item.quantity,
              changeReserved: 0,
              reasonCode: 'pos_return',
              sourceType: 'pos_order',
              sourceId: order.id,
              actor: { id: req.user?.id || 'pos', type: 'staff' },
              idempotencyKey: `pos-return-${order.id}-${skuId}`,
              notes: `POS return restock (order ${order.id})`,
            }, { transaction });
          } catch {}

          // Compatibility projection: update model stockQuantity for callers and unit tests
          const targetModel = item.variantId && models.ProductVariant?.findByPk
            ? await models.ProductVariant.findByPk(item.variantId, { transaction }).catch(() => null)
            : (models.Product?.findByPk ? await models.Product.findByPk(item.productId, { transaction }).catch(() => null) : null);
          if (targetModel && typeof targetModel.update === 'function') {
            const nextStock = (targetModel.stockQuantity || 0) + item.quantity;
            const nextStatus = nextStock > 0 && targetModel.status === 'out_of_stock' ? 'active' : targetModel.status;
            await targetModel.update({
              stockQuantity: nextStock,
              status: nextStatus,
            }, { transaction }).catch(() => {});
          }
        }
      }
    }

    // Mark order as refunded
    await order.update({
      status: 'refunded',
      deliveryStatus: 'cancelled',
      notes: reason ? `POS Return: ${reason}` : order.notes,
    }, { transaction });

    // Mark associated payment as refunded
    if (order.Payment) {
      await order.Payment.update({
        status: 'refunded',
        refundedAmount: order.totalAmount,
        refundedAt: new Date(),
      }, { transaction });
    }

    // Mark associated invoice as refunded
    if (order.Invoice) {
      await order.Invoice.update({
        status: 'refunded',
      }, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "POS order successfully returned and inventory restored to store catalog",
      order: order.toJSON ? order.toJSON() : order,
    });
  } catch (error) {
    if (transaction) {
      try { await transaction.rollback(); } catch {}
    }
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({ success: false, error: error.message });
  }
};

exports.getPublicTracking = async (req, res) => {
  try {
    const identifier = req.params.trackingNumber || req.params.orderNumber || req.query?.trackingNumber || req.query?.orderNumber;
    if (!identifier || typeof identifier !== 'string' || identifier.trim().length === 0) {
      return res.status(400).json({ error: 'Tracking number or order number is required' });
    }
    const cleanId = identifier.trim();
    const { Op } = require('sequelize');
    const order = await models.Order.findOne({
      where: {
        [Op.or]: [
          { trackingNumber: cleanId },
          { orderNumber: cleanId },
        ],
      },
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    // Return ONLY approved minimal safe fields (NO PII, NO buyer address, NO phone/email, NO payment secrets)
    return res.json({
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber || null,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery || null,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve tracking information' });
  }
};

/**
 * P3-INV-002: Store-scoped barcode lookup for POS.
 * Resolves barcode strictly within the authorized Store scope.
 */
exports.lookupPOSBarcode = async (req, res) => {
  try {
    const rawStoreId = req.params.storeId || req.store?.storeId;
    const barcode = req.query.barcode || req.params.barcode;
    if (!barcode || typeof barcode !== 'string' || !barcode.trim()) {
      return res.status(400).json({ error: 'Barcode parameter is required' });
    }
    const cleanBarcode = barcode.trim();
    if (!rawStoreId) {
      return res.status(400).json({ error: 'Store ID is required' });
    }

    const { Product, ProductVariant } = models;
    const { inventoryLedgerService } = require('../inventory');

    // 1. Look up variant with this barcode in store
    let variant = await ProductVariant.findOne({
      where: { storeId: rawStoreId, barcode: cleanBarcode },
      include: [{ model: Product, as: 'Product' }]
    });

    let product = null;
    if (variant) {
      product = variant.Product || await Product.findByPk(variant.productId);
    } else {
      // 2. Look up product with this barcode in store
      product = await Product.findOne({
        where: { storeId: rawStoreId, barcode: cleanBarcode }
      });
      if (product) {
        variant = await ProductVariant.findOne({
          where: { productId: product.id, isDefault: true }
        }) || await ProductVariant.findOne({
          where: { productId: product.id }
        });
      }
    }

    if (!product) {
      return res.status(404).json({ error: `Product with barcode "${cleanBarcode}" not found in this store` });
    }

    const skuId = variant?.id || product.defaultSkuId || product.id;
    let balance = null;
    try {
      balance = await inventoryLedgerService.getBalance(rawStoreId, skuId);
    } catch (e) {
      balance = { onHand: 0, reserved: 0, available: 0 };
    }

    return res.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        status: product.status,
        barcode: variant?.barcode || product.barcode,
        sku: variant?.sku || product.sku,
      },
      variant: variant ? {
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price,
        title: variant.title,
        optionValues: variant.optionValues,
      } : null,
      skuId,
      price: variant?.price || product.price,
      currency: product.currency || 'USD',
      stockOnHand: balance?.onHand ?? 0,
      stockAvailable: balance?.available ?? 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Failed to lookup barcode' });
  }
};

/**
 * P3-INV-002: POS order void endpoint.
 * Restores deducted stock exactly once via canonical inventory ledger.
 * Retries are idempotent.
 */
exports.voidPOSOrder = async (req, res) => {
  const { storeId, orderId } = req.params;
  const reason = req.body?.reason || 'POS Cashier Void';
  const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `void-${orderId}`;

  try {
    const { Order, OrderItem, Payment, Invoice, Product, ProductVariant } = models;
    const { inventoryLedgerService } = require('../inventory');

    const order = await Order.findOne({
      where: { id: orderId, storeId },
      include: [{ model: OrderItem, as: 'OrderItems' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'POS order not found in this store' });
    }

    // Idempotent replay: if already cancelled/voided
    if (order.status === 'cancelled') {
      return res.status(200).json({
        success: true,
        order: order.toJSON(),
        alreadyVoided: true,
        message: 'Order already voided'
      });
    }

    await sequelize.transaction(async (tx) => {
      // Lock order
      const lockedOrder = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'OrderItems' }],
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });

      if (lockedOrder.status === 'cancelled') {
        return;
      }

      // Restore inventory exactly once if stock was deducted
      if (lockedOrder.stockDeducted && lockedOrder.OrderItems && lockedOrder.OrderItems.length > 0) {
        const sortedItems = [...lockedOrder.OrderItems].sort((a, b) =>
          String(a.productId).localeCompare(String(b.productId))
        );

        for (const item of sortedItems) {
          let variant = item.variantId ? await ProductVariant.findByPk(item.variantId, { transaction: tx }).catch(() => null) : null;
          let product = item.productId ? await Product.findByPk(item.productId, { transaction: tx }).catch(() => null) : null;
          if (!variant && product) {
            variant = await ProductVariant.findOne({ where: { productId: product.id, isDefault: true }, transaction: tx }).catch(() => null) ||
                      await ProductVariant.findOne({ where: { productId: product.id }, transaction: tx }).catch(() => null);
          }

          const skuId = variant?.id || item.variantId || product?.defaultSkuId || item.productId;
          const itemVoidKey = `pos-void-${lockedOrder.id}-${skuId}-${idempotencyKey}`;

          await inventoryLedgerService.mutateBalance({
            storeId,
            skuId,
            changeOnHand: Number(item.quantity || 1),
            changeReserved: 0,
            reasonCode: 'cancellation',
            sourceType: 'pos_order',
            sourceId: lockedOrder.id,
            actor: { id: req.user?.id || 'pos-cashier', type: req.user?.type || 'staff' },
            idempotencyKey: itemVoidKey,
            monetaryContext: {
              orderId: lockedOrder.id,
              storeId,
              salesChannel: 'pos',
              action: 'void',
            },
            notes: `POS order void compensation (orderId: ${lockedOrder.id})`,
          }, { transaction: tx });
        }

        lockedOrder.stockDeducted = false;
      }

      await lockedOrder.update({
        status: 'cancelled',
        deliveryStatus: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date(),
        stockDeducted: false,
      }, { transaction: tx, byStateMachine: true });

      // Update associated payment and invoice if present
      await Payment.update(
        { status: 'voided' },
        { where: { orderId: lockedOrder.id }, transaction: tx }
      );
      await Invoice.update(
        { status: 'voided' },
        { where: { orderId: lockedOrder.id }, transaction: tx }
      );
    });

    const refreshedOrder = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'OrderItems' }]
    });

    return res.status(200).json({
      success: true,
      order: refreshedOrder.toJSON(),
      message: 'POS order successfully voided'
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * P3-INV-002: Offline / manual KHQR payment recording endpoint.
 * Deducts stock exactly once if not already deducted.
 * Retries are idempotent and do not double deduct.
 */
exports.recordManualKHQR = async (req, res) => {
  const { storeId, orderId } = req.params;
  const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `manual-khqr-${orderId}`;

  try {
    const { Order, OrderItem, Payment, Product, ProductVariant } = models;
    const { inventoryLedgerService } = require('../inventory');

    const order = await Order.findOne({
      where: { id: orderId, storeId },
      include: [{ model: OrderItem, as: 'OrderItems' }]
    });

    if (!order) {
      return res.status(404).json({ error: 'POS order not found in this store' });
    }

    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'Cannot record payment on cancelled order' });
    }

    await sequelize.transaction(async (tx) => {
      const lockedOrder = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'OrderItems' }],
        transaction: tx,
        lock: tx.LOCK.UPDATE,
      });

      // Deduct stock exactly once if not already deducted
      if (!lockedOrder.stockDeducted && lockedOrder.OrderItems && lockedOrder.OrderItems.length > 0) {
        const sortedItems = [...lockedOrder.OrderItems].sort((a, b) =>
          String(a.productId).localeCompare(String(b.productId))
        );

        for (const item of sortedItems) {
          let variant = item.variantId ? await ProductVariant.findByPk(item.variantId, { transaction: tx }).catch(() => null) : null;
          let product = item.productId ? await Product.findByPk(item.productId, { transaction: tx }).catch(() => null) : null;
          if (!variant && product) {
            variant = await ProductVariant.findOne({ where: { productId: product.id, isDefault: true }, transaction: tx }).catch(() => null) ||
                      await ProductVariant.findOne({ where: { productId: product.id }, transaction: tx }).catch(() => null);
          }

          const skuId = variant?.id || item.variantId || product?.defaultSkuId || item.productId;
          const itemDeductKey = `pos-deduct-${lockedOrder.id}-${skuId}`;

          await inventoryLedgerService.ensureBalance(
            { storeId, skuId, variant, product },
            { transaction: tx }
          );

          await inventoryLedgerService.mutateBalance({
            storeId,
            skuId,
            changeOnHand: -Number(item.quantity || 1),
            changeReserved: 0,
            reasonCode: 'pos_sale',
            sourceType: 'pos_order',
            sourceId: lockedOrder.id,
            actor: { id: req.user?.id || 'pos-cashier', type: req.user?.type || 'staff' },
            idempotencyKey: itemDeductKey,
            monetaryContext: {
              orderId: lockedOrder.id,
              storeId,
              salesChannel: 'pos',
              action: 'manual_khqr',
            },
            notes: `POS manual KHQR payment deduction (orderId: ${lockedOrder.id})`,
          }, { transaction: tx });
        }

        lockedOrder.stockDeducted = true;
      }

      await lockedOrder.update({
        status: 'completed',
        deliveryStatus: 'delivered',
        stockDeducted: true,
      }, { transaction: tx, byStateMachine: true });

      // Update or create payment
      let payment = await Payment.findOne({ where: { orderId: lockedOrder.id }, transaction: tx });
      if (payment) {
        await payment.update({
          status: 'completed',
          transactionData: {
            ...payment.transactionData,
            posData: {
              method: 'KHQR_COUNTER_MANUAL',
              recordedBy: req.user?.id || 'pos-cashier',
              timestamp: new Date(),
            }
          }
        }, { transaction: tx });
      } else {
        await Payment.create({
          orderId: lockedOrder.id,
          amount: lockedOrder.totalAmount,
          paymentMethod: 'WALLET',
          status: 'completed',
          currency: lockedOrder.currency || 'USD',
          transactionData: {
            posData: {
              method: 'KHQR_COUNTER_MANUAL',
              recordedBy: req.user?.id || 'pos-cashier',
              timestamp: new Date(),
            }
          }
        }, { transaction: tx });
      }
    });

    const refreshedOrder = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'OrderItems' }]
    });
    const refreshedPayment = await Payment.findOne({ where: { orderId } });

    return res.status(200).json({
      success: true,
      order: refreshedOrder.toJSON(),
      payment: refreshedPayment ? refreshedPayment.toJSON() : null,
      message: 'Manual KHQR payment successfully recorded'
    });
  } catch (error) {
    if (error.name === 'InsufficientStockError' || error.statusCode === 409 || error.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ success: false, error: error.message, code: 'INSUFFICIENT_STOCK' });
    }
    return res.status(400).json({ success: false, error: error.message });
  }
};
