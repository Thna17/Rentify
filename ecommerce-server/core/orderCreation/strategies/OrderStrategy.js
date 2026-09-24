// strategies/OrderStrategy.js
const { ApiError } = require("../../../utils/ApiError");

class OrderStrategy {
  constructor(niche) {
    this.niche = niche;
    this.config = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      taxRate: 0.08,
      requiresPreparation: false,
      supportsDelivery: true,
      supportsPickup: true,
      maxPreparationTime: 60, // minutes
      autoFulfillDigital: false
    };
  }

  // Validation methods
  async validateOrderItems(items, transaction = null) {
    const validationErrors = [];
    
    for (const item of items) {
      try {
        await this.validateOrderItem(item, transaction);
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

  async validateOrderItem(item, transaction = null) {
    const { Product, ProductVariant } = require('../models');
    
    // Validate product exists and is active
    const product = await Product.findOne({
      where: { 
        id: item.productId,
        status: 'active'
      },
      transaction
    });

    if (!product) {
      throw new Error(`Product not found or inactive: ${item.productId}`);
    }

    // Validate variant if specified
    if (item.variantId) {
      const variant = await ProductVariant.findOne({
        where: { 
          id: item.variantId,
          productId: item.productId,
          status: 'active'
        },
        transaction
      });

      if (!variant) {
        throw new Error(`Variant not found: ${item.variantId}`);
      }

      // Validate selected options match variant
      this.validateVariantOptions(item.selectedOptions, variant.optionValues);
    }

    // Validate quantity
    if (item.quantity < 1) {
      throw new Error('Quantity must be at least 1');
    }

    // Validate customizations
    this.validateCustomizations(item.customizations);

    // Niche-specific validation
    await this.validateNicheSpecific(item, product, transaction);
  }

  validateVariantOptions(selectedOptions, variantOptions) {
    if (selectedOptions && typeof selectedOptions === 'object') {
      for (const [key, value] of Object.entries(selectedOptions)) {
        if (variantOptions[key] !== value) {
          throw new Error(`Selected option ${key}=${value} does not match variant`);
        }
      }
    }
  }

  validateCustomizations(customizations) {
    if (customizations && typeof customizations !== 'object') {
      throw new Error('Customizations must be an object');
    }
    // Override in subclasses for niche-specific validation
  }

  async validateNicheSpecific(item, product, transaction) {
    // Override in subclasses
  }

  // Price calculation
  calculateItemPrice(product, variant, selectedOptions = {}, customizations = {}) {
    const basePrice = variant?.price || product.price;
    return this.applyCustomizationPricing(basePrice, customizations);
  }

  applyCustomizationPricing(basePrice, customizations) {
    // Base implementation - override in subclasses
    return basePrice;
  }

  // Order total calculation
  calculateOrderTotals(items, shippingInfo = {}, currency = 'USD') {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    // Calculate item totals
    for (const item of items) {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      
      // Calculate tax per item (different products might have different tax rates)
      const itemTax = this.calculateItemTax(itemTotal, item.productType);
      taxTotal += itemTax;
    }

    // Calculate shipping
    const shippingFee = this.calculateShippingFee(items, shippingInfo);

    // Apply discounts
    const totalAmount = subtotal + taxTotal + shippingFee - discountTotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      shippingFee: Math.round(shippingFee * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  calculateItemTax(itemTotal, productType) {
    const taxRates = {
      digital: 0.10,
      physical: 0.08,
      service: 0.08,
      food: 0.05,
      beverage: 0.05
    };
    
    return itemTotal * (taxRates[productType] || this.config.taxRate);
  }

  calculateShippingFee(items, shippingInfo) {
    // Base shipping logic - override in subclasses
    let shipping = 0;
    
    items.forEach(item => {
      if (item.productType === 'physical') {
        shipping += 2.99; // Base shipping per item
      }
    });

    // Free shipping threshold
    if (this.getItemsSubtotal(items) > 50) {
      shipping = 0;
    }

    return shipping;
  }

  getItemsSubtotal(items) {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  // Inventory management
  async updateInventory(items, transaction = null) {
    for (const item of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      await this.updateItemInventory(item, transaction);
    }
  }

  async updateItemInventory(item, transaction = null) {
    const { changeStock } = require('../../../services/sharedStockService');
    await changeStock(item.productId, -item.quantity, transaction, item.variantId || null);
  }

  // Order creation
  async createOrder(orderData, transaction = null) {
    const { websiteId, customerInfo, items, shippingInfo, orderType = 'online' } = orderData;
    
    // Validate items
    await this.validateOrderItems(items, transaction);

    // Calculate totals
    const totals = this.calculateOrderTotals(items, shippingInfo, orderData.currency);

    // Create order
    const order = await this.createOrderRecord({
      websiteId,
      customerInfo,
      shippingInfo,
      orderType,
      ...totals,
      ...orderData
    }, transaction);

    // Create order items
    const orderItems = await this.createOrderItems(order.id, items, transaction);

    // Update inventory
    await this.updateInventory(items, transaction);

    return { order, orderItems };
  }

  async createOrderRecord(orderData, transaction = null) {
    const Order = require('../models/Order');
    
    return await Order.create({
      orderNiche: this.niche,
      status: 'pending',
      stockDeducted: true,
      ...orderData
    }, { transaction });
  }

  async createOrderItems(orderId, items, transaction = null) {
    const OrderItem = require('../models/OrderItem');
    const { Product, ProductVariant } = require('../models');
    
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
        itemMetadata: this.generateItemMetadata(item, product, variant)
      };

      const orderItem = await OrderItem.create(orderItemData, { transaction });
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

  generateItemMetadata(item, product, variant) {
    return {
      productType: product.productType,
      websiteNiche: product.websiteNiche,
      hasVariants: !!variant,
      variantOptions: variant?.optionValues || {}
    };
  }

  // Niche-specific methods to be implemented by subclasses
  getOrderMetadata() {
    throw new Error('getOrderMetadata must be implemented');
  }

  async processNicheSpecific(order, items, transaction) {
    // Override in subclasses
  }
}

module.exports = OrderStrategy;
