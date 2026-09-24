import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product from '../../models/Product';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { deliveryInfo, makeProduct, signInBuyer, strongPassword } from './helpers';

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

const signInSeller = async (email = 'seller@khmercraft.test') => {
  const seller = await User.create({
    name: 'Srey Khmer Handmade Store',
    email,
    password_hash: await hashPassword(strongPassword),
    role: 'SELLER',
    status: 'ACTIVE',
  });
  return {
    cookie: [
      `${AUTH_COOKIE_NAME}=${signAccessToken(
        String(seller._id),
        seller.role,
        seller.token_version,
      )}`,
    ],
    userId: String(seller._id),
  };
};

/** A product owned by `sellerUserId`, plus an order for it from a buyer. */
const placeOrder = async (sellerUserId: string, buyerCookie: string[]) => {
  const product = await makeProduct({ stock: 10, price: 10 });
  await Product.updateOne(
    { _id: product._id },
    { $set: { sellerUserId } },
  );

  const response = await request(app)
    .post('/api/orders')
    .set('Cookie', buyerCookie)
    .send({
      items: [{ productId: String(product._id), quantity: 2 }],
      deliveryInfo,
      paymentMethod: 'COD',
    });

  return { product, order: response.body };
};

describe('seller order desk', () => {
  it('is closed to buyers', async () => {
    const buyer = await signInBuyer(app);

    const response = await request(app)
      .get('/api/orders/seller')
      .set('Cookie', buyer.cookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('lists orders containing the seller’s products, with their share', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    await placeOrder(seller.userId, buyer.cookie);

    const response = await request(app)
      .get('/api/orders/seller')
      .set('Cookie', seller.cookie);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);

    const order = response.body.orders[0];
    expect(order.orderStatus).toBe('PENDING');
    expect(order.myItems).toHaveLength(1);
    expect(order.myTotal).toBe(20);
    // The buttons the UI should offer at this point.
    expect(order.availableActions).toEqual(
      expect.arrayContaining(['CONFIRMED', 'CANCELLED']),
    );
  });

  it('does not show a seller another seller’s orders', async () => {
    const mine = await signInSeller('mine@khmercraft.test');
    const other = await signInSeller('other@khmercraft.test');
    const buyer = await signInBuyer(app);
    await placeOrder(other.userId, buyer.cookie);

    const response = await request(app)
      .get('/api/orders/seller')
      .set('Cookie', mine.cookie);

    expect(response.body.total).toBe(0);
  });
});

describe('seller accepting an order', () => {
  it('moves PENDING to CONFIRMED and records who did it', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CONFIRMED', note: 'Packing today' });

    expect(response.status).toBe(200);
    expect(response.body.orderStatus).toBe('CONFIRMED');

    const history = response.body.statusHistory;
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      status: 'CONFIRMED',
      by: 'SELLER',
      note: 'Packing today',
    });
  });

  it('is visible to the buyer straight away', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CONFIRMED' });

    const buyerView = await request(app)
      .get(`/api/orders/${order.orderId}`)
      .set('Cookie', buyer.cookie);

    expect(buyerView.body.orderStatus).toBe('CONFIRMED');
  });

  it('refuses a seller who has no item in the order', async () => {
    const mine = await signInSeller('mine@khmercraft.test');
    const other = await signInSeller('other@khmercraft.test');
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(other.userId, buyer.cookie);

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', mine.cookie)
      .send({ status: 'CONFIRMED' });

    // 404, not 403 — a stranger cannot confirm the order even exists.
    expect(response.status).toBe(404);
  });

  it('will not accept the same order twice', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CONFIRMED' });

    const again = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CONFIRMED' });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_IN_STATUS');
  });
});

describe('lifecycle rules', () => {
  it('walks the happy path PENDING → CONFIRMED → SHIPPED → DELIVERED', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
      const response = await request(app)
        .patch(`/api/orders/${order.orderId}/status`)
        .set('Cookie', seller.cookie)
        .send({ status });
      expect(response.status).toBe(200);
      expect(response.body.orderStatus).toBe(status);
    }
  });

  it('settles cash on delivery when it is delivered', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    expect(order.paymentStatus).toBe('PENDING');

    for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
      await request(app)
        .patch(`/api/orders/${order.orderId}/status`)
        .set('Cookie', seller.cookie)
        .send({ status });
    }

    const final = await request(app)
      .get(`/api/orders/${order.orderId}`)
      .set('Cookie', buyer.cookie);

    expect(final.body.paymentStatus).toBe('PAID');
  });

  it('refuses to skip a step', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'DELIVERED' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ILLEGAL_TRANSITION');
    expect(response.body.error.details.allowed).toEqual(
      expect.arrayContaining(['CONFIRMED']),
    );
  });

  it('lets the buyer cancel while pending, and puts the stock back', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { product, order } = await placeOrder(seller.userId, buyer.cookie);

    const afterOrder = await Product.findById(product._id);
    expect(afterOrder!.stock).toBe(8);

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', buyer.cookie)
      .send({ status: 'CANCELLED' });

    expect(response.status).toBe(200);
    expect(response.body.orderStatus).toBe('CANCELLED');

    const afterCancel = await Product.findById(product._id);
    expect(afterCancel!.stock).toBe(10);
    expect(afterCancel!.soldCount).toBe(0);
  });

  it('stops the buyer cancelling once the seller has accepted', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CONFIRMED' });

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', buyer.cookie)
      .send({ status: 'CANCELLED' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ILLEGAL_TRANSITION');
  });

  it('treats DELIVERED as terminal', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const { order } = await placeOrder(seller.userId, buyer.cookie);

    for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
      await request(app)
        .patch(`/api/orders/${order.orderId}/status`)
        .set('Cookie', seller.cookie)
        .send({ status });
    }

    const response = await request(app)
      .patch(`/api/orders/${order.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CANCELLED' });

    expect(response.status).toBe(409);
  });

  it('refunds a prepaid order when it is cancelled', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const product = await makeProduct({ stock: 5, price: 10 });
    await Product.updateOne(
      { _id: product._id },
      { $set: { sellerUserId: seller.userId } },
    );

    const created = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookie)
      .send({
        items: [{ productId: String(product._id), quantity: 1 }],
        deliveryInfo,
        paymentMethod: 'ABA_DEMO',
      });

    expect(created.body.paymentStatus).toBe('PAID');

    const cancelled = await request(app)
      .patch(`/api/orders/${created.body.orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status: 'CANCELLED' });

    expect(cancelled.body.paymentStatus).toBe('REFUNDED');
  });
});
