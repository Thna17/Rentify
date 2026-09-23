import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createApp } from '../../src/app';
import Order from '../../models/Order';
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
  delete process.env.PAYWAY_MERCHANT_ID;
  delete process.env.PAYWAY_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

const withPaywayCredentials = () => {
  process.env.PAYWAY_MERCHANT_ID = 'test_merchant';
  process.env.PAYWAY_API_KEY = 'test_api_key';
};

/** Places an order with the given payment method, via the real checkout flow. */
const placeOrder = async (cookie: string[], paymentMethod: string) => {
  const product = await makeProduct({ price: 20, stock: 5 });
  await request(app)
    .post('/api/cart/items')
    .set('Cookie', cookie)
    .send({ productId: String(product._id), quantity: 1 });

  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', cookie)
    .send({ deliveryInfo, paymentMethod });

  expect(response.status).toBe(201);
  return response.body.orderId as string;
};

describe('ABA PayWay checkout session', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .send({ orderId: '000000000000000000000000' });

    expect(response.status).toBe(401);
  });

  it('fails clearly when PayWay is not configured', async () => {
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('PAYWAY_NOT_CONFIGURED');
  });

  it('rejects an order placed with a different payment method', async () => {
    withPaywayCredentials();
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'COD');

    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('WRONG_PAYMENT_METHOD');
  });

  it("404s on someone else's order, same as any other order lookup", async () => {
    withPaywayCredentials();
    const owner = await signInBuyer(app, 'owner@khmercraft.test');
    const orderId = await placeOrder(owner.cookie, 'ABA_PAYWAY');
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');

    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', stranger.cookie)
      .send({ orderId });

    expect(response.status).toBe(404);
  });

  it('builds a signed checkout session and stamps the order with a tran_id', async () => {
    withPaywayCredentials();
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');

    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });

    expect(response.status).toBe(200);
    expect(response.body.checkoutUrl).toContain('/payments/purchase');
    expect(response.body.fields.merchant_id).toBe('test_merchant');
    // Product price ($20) plus whatever delivery fee applies — the total the
    // order itself was priced at, not a number this test should hardcode.
    const order = await Order.findById(orderId);
    expect(response.body.fields.amount).toBe(order!.totalAmount.toFixed(2));
    expect(typeof response.body.fields.hash).toBe('string');
    expect(response.body.fields.hash.length).toBeGreaterThan(0);
    expect(order!.paymentTranId).toBe(response.body.fields.tran_id);
    // PayWay rejects tran_id over 20 characters — confirmed in their docs.
    expect(response.body.fields.tran_id.length).toBeLessThanOrEqual(20);
  });

  it('refuses to build a second session for an already-paid order', async () => {
    withPaywayCredentials();
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    await Order.updateOne({ _id: orderId }, { $set: { paymentStatus: 'PAID' } });

    const response = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ALREADY_PAID');
  });
});

describe('ABA PayWay callback', () => {
  it('acknowledges an unknown tran_id without crashing', async () => {
    const response = await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: 'DOES_NOT_EXIST' });

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
  });

  it("marks the order PAID once PayWay's own status check confirms it, never from the payload alone", async () => {
    withPaywayCredentials();
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    const checkout = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });
    const tranId = checkout.body.fields.tran_id as string;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ data: { payment_status_code: 0, payment_status: 'APPROVED' } }),
      })),
    );

    const response = await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: tranId, status: 0 }); // a forged/claimed status in the payload itself

    expect(response.status).toBe(200);
    const order = await Order.findById(orderId);
    expect(order!.paymentStatus).toBe('PAID');
  });

  it('does not mark an order PAID just because the callback payload claims so', async () => {
    withPaywayCredentials();
    const { cookie } = await signInBuyer(app);
    const orderId = await placeOrder(cookie, 'ABA_PAYWAY');
    const checkout = await request(app)
      .post('/api/payments/aba-payway/checkout')
      .set('Cookie', cookie)
      .send({ orderId });
    const tranId = checkout.body.fields.tran_id as string;

    // PayWay's own status check says it's still pending — an attacker
    // simply POSTing status:0 to our callback must not be enough on its own.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({ data: { payment_status_code: 2, payment_status: 'PENDING' } }),
      })),
    );

    await request(app)
      .post('/api/payments/aba-payway/callback')
      .send({ tran_id: tranId, status: 0 });

    const order = await Order.findById(orderId);
    expect(order!.paymentStatus).toBe('PENDING');
  });
});
