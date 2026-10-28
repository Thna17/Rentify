// controllers/cartController.js
const { sequelize } = require('../../config/db');
const { Cart } = require('../../models');
const CartService = require('./CartService');
const { ApiError } = require('../../utils/ApiError');
const { logger } = require('../../utils/logger');

class CartController {
  static getCartIdentifier(req) {
    if (req.user && req.user.id) {
      return {
        userId: req.user.id,
        buyerId: req.user.type === 'user' ? req.user.id : null,
        userType: req.user.type,
      };
    }
    return { sessionId: req.sessionId };
  }

  static sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    delete sanitized.buyerId;
    delete sanitized.ownerId;
    delete sanitized.customerId;
    delete sanitized.userId;
    delete sanitized.storeId;
    delete sanitized.websiteId;
    return sanitized;
  }

  static async addToCart(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      const cleanBody = CartController.sanitizeBody(req.body);
      
      const cartService = new CartService(websiteId);
      const { cart, cartItem } = await cartService.addItem(cartIdentifier, cleanBody, transaction);
      
      await transaction.commit();
      
      logger.cartAction('add', cart.id, websiteId, {
        productId: cleanBody.productId,
        quantity: cleanBody.quantity
      });

      res.status(201).json(cartItem);
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async getCart(req, res) {
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const cart = await cartService.getCart(cartIdentifier);
      
      res.json(cart);
    } catch (error) {
      CartController.handleError(error, res);
    }
  }

  static async updateCartItem(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId, itemId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      const cleanBody = CartController.sanitizeBody(req.body);
      
      const cartService = new CartService(websiteId);
      const cartItem = await cartService.updateItem(cartIdentifier, itemId, cleanBody, transaction);
      
      await transaction.commit();
      
      logger.cartAction('update', cartItem.cartId, websiteId, {
        itemId,
        quantity: cleanBody.quantity
      });

      res.json(cartItem);
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async removeFromCart(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId, itemId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const result = await cartService.removeItem(cartIdentifier, itemId, transaction);
      
      await transaction.commit();
      
      logger.cartAction('remove', result.cartId, websiteId, { itemId });
      
      res.status(200).json(result);
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async clearCart(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const result = await cartService.clearCart(cartIdentifier, transaction);
      
      await transaction.commit();
      
      logger.cartAction('clear', websiteId, { cartIdentifier });
      
      res.status(204).send();
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async getCartSummary(req, res) {
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const cart = await cartService.getCart(cartIdentifier);
      
      const summary = {
        totalQuantity: cart.CartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        totalPrice: cart.total || 0,
        itemCount: cart.CartItems?.length || 0
      };
      
      res.json(summary);
    } catch (error) {
      CartController.handleError(error, res);
    }
  }

    static async updateCartItemVariant(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { websiteId, itemId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      const cleanBody = CartController.sanitizeBody(req.body);
      
      const cartService = new CartService(websiteId);
      const updatedItem = await cartService.updateItemVariant(
        cartIdentifier,
        itemId,
        cleanBody,
        transaction
      );
      
      await transaction.commit();
      
      logger.cartAction('update_variant', updatedItem.cartId, websiteId, {
        itemId,
        variantId: cleanBody.variantId
      });

      res.json(updatedItem);
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async mergeCarts(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const userId = req.user?.id || req.user?.userId;
      const sessionId = req.sessionId;

      if (!userId) {
        await transaction.rollback();
        return res.status(400).json({ error: 'User authentication required for cart merge' });
      }

      if (!sessionId) {
        await transaction.rollback();
        return res.status(200).json({ 
          message: 'No guest cart to merge',
          mergedCount: 0,
          skippedCount: 0
        });
      }

      // Get website ID and channel from first cart or request
      const guestCart = await Cart.findOne({
        where: { sessionId },
        attributes: ['websiteId', 'channel']
      });

      if (!guestCart) {
        await transaction.rollback();
        return res.status(200).json({ 
          message: 'No guest cart found to merge',
          mergedCount: 0,
          skippedCount: 0
        });
      }

      if (!guestCart.websiteId || guestCart.channel === 'marketplace') {
        await transaction.rollback();
        const { marketplaceCartService } = require('../checkout');
        const carts = await marketplaceCartService.mergeCarts({
          buyerId: userId,
          sessionId,
          channel: 'marketplace',
        });
        return res.status(200).json({
          message: 'Cart merged successfully',
          mergedCount: Array.isArray(carts) ? carts.reduce((acc, c) => acc + (c.items?.length || 0), 0) : 1,
          skippedCount: 0,
          carts,
        });
      }

      const cartService = new CartService(guestCart.websiteId);
      
      const mergeResult = await cartService.mergeCarts(
        { sessionId }, // source (guest cart)
        { userId, buyerId: req.user?.type === 'user' ? userId : null, userType: req.user?.type }, // target (user cart)
        transaction
      );
      
      await transaction.commit();
      
      logger.cartAction('merge', mergeResult.targetCartId, guestCart.websiteId, {
        sourceCartId: mergeResult.sourceCartId,
        mergedCount: mergeResult.mergedCount,
        skippedCount: mergeResult.skippedCount
      });

      res.json({
        message: 'Cart merged successfully',
        ...mergeResult
      });
    } catch (error) {
      await transaction.rollback();
      CartController.handleError(error, res);
    }
  }

  static async validateCartStock(req, res) {
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const stockValidation = await cartService.validateCartItemStock(cartIdentifier);
      
      res.json(stockValidation);
    } catch (error) {
      CartController.handleError(error, res);
    }
  }

  static async getCartAnalytics(req, res) {
    try {
      const { websiteId } = req.params;
      const cartIdentifier = CartController.getCartIdentifier(req);
      
      const cartService = new CartService(websiteId);
      const cart = await cartService.getCart(cartIdentifier);
      
      const analytics = {
        totalItems: cart.CartItems?.length || 0,
        totalQuantity: cart.CartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        totalValue: cart.total || 0,
        productTypes: {},
        niche: cart.niche,
        metadata: cart.metadata
      };

      // Calculate product type distribution
      if (cart.CartItems) {
        cart.CartItems.forEach(item => {
          const productType = item.Product?.productType || 'unknown';
          analytics.productTypes[productType] = (analytics.productTypes[productType] || 0) + item.quantity;
        });
      }

      res.json(analytics);
    } catch (error) {
      CartController.handleError(error, res);
    }
  }

  static handleError(error, res) {
    logger.error('Cart error:', error);
    
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json(error.toJSON());
    }
    
    if (error.message.includes('stock') || 
        error.message.includes('variant') || 
        error.message.includes('customization') ||
        error.message.includes('Invalid') ||
        error.message.includes('Maximum')) {
      return res.status(400).json({ error: error.message });
    }
    
    if (error.name === 'SequelizeOptimisticLockError') {
      return res.status(409).json({ error: 'Version conflict. Please refresh your cart.' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
}

// Enhanced logger
logger.cartAction = (action, cartId, websiteId, metadata = {}) => {
  logger.info('Cart action', {
    action,
    cartId,
    websiteId,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

module.exports = CartController;