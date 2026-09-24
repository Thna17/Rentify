const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const service = require('../../services/marketplaceCheckoutService');
const { Cart, CartItem, Product, ProductVariant, StoreAccess, StoreDeliveryPolicy } = require('../../models');

test('marketplace cart: guest session getCart, setCartItem, updateCartItem, and multi-store support', async (t) => {
  const storeId1 = '11111111-1111-4111-8111-111111111111';
  const productId1 = '22222222-2222-4222-8222-222222222222';
  const variantId1 = '33333333-3333-4333-8333-333333333333';

  const storeId2 = '55555555-5555-4555-8555-555555555555';
  const productId2 = '66666666-6666-4666-8666-666666666666';

  const sessionId = 'guest-session-12345';

  const mockStores = new Map([
    [storeId1, {
      storeId: storeId1,
      status: 'active',
      marketplaceApprovalStatus: 'approved',
      marketplaceEntitlement: 'pilot',
      needsCategoryReview: false,
      marketplaceEnabled: true,
    }],
    [storeId2, {
      storeId: storeId2,
      status: 'active',
      marketplaceApprovalStatus: 'approved',
      marketplaceEntitlement: 'pilot',
      needsCategoryReview: false,
      marketplaceEnabled: true,
    }],
  ]);

  const mockPolicies = new Map([
    [storeId1, { storeId: storeId1, flatFee: '2.50', currency: 'USD', version: 1 }],
    [storeId2, { storeId: storeId2, flatFee: '4.00', currency: 'USD', version: 1 }],
  ]);

  const mockProducts = new Map([
    [productId1, {
      id: productId1,
      storeId: storeId1,
      name: 'Silk Scarf',
      slug: 'silk-scarf',
      price: '20.00',
      marketplaceCategory: 'clothing',
      marketplaceVisibility: true,
      status: 'active',
      trackInventory: true,
      stockQuantity: 15,
      images: [{ url: 'https://example.com/scarf.jpg' }],
    }],
    [productId2, {
      id: productId2,
      storeId: storeId2,
      name: 'Ceramic Mug',
      slug: 'ceramic-mug',
      price: '10.00',
      marketplaceCategory: 'ceramics',
      marketplaceVisibility: true,
      status: 'active',
      trackInventory: true,
      stockQuantity: 20,
      images: [{ url: 'https://example.com/mug.jpg' }],
    }],
  ]);

  const mockVariant1 = {
    id: variantId1,
    productId: productId1,
    sku: 'VAR-SILK-RED',
    price: '22.00',
    stockQuantity: 5,
    trackInventory: true,
    status: 'active',
    optionValues: { color: 'Red' },
  };

  const cartsDb = new Map();
  const itemsDb = new Map();
  let nextCartId = 1;
  let nextItemId = 1;

  t.mock.method(StoreAccess, 'findByPk', async (id) => mockStores.get(id) || null);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async (id) => mockPolicies.get(id) || null);
  t.mock.method(Product, 'findByPk', async (id) => mockProducts.get(id) || null);
  t.mock.method(Product, 'findAll', async (options) => {
    if (options?.where?.id) {
      const ids = Array.isArray(options.where.id) ? options.where.id : [options.where.id];
      return ids.map((id) => mockProducts.get(id)).filter(Boolean);
    }
    return [...mockProducts.values()];
  });
  t.mock.method(ProductVariant, 'findByPk', async (id) => (id === variantId1 ? mockVariant1 : null));
  t.mock.method(ProductVariant, 'findAll', async (options) => {
    if (options?.where?.id) {
      const ids = Array.isArray(options.where.id) ? options.where.id : [options.where.id];
      return ids.includes(variantId1) ? [mockVariant1] : [];
    }
    return [mockVariant1];
  });
  t.mock.method(ProductVariant, 'findOne', async (options) => {
    if (options.where?.id === variantId1 && options.where?.productId === productId1) return mockVariant1;
    return null;
  });

  t.mock.method(Cart.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));

  t.mock.method(Cart, 'findOne', async (options) => {
    for (const c of cartsDb.values()) {
      if (options.where?.storeId && c.storeId !== options.where.storeId) continue;
      if (options.where?.sessionId && c.sessionId !== options.where.sessionId) continue;
      if (options.where?.buyerId && c.buyerId !== options.where.buyerId) continue;
      return c;
    }
    return null;
  });

  t.mock.method(Cart, 'findAll', async (options) => {
    const matched = [];
    for (const c of cartsDb.values()) {
      if (options.where?.storeId && c.storeId !== options.where.storeId) continue;
      if (options.where?.sessionId && c.sessionId !== options.where.sessionId) continue;
      if (options.where?.buyerId && c.buyerId !== options.where.buyerId) continue;
      const items = [...itemsDb.values()].filter((it) => it.cartId === c.id);
      matched.push({ ...c, CartItems: items });
    }
    return matched;
  });

  t.mock.method(Cart, 'create', async (data) => {
    const id = randomUUID();
    const cart = {
      id,
      ...data,
      update: async (changes) => Object.assign(cart, changes),
      destroy: async () => cartsDb.delete(id),
    };
    cartsDb.set(id, cart);
    return cart;
  });

  t.mock.method(CartItem, 'findOne', async (options) => {
    for (const item of itemsDb.values()) {
      if (item.cartId === options.where?.cartId && item.productId === options.where?.productId) {
        if (options.where?.variantId !== undefined && item.variantId !== options.where.variantId) continue;
        return item;
      }
    }
    return null;
  });

  t.mock.method(CartItem, 'findByPk', async (id, options) => {
    const item = itemsDb.get(id);
    if (!item) return null;
    const cart = cartsDb.get(item.cartId);
    if (options?.include?.[0]?.where) {
      const where = options.include[0].where;
      if (where.sessionId && cart?.sessionId !== where.sessionId) return null;
      if (where.buyerId && cart?.buyerId !== where.buyerId) return null;
    }
    return {
      ...item,
      Cart: cart,
      update: async (changes) => {
        Object.assign(item, changes);
        return item;
      },
      destroy: async () => itemsDb.delete(id),
    };
  });

  t.mock.method(CartItem, 'count', async (options) => {
    let count = 0;
    for (const it of itemsDb.values()) {
      if (options.where?.cartId && it.cartId === options.where.cartId) count++;
    }
    return count;
  });

  t.mock.method(CartItem, 'create', async (data) => {
    const id = randomUUID();
    const item = {
      id,
      ...data,
      update: async (changes) => Object.assign(item, changes),
      destroy: async () => itemsDb.delete(id),
    };
    itemsDb.set(id, item);
    return item;
  });

  t.mock.method(Cart, 'destroy', async (options) => {
    if (options.where?.id) {
      const ids = Array.isArray(options.where.id) ? options.where.id : [options.where.id];
      for (const id of ids) cartsDb.delete(id);
    }
  });

  t.mock.method(CartItem, 'destroy', async (options) => {
    if (options.where?.cartId) {
      const ids = Array.isArray(options.where.cartId) ? options.where.cartId : [options.where.cartId];
      for (const [k, it] of itemsDb.entries()) {
        if (ids.includes(it.cartId)) itemsDb.delete(k);
      }
    } else if (options.where?.productId) {
      for (const [k, it] of itemsDb.entries()) {
        if (it.productId === options.where.productId) itemsDb.delete(k);
      }
    }
  });

  // 1. Add item with variant as guest session
  const res1 = await service.setCartItem({
    sessionId,
    storeId: storeId1,
    productId: productId1,
    variantId: variantId1,
    quantity: 2,
  });
  assert.equal(res1.length, 1);
  assert.equal(res1[0].storeId, storeId1);
  assert.equal(res1[0].items.length, 1);
  assert.equal(res1[0].items[0].quantity, 2);
  assert.equal(res1[0].items[0].variantId, variantId1);
  assert.equal(res1[0].items[0].currentPrice, '22.00');
  assert.equal(res1[0].subtotal, '44.00');
  assert.equal(res1[0].deliveryFee, '2.50');
  assert.equal(res1[0].totalAmount, '46.50');
  assert.equal(res1[0].checkoutReady, true);

  // 2. Add second product from Store 2 (without passing storeId - auto resolve)
  const resMulti = await service.setCartItem({
    sessionId,
    productId: productId2,
    quantity: 1,
    mode: 'add',
  });
  assert.equal(resMulti.length, 2, 'Adding from store 2 retains store 1 cart');
  const cart1 = resMulti.find((c) => c.storeId === storeId1);
  const cart2 = resMulti.find((c) => c.storeId === storeId2);
  assert.ok(cart1, 'Store 1 cart is present');
  assert.ok(cart2, 'Store 2 cart is present');
  assert.equal(cart2.items[0].product.name, 'Ceramic Mug');

  // 3. Test mode: 'add' increments existing item
  const resAdd = await service.setCartItem({
    sessionId,
    productId: productId2,
    quantity: 2,
    mode: 'add',
  });
  const updatedCart2 = resAdd.find((c) => c.storeId === storeId2);
  assert.equal(updatedCart2.items[0].quantity, 3, 'mode add increments quantity from 1 to 3');

  // 4. Test updateCartItem by itemId
  const item2Id = updatedCart2.items[0].id;
  const resUpdate = await service.updateCartItem({
    sessionId,
    itemId: item2Id,
    quantity: 4,
  });
  const cartAfterUpdate = resUpdate.find((c) => c.storeId === storeId2);
  assert.equal(cartAfterUpdate.items[0].quantity, 4, 'updateCartItem by itemId updates quantity to 4 without deleting');

  // 5. Remove store 2 item by itemId
  const resRemoveItem = await service.updateCartItem({
    sessionId,
    itemId: item2Id,
    quantity: 0,
  });
  assert.equal(resRemoveItem.length, 1, 'Empty store 2 cart is pruned');
  assert.equal(resRemoveItem[0].storeId, storeId1);

  // 6. Clear all carts
  await service.clearCart({ sessionId });
  const resEmpty = await service.getCart({ sessionId });
  assert.equal(resEmpty.length, 0);
});

