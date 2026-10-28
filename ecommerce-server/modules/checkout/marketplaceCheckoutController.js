const service = require('./marketplaceCheckoutService');
const { Product } = require('../../models');

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

const getIdentifier = (req) => ({
  buyerId: (req.user?.type === 'user' && req.user?.id) ? req.user.id : (req.buyer?.id || null),
  sessionId: req.sessionId || req.cookies?.sessionId || null,
});

module.exports = {
  getDeliveryPolicy: wrap(async (req, res) => res.json({ policy: await service.getDeliveryPolicy(req.params.storeId) })),
  setDeliveryPolicy: wrap(async (req, res) => res.json({ policy: await service.setDeliveryPolicy(
    req.params.storeId, req.body,
  ) })),
  getCart: wrap(async (req, res) => res.json({ carts: await service.getCart(getIdentifier(req), req.query.storeId) })),
  setCartItem: wrap(async (req, res) => res.json({ carts: await service.setCartItem({
    ...getIdentifier(req),
    storeId: req.params.storeId,
    productId: req.params.productId,
    variantId: req.body.variantId,
    quantity: req.body.quantity,
  }) })),
  addToCart: wrap(async (req, res) => {
    let storeId = req.body?.storeId;
    if (req.body?.productId) {
      const product = await Product.findByPk(req.body.productId);
      if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
      }
      if (storeId && product.storeId !== storeId) {
        const error = new Error('Product not found in specified store');
        error.statusCode = 404;
        throw error;
      }
      storeId = product.storeId;
    }
    const quantity = typeof req.body?.quantity === 'number' ? req.body.quantity : 1;
    res.status(201).json({ carts: await service.setCartItem({
      ...getIdentifier(req),
      storeId,
      productId: req.body?.productId,
      variantId: req.body?.variantId,
      quantity,
      mode: 'add',
    }) });
  }),
  updateCartItem: wrap(async (req, res) => {
    let storeId = req.params.storeId || req.body?.storeId;
    let productId = req.params.productId || req.body?.productId;
    const quantity = typeof req.body?.quantity === 'number' ? req.body.quantity : req.body?.quantity;
    if (req.params.itemId) {
      return res.json({ carts: await service.updateCartItem({
        ...getIdentifier(req),
        itemId: req.params.itemId,
        storeId,
        quantity,
      }) });
    }
    if (storeId && productId) {
      const product = await Product.findByPk(productId);
      if (!product || product.storeId !== storeId) {
        const error = new Error('Product not found in specified store');
        error.statusCode = 404;
        throw error;
      }
    }
    res.json({ carts: await service.setCartItem({
      ...getIdentifier(req),
      storeId,
      productId,
      variantId: req.body?.variantId,
      quantity: req.body?.quantity,
    }) });
  }),
  removeCartItem: wrap(async (req, res) => {
    const rawId = req.params.id || req.params.itemId || req.params.productId;
    res.json({ carts: await service.removeCartItem({
      ...getIdentifier(req),
      storeId: req.params.storeId || req.body?.storeId,
      productId: req.params.storeId ? req.params.productId : (req.body?.productId || rawId),
      itemId: req.params.storeId ? undefined : (req.params.itemId || rawId),
      variantId: req.body?.variantId,
    }) });
  }),
  clearCart: wrap(async (req, res) => {
    res.json({ carts: await service.clearCart({
      ...getIdentifier(req),
      storeId: req.params.storeId,
    }) });
  }),
  mergeCarts: wrap(async (req, res) => {
    const sessionId = req.body?.sessionId || req.sessionId;
    res.json({ carts: await service.mergeCarts({
      buyerId: req.user.id,
      sessionId,
    }) });
  }),
  checkout: wrap(async (req, res) => {
    if (Array.isArray(req.body?.storeOrders) || Array.isArray(req.body?.stores)) {
      const storeOrders = req.body.storeOrders || req.body.stores;
      const result = await service.checkoutMultiStore({
        buyerId: req.user.id,
        storeOrders,
        checkoutKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
        customerInfo: req.body.customerInfo,
        shippingInfo: req.body.shippingInfo,
        atomic: req.body.atomic === true,
      });
      return res.status(201).json(result);
    }
    return res.status(201).json({ order: await service.checkout({
      buyerId: req.user.id, storeId: req.body.storeId,
      checkoutKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
      expectedTotalAmount: req.body.expectedTotalAmount,
      customerInfo: req.body.customerInfo, shippingInfo: req.body.shippingInfo,
    }) });
  }),
  buyerOrders: wrap(async (req, res) => res.json({ orders: await service.buyerOrders(req.user.id) })),
  buyerOrder: wrap(async (req, res) => res.json({ order: await service.buyerOrder(req.user.id, req.params.orderId) })),
  buyerOrderEvents: wrap(async (req, res) => res.json({ events: await service.buyerOrderEvents(req.user.id, req.params.orderId) })),
  buyerReport: wrap(async (req, res) => {
    const { buyerReportService } = require('../support');
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey || null;
    const correlationId = req.get('X-Correlation-ID') || null;
    const subjectType = req.params.type === 'return_requested' ? 'return' : 'order';
    const category = req.params.type === 'return_requested' ? 'return_claim' : 'order_complaint';
    const reason = typeof req.body?.reason === 'string' ? req.body.reason : (req.body?.notes || req.params.type);
    const description = typeof req.body?.notes === 'string' ? req.body.notes : reason;
    const evidence = req.body?.evidence || (req.body?.evidenceUrl ? [req.body.evidenceUrl] : []);

    try {
      const result = await buyerReportService.submitBuyerReport(
        req.user.id,
        {
          subjectType,
          subjectId: req.params.orderId,
          category,
          reason,
          description: description && description.length >= 10 ? description : `${description} (additional details provided)`,
          evidence,
        },
        { idempotencyKey, correlationId }
      );
      res.status(201).json({
        success: true,
        event: { id: result.report.id, type: req.params.type },
        data: result,
      });
    } catch (err) {
      // Fallback to legacy service if needed
      if (err.code === 'REPORT_NOT_FOUND' || err.code === 'INVALID_SUBJECT_TYPE') {
        const legacyEvent = await service.buyerReport({
          buyerId: req.user.id, orderId: req.params.orderId,
          eventKey: idempotencyKey,
          type: req.params.type, details: req.body,
        });
        return res.status(201).json({ event: legacyEvent });
      }
      throw err;
    }
  }),
  checkReportEligibility: wrap(async (req, res) => {
    const { buyerReportService } = require('../support');
    const result = await buyerReportService.evaluateEligibility(req.user.id, {
      subjectType: req.query.subjectType,
      subjectId: req.query.subjectId,
    });
    res.json({ success: true, data: result });
  }),
  submitReport: wrap(async (req, res) => {
    const { buyerReportService } = require('../support');
    const idempotencyKey = req.get('Idempotency-Key') || req.body?.idempotencyKey || null;
    const correlationId = req.get('X-Correlation-ID') || null;
    const result = await buyerReportService.submitBuyerReport(
      req.user.id,
      req.body,
      { idempotencyKey, correlationId }
    );
    res.status(201).json({ success: true, data: result });
  }),
  myReports: wrap(async (req, res) => {
    const { buyerReportService } = require('../support');
    const result = await buyerReportService.listReports({
      buyerId: req.user.id,
      subjectType: req.query.subjectType,
      page: Number.parseInt(req.query.page, 10) || 1,
      limit: Number.parseInt(req.query.limit, 10) || 20,
    });
    res.json({ success: true, data: result.items, total: result.total, page: result.page, limit: result.limit });
  }),
  getReport: wrap(async (req, res) => {
    const { buyerReportService } = require('../support');
    const facts = await buyerReportService.getAuthoritativeFacts(req.params.id);
    if (facts.report.buyerId !== req.user.id) {
      const err = new Error('Unauthorized');
      err.statusCode = 403;
      throw err;
    }
    res.json({ success: true, data: facts });
  }),
  merchantOrder: wrap(async (req, res) => res.json({ order: await service.merchantOrder(
    req.params.storeId, req.params.orderId,
  ) })),
  merchantOrders: wrap(async (req, res) => res.json(await service.merchantOrders(req.params.storeId, req.query))),
  merchantOrderAction: wrap(async (req, res) => {
    await service.merchantAction({
      storeId: req.params.storeId, orderId: req.params.orderId, actorId: req.user.id,
      eventKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
      action: req.params.action, details: req.body,
    });
    res.json({ order: await service.merchantOrder(req.params.storeId, req.params.orderId) });
  }),
  sellerOrder: wrap(async (req, res) => res.json({ order: await service.buyerOrderForStore(
    req.params.storeId, req.params.orderId,
  ) })),
  sellerOrders: wrap(async (req, res) => res.json({ orders: await service.sellerOrders(req.params.storeId) })),
  orderEvents: wrap(async (req, res) => res.json({ events: await service.orderEvents(
    req.params.storeId, req.params.orderId,
  ) })),
  sellerAction: wrap(async (req, res) => res.json({ order: await service.merchantAction({
    storeId: req.params.storeId, orderId: req.params.orderId, actorId: req.user.id,
    eventKey: req.get('Idempotency-Key') || req.body.idempotencyKey,
    action: req.params.action, details: req.body,
  }) })),
  getPublicTracking: wrap(async (req, res) => {
    const trackingNumber = req.params.trackingNumber || req.query?.trackingNumber;
    if (!trackingNumber) {
      const error = new Error('Tracking number is required');
      error.statusCode = 400;
      throw error;
    }
    const { Order } = require('../../models');
    const { Op } = require('sequelize');
    const cleanNum = trackingNumber.trim();
    const order = await Order.findOne({
      where: {
        [Op.or]: [
          { trackingNumber: cleanNum },
          { orderNumber: cleanNum },
        ],
      },
    });
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber || null,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery || null,
    });
  }),
};
