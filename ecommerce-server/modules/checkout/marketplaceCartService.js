// Buyer and guest carts for the marketplace and storefront channels (one cart per Store).
const { sequelize } = require('../../config/db');
const { Cart, CartItem, Product, ProductVariant, StoreAccess, StoreDeliveryPolicy, WebsiteData } = require('../../models');
const { fail, uuid, cents, dollars, eligibleStore, eligibleProduct, checkedProductAndVariant } = require('./marketplaceRules');

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
  if (channel === 'storefront' && !storeId) fail('Store is required');

  const cartWhere = {
    websiteId: null,
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
    const [store, policy, products, variants] = await Promise.all([
      StoreAccess.findByPk(cart.storeId),
      StoreDeliveryPolicy.findByPk(cart.storeId),
      Product.findAll({ where: { id: productIds } }),
      ProductVariant.findAll({ where: { id: variantIds } }),
    ]);
    const byId = new Map(products.map((product) => [product.id, product]));
    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const issues = [];
    const websiteReady = channel !== 'storefront' || (store?.websiteId && await WebsiteData.findOne({
      where: { websiteId: store.websiteId, storeId: cart.storeId, status: 'active' },
    }));
    if (!store || store.status !== 'active' || !websiteReady || (channel === 'marketplace' &&
        (store.marketplaceApprovalStatus !== 'approved' || store.marketplaceEntitlement !== 'pilot' ||
         store.needsCategoryReview))) issues.push('Seller is not available for checkout');
    if (!policy) issues.push('Seller has not posted a delivery fee');
    let subtotal = 0;
    const items = cart.CartItems.map((item) => {
      const product = byId.get(item.productId);
      const variant = item.variantId ? variantById.get(item.variantId) : null;
      let available = false;
      if (store && eligibleProduct(product, store, channel)) {
        if (variant) {
          available = variant.status === 'active' &&
            (!variant.trackInventory || variant.stockQuantity >= item.quantity);
        } else {
          available = !product.trackInventory || product.stockQuantity >= item.quantity;
        }
      }
      if (!available) issues.push(`Product ${item.productId} is unavailable or has insufficient stock`);
      const effectivePrice = variant ? variant.price : (product ? product.price : null);
      const currentPrice = effectivePrice ? dollars(cents(effectivePrice)) : null;
      if (currentPrice) subtotal += cents(currentPrice) * item.quantity;
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        currentPrice,
        available: Boolean(available),
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
        } : null,
        variant: variant ? {
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          optionValues: variant.optionValues,
        } : null,
      };
    });
    if (!items.length) issues.push('Cart is empty');
    const fee = policy ? cents(policy.flatFee) : null;
    return {
      id: cart.id,
      storeId: cart.storeId,
      websiteId: channel === 'storefront' ? store?.websiteId : null,
      items,
      subtotal: dollars(subtotal),
      deliveryFee: items.length === 0 ? '0.00' : (fee === null ? null : dollars(fee)),
      totalAmount: fee === null || issues.length ? null : dollars(subtotal + fee),
      currency: 'USD',
      deliveryPolicyVersion: policy?.version ?? null,
      checkoutReady: issues.length === 0,
      issues,
    };
  }));
}

async function setCartItem({
  buyerId, sessionId, storeId, productId, variantId, quantity, mode = 'set', channel = 'marketplace',
}) {
  if (!buyerId && !sessionId) fail('Buyer or session identifier is required');
  if (buyerId) uuid(buyerId, 'buyer');
  uuid(productId, 'product');
  if (variantId) uuid(variantId, 'variant');
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 999) fail('Invalid quantity');

  await sequelize.transaction(async (transaction) => {
    if (!storeId) {
      const p = await Product.findByPk(productId, { transaction, attributes: ['id', 'storeId'] });
      if (!p) fail('Product not found', 404);
      storeId = p.storeId;
    }
    uuid(storeId, 'Store');

    const store = await eligibleStore(storeId, transaction, channel);

    const cartWhere = {
      storeId,
      websiteId: null,
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
        websiteId: null,
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
            websiteId: null,
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
            websiteId: null,
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
        websiteId: null,
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
        websiteId: null,
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

async function mergeCarts({ buyerId, sessionId }) {
  uuid(buyerId, 'buyer');
  if (!sessionId) return getCart({ buyerId });

  await sequelize.transaction(async (transaction) => {
    const guestCarts = await Cart.findAll({
      where: { sessionId, websiteId: null },
      include: [{ model: CartItem, as: 'CartItems' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    for (const guestCart of guestCarts) {
      let buyerCart = await Cart.findOne({
        where: { buyerId, storeId: guestCart.storeId, websiteId: null },
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

  return getCart({ buyerId });
}

module.exports = { getCart, setCartItem, updateCartItem, removeCartItem, clearCart, mergeCarts };
