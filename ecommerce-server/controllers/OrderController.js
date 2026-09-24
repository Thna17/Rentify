// controllers/OrderController.js
const OrderTypeFactory = require("../core/orderCreation/factory/OrderFactory");
const PaymentProcessor = require("../services/PaymentProcessor");
const models = require("../models");
const NotificationService = require("../services/notificationService");
const OrderRetrievalFactory = require('../core/orderRetrieval/factory/OrderRetrievalFactory');
const { WebsiteData } = require("../models");
const { sequelize } = require('../config/db');
const { decryptSecrets } = require("../utils/paymentConfigEncryption");

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
    const invoiceData = req.body.body;

    // Get website niche
    const website = await WebsiteData.findOne({ 
      where: { websiteId },
      attributes: ['niche']
    });
    
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
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
    const { websiteId } = req.params;
    const { items, paymentMethod, cashierId, customerInfo } = req.body;

    // Get website niche
    const website = await WebsiteData.findOne({ 
      where: { websiteId },
      attributes: ['niche']
    });
    
    if (!website) {
      return res.status(404).json({ error: "Website not found" });
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
      "pos",
      models,
      paymentProcessor,
      NotificationService,
      website.niche
    );

    const result = await strategy.execute({
      websiteId,
      items,
      paymentMethod,
      cashierId,
      customerInfo,
      merchantConfig,
    });

    res.status(201).json({
      success: true,
      order: result.order,
      payment: result.payment,
      invoice: result.invoice,
      khqr: result.khqrData,
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
