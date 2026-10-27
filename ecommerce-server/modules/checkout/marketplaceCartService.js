// Buyer and guest carts for the marketplace and storefront channels (one cart per Store).
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const { Cart, CartItem, Product, ProductVariant, StoreAccess, StoreDeliveryPolicy, WebsiteData } = require('../../models');
const { fail, uuid, cents, dollars, eligibleStore, checkedProductAndVariant } = require('./marketplaceRules');
const { publicationEligibilityService } = require('../catalog');
const { evaluateChannel } = publicationEligibilityService;

function normalizeBuyerOrSession(buyerOrOptions) {
  if (typeof buyerOrOptions === 'object' && buyerOrOptions !== null) {
    return {
      buyerId: buyerOrOptions.buyerId || null,
      sessionId: buyerOrOptions.sessionId || null,
    };
  }
  return { buyerId: buyerOrOptions || null, sessionId: null };
}

async function getCart(buyerOrOptions, storeId, channel = 'marketplace') {
  const { buyerId, sessionId } = normalizeBuyerOrSession(buyerOrOptions);
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');

  const cartWhere = {
    ...(channel === 'marketplace'
      ? { [Op.or]: [{ channel: 'marketplace' }, { channel: null, websiteId: null }] }
      : { [Op.or]: [{ channel: 'storefront' }, { channel: null, websiteId: { [Op.ne]: null } }] }),
    ...(channel === 'marketplace' ? { websiteId: null } : {}),
    ...(storeId ? { storeId } : {}),
  };
  if (buyerId) {
    cartWhere.buyerId = buyerId;
  } else {
    cartWhere.sessionId = sessionId;
  }

  const carts = await Cart.findAll({
    where: cartWhere,
    include: [{ model: CartItem, as: 'CartItems' }],
    order: [['createdAt', 'ASC']],
  });

  return Promise.all(carts.map(async (cart) => {
    const productIds = cart.CartItems.map((item) => item.productId);
    const variantIds = cart.CartItems.map((item) => item.variantId).filter(Boolean);
    const [store, policy, products, variants, website] = await Promise.all([
      StoreAccess.findByPk(cart.storeId),
      StoreDeliveryPolicy.findByPk(cart.storeId),
      Product.findAll({ where: { id: productIds } }),
      ProductVariant.findAll({ where: { id: variantIds } }),
      cart.websiteId ? WebsiteData.findOne({ where: { websiteId: cart.websiteId } }) : null,
    ]);
    const byId = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));

    const issues = [];
    const issueDetails = [];

    // Store & seller availability checks
    if (!store || store.status !== 'active') {
      issues.push('Seller is not available for checkout');
      issueDetails.push({
        code: 'STORE_INACTIVE',
        message: 'Store is temporarily closed or suspended',
        nextAction: 'CHOOSE_ANOTHER_STORE',
        storeId: cart.storeId,
      });
    } else if (channel === 'marketplace') {
      if (store.marketplaceApprovalStatus !== 'approved') {
        issues.push('Seller is pending marketplace approval');
        issueDetails.push({
          code: 'SELLER_NOT_APPROVED',
          message: 'Seller is pending marketplace approval',
          nextAction: 'CHOOSE_ANOTHER_STORE',
          storeId: cart.storeId,
        });
      }
      if (store.marketplaceEntitlement !== 'pilot') {
        issues.push('Seller marketplace entitlement is unavailable');
        issueDetails.push({
          code: 'SELLER_ENTITLEMENT_INELIGIBLE',
          message: 'Seller marketplace entitlement is not active',
          nextAction: 'CHOOSE_ANOTHER_STORE',
          storeId: cart.storeId,
        });
      }
      if (store.needsCategoryReview) {
        issues.push('Seller category is under review');
        issueDetails.push({
          code: 'STORE_CATEGORY_REVIEW',
          message: 'Seller category assignment is under administrative review',
          nextAction: 'CHOOSE_ANOTHER_STORE',
          storeId: cart.storeId,
        });
      }
    } else if (channel === 'storefront') {
      const websiteReady = website && website.status === 'active';
      if (!websiteReady) {
        issues.push('Storefront is not available for checkout');
        issueDetails.push({
          code: 'STOREFRONT_UNAVAILABLE',
          message: 'Storefront website is inactive or unavailable',
          nextAction: 'CONTACT_SELLER',
          storeId: cart.storeId,
          websiteId: cart.websiteId,
        });
      }
    }

    // Delivery policy checks
    if (!policy) {
      issues.push('Seller has not posted a delivery fee');
      issueDetails.push({
        code: 'STORE_DELIVERY_UNAVAILABLE',
        message: 'Seller has not posted a delivery fee',
        nextAction: 'CONTACT_SELLER',
        storeId: cart.storeId,
      });
    } else if (policy.currency !== 'USD') {
      issues.push('Seller has not posted a USD delivery fee');
      issueDetails.push({
        code: 'CURRENCY_MISMATCH',
        message: 'Seller delivery policy must be in USD',
        nextAction: 'CONTACT_SELLER',
        storeId: cart.storeId,
      });
    }

    let subtotal = 0;
    const items = cart.CartItems.map((item) => {
      const product = byId.get(item.productId);
      const variant = item.variantId ? variantById.get(item.variantId) : null;

      if (!product) {
        issues.push(`Product ${item.productId} is unavailable or has insufficient stock`);
        issueDetails.push({
          code: 'PRODUCT_NOT_FOUND',
          message: `Product ${item.productId} was not found`,
          nextAction: 'REMOVE_ITEM',
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          storeId: cart.storeId,
        });
        return {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currentPrice: null,
          priceChanged: false,
          priceChangeNotice: null,
          available: false,
          availability: {
            available: false,
            reasonCode: 'PRODUCT_NOT_FOUND',
            message: 'Product no longer exists',
            nextAction: 'REMOVE_ITEM',
            availableQuantity: 0,
            requestedQuantity: item.quantity,
          },
          product: null,
          variant: null,
        };
      }

      // Re-evaluate eligibility via centralized policy service
      const evalResult = evaluateChannel({
        channel,
        store: store || { storeId: cart.storeId, status: 'inactive' },
        product,
        variant,
        website,
        deliveryPolicy: policy,
        isPrivileged: true,
      });

      const effectivePrice = variant ? variant.price : product.price;
      const currentPrice = effectivePrice ? dollars(cents(effectivePrice)) : null;
      const originalPrice = item.unitPrice ? dollars(cents(item.unitPrice)) : null;
      const priceChanged = Boolean(currentPrice && originalPrice && currentPrice !== originalPrice);

      const trackInventory = variant ? (variant.trackInventory !== false && product.trackInventory !== false) : Boolean(product.trackInventory);
      const stockQuantity = variant ? variant.stockQuantity : product.stockQuantity;

      let stockSufficient = true;
      let stockReason = null;
      if (trackInventory && !product.allowBackorders) {
        if (stockQuantity <= 0) {
          stockSufficient = false;
          stockReason = {
            code: 'OUT_OF_STOCK',
            message: `Product ${item.productId} is unavailable or has insufficient stock`,
            nextAction: 'REMOVE_ITEM',
          };
        } else if (stockQuantity < item.quantity) {
          stockSufficient = false;
          stockReason = {
            code: 'INSUFFICIENT_STOCK',
            message: `Product ${item.productId} is unavailable or has insufficient stock`,
            nextAction: 'REDUCE_QUANTITY',
            availableQuantity: stockQuantity,
            requestedQuantity: item.quantity,
          };
        }
      }

      const itemCurrency = String(variant?.currency || product?.currency || 'USD').toUpperCase();
      let currencyValid = true;
      if (itemCurrency === 'KHR') {
        currencyValid = false;
        issues.push(`Product ${item.productId} uses KHR which is disabled for online checkout in Release 1`);
        issueDetails.push({
          code: 'CURRENCY_MISMATCH',
          message: `Product ${product.name || item.productId} uses KHR which is disabled for online checkout in Release 1`,
          nextAction: 'REMOVE_ITEM',
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          storeId: cart.storeId,
        });
      }

      const isEligible = evalResult.eligible && evalResult.purchasable;
      const available = Boolean(isEligible && stockSufficient && currencyValid);

      const rawBlocker = stockReason || evalResult.primaryBlocker;
      const safeBlocker = (rawBlocker?.code && rawBlocker.code.includes('MODERATION'))
        ? { code: 'UNAVAILABLE', message: `Product ${item.productId} is unavailable`, nextAction: 'REMOVE_ITEM' }
        : (rawBlocker || { code: 'UNAVAILABLE', message: `Product ${item.productId} is unavailable`, nextAction: 'REMOVE_ITEM' });

      const buyerNextAction = available
        ? (priceChanged ? 'ACCEPT_PRICE_CHANGE' : null)
        : (safeBlocker?.code === 'INSUFFICIENT_STOCK'
            ? 'REDUCE_QUANTITY'
            : (safeBlocker?.code === 'PRICE_CHANGED' ? 'ACCEPT_PRICE_CHANGE' : 'REMOVE_ITEM'));

      if (!available && currencyValid) {
        issues.push(safeBlocker.message || `Product ${item.productId} is unavailable or has insufficient stock`);
        issueDetails.push({
          code: safeBlocker.code || 'UNAVAILABLE',
          message: safeBlocker.message || `Product ${item.productId} is unavailable`,
          nextAction: buyerNextAction,
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          storeId: cart.storeId,
        });
      }

      if (priceChanged) {
        issueDetails.push({
          code: 'PRICE_CHANGED',
          message: `Price changed from $${originalPrice} to $${currentPrice}`,
          nextAction: 'ACCEPT_PRICE_CHANGE',
          itemId: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          storeId: cart.storeId,
          originalPrice,
          currentPrice,
        });
      }

      if (currentPrice) subtotal += cents(currentPrice) * item.quantity;

      const reasonCode = available ? (priceChanged ? 'PRICE_CHANGED' : null) : (safeBlocker?.code || (currencyValid ? 'UNAVAILABLE' : 'CURRENCY_MISMATCH'));
      const nextAction = buyerNextAction;
      const itemMsg = available ? (priceChanged ? `Price changed from $${originalPrice} to $${currentPrice}` : null) : (safeBlocker?.message || (currencyValid ? 'Item is unavailable' : 'KHR currency disabled'));

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        originalPrice,
        currentPrice,
        priceChanged,
        priceChangeNotice: priceChanged ? `Price changed from $${originalPrice} to $${currentPrice}` : null,
        available: Boolean(available),
        reasonCode,
        nextAction,
        availableQuantity: trackInventory ? stockQuantity : null,
        requestedQuantity: item.quantity,
        availability: {
          available: Boolean(available),
          reasonCode,
          message: itemMsg,
          nextAction,
          availableQuantity: trackInventory ? stockQuantity : null,
          requestedQuantity: item.quantity,
        },
        product: product ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images || [],
          price: product.price,
          trackInventory: product.trackInventory,
          allowBackorders: product.allowBackorders,
          stockQuantity: product.stockQuantity,
          productType: product.productType,
          status: product.status,
          moderationStatus: product.moderationStatus,
        } : null,
        variant: variant ? {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          optionValues: variant.optionValues,
          status: variant.status,
        } : null,
      };
    });

    if (!items.length) {
      issues.push('Cart is empty');
      issueDetails.push({
        code: 'CART_EMPTY',
        message: 'Cart is empty',
        nextAction: 'ADD_ITEMS',
        storeId: cart.storeId,
      });
    }

    const fee = policy ? cents(policy.flatFee) : null;
    return {
      id: cart.id,
      storeId: cart.storeId,
      storeName: store?.storeName || null,
      channel: cart.channel || channel || (cart.websiteId ? 'storefront' : 'marketplace'),
      websiteId: (cart.channel || channel) === 'storefront' ? (cart.websiteId || store?.websiteId || null) : null,
      items,
      subtotal: dollars(subtotal),
      deliveryFee: items.length === 0 ? '0.00' : (fee === null ? null : dollars(fee)),
      totalAmount: fee === null || issues.length ? null : dollars(subtotal + fee),
      currency: 'USD',
      deliveryPolicyVersion: policy?.version ?? null,
      checkoutReady: issues.length === 0,
      canCheckout: issues.length === 0,
      issues,
      issueDetails,
    };
  }));
}

async function setCartItem({
  buyerId, sessionId, storeId, productId, variantId, quantity, mode = 'set', channel = 'marketplace', websiteId = null,
}) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  uuid(productId, 'product');
  if (variantId) uuid(variantId, 'variant');
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999) fail('Invalid quantity');

  await sequelize.transaction(async (transaction) => {
    let effectiveWebsiteId = websiteId;
    let websiteData = null;

    if (channel === 'storefront') {
      if (effectiveWebsiteId) {
        websiteData = await WebsiteData.findOne({
          where: { websiteId: effectiveWebsiteId },
          transaction,
        });
        if (!websiteData) fail('Storefront not found', 404);
        if (storeId && websiteData.storeId && websiteData.storeId !== storeId) {
          fail('Store does not match Website', 400);
        }
        storeId = websiteData.storeId;
      } else if (storeId) {
        const storeRec = await StoreAccess.findByPk(storeId, { transaction });
        if (storeRec?.websiteId) {
          effectiveWebsiteId = storeRec.websiteId;
          websiteData = await WebsiteData.findOne({
            where: { websiteId: effectiveWebsiteId },
            transaction,
          });
        }
      }
      if (!storeId) fail('Store is required for storefront cart', 400);
    }

    if (!storeId) {
      const p = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
      if (!p) fail('Product not found', 404);
      storeId = p.storeId;
    }
    uuid(storeId, 'Store');

    // Verify product belongs to this store
    const productRecord = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
    if (!productRecord) fail('Product not found', 404);
    if (productRecord.storeId !== storeId) {
      fail(channel === 'storefront' ? 'Product not found for this store' : 'Product not found in specified store', 404);
    }

    const store = await eligibleStore(storeId, transaction, channel);

    const cartWhere = {
      storeId,
      channel,
      ...(channel === 'marketplace' ? { websiteId: null } : { websiteId: effectiveWebsiteId }),
      ...(buyerId ? { buyerId } : { sessionId }),
    };

    let cart = await Cart.findOne({
      where: cartWhere,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const itemWhere = {
      cartId: cart ? cart.id : null,
      productId,
      variantId: variantId || null,
    };
    const item = cart ? await CartItem.findOne({ where: itemWhere, transaction }) : null;

    let targetQuantity = quantity;
    if (mode === 'add') {
      targetQuantity = (item ? item.quantity : 0) + quantity;
      if (targetQuantity > 999) targetQuantity = 999;
    }

    const { product, variant, unitPrice } = targetQuantity
      ? await checkedProductAndVariant(productId, variantId, store, transaction, channel)
      : { product: null, variant: null, unitPrice: null };

    if (targetQuantity) {
      if (variant && variant.trackInventory && targetQuantity > variant.stockQuantity) {
        fail('Insufficient stock', 409);
      } else if (!variant && product && product.trackInventory && targetQuantity > product.stockQuantity) {
        fail('Insufficient stock', 409);
      }
    }

    if (!cart && targetQuantity) {
      cart = await Cart.create({
        buyerId: buyerId || null,
        sessionId: buyerId ? null : sessionId,
        storeId,
        websiteId: channel === 'storefront' ? effectiveWebsiteId : null,
        channel,
        currency: 'USD',
      }, { transaction });
    }
    if (!cart) return;

    if (!targetQuantity) {
      if (item) await item.destroy({ transaction });
      const remaining = await CartItem.count({ where: { cartId: cart.id }, transaction });
      if (remaining === 0) await cart.destroy({ transaction });
    } else if (item) {
      await item.update({ quantity: targetQuantity, unitPrice }, { transaction });
    } else {
      await CartItem.create({
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity: targetQuantity,
        unitPrice,
      }, { transaction });
    }
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function updateCartItem({
  buyerId, sessionId, itemId, storeId, productId, variantId, quantity, channel = 'marketplace',
}) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (quantity !== undefined && (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999)) {
    fail('Invalid quantity');
  }

  if (itemId) {
    uuid(itemId, 'item');
    await sequelize.transaction(async (transaction) => {
      const item = await CartItem.findByPk(itemId, {
        include: [{
          model: Cart,
          where: {
            channel,
            ...(channel === 'marketplace' ? { websiteId: null } : {}),
            ...(buyerId ? { buyerId } : { sessionId }),
          },
        }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item) fail('Cart item not found', 404);
      const cartId = item.cartId;
      if (quantity === 0) {
        await item.destroy({ transaction });
        const remaining = await CartItem.count({ where: { cartId }, transaction });
        if (remaining === 0) await Cart.destroy({ where: { id: cartId }, transaction });
      } else if (quantity !== undefined) {
        const cart = item.Cart;
        const store = await eligibleStore(cart.storeId, transaction, channel);
        const { variant, product, unitPrice } = await checkedProductAndVariant(
          item.productId, item.variantId, store, transaction, channel,
        );
        if (variant && variant.trackInventory && quantity > variant.stockQuantity) {
          fail('Insufficient stock', 409);
        } else if (!variant && product && product.trackInventory && quantity > product.stockQuantity) {
          fail('Insufficient stock', 409);
        }
        await item.update({ quantity, unitPrice }, { transaction });
      }
    });
    return getCart({ buyerId, sessionId }, null, channel);
  }

  return setCartItem({ buyerId, sessionId, storeId, productId, variantId, quantity, channel });
}

async function removeCartItem({ buyerId, sessionId, storeId, productId, variantId, itemId, channel = 'marketplace' }) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');

  await sequelize.transaction(async (transaction) => {
    if (itemId) {
      uuid(itemId, 'item');
      const item = await CartItem.findByPk(itemId, {
        include: [{
          model: Cart,
          where: {
            channel,
            ...(channel === 'marketplace' ? { websiteId: null } : {}),
            ...(buyerId ? { buyerId } : { sessionId }),
          },
        }],
        transaction,
      });
      if (item) {
        const cartId = item.cartId;
        await item.destroy({ transaction });
        const remaining = await CartItem.count({ where: { cartId }, transaction });
        if (remaining === 0) await Cart.destroy({ where: { id: cartId }, transaction });
        return;
      }
      if (productId !== itemId) {
        return;
      }
    }

    if (!productId) fail('Item ID or Product ID is required');
    uuid(productId, 'product');
    if (!storeId) {
      const p = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
      if (p) storeId = p.storeId;
    }
    if (storeId) uuid(storeId, 'Store');

    const cart = await Cart.findOne({
      where: {
        channel,
        ...(channel === 'marketplace' ? { websiteId: null } : {}),
        ...(storeId ? { storeId } : {}),
        ...(buyerId ? { buyerId } : { sessionId }),
      },
      transaction,
    });
    if (!cart) return;

    const itemWhere = {
      cartId: cart.id,
      productId,
      ...(variantId ? { variantId } : {}),
    };
    await CartItem.destroy({ where: itemWhere, transaction });
    const remaining = await CartItem.count({ where: { cartId: cart.id }, transaction });
    if (remaining === 0) await cart.destroy({ transaction });
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function clearCart({ buyerId, sessionId, storeId, channel = 'marketplace' }) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  if (storeId) uuid(storeId, 'Store');

  await sequelize.transaction(async (transaction) => {
    const carts = await Cart.findAll({
      where: {
        channel,
        ...(channel === 'marketplace' ? { websiteId: null } : {}),
        ...(storeId ? { storeId } : {}),
        ...(buyerId ? { buyerId } : { sessionId }),
      },
      transaction,
    });
    const cartIds = carts.map((c) => c.id);
    if (cartIds.length) {
      await CartItem.destroy({ where: { cartId: cartIds }, transaction });
      await Cart.destroy({ where: { id: cartIds }, transaction });
    }
  });

  return getCart({ buyerId, sessionId }, null, channel);
}

async function mergeCarts({ buyerId, sessionId, channel = 'marketplace', storeId, websiteId }) {
  uuid(buyerId, 'buyer');
  if (!sessionId) return getCart({ buyerId }, null, channel);

  await sequelize.transaction(async (transaction) => {
    const guestCartWhere = {
      sessionId,
      channel,
      ...(channel === 'marketplace' ? { websiteId: null } : (websiteId ? { websiteId } : {})),
      ...(storeId ? { storeId } : {}),
    };

    const guestCarts = await Cart.findAll({
      where: guestCartWhere,
      include: [{ model: CartItem, as: 'CartItems' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const guestCart of guestCarts) {
      let buyerCart = await Cart.findOne({
        where: {
          buyerId,
          storeId: guestCart.storeId,
          channel: guestCart.channel,
          websiteId: guestCart.websiteId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!buyerCart) {
        await guestCart.update({ buyerId, sessionId: null }, { transaction });
        continue;
      }

      for (const guestItem of guestCart.CartItems) {
        const itemWhere = {
          cartId: buyerCart.id,
          productId: guestItem.productId,
          variantId: guestItem.variantId || null,
        };
        const existingItem = await CartItem.findOne({ where: itemWhere, transaction });
        if (existingItem) {
          await existingItem.update({
            quantity: Math.min(999, existingItem.quantity + guestItem.quantity),
          }, { transaction });
        } else {
          await guestItem.update({ cartId: buyerCart.id }, { transaction });
        }
      }
      await guestCart.destroy({ transaction });
    }
  });

  return getCart({ buyerId }, null, channel);
}

module.exports = { getCart, setCartItem, updateCartItem, removeCartItem, clearCart, mergeCarts };
