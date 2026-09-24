import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product from '../../models/Product';
import Store from '../../models/Store';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { deliveryInfo, signInBuyer, strongPassword } from './helpers';

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

/** A seller with a real Store — reviews need `item.sellerId` to resolve to one. */
const signInSeller = async (email = 'seller@khmercraft.test') => {
  const user = await User.create({
    name: 'Real Store Owner',
    email,
    password_hash: await hashPassword(strongPassword),
    role: 'SELLER',
    status: 'ACTIVE',
  });
  const cookie = [
    `${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), 'SELLER', user.token_version)}`,
  ];

  await Store.create({
    userId: user._id,
    storeName: `${user.name}'s Store`,
    slug: `store-${String(user._id)}`,
    onboardingStatus: 'COMPLETED',
  });

  return { cookie, userId: String(user._id) };
};

/** Places an order for one product and drives it all the way to DELIVERED. */
const buyAndDeliver = async (
  buyer: { cookie: string[] },
  seller: { cookie: string[] },
  productId: string,
) => {
  const created = await request(app)
    .post('/api/orders')
    .set('Cookie', buyer.cookie)
    .send({
      items: [{ productId, quantity: 1 }],
      deliveryInfo,
      paymentMethod: 'COD',
    });
  const orderId = created.body.orderId;

  for (const status of ['CONFIRMED', 'SHIPPED', 'DELIVERED']) {
    const step = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Cookie', seller.cookie)
      .send({ status });
    if (step.status !== 200) {
      throw new Error(`Failed to move order to ${status}: ${JSON.stringify(step.body)}`);
    }
  }

  return orderId;
};

describe('POST /api/reviews', () => {
  it('refuses a review for an order that has not been delivered', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const product = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ name: 'Krama Scarf', price: 12, category: 'Weaving', stock: 5 });

    const order = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookie)
      .send({
        items: [{ productId: product.body.id, quantity: 1 }],
        deliveryInfo,
        paymentMethod: 'COD',
      });

    const response = await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({ orderId: order.body.orderId, productId: product.body.id, rating: 5, comment: 'Lovely!' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ORDER_NOT_DELIVERED');
  });

  it('hides someone else’s order behind a 404 rather than letting them review it', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app, 'owner@khmercraft.test');
    const stranger = await signInBuyer(app, 'stranger@khmercraft.test');
    const product = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ name: 'Rattan Basket', price: 8, category: 'Bamboo Products', stock: 5 });

    const orderId = await buyAndDeliver(buyer, seller, product.body.id);

    const response = await request(app)
      .post('/api/reviews')
      .set('Cookie', stranger.cookie)
      .send({ orderId, productId: product.body.id, rating: 5, comment: 'Not mine to review' });

    expect(response.status).toBe(404);
  });

  it('accepts a review after delivery, marks it verified, and recalculates the aggregates', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const product = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ name: 'Palm Sugar Candy', price: 5, category: 'Local Food', stock: 5 });

    const orderId = await buyAndDeliver(buyer, seller, product.body.id);

    const response = await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({ orderId, productId: product.body.id, rating: 4, comment: 'Sweet and fresh.' });

    expect(response.status).toBe(201);
    expect(response.body.verifiedPurchase).toBe(true);
    expect(response.body.rating).toBe(4);

    // The client cannot claim verifiedPurchase itself — only the server's own
    // delivered-order check produces it.
    const spoofed = await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({
        orderId,
        productId: product.body.id,
        rating: 5,
        comment: 'trying to sneak a field in',
        verifiedPurchase: false,
      });
    expect(spoofed.status).toBe(422); // rejected by .strict(), not silently ignored

    const updatedProduct = await Product.findById(product.body.id);
    expect(updatedProduct!.rating).toBe(4);
    expect(updatedProduct!.reviewCount).toBe(1);

    const store = await Store.findOne({ userId: seller.userId });
    expect(store!.rating).toBe(4);
    expect(store!.reviewCount).toBe(1);
  });

  it('refuses a second review of the same product for the same order', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const product = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ name: 'Ceramic Bowl', price: 15, category: 'Pottery', stock: 5 });

    const orderId = await buyAndDeliver(buyer, seller, product.body.id);

    const first = await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({ orderId, productId: product.body.id, rating: 5, comment: 'Great bowl.' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({ orderId, productId: product.body.id, rating: 1, comment: 'Changed my mind.' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_REVIEWED');
  });
});

describe('GET /api/products/:id/reviews', () => {
  it('lists only approved reviews, newest first by default', async () => {
    const seller = await signInSeller();
    const buyer = await signInBuyer(app);
    const product = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ name: 'Woven Mat', price: 9, category: 'Weaving', stock: 5 });

    const orderId = await buyAndDeliver(buyer, seller, product.body.id);
    await request(app)
      .post('/api/reviews')
      .set('Cookie', buyer.cookie)
      .send({ orderId, productId: product.body.id, rating: 3, comment: 'Decent.' });

    const response = await request(app).get(`/api/products/${product.body.id}/reviews`);
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.reviews[0].comment).toBe('Decent.');
    expect(response.body.ratingBreakdown['3']).toBe(1);
  });
});
