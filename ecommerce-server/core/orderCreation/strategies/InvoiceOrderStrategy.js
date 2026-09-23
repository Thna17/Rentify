// strategies/InvoiceOrderStrategy.js
const OrderTypeStrategy = require('./OrderTypeStrategy');

class InvoiceOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { websiteId, invoiceData, currency = "USD" } = orderData;
    const items = invoiceData.items;

    // Validate products using niche strategy
    await this.validateOrderItems(items, transaction);

    // Determine if we should deduct stock now
    const immediatePaymentMethods = ['cash', 'card'];
    const shouldDeductNow = immediatePaymentMethods.includes(invoiceData.paymentMethod);

    // Calculate totals using niche strategy
    const totals = this.nicheStrategy.calculateOrderTotals(
      items, 
      'manual', 
      invoiceData.shippingInfo, 
      currency
    );

    // Create order
    const order = await this.createOrderRecord({
      websiteId,
      orderType: "manual",
      paymentMethod: invoiceData.paymentMethod,
      status: shouldDeductNow ? 'confirmed' : 'pending',
      stockDeducted: shouldDeductNow,
      customerInfo: {
        name: invoiceData.customerName,
        email: invoiceData.customerEmail,
        phone: invoiceData.customerPhone
      },
      customerEmail: invoiceData.customerEmail,
      currency,
      ...totals
    }, totals, transaction);

    // Create shipping details
    await this.createShippingDetail(
      order.id,
      {
        name: invoiceData.customerName,
        phone: invoiceData.customerPhone,
        email: invoiceData.customerEmail,
        street: invoiceData.address,
      },
      transaction
    );

    // Create order items
    const orderItems = await this.createOrderItems(order.id, items, transaction);

    // Update inventory if immediate payment
    if (shouldDeductNow) {
      await this.nicheStrategy.updateInventory(items, transaction);
    }

    // Process payment
    const payment = await this.paymentProcessor.process(
      order,
      invoiceData.paymentMethod,
      orderData.merchantConfig,
      transaction,
      currency
    );

    // Process niche-specific logic
    await this.nicheStrategy.processNicheSpecific(order, orderItems, transaction);

    // Create invoice
    const invoice = await this.models.Invoice.create(
      {
        websiteId,
        orderId: order.id,
        paymentId: payment.id,
        invoiceNumber: invoiceData.invoiceNumber || this.generateInvoiceNumber(),
        dueDate: invoiceData.dueDate,
        status: payment.status === 'completed' ? 'paid' : 'sent',
        customerName: invoiceData.customerName,
        customerEmail: invoiceData.customerEmail,
        subtotal: order.subtotal,
        tax: order.taxTotal || 0,
        discount: order.discountTotal || 0,
        total: order.totalAmount,
        currency: order.currency,
      },
      { transaction }
    );

    return { 
      order: order.toJSON(),
      payment: payment.toJSON(),
      invoice: invoice.toJSON(),
      orderItems: orderItems.map(item => item.toJSON())
    };
  }

  getOrderType() {
    return 'manual';
  }
}

module.exports = InvoiceOrderStrategy;