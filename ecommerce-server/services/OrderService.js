// services/OrderService.js
const { Order, OrderItem, Product, ProductVariant, WebsiteData, Cart, CartItem } = require('../models');
const OrderStrategyFactory = require('../core/orderCreation/factory/OrderFactory');
const { Op } = require('sequelize');
const { ApiError } = require('../utils/ApiError');
const { logger } = require('../utils/logger');

class OrderService {
  constructor(websiteId) {
    this.websiteId = websiteId;
    this.strategy = null;
  }

  async initialize() {
    if (!this.strategy) {
      const niche = await this.getWebsiteNiche();
      this.strategy = OrderStrategyFactory.createStrategy(niche);
    }
    return this;
  }

  async getWebsiteNiche() {
    const website = await WebsiteData.findOne({
      where: { id: this.websiteId },
      attributes: ['niche']
    });
    return website?.niche || 'ecommerce';
  }

  async createOrder(orderData, transaction = null) {
    await this.initialize();
    
    const { customerInfo, items, shippingInfo, orderType = 'online', ...otherData } = orderData;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new ApiError(400, 'Order must contain at least one item');
    }

    if (!customerInfo) {
      throw new ApiError(400, 'Customer information is required');
    }

    // Process order using strategy
    const { order, orderItems } = await this.strategy.createOrder(
      { websiteId: this.websiteId, customerInfo, items, shippingInfo, orderType, ...otherData },
      transaction
    );

    // Process niche-specific logic
    await this.strategy.processNicheSpecific(order, orderItems, transaction);

    logger.orderAction('create', order.id, this.websiteId, {
      orderType,
      itemCount: items.length,
      totalAmount: order.totalAmount
    });

    return { order, orderItems };
  }

  async createOrderFromCart(cartIdentifier, orderData, transaction = null) {
    await this.initialize();
    
    const { userId, sessionId } = cartIdentifier;
    
    // Get cart with items
    const cart = await Cart.findOne({
      where: { 
        websiteId: this.websiteId,
        [Op.or]: [
          userId ? { userId } : { sessionId }
        ]
      },
      include: [{
        model: CartItem,
        as: 'CartItems',
        include: [{
          model: Product,
          include: [{
            model: ProductVariant,
            as: 'ProductVariants'
          }]
        }],
        required: true
      }],
      transaction,
      lock: transaction?.LOCK?.UPDATE
    });

    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    if (!cart.CartItems?.length) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Convert cart items to order items
    const orderItems = cart.CartItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.unitPrice,
      selectedOptions: item.selectedOptions,
      customizations: item.customizations,
      productType: item.Product?.productType
    }));

    // Create order
    const result = await this.createOrder({
      ...orderData,
      items: orderItems,
      customerInfo: {
        ...orderData.customerInfo,
        email: orderData.customerInfo?.email || cart.customerEmail
      }
    }, transaction);

    // Clear cart after successful order
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    await Cart.destroy({ where: { id: cart.id }, transaction });

    return result;
  }

  async getOrder(orderId, options = {}) {
    await this.initialize();
    
    const include = [{
      model: OrderItem,
      include: [{
        model: Product,
        include: [{
          model: ProductVariant,
          as: 'ProductVariants'
        }]
      }]
    }];

    if (options.includePayment) {
      include.push({
        model: Payment,
        as: 'payments'
      });
    }

    const order = await Order.findOne({
      where: { 
        id: orderId,
        websiteId: this.websiteId
      },
      include,
      order: [[OrderItem, 'createdAt', 'ASC']]
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    return order;
  }

  async updateOrderStatus(orderId, newStatus, transaction = null) {
    await this.initialize();
    
    const order = await Order.findOne({
      where: { 
        id: orderId,
        websiteId: this.websiteId
      },
      transaction
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    const validStatuses = this.getValidStatusTransitions(order.status);
    if (!validStatuses.includes(newStatus)) {
      throw new ApiError(400, `Invalid status transition from ${order.status} to ${newStatus}`);
    }

    await order.update({ status: newStatus }, { transaction });

    logger.orderAction('status_update', orderId, this.websiteId, {
      oldStatus: order.status,
      newStatus
    });

    return order;
  }

  getValidStatusTransitions(currentStatus) {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['processing', 'cancelled'],
      processing: ['fulfilled', 'cancelled'],
      fulfilled: ['completed', 'cancelled'],
      preparing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['completed', 'cancelled']
    };

    return transitions[currentStatus] || [];
  }

  async getOrders(filters = {}, options = {}) {
    await this.initialize();
    
    const { 
      page = 1, 
      limit = 20, 
      status, 
      orderType, 
      customerEmail,
      startDate,
      endDate
    } = filters;

    const where = { websiteId: this.websiteId };

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (customerEmail) where.customerEmail = { [Op.like]: `%${customerEmail}%` };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [{
        model: OrderItem,
        attributes: ['id', 'name', 'quantity', 'price', 'total']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      distinct: true
    });

    return {
      totalItems: orders.count,
      totalPages: Math.ceil(orders.count / limit),
      currentPage: parseInt(page),
      orders: orders.rows
    };
  }

  async getOrderAnalytics(timeframe = '30d') {
    await this.initialize();
    
    const timeframes = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };

    const days = timeframes[timeframe] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Order.findAll({
      where: {
        websiteId: this.websiteId,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue']
      ],
      group: ['status'],
      raw: true
    });

    const totalOrders = await Order.count({
      where: {
        websiteId: this.websiteId,
        createdAt: { [Op.gte]: startDate }
      }
    });

    const revenueByDay = await Order.findAll({
      where: {
        websiteId: this.websiteId,
        createdAt: { [Op.gte]: startDate },
        status: { [Op.in]: ['completed', 'fulfilled'] }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orders']
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    return {
      timeframe,
      totalOrders,
      statusBreakdown: analytics.reduce((acc, item) => {
        acc[item.status] = {
          count: parseInt(item.count),
          revenue: parseFloat(item.totalRevenue) || 0
        };
        return acc;
      }, {}),
      revenueByDay,
      totalRevenue: analytics.reduce((sum, item) => sum + (parseFloat(item.totalRevenue) || 0), 0)
    };
  }
}

// Enhanced logger
logger.orderAction = (action, orderId, websiteId, metadata = {}) => {
  logger.info('Order action', {
    action,
    orderId,
    websiteId,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

module.exports = OrderService;