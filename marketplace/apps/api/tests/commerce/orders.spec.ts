import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product from '../../models/Product';
import { deliveryInfo, makeProduct, signInBuyer } from './helpers';

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

const addToCart = (cookie: string[], productId: string, quantity = 1) =>
  request(app)
    .post('/api/cart/items')
    .set('Cookie', cookie)
    .send({ productId, quantity });

describe('checkout', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/orders')
      .send({ deliveryInfo, paymentMethod: 'COD' });

    expect(response.status).toBe(401);
  });

  it('creates an order from the server-side cart', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 12.5, stock: 10 });
    await addToCart(cookie, String(product._id), 2);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ deliveryInfo, paymentMethod: 'COD' });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Order placed successfully.');
    expect(response.body.orderNumber).toMatch(/^KC-\d{6}-[A-Z0-9]{6}$/);
    expect(response.body.orderStatus).toBe('PENDING');
    expect(response.body.paymentStatus).toBe('PENDING');
    expect(response.body.totalAmount).toBe(28.5);
  });

  it('marks demo gateways as paid but cash on delivery as pending', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 10, stock: 10 });

    await addToCart(cookie, String(product._id), 1);
    const aba = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ deliveryInfo, paymentMethod: 'ABA_DEMO' });

    expect(aba.body.paymentStatus).toBe('PAID');
  });

  it('ignores any total the client tries to supply', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 100, stock: 5 });
    await addToCart(cookie, String(product._id), 1);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        deliveryInfo,
        paymentMethod: 'COD',
        totalAmount: 1,
        subtotal: 1,
        deliveryFee: 0,
      });

    // The schema is strict, so unexpected keys are rejected outright rather
    // than silently ignored — a tampered payload never reaches pricing.
    expect(response.status).toBe(422);
  });

  it('prices from the database, not from the requested items', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ price: 40, stock: 5 });

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        items: [{ productId: String(product._id), quantity: 2 }],
        deliveryInfo,
        paymentMethod: 'COD',
      });

    expect(response.status).toBe(201);
    // 2 x 40 = 80, over the free-delivery threshold.
    expect(response.body.totalAmount).toBe(80);
  });

  it('decrements stock and increments soldCount', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 10, soldCount: 0 });

    await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        items: [{ productId: String(product._id), quantity: 3 }],
        deliveryInfo,
        paymentMethod: 'COD',
      });

    const after = await Product.findById(product._id);
    expect(after!.stock).toBe(7);
    expect(after!.soldCount).toBe(3);
  });

  it('clears the cart after checking out from it', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 10 });
    await addToCart(cookie, String(product._id), 2);

    await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ deliveryInfo, paymentMethod: 'COD' });

    const cart = await request(app).get('/api/cart').set('Cookie', cookie);
    expect(cart.body.items).toEqual([]);
  });

  it('rejects checkout with an empty cart', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ deliveryInfo, paymentMethod: 'COD' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('CART_EMPTY');
  });

  it('requires delivery information', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ paymentMethod: 'COD' });

    expect(response.status).toBe(422);
  });

  it('requires a valid payment method', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({ deliveryInfo, paymentMethod: 'BITCOIN' });

    expect(response.status).toBe(422);
  });

  it('refuses to oversell and leaves stock untouched', async () => {
    const { cookie } = await signInBuyer(app);
    const product = await makeProduct({ stock: 2 });

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        items: [{ productId: String(product._id), quantity: 5 }],
        deliveryInfo,
        paymentMethod: 'COD',
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');

    const after = await Product.findById(product._id);
    expect(after!.stock).toBe(2);
  });

  it('rolls back stock already reserved when a later line fails', async () => {
    const { cookie } = await signInBuyer(app);
    const ok = await makeProduct({ name: 'Plenty', stock: 10 });
    const short = await makeProduct({ name: 'Scarce', stock: 1 });

    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        items: [
          { productId: String(ok._id), quantity: 2 },
          { productId: String(short._id), quantity: 5 },
        ],
        deliveryInfo,
        paymentMethod: 'COD',
      });

    expect(response.status).toBe(409);

    // The first line was reserved before the second failed; both must be back
    // to their starting values.
    const okAfter = await Product.findById(ok._id);
    const shortAfter = await Product.findById(short._id);
    expect(okAfter!.stock).toBe(10);
    expect(okAfter!.soldCount).toBe(0);
    expect(shortAfter!.stock).toBe(1);
  });
});

describe('order history', () => {
  const placeOrder = async (cookie: string[]) => {
    const product = await makeProduct({
      name: `Item ${Math.random().toString(36).slice(2, 8)}`,
      stock: 10,
    });
    return request(app)
      .post('/api/orders')
      .set('Cookie', cookie)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }],
        deliveryInfo,
        paymentMethod: 'COD',
      });
  };

  it('lists only the caller’s orders', async () => {
    const mine = await signInBuyer(app, 'mine@khmercraft.test');
    const other = await signInBuyer(app, 'other@khmercraft.test');

    await placeOrder(mine.cookie);
    await placeOrder(other.cookie);

    const response = await request(app)
      .get('/api/orders/my-orders')
      .set('Cookie', mine.cookie);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
  });

  it('returns a single order by id and by order number', async () => {
    const { cookie } = await signInBuyer(app);
    const created = await placeOrder(cookie);

    const byId = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .set('Cookie', cookie);
    const byNumber = await request(app)
      .get(`/api/orders/${created.body.orderNumber}`)
      .set('Cookie', cookie);

    expect(byId.status).toBe(200);
    expect(byNumber.status).toBe(200);
    expect(byNumber.body.orderNumber).toBe(created.body.orderNumber);
  });

  it('hides another buyer’s order behind the same 404 as a missing one', async () => {
    const mine = await signInBuyer(app, 'mine@khmercraft.test');
    const other = await signInBuyer(app, 'other@khmercraft.test');
    const created = await placeOrder(other.cookie);

    const response = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .set('Cookie', mine.cookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ORDER_NOT_FOUND');
  });

  it('returns 404 for an unknown order', async () => {
    const { cookie } = await signInBuyer(app);

    const response = await request(app)
      .get(`/api/orders/${new mongoose.Types.ObjectId()}`)
      .set('Cookie', cookie);

    expect(response.status).toBe(404);
  });
});
