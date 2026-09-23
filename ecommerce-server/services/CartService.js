// services/CartService.js
const { Cart, CartItem, Product, ProductVariant, WebsiteData } = require('../models');
const CartStrategyFactory = require('../core/cart/factories/CartStrategyFactory');
const { Op } = require('sequelize');
const { ApiError } = require('../utils/ApiError');
const { logger } = require('../utils/logger');
const { sequelize } = require('../config/db');

class CartService {
  constructor(websiteId) {
    this.websiteId = websiteId;
    this.strategy = null;
  }

  async initialize() {
    if (!this.strategy) {
      const niche = await this.getWebsiteNiche();
      this.strategy = CartStrategyFactory.createStrategy(niche);
    }
    return this;
  }

  async getWebsiteNiche() {
    const website = await WebsiteData.findOne({
      where: { id: this.websiteId },
      attributes: ['niche']
    });
    return website?.niche || 'ecommerce';
  }

  async getOrCreateCart(identifier, transaction = null) {
    const { userId, sessionId } = identifier;
    
    let cart = await Cart.findOne({
      where: { 
        websiteId: this.websiteId,
        [Op.or]: [
          userId ? { userId } : { sessionId }
        ]
      },
      transaction
    });

    if (!cart) {
      cart = await Cart.create({
        websiteId: this.websiteId,
        userId,
        sessionId,
        version: 0,
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        total: 0
      }, { transaction });
    }

    return cart;
  }

  async addItem(cartIdentifier, itemData, transaction = null) {
    await this.initialize();
    
    const { productId, variantId, quantity, selectedOptions = {}, customizations = {} } = itemData;

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      throw new ApiError(400, 'Invalid product or quantity');
    }

    // Get product and variant
    const { product, variant, price } = await this.validateAndGetProductVariant(
      productId, variantId, selectedOptions, transaction
    );

    // Apply strategy validations
    this.strategy.validateQuantity(quantity);
    this.strategy.validateCustomizations(customizations);
    this.strategy.validateProductSpecific(product, variant, customizations);

    // Check stock
    await this.validateStock(product, variant, quantity, transaction);

