// ecommerce-server/modules/orders/core/orderCreation/strategies/InvoiceOrderStrategy.js
// P3-INV-002 Slice 5: Routes invoice order creation through canonical invoice fulfillment service.
// Supports draft invoices (0 stock effect), immediate payment (deduction), and pending invoices (reservation).

const OrderTypeStrategy = require('./OrderTypeStrategy');
const { invoiceFulfillmentService } = require('../../../../invoices');
const { createInvoiceOrder } = invoiceFulfillmentService;

class InvoiceOrderStrategy extends OrderTypeStrategy {
  async processOrder(orderData, transaction) {
    const { websiteId, invoiceData = {}, storeId } = orderData;
    const effectiveStoreId = storeId || orderData.storeId;

    return await createInvoiceOrder(
      {
        storeId: effectiveStoreId,
        websiteId,
        invoiceData,
        actor: orderData.actor || { id: 'merchant', role: 'merchant' },
        idempotencyKey: orderData.idempotencyKey || invoiceData.idempotencyKey,
        correlationId: orderData.correlationId,
      },
      { transaction }
    );
  }

  getOrderType() {
    return 'manual';
  }
}

module.exports = InvoiceOrderStrategy;
