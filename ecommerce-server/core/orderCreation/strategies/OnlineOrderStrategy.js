// strategies/OnlineOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');
const axios = require('axios');

class OnlineOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { user, websiteId, shippingDetails, paymentMethod, currency = 'USD' } = orderData;
    const { Cart, CartItem, Customer, Product, ProductVariant } = this.models;

    // Validate payment method
    const validPaymentMethods = ['KHQR', 'COD', 'card', 'bank_transfer', 'digital_wallet'];
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

    // Prepare items for validation
    const items = cart.CartItems.map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      price: item.unitPrice,
      selectedOptions: item.selectedOptions,
      customizations: item.customizations,
      productType: item.Product?.productType
    }));

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
    let customer = null;

    if (user.type === "customer") {
      customer = await Customer.findOne({
        where: { id: user.id, websiteId },
        transaction
      });
    }

    if (!customer && shippingDetails.email) {
      customer = await Customer.findOne({
        where: { email: shippingDetails.email, websiteId },
        transaction
      });

      if (!customer) {
        customer = await Customer.create({
          websiteId,
          email: shippingDetails.email,
          firstName: shippingDetails.firstName || '',
          lastName: shippingDetails.lastName || '',
          phone: shippingDetails.phone,
          addresses: [shippingDetails],
          defaultShippingAddress: shippingDetails,
          defaultBillingAddress: shippingDetails
        }, { transaction });
      }
    }

    return customer;
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
    await Customer.update(
      { 
        totalOrders: sequelize.literal('totalOrders + 1'),
        totalSpent: sequelize.literal(`totalSpent + ${totalAmount}`),
        lastOrderDate: new Date()
      },
      { where: { id: customerId }, transaction }
    );
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
