const { UsageEvent, Order, Invoice } = require("../../models");
const { findRuleForEvent } = require("./pricingRuleService");

const recordUsageEvent = async ({
  websiteId,
  eventType,
  quantity = 1,
  occurredAt = new Date(),
  metadata = {},
  idempotencyKey,
}) => {
  if (!idempotencyKey) return null;

  const rule = await findRuleForEvent(eventType, occurredAt);
  if (!rule) return null;

  try {
    return await UsageEvent.create({
      websiteId,
      eventType,
      quantity,
      occurredAt,
      metadata,
      idempotencyKey,
      pricePerUnit: rule.pricePerUnit,
      currency: rule.currency,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      return null;
    }
    throw error;
  }
};

const recordOrderPaidEvent = async (orderId, occurredAt = new Date()) => {
  const order = await Order.findByPk(orderId);
  if (!order || !order.websiteId) return null;

  const idempotencyKey = `${order.websiteId}|ORDER_PAID|${order.id}`;
  return recordUsageEvent({
    websiteId: order.websiteId,
    eventType: "ORDER_PAID",
    quantity: 1,
    occurredAt,
    metadata: { orderId: order.id },
    idempotencyKey,
  });
};

const recordInvoicePaidEvent = async (invoiceId, occurredAt = new Date()) => {
  const invoice = await Invoice.findByPk(invoiceId);
  if (!invoice) return null;
  const idempotencyKey = `${invoice.websiteId}|INVOICE_PAID|${invoice.id}`;
  return recordUsageEvent({
    websiteId: invoice.websiteId,
    eventType: "INVOICE_PAID",
    quantity: 1,
    occurredAt,
    metadata: { invoiceId: invoice.id, orderId: invoice.orderId },
    idempotencyKey,
  });
};

const recordStoreViewEvent = async ({
  websiteId,
  sessionId,
  occurredAt = new Date(),
  userAgent,
  ip,
}) => {
  const dateStr = new Date(occurredAt).toISOString().slice(0, 10);
  const idempotencyKey = `${websiteId}|STORE_VIEW|${sessionId}|${dateStr}`;
  return recordUsageEvent({
    websiteId,
    eventType: "STORE_VIEW",
    quantity: 1,
    occurredAt,
    metadata: { sessionId, userAgent, ip },
    idempotencyKey,
  });
};

module.exports = {
  recordUsageEvent,
  recordOrderPaidEvent,
  recordInvoicePaidEvent,
  recordStoreViewEvent,
};
