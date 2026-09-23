// strategies/POSOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');

class POSOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { websiteId, items, paymentMethod, cashierId, customerInfo, currency = 'USD' } = orderData;

    // Validate products using niche strategy
    await this.validateOrderItems(items, transaction);

    // Calculate totals using niche strategy
    const totals = this.nicheStrategy.calculateOrderTotals(
      items, 
      'pos', 
      {}, 
      currency
    );

    // Create customer record for POS if provided
    let customer = null;
    if (customerInfo?.email) {
      customer = await this.findOrCreateCustomer(customerInfo, websiteId, transaction);
    }

    // Create order
    const order = await this.createOrderRecord({
      websiteId,
      orderType: "pos",
      customerId: customer?.id,
      status: paymentMethod === 'cash' ? 'completed' : 'pending',
      cashierId,
      stockDeducted: paymentMethod === 'cash',
      customerInfo,
      currency,
      ...totals
    }, totals, transaction);

    // Create order items
    const orderItems = await this.createOrderItems(order.id, items, transaction);

    // Update inventory for immediate payments
    if (paymentMethod === 'cash') {
      await this.nicheStrategy.updateInventory(items, transaction);
    }

    // Process payment
    const payment = await this.paymentProcessor.process(
      order,
      paymentMethod,
      orderData.merchantConfig,
      transaction,
      currency
    );

    // Process niche-specific logic
    await this.nicheStrategy.processNicheSpecific(order, orderItems, transaction);

    // Create invoice
    const invoice = await this.createInvoice(
      order, 
      payment, 
      transaction, 
      customerInfo
    );

    // Update order status for instant payments
    if (paymentMethod === 'cash') {
      await order.update({ 
        status: 'completed',
        stockDeducted: true 
      }, { transaction });
    }

    return {
      order: order.toJSON(),
      payment: payment.toJSON(),
      invoice: invoice.toJSON(),
      orderItems: orderItems.map(item => item.toJSON())
    };
  }

  async findOrCreateCustomer(customerInfo, websiteId, transaction) {
    const { Customer } = this.models;
    
    let customer = await Customer.findOne({
      where: { email: customerInfo.email, websiteId },
      transaction
    });

    if (!customer) {
      customer = await Customer.create({
        websiteId,
        email: customerInfo.email,
        firstName: customerInfo.firstName || 'POS',
        lastName: customerInfo.lastName || 'Customer',
        phone: customerInfo.phone,
        addresses: customerInfo.addresses || [],
      }, { transaction });
    }

    return customer;
  }

  async createInvoice(order, payment, transaction, customerInfo = {}) {
    const invoiceNumber = this.generateInvoiceNumber();
    
    return await this.models.Invoice.create({
      websiteId: order.websiteId,
      orderId: order.id,
      paymentId: payment.id,
      invoiceNumber,
      status: payment.status === 'completed' ? 'paid' : 'sent',
      customerName: customerInfo.name || order.customerInfo?.name || 'POS Customer',
      customerEmail: customerInfo.email || order.customerInfo?.email,
      subtotal: order.subtotal,
      tax: order.taxTotal || 0,
      discount: order.discountTotal || 0,
      total: order.totalAmount,
      currency: order.currency,
    }, { transaction });
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