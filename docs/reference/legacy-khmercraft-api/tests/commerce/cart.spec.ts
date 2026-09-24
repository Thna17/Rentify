import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product from '../../models/Product';
import { makeProduct, signInBuyer } from './helpers';

const app = createApp();
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('cart', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/cart');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns an empty cart with zero totals on first use', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app).get('/api/cart').set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.subtotal).toBe(0);
    expect(response.body.deliveryFee).toBe(0);
    expect(response.body.total).toBe(0);
    expect(response.body.itemCount).toBe(0);
  });

  it('adds an item and prices it from the database', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 12.5, stock: 10 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body.items[0].price).toBe(12.5);
    expect(response.body.items[0].subtotal).toBe(25);
    expect(response.body.subtotal).toBe(25);
    // Under the $50 threshold, so delivery is charged.
    expect(response.body.deliveryFee).toBe(3.5);
    expect(response.body.total).toBe(28.5);
    expect(response.body.itemCount).toBe(2);
  });

  it('waives delivery once the basket passes the threshold', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 60, stock: 5 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 1 });

    expect(response.body.deliveryFee).toBe(0);
    expect(response.body.total).toBe(60);
  });

  it('increases quantity when the same product is added again', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 3 });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(5);
  });

  it('refuses to add an out-of-stock product', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 0 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('OUT_OF_STOCK');
  });

  it('refuses a quantity beyond available stock', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 3 });

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 4 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('counts what is already in the cart when checking stock', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 3 });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    // 2 already held + 2 more exceeds the 3 in stock.
    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    expect(response.status).toBe(409);
  });

  it('rejects a zero or negative quantity', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct();

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 0 });

    expect(response.status).toBe(422);
  });

  it('returns 404 for an unknown product', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: new mongoose.Types.ObjectId().toString(), quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('updates and removes an item, recalculating totals each time', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 10, stock: 10 });

    const added = await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 1 });

    const itemId = added.body.items[0].id;

    const updated = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set('Cookie', cookie)
      .send({ quantity: 4 });

    expect(updated.body.items[0].quantity).toBe(4);
    expect(updated.body.subtotal).toBe(40);

    const removed = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set('Cookie', cookie);

    expect(removed.body.items).toEqual([]);
    expect(removed.body.subtotal).toBe(0);
  });

  it('returns 404 when updating an item that is not in the cart', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .patch(`/api/cart/items/${new mongoose.Types.ObjectId()}`)
      .set('Cookie', cookie)
      .send({ quantity: 2 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('CART_ITEM_NOT_FOUND');
  });

  it('clears the cart', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 5 });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    const response = await request(app)
      .delete('/api/cart/clear')
      .set('Cookie', cookie);

    expect(response.body.items).toEqual([]);
    expect(response.body.itemCount).toBe(0);
  });

  it('reprices the cart when the product price changes', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 10, stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', cookie)
      .send({ productId: String(product._id), quantity: 2 });

    await Product.updateOne({ _id: product._id }, { $set: { price: 20 } });

    const response = await request(app).get('/api/cart').set('Cookie', cookie);

    // The cart stores no price of its own, so it follows the catalog.
    expect(response.body.items[0].price).toBe(20);
    expect(response.body.subtotal).toBe(40);
  });

  it('keeps carts separate between users', async () => {
    const first = await signInBuyer(app, 'one@khmercraft.test');
    const second = await signInBuyer(app, 'two@khmercraft.test');
    const product = await makeProduct({ stock: 10 });

    await request(app)
      .post('/api/cart/items')
      .set('Cookie', first.cookie)
      .send({ productId: String(product._id), quantity: 2 });

    const response = await request(app)
      .get('/api/cart')
      .set('Cookie', second.cookie);

    expect(response.body.items).toEqual([]);
  });
});