test('marketplace cart: merge guest cart into authenticated buyer upon sign-in', async (t) => {
  const storeId = '11111111-1111-4111-8111-111111111111';
  const productId = '22222222-2222-4222-8222-222222222222';
  const sessionId = 'guest-session-456';
  const buyerId = '44444444-4444-4444-8444-444444444444';

  const mockStore = {
    storeId, status: 'active', marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot', needsCategoryReview: false, marketplaceEnabled: true,
  };
  const mockPolicy = { storeId, flatFee: '3.00', currency: 'USD', version: 1 };
  const mockProduct = {
    id: productId, storeId, name: 'Clay Pot', slug: 'clay-pot', price: '15.00',
    marketplaceCategory: 'ceramics', status: 'active', trackInventory: false,
    images: [],
  };

  const guestCart = {
    id: 'cart-guest',
    storeId,
    sessionId,
    buyerId: null,
    websiteId: null,
    CartItems: [{ id: 'item-1', cartId: 'cart-guest', productId, variantId: null, quantity: 2, unitPrice: '15.00' }],
    update: async (changes) => Object.assign(guestCart, changes),
    destroy: async () => {},
  };

  t.mock.method(Cart.sequelize, 'transaction', async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => mockStore);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => mockPolicy);
  t.mock.method(Product, 'findAll', async () => [mockProduct]);
  t.mock.method(ProductVariant, 'findAll', async () => []);
  t.mock.method(Cart, 'findAll', async (options) => {
    if (options.where?.sessionId === sessionId) return [guestCart];
    if (options.where?.buyerId === buyerId) return [{ ...guestCart, buyerId, sessionId: null }];
    return [];
  });
  t.mock.method(Cart, 'findOne', async (options) => {
    if (options.where?.buyerId === buyerId) return null; // no existing buyer cart
    return null;
  });

  const merged = await service.mergeCarts({ buyerId, sessionId });
  assert.equal(guestCart.buyerId, buyerId);
  assert.equal(guestCart.sessionId, null);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].items[0].quantity, 2);
});
