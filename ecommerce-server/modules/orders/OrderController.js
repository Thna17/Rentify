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

    // Get website niche
    const website = await WebsiteData.findOne({
      where: { websiteId, status: 'active' },
      attributes: ['niche', 'storeId'],
      transaction
    });

    if (!website) {
      await transaction.rollback();
      return res.status(404).json({ error: "Website not found" });
    }

    if (website.storeId) {
      const { StoreAccess } = require('../../models');
      const store = await StoreAccess.findByPk(website.storeId, { transaction });
      if (store && store.status !== 'active') {
        await transaction.rollback();
        return res.status(403).json({ error: 'Store is not active' });
      }
    }

    // Fetch payment config
    const paymentConfigs = await models.PaymentGatewayConfig.findAll({
      where: { websiteId } ,
      transaction
    });

    const merchantConfig = hydratePaymentConfig(paymentConfigs.find(
      (cfg) => cfg.gateway === "khqr" && cfg.enabled
    ));

    const paymentProcessor = new PaymentProcessor(models);
    const strategy = OrderTypeFactory.createStrategy(
      "online",
      models,
      paymentProcessor,
      NotificationService,
      website.niche,
    );

    const result = await strategy.execute({
      user,
      websiteId,
      storeId: website.storeId || null,
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
    res.status(400).json({ error: error.message });
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
      (cfg) => cfg.gateway === "khqr" && cfg.enabled
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
    res.status(400).json({ error: error.message });
  }
};

exports.createPOSOrder = async (req, res) => {
  const checkoutKey = (typeof req.get === 'function' ? req.get('Idempotency-Key') : req.headers?.['idempotency-key']) || req.body?.idempotencyKey || req.body?.checkoutKey || null;

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
        where: { checkoutKey }
      });
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
      (cfg) => cfg.gateway === "khqr" && cfg.enabled
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

    const isStockConflict = error.message?.includes('left in stock') || error.message?.includes('out of stock') || error.statusCode === 409;
    const statusCode = isStockConflict ? 409 : (error.statusCode || 400);
    res.status(statusCode).json({ success: false, error: error.message });
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

    // Restore canonical stock using sharedStockService
    const { changeStock } = require('../inventory').sharedStockService;
    if (order.stockDeducted && Array.isArray(order.OrderItems)) {
      for (const item of order.OrderItems) {
        if (item.productId && item.quantity > 0) {
          await changeStock(item.productId, item.quantity, transaction, item.variantId || null);
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
