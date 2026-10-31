// strategies/OnlineOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');
const axios = require('axios');

class OnlineOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { user, websiteId, shippingDetails, paymentMethod, currency = 'USD' } = orderData;
    let storeId = orderData.storeId || null;
    const { Cart, CartItem, Customer, Product, ProductVariant, WebsiteData } = this.models;
    const { Op } = require('sequelize');

    if (!storeId && websiteId) {
      const { resolveWebsiteToStore } = require('../../../services/legacyWebsiteCompatibilityService');
      const resolved = await resolveWebsiteToStore(websiteId, { transaction });
      storeId = resolved.storeId;
    }

    // Validate payment method
    const validPaymentMethods = ['COD', 'KHQR', 'cutluy', 'khqr'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // Get cart identifier
    const cartIdentifier = user.type === "customer" 
      ? { userId: user.id } 
      : (user.type === "user" ? { [this.models.Sequelize.Op.or]: [{ buyerId: user.id }, { userId: user.id }] } : { sessionId: user.sessionId });

    // Find cart with items
    const cart = await Cart.findOne({
      where: { websiteId, ...cartIdentifier },
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
        required: true,
      }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (!cart) throw new Error("Cart not found");
    if (!cart.CartItems?.length) throw new Error("Cart is empty");

    // Lock the canonical Product before reading price or stock. A cart unit
    // price is a display cache and must never become the order price.
    const items = [];
    for (const item of [...cart.CartItems].sort((a, b) => a.productId.localeCompare(b.productId))) {
      const productWhere = {
        id: item.productId,
        status: 'active',
        moderationStatus: 'approved',
      };
      if (storeId && websiteId) {
        productWhere[Op.or] = [{ websiteId }, { storeId }];
      } else if (websiteId) {
        productWhere.websiteId = websiteId;
      } else if (storeId) {
        productWhere.storeId = storeId;
      }

      const product = await Product.findOne({
        where: productWhere,
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!product) throw new Error('Product is not available on this Website or not eligible for purchase');
      const { resolveLegacyItemToSku } = require('../../../services/legacyWebsiteCompatibilityService');
      const resolvedSku = await resolveLegacyItemToSku({
        productId: product.id,
        variantId: item.variantId || null,
        storeId,
      }, { transaction });
      const variant = resolvedSku.variant;
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid quantity');
      items.push({
        productId: product.id,
        variantId: resolvedSku.isVariant ? resolvedSku.skuId : null,
        quantity: item.quantity,
        price: this.nicheStrategy.calculateItemPrice(product, variant, item.selectedOptions, item.customizations),
        selectedOptions: item.selectedOptions,
        customizations: item.customizations,
        productType: product.productType,
      });
    }

    // Validate products using niche strategy
    await this.validateOrderItems(items, transaction);

    // Release 1 Policy: Online checkout is USD only. KHR checkout is disabled.
    if (currency === 'KHR') {
      const error = new Error('KHR online checkout is disabled in Release 1. Online checkout is USD only.');
      error.statusCode = 400;
      error.status = 400;
      error.code = 'KHR_CHECKOUT_DISABLED';
      throw error;
    }
    if (currency !== 'USD') {
      const error = new Error(`Unsupported currency for online checkout: ${currency}`);
      error.statusCode = 400;
      error.status = 400;
      error.code = 'UNSUPPORTED_CURRENCY';
      throw error;
    }

    // Calculate order totals using niche strategy (server calculations are authoritative)
    const totals = this.nicheStrategy.calculateOrderTotals(
      items, 
      'online', 
      shippingDetails, 
      currency
    );

    // Create or find customer
    let customer = await this.findOrCreateCustomer(user, shippingDetails, websiteId, transaction);

    // Create order
    const order = await this.createOrderRecord({
      websiteId: websiteId || null,
      storeId: storeId || null,
      salesChannel: 'storefront',
      deliveryStatus: 'pending',
      orderType: 'online',
      userId: user.type === "customer" ? user.id : null,
      buyerId: user.type === "user" ? user.id : null,
      sessionId: user.type === "guest" ? user.sessionId : null,
      customerId: customer?.id,
      customerInfo: {
        ...shippingDetails,
        customerId: customer?.id
      },
      customerEmail: shippingDetails.email,
      currency,
      stockDeducted: true,
      ...totals
    }, totals, transaction);

    // Create shipping details
    await this.createShippingDetail(order.id, shippingDetails, transaction);

    // Create order items
    const orderItems = await this.createOrderItems(order.id, items, transaction);

    // Update inventory using canonical inventory via niche strategy
    await this.nicheStrategy.updateInventory(items, transaction, {
      orderId: order.id,
      storeId,
      websiteId,
      actor: { id: user?.id || 'storefront_buyer', type: user?.type || 'customer' },
      idempotencyKey: `legacy-order-${order.id}`,
      sourceType: 'legacy_website_order',
      sourceId: order.id,
      currency,
    });

    // Process payment
    const payment = await this.paymentProcessor.process(
      order,
      paymentMethod,
      orderData.merchantConfig,
      transaction,
      currency
    );
    
    // Update order status based on payment
    if (payment.status === 'completed' || payment.status === 'paid') {
      await order.update({ 
        status: 'confirmed',
        stockDeducted: true 
      }, { transaction });
    }

    // Process niche-specific logic
    await this.nicheStrategy.processNicheSpecific(order, orderItems, transaction);

    // Create invoice
    const invoice = await this.createInvoice(
      order, 
      payment, 
      transaction, 
      shippingDetails
    );

    // Clear cart
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });
    await Cart.destroy({ where: { id: cart.id }, transaction });

    // Update customer statistics
    if (customer) {
      await this.updateCustomerStatistics(customer.id, order.totalAmount, transaction);
    }

    return {
      order: order.toJSON(),
      payment: payment.toJSON(),
      invoice: invoice.toJSON(),
      orderItems: orderItems.map(item => item.toJSON())
    };
  }

  async getExchangeRate() {
    try {
      const res = await axios.get(
        "https://v6.exchangerate-api.com/v6/e4242a74360d7b521538fddb/latest/USD",
        { timeout: 5000 }
      );
      return res.data?.conversion_rates?.KHR || 4100;
    } catch (err) {
      console.warn('Failed to fetch exchange rate, using fallback:', err.message);
      return 4100;
    }
  }

  async findOrCreateCustomer(user, shippingDetails, websiteId, transaction) {
    const { Customer } = this.models;
    if (user.type === "customer") {
      const customer = await Customer.findOne({
        where: { id: user.id, storeId: websiteId },
        transaction
      });
      if (!customer) throw new Error('Customer account does not belong to this Website');
      return customer;
    }
    // An order's contact email is not proof of account ownership. Guest and
    // Core-user orders keep their shipping snapshot without linking a local
    // Website Customer by email.
    return null;
  }

  async createShippingDetail(orderId, shippingDetails, transaction) {
    return await this.models.ShippingDetail.create({
      orderId,
      ...shippingDetails
    }, { transaction });
  }

  async createInvoice(order, payment, transaction, customerInfo = {}) {
    const invoiceNumber = this.generateInvoiceNumber();
    
    return await this.models.Invoice.create({
      websiteId: order.websiteId,
      storeId: order.storeId || null,
      orderId: order.id,
      paymentId: payment.id,
      invoiceNumber,
      status: payment.status === 'completed' ? 'paid' : 'sent',
      customerName: customerInfo.name || order.customerInfo?.name || 'Customer',
      customerEmail: customerInfo.email || order.customerInfo?.email,
      subtotal: order.subtotal,
      tax: order.taxTotal || 0,
      discount: order.discountTotal || 0,
      total: order.totalAmount,
      currency: order.currency,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }, { transaction });
  }

  async updateCustomerStatistics(customerId, totalAmount, transaction) {
    const { Customer } = this.models;
    await Customer.increment({ totalOrders: 1, totalSpent: Number(totalAmount) },
      { where: { id: customerId }, transaction });
    await Customer.update({ lastOrderDate: new Date() },
      { where: { id: customerId }, transaction });
  }

  generateInvoiceNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `INV-${timestamp}-${random}`;
  }

  getOrderType() {
    return 'online';
  }
}

module.exports = OnlineOrderStrategy;
