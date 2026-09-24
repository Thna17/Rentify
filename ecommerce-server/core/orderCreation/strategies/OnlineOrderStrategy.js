// strategies/OnlineOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');
const axios = require('axios');

class OnlineOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { user, websiteId, shippingDetails, paymentMethod, currency = 'USD' } = orderData;
    const { Cart, CartItem, Customer, Product, ProductVariant } = this.models;

    // Validate payment method
    const validPaymentMethods = ['COD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // Get cart identifier
    const cartIdentifier = user.type === "customer" 
      ? { userId: user.id } 
      : { sessionId: user.sessionId };

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
      const product = await Product.findOne({ where: { id: item.productId, websiteId, status: 'active' },
        transaction, lock: transaction.LOCK.UPDATE });
      if (!product) throw new Error('Product is not available on this Website');
      const variant = item.variantId ? await ProductVariant.findOne({
        where: { id: item.variantId, productId: product.id, status: 'active' },
        transaction, lock: transaction.LOCK.UPDATE,
      }) : null;
      if (item.variantId && !variant) throw new Error('Product variant is not available');
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid quantity');
      items.push({
        productId: product.id, variantId: item.variantId,
        quantity: item.quantity,
        price: this.nicheStrategy.calculateItemPrice(product, variant, item.selectedOptions, item.customizations),
        selectedOptions: item.selectedOptions,
        customizations: item.customizations,
        productType: product.productType,
      });
    }

    // Validate products using niche strategy
    await this.validateOrderItems(items, transaction);

    // Get exchange rate for KHR
    const exchangeRate = currency === 'KHR' 
      ? await this.getExchangeRate() 
      : 1;

    // Calculate order totals using niche strategy
    const totals = this.nicheStrategy.calculateOrderTotals(
      items, 
      'online', 
      shippingDetails, 
      currency
    );

    // Adjust totals for currency conversion
    if (currency === 'KHR') {
      Object.keys(totals).forEach(key => {
        if (typeof totals[key] === 'number') {
          totals[key] = totals[key] * exchangeRate;
        }
      });
    }

    // Create or find customer
    let customer = await this.findOrCreateCustomer(user, shippingDetails, websiteId, transaction);

    // Create order
    const order = await this.createOrderRecord({
      websiteId,
      userId: user.type === "customer" ? user.id : null,
      sessionId: user.type === "guest" ? user.sessionId : null,
      customerId: customer?.id,
      customerInfo: {
        ...shippingDetails,
        customerId: customer?.id
      },
      customerEmail: shippingDetails.email,
      currency,
      ...totals
    }, totals, transaction);

    // Create shipping details
    await this.createShippingDetail(order.id, shippingDetails, transaction);

    // Create order items
    const orderItems = await this.createOrderItems(order.id, items, transaction);

    // Update inventory using niche strategy
    await this.nicheStrategy.updateInventory(items, transaction);

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