    // Get or create cart
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);

    // Calculate final price with customizations
    const finalPrice = this.strategy.calculateItemPrice(product, variant, selectedOptions, customizations);

    // Add or update cart item
    const cartItem = await this.upsertCartItem(
      cart.id, productId, variantId, quantity, finalPrice, selectedOptions, customizations, transaction
    );

    // Update cart totals
    await this.updateCartTotals(cart.id, transaction);

    return { cart, cartItem };
  }

  async validateAndGetProductVariant(productId, variantId, selectedOptions, transaction = null) {
    const product = await Product.findByPk(productId, {
      include: [{
        model: ProductVariant,
        as: 'ProductVariants',
        where: { status: 'active' },
        required: false
      }],
      transaction
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    let variant = null;
    let price = product.price;

    // Handle variant selection
    if (variantId) {
      variant = await ProductVariant.findOne({
        where: { id: variantId, productId, status: 'active' },
        transaction
      });

      if (!variant) {
        throw new ApiError(404, 'Selected variant not found');
      }
      price = variant.price;
    } else if (Object.keys(selectedOptions).length > 0) {
      variant = await ProductVariant.findOne({
        where: { 
          productId,
          optionValues: selectedOptions,
          status: 'active'
        },
        transaction
      });

      if (!variant) {
        throw new ApiError(404, 'No variant matches the selected options');
      }
      price = variant.price;
    } else if (product.ProductVariants?.length > 0) {
      throw new ApiError(400, 'Please select a variant for this product');
    }

    return { product, variant, price };
  }

  async validateStock(product, variant, quantity, transaction = null) {
    const stockItem = variant || product;
    
    if (stockItem.trackInventory && !product.allowBackorders) {
      if (stockItem.stockQuantity < quantity) {
        throw new ApiError(400, `Insufficient stock. Only ${stockItem.stockQuantity} available`);
      }
    }
  }

  async upsertCartItem(cartId, productId, variantId, quantity, unitPrice, selectedOptions, customizations, transaction = null) {
    // Find existing item with same configuration
    const existingItem = await CartItem.findOne({
      where: { 
        cartId, 
        productId,
        variantId: variantId || null
      },
      transaction
    });

    if (existingItem) {
      const optionsMatch = JSON.stringify(existingItem.selectedOptions) === JSON.stringify(selectedOptions);
      const customizationsMatch = JSON.stringify(existingItem.customizations) === JSON.stringify(customizations);
      
      if (optionsMatch && customizationsMatch) {
        // Update quantity
        const newQuantity = existingItem.quantity + quantity;
        await existingItem.update({
          quantity: newQuantity,
          version: existingItem.version + 1
        }, { transaction });
        return existingItem;
      }
    }

    // Create new item
    return await CartItem.create({
      cartId,
      productId,
      variantId,
      quantity,
      unitPrice,
      selectedOptions,
      customizations,
      version: 0
    }, { transaction });
  }

  async updateCartTotals(cartId, transaction = null) {
    await this.initialize();
    
    const cartItems = await CartItem.findAll({
      where: { cartId },
      include: [{
        model: Product,
        attributes: ['id', 'price', 'productType', 'compareAtPrice']
      }],
      transaction
    });

    const subtotal = this.strategy.getSubtotal(cartItems);
    
    // Calculate tax per item (different product types may have different tax rates)
    let taxTotal = 0;
    cartItems.forEach(item => {
      const itemSubtotal = item.unitPrice * item.quantity;
      taxTotal += this.strategy.calculateTax(itemSubtotal, item.Product.productType);
    });

    const shippingTotal = this.strategy.calculateShipping(cartItems);
    
    // Calculate discounts
    let discountTotal = 0;
    cartItems.forEach(item => {
      if (item.compareAtPrice && item.compareAtPrice > item.unitPrice) {
        discountTotal += (item.compareAtPrice - item.unitPrice) * item.quantity;
      }
    });

    const total = subtotal + taxTotal + shippingTotal - discountTotal;

    await Cart.update({
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      shippingTotal: Math.round(shippingTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      version: sequelize.literal('version + 1')
    }, {
      where: { id: cartId },
      transaction
    });

    return { subtotal, taxTotal, discountTotal, shippingTotal, total };
  }

  async getCart(cartIdentifier, transaction = null) {
    await this.initialize();
    
    const { userId, sessionId } = cartIdentifier;
    
    const cart = await Cart.findOne({
      where: { 
        websiteId: this.websiteId,
        [Op.or]: [
          userId ? { userId } : { sessionId }
        ]
      },
      include: [{
        model: CartItem,
        as: 'CartItems',
        include: [
          {
            model: Product,
            include: [{
              model: ProductVariant,
              as: 'ProductVariants',
              where: { status: 'active' },
              required: false
            }]
          },
          {
            model: ProductVariant
          }
        ]
      }],
      transaction
    });

    if (!cart) {
      return this.createEmptyCartResponse(cartIdentifier);
    }

    const metadata = this.strategy.getCartMetadata();
    
    return {
      ...cart.toJSON(),
      metadata,
      niche: this.strategy.niche
    };
  }

  createEmptyCartResponse(identifier) {
    const metadata = this.strategy.getCartMetadata();
    
    return {
      id: null,
      websiteId: this.websiteId,
      ...identifier,
      version: 0,
      CartItems: [],
      subtotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      shippingTotal: 0,
      total: 0,
      metadata,
      niche: this.strategy.niche
    };
  }

  async updateItem(cartIdentifier, itemId, updates, transaction = null) {
    await this.initialize();
    
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);
    
    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      include: [Product, ProductVariant],
      transaction
    });

    if (!cartItem) {
      throw new ApiError(404, 'Cart item not found');
    }

    // Validate updates
    if (updates.quantity !== undefined) {
      this.strategy.validateQuantity(updates.quantity);
      await this.validateStock(cartItem.Product, cartItem.ProductVariant, updates.quantity, transaction);
    }

    if (updates.customizations) {
      this.strategy.validateCustomizations(updates.customizations);
    }

    await cartItem.update({
      ...updates,
      version: cartItem.version + 1
    }, { transaction });

    await this.updateCartTotals(cart.id, transaction);

    return cartItem;
  }

  async updateItemVariant(cartIdentifier, itemId, variantData, transaction = null) {
    await this.initialize();
    
    const { variantId, selectedOptions } = variantData;
    
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);
    
    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
      include: [Product],
      transaction
    });

    if (!cartItem) {
      throw new ApiError(404, 'Cart item not found');
    }

    // Validate new variant
    const { variant, price } = await this.validateAndGetProductVariant(
      cartItem.productId, variantId, selectedOptions, transaction
    );

    // Check stock for new variant with current quantity
    await this.validateStock(cartItem.Product, variant, cartItem.quantity, transaction);

    // Update cart item with new variant
    await cartItem.update({
      variantId: variant.id,
      unitPrice: price,
      selectedOptions: selectedOptions || variant.optionValues,
      version: cartItem.version + 1
    }, { transaction });

    // Update cart totals
    await this.updateCartTotals(cart.id, transaction);

    return this.getEnhancedCartItem(cartItem.id, transaction);
  }

  async mergeCarts(sourceIdentifier, targetIdentifier, transaction = null) {
    await this.initialize();
    
    const sourceCart = await this.getOrCreateCart(sourceIdentifier, transaction);
    const targetCart = await this.getOrCreateCart(targetIdentifier, transaction);

    if (sourceCart.id === targetCart.id) {
      throw new ApiError(400, 'Cannot merge cart with itself');
    }

    const sourceItems = await CartItem.findAll({
      where: { cartId: sourceCart.id },
      include: [Product, ProductVariant],
      transaction
    });

    let mergedCount = 0;
    let skippedCount = 0;

    for (const sourceItem of sourceItems) {
      try {
        // Check if identical item exists in target cart
        const existingItem = await CartItem.findOne({
          where: {
            cartId: targetCart.id,
            productId: sourceItem.productId,
            variantId: sourceItem.variantId || null
          },
          transaction
        });

        if (existingItem) {
          // Check if options and customizations match
          const optionsMatch = JSON.stringify(existingItem.selectedOptions) === 
                             JSON.stringify(sourceItem.selectedOptions);
          const customizationsMatch = JSON.stringify(existingItem.customizations) === 
                                    JSON.stringify(sourceItem.customizations);

          if (optionsMatch && customizationsMatch) {
            // Merge quantities
            const newQuantity = existingItem.quantity + sourceItem.quantity;
            
            // Validate stock for merged quantity
            await this.validateStock(
              sourceItem.Product, 
              sourceItem.ProductVariant, 
              newQuantity, 
              transaction
            );

            await existingItem.update({
              quantity: newQuantity,
              version: existingItem.version + 1
            }, { transaction });
            
            mergedCount++;
          } else {
            // Different configuration, create new item
            await CartItem.create({
              cartId: targetCart.id,
              productId: sourceItem.productId,
              variantId: sourceItem.variantId,
              quantity: sourceItem.quantity,
              unitPrice: sourceItem.unitPrice,
              compareAtPrice: sourceItem.compareAtPrice,
              selectedOptions: sourceItem.selectedOptions,
              customizations: sourceItem.customizations,
              version: 0
            }, { transaction });
            
            mergedCount++;
          }
        } else {
          // No existing item, create new
          await CartItem.create({
            cartId: targetCart.id,
            productId: sourceItem.productId,
            variantId: sourceItem.variantId,
            quantity: sourceItem.quantity,
            unitPrice: sourceItem.unitPrice,
            compareAtPrice: sourceItem.compareAtPrice,
            selectedOptions: sourceItem.selectedOptions,
            customizations: sourceItem.customizations,
            version: 0
          }, { transaction });
          
          mergedCount++;
        }
      } catch (error) {
        // Skip items that can't be merged (e.g., stock issues)
        logger.warn(`Skipping item during merge: ${error.message}`);
        skippedCount++;
        continue;
      }
    }

    // Delete source cart and items after successful merge
    await CartItem.destroy({
      where: { cartId: sourceCart.id },
      transaction
    });

    await Cart.destroy({
      where: { id: sourceCart.id },
      transaction
    });

    // Update target cart totals
    await this.updateCartTotals(targetCart.id, transaction);

    return {
      mergedCount,
      skippedCount,
      targetCartId: targetCart.id,
      sourceCartId: sourceCart.id
    };
  }

  async getEnhancedCartItem(itemId, transaction = null) {
    return await CartItem.findByPk(itemId, {
      include: [
        {
          model: Product,
          include: [
            {
              model: Category,
              attributes: ['id', 'name']
            },
            {
              model: ProductVariant,
              as: 'ProductVariants',
              where: { status: 'active' },
              required: false
            },
            {
              model: ProductOption,
              as: 'ProductOptions',
              required: false
            }
          ]
        },
        {
          model: ProductVariant
        }
      ],
      transaction
    });
  }

  async validateCartItemStock(cartIdentifier, transaction = null) {
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);
    
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [Product, ProductVariant],
      transaction
    });

    const stockIssues = [];

    for (const item of cartItems) {
      const stockItem = item.ProductVariant || item.Product;
      
      if (stockItem.trackInventory && !item.Product.allowBackorders) {
        if (stockItem.stockQuantity < item.quantity) {
          stockIssues.push({
            itemId: item.id,
            productId: item.productId,
            productName: item.Product.name,
            requested: item.quantity,
            available: stockItem.stockQuantity,
            variant: item.ProductVariant?.optionValues || {}
          });
        }
      }
    }

    return {
      hasStockIssues: stockIssues.length > 0,
      issues: stockIssues,
      totalItems: cartItems.length
    };
  }

  async removeItem(cartIdentifier, itemId, transaction = null) {
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);
    
    const deleted = await CartItem.destroy({
      where: { id: itemId, cartId: cart.id },
      transaction
    });

    if (deleted === 0) {
      throw new ApiError(404, 'Cart item not found');
    }

    await this.updateCartTotals(cart.id, transaction);

    return { success: true, itemId };
  }

  async clearCart(cartIdentifier, transaction = null) {
    const cart = await this.getOrCreateCart(cartIdentifier, transaction);
    
    await CartItem.destroy({
      where: { cartId: cart.id },
      transaction
    });

    await this.updateCartTotals(cart.id, transaction);

    return { success: true };
  }
}

module.exports = CartService;