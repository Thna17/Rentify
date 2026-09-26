// strategies/OrderTypeStrategy.js
const { sequelize } = require("../../../config/db");
const { ApiError } = require("../../../utils/ApiError");
const { getWebsiteOwnerContact } = require("../../../services/merchantContactService");

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
    const order = await this.models.Order.create({
      websiteId: orderData.websiteId,
      orderNiche: this.nicheStrategy.niche,
      orderType: this.getOrderType(),
      status: 'pending',
      stockDeducted: true,
      ...totals,
      ...orderData,
      orderNumber: this.generateOrderNumber()
    }, { transaction });

    return order;
  }

  async createOrderItems(orderId, items, transaction = null) {
    const { Product, ProductVariant } = this.models;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });
      const variant = item.variantId ? 
        await ProductVariant.findByPk(item.variantId, { transaction }) : null;

      const orderItemData = {
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        variantName: variant ? this.generateVariantName(variant) : null,
        name: product.name,
        sku: variant?.sku || product.sku,
        quantity: item.quantity,
        basePrice: variant?.price || product.price,
        price: item.price || (variant?.price || product.price),
        total: (item.price || (variant?.price || product.price)) * item.quantity,
        selectedOptions: item.selectedOptions || {},
        customizations: item.customizations || {},
        itemMetadata: this.nicheStrategy.getItemMetadata(item, product, variant)
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
