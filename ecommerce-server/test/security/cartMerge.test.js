const test = require('node:test');
const assert = require('node:assert/strict');

const { sequelize } = require('../../config/db');
const { Cart } = require('../../models');
const CartController = require('../../modules/cart/CartController');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('storefront cart merge looks up the guest cart instead of failing', async (t) => {
  t.mock.method(sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} }));
  const lookups = [];
  t.mock.method(Cart, 'findOne', async (options) => { lookups.push(options.where); return null; });

  const res = response();
  await CartController.mergeCarts({ user: { userId: 'u1' }, sessionId: 's1' }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, 'No guest cart found to merge');
  assert.deepEqual(lookups, [{ sessionId: 's1' }]);
});
