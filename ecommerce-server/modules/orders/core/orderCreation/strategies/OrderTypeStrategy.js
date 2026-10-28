// strategies/OrderTypeStrategy.js
const { sequelize } = require("../../../../../config/db");
const { ApiError } = require("../../../../../utils/ApiError");
const { getWebsiteOwnerContact } = require("../../../../checkout").merchantContactService;

class OrderTypeStrategy {
  constructor(models, paymentProcessor, notificationService, nicheStrategy) {
    this.models = models;
    this.paymentProcessor = paymentProcessor;
    this.notificationService = notificationService;
    this.nicheStrategy = nicheStrategy;
  }

async execute(orderData, existingTransaction = null) {
  const transaction = existingTransaction || await sequelize.transaction();
  let newTransaction = !existingTransaction; // flag to know if we should commit/rollback ourselves

  try {
    const result = await this.processOrder(orderData, transaction);

    if (newTransaction) {
      await transaction.commit();
    }

    return result;
  } catch (error) {
    if (newTransaction && transaction) {
      await transaction.rollback();
    }
    throw error;
  }
}


  async processOrder(orderData, transaction) {
    throw new Error("processOrder must be implemented by subclass");
  }

  // Common validation methods
  async validateOrderItems(items, transaction = null) {
    const { Product, ProductVariant } = this.models;
    const validationErrors = [];
    
    for (const item of items) {
      try {
        const product = await Product.findByPk(item.productId, {
          include: [{
            model: ProductVariant,
            as: 'ProductVariants'
          }],
          transaction
        });

        const variant = item.variantId ? 
          product.ProductVariants.find(v => v.id === item.variantId) : null;

        await this.nicheStrategy.validateProduct(product, variant, item, transaction);
      } catch (error) {
        validationErrors.push({
          productId: item.productId,
          variantId: item.variantId,
          error: error.message
        });
      }
    }

    if (validationErrors.length > 0) {
      throw new ApiError(400, 'Order item validation failed', validationErrors);
    }
  }

  // Common order creation methods
  async createOrderRecord(orderData, totals, transaction = null) {
    const currency = orderData.currency || 'USD';
    const { parseMinor } = require('../../../../../utils/money');

    const subtotalMinor = parseMinor(totals.subtotal, currency);
    const shippingFeeMinor = parseMinor(totals.shippingFee || 0, currency);
    const taxTotalMinor = parseMinor(totals.taxTotal || 0, currency);
    const discountTotalMinor = parseMinor(totals.discountTotal || 0, currency);
    const totalAmountMinor = parseMinor(totals.totalAmount, currency);

    const orderSnapshot = {
      storeId: orderData.storeId || null,
      storeName: orderData.storeName || (orderData.storeId ? `Store ${orderData.storeId.slice(0, 8)}` : 'Storefront'),
      salesChannel: orderData.salesChannel || this.getOrderType(),
      currency,
      subtotal: String(totals.subtotal),
      subtotalMinor,
      deliveryFee: String(totals.shippingFee || '0.00'),
      deliveryFeeMinor: shippingFeeMinor,
      taxTotal: String(totals.taxTotal || '0.00'),
      taxTotalMinor,
      discountTotal: String(totals.discountTotal || '0.00'),
      discountTotalMinor,
      commissionTotal: '0.00',
      commissionTotalMinor: 0,
      totalAmount: String(totals.totalAmount),
      totalAmountMinor,
      policyVersions: {
        delivery: 1,
        tax: 'release-1-zero-tax',
        pricing: 'v1',
      },
      calculatedAt: new Date().toISOString(),
    };

    const order = await this.models.Order.create({
      websiteId: orderData.websiteId,
      orderNiche: this.nicheStrategy.niche,
      orderType: this.getOrderType(),
      status: 'pending',
      stockDeducted: true,
      ...totals,
      ...orderData,
      orderSnapshot,
      metadata: {
        ...(orderData.metadata || {}),
        snapshot: orderSnapshot,
      },
      orderNumber: this.generateOrderNumber()
    }, { transaction });

    return order;
  }

  async createOrderItems(orderId, items, transaction = null, currency = 'USD') {
    const { Product, ProductVariant } = this.models;
    const { parseMinor, formatDecimal } = require('../../../../../utils/money');
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });
      const variant = item.variantId ? 
        await ProductVariant.findByPk(item.variantId, { transaction }) : null;

      const rawPrice = item.price || (variant?.price || product?.price || 0);
      const unitPriceMinor = parseMinor(rawPrice, currency);
      const qty = Number(item.quantity) || 1;
      const totalMinor = unitPriceMinor * qty;
      const priceStr = formatDecimal(unitPriceMinor, currency);
      const totalStr = formatDecimal(totalMinor, currency);

      const lineSnapshot = {
        productId: item.productId,
        productName: product?.name || item.name || 'Product',
        variantId: item.variantId || null,
        sku: variant?.sku || product?.sku || item.sku || '',
        barcode: variant?.barcode || product?.barcode || null,
        attributes: variant?.optionValues || item.selectedOptions || {},
        unitPrice: priceStr,
        unitPriceMinor,
        quantity: qty,
        discount: '0.00',
        discountMinor: 0,
        tax: '0.00',
        taxMinor: 0,
        taxPolicyVersion: 'release-1-zero-tax',
        deliveryFee: '0.00',
        deliveryFeeMinor: 0,
        commission: '0.00',
        commissionMinor: 0,
        total: totalStr,
        totalMinor,
        currency,
        productVersion: product?.version ?? 0,
      };

      const orderItemData = {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        variantName: variant ? this.generateVariantName(variant) : null,
        name: product?.name || item.name || 'Product',
        sku: variant?.sku || product?.sku || item.sku || '',
        quantity: qty,
        basePrice: priceStr,
        price: priceStr,
        total: totalStr,
        currency,
        baseCurrency: currency,
        selectedOptions: item.selectedOptions || {},
        customizations: item.customizations || {},
        lineSnapshot,
        itemMetadata: {
          ...this.nicheStrategy.getItemMetadata(item, product, variant),
          snapshot: lineSnapshot,
        }
      };

      const orderItem = await this.models.OrderItem.create(orderItemData, { transaction });
      orderItems.push(orderItem);
    }

    return orderItems;
  }

  generateVariantName(variant) {
    if (variant.optionValues && typeof variant.optionValues === 'object') {
      return Object.values(variant.optionValues).join(' / ');
    }
    return null;
  }

  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  getOrderType() {
    throw new Error("getOrderType must be implemented by subclass");
  }

  // Common notification methods. Never lets a notification failure fail the
  // order itself — the order is already committed by the time this runs.
  async sendNotifications(result, user, websiteId) {
    try {
      const buyerEmail = result.order.customerEmail || result.order.customerInfo?.email;
      if (buyerEmail) {
        await this.notificationService.sendOrderConfirmation(
          buyerEmail,
          result.order,
          result.orderItems
        );
      }

      const merchantContact = await getWebsiteOwnerContact(websiteId);
      await this.notificationService.sendNewOrderNotification(
        merchantContact,
        result.order,
        result.orderItems
      );
    } catch (error) {
      console.error('Notification sending failed:', error);
    }
  }
}

module.exports = OrderTypeStrategy;
