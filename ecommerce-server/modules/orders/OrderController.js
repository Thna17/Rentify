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
    res.status(400).json({ success: false, error: error.message });
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
