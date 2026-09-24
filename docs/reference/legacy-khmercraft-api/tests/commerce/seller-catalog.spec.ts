import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Product from '../../models/Product';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { makeProduct, signInBuyer, strongPassword } from './helpers';

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

const signIn = async (
  role: 'SELLER' | 'ADMIN',
  name: string,
  email: string,
) => {
  const user = await User.create({
    name,
    email,
    password_hash: await hashPassword(strongPassword),
    role,
    status: 'ACTIVE',
  });
  return {
    cookie: [
      `${AUTH_COOKIE_NAME}=${signAccessToken(
        String(user._id),
        user.role,
        user.token_version,
      )}`,
    ],
    userId: String(user._id),
    name,
  };
};

const newListing = {
  name: 'Test Listing',
  price: 9.99,
  category: 'Pottery',
  stock: 5,
};

describe('creating a product', () => {
  it('rejects a buyer', async () => {
    const buyer = await signInBuyer(app);

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', buyer.cookie)
      .send(newListing);

    expect(response.status).toBe(403);
  });

  it('stamps the seller from the session, not the payload', async () => {
    const seller = await signIn('SELLER', 'Real Store', 'real@khmercraft.test');

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send(newListing);

    expect(response.status).toBe(201);
    expect(response.body.sellerName).toBe('Real Store');

    const stored = await Product.findById(response.body.id);
    expect(String(stored!.sellerUserId)).toBe(seller.userId);
  });

  it('ignores an attempt to name another store', async () => {
    const seller = await signIn('SELLER', 'Real Store', 'real@khmercraft.test');

    // `sellerName` is accepted in the payload (the seller dashboard sends
    // its own copy for form state), but the service always overwrites it
    // from the authenticated seller — sending someone else's name here must
    // not publish under it.
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ ...newListing, sellerName: 'Somebody Else' });

    expect(response.status).toBe(201);
    expect(response.body.sellerName).toBe('Real Store');
  });

  it('cannot be pointed at another seller via sellerUserId', async () => {
    const seller = await signIn('SELLER', 'Real Store', 'real@khmercraft.test');
    const victim = await signIn('SELLER', 'Victim', 'victim@khmercraft.test');

    const response = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ ...newListing, sellerUserId: victim.userId });

    expect(response.status).toBe(201);
    const stored = await Product.findById(response.body.id);
    expect(String(stored!.sellerUserId)).toBe(seller.userId);
    expect(String(stored!.sellerUserId)).not.toBe(victim.userId);
  });

  it('makes the new listing reachable from the seller order desk', async () => {
    const seller = await signIn('SELLER', 'Real Store', 'real@khmercraft.test');
    const buyer = await signInBuyer(app);

    const created = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send(newListing);

    await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookie)
      .send({
        items: [{ productId: created.body.id, quantity: 1 }],
        deliveryInfo: {
          fullName: 'Sophea Chan',
          phone: '012345678',
          province: 'Phnom Penh',
          city: 'Chamkarmon',
          address: '12 Street 240',
        },
        paymentMethod: 'COD',
      });

    // Before sellerUserId was stamped, this returned nothing.
    const desk = await request(app)
      .get('/api/orders/seller')
      .set('Cookie', seller.cookie);

    expect(desk.body.total).toBe(1);
  });
});

describe('updating a product', () => {
  const createFor = async (cookie: string[]) =>
    (
      await request(app)
        .post('/api/products')
        .set('Cookie', cookie)
        .send(newListing)
    ).body;

  it('lets the owner edit it', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const product = await createFor(seller.cookie);

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', seller.cookie)
      .send({ price: 12.5, stock: 20 });

    expect(response.status).toBe(200);
    expect(response.body.price).toBe(12.5);
    expect(response.body.stock).toBe(20);
    // Untouched fields survive a partial update.
    expect(response.body.name).toBe('Test Listing');
  });

  it('hides another seller’s product behind a 404', async () => {
    const owner = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const other = await signIn('SELLER', 'Other', 'other@khmercraft.test');
    const product = await createFor(owner.cookie);

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', other.cookie)
      .send({ price: 0.01 });

    // 404 not 403: a stranger should not learn the id exists.
    expect(response.status).toBe(404);

    const stored = await Product.findById(product.id);
    expect(stored!.price).toBe(9.99);
  });

  it('lets an admin edit anyone’s product', async () => {
    const owner = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const admin = await signIn('ADMIN', 'Support', 'admin@khmercraft.test');
    const product = await createFor(owner.cookie);

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'DRAFT' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('DRAFT');
  });

  it('re-slugs on rename, and leaves the slug alone otherwise', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const product = await createFor(seller.cookie);
    expect(product.slug).toBe('test-listing');

    const renamed = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Renamed Listing' });
    expect(renamed.body.slug).toBe('renamed-listing');

    // Editing something else must not bump the slug to "-2".
    const again = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Renamed Listing', price: 3 });
    expect(again.body.slug).toBe('renamed-listing');
  });

  it('rejects an empty update', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const product = await createFor(seller.cookie);

    const response = await request(app)
      .patch(`/api/products/${product.id}`)
      .set('Cookie', seller.cookie)
      .send({});

    expect(response.status).toBe(422);
  });
});

describe('delisting a product', () => {
  it('archives rather than deletes, so past orders still resolve', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const created = await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send(newListing);

    const response = await request(app)
      .delete(`/api/products/${created.body.id}`)
      .set('Cookie', seller.cookie);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ARCHIVED');

    // Still in the database, just not on the shelf.
    expect(await Product.findById(created.body.id)).not.toBeNull();

    const publicList = await request(app).get('/api/products');
    expect(publicList.body.total).toBe(0);
  });

  it('refuses to delist another seller’s product', async () => {
    const owner = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const other = await signIn('SELLER', 'Other', 'other@khmercraft.test');
    const created = await request(app)
      .post('/api/products')
      .set('Cookie', owner.cookie)
      .send(newListing);

    const response = await request(app)
      .delete(`/api/products/${created.body.id}`)
      .set('Cookie', other.cookie);

    expect(response.status).toBe(404);
    const stored = await Product.findById(created.body.id);
    expect(stored!.status).toBe('ACTIVE');
  });
});

describe('GET /api/products/mine', () => {
  it('returns only the caller’s listings, drafts included', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');
    const other = await signIn('SELLER', 'Other', 'other@khmercraft.test');

    await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send(newListing);
    await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ ...newListing, name: 'Draft Item', status: 'DRAFT' });
    await request(app)
      .post('/api/products')
      .set('Cookie', other.cookie)
      .send({ ...newListing, name: 'Not Mine' });

    const response = await request(app)
      .get('/api/products/mine')
      .set('Cookie', seller.cookie);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.products.map((p: { name: string }) => p.name)).toEqual(
      expect.arrayContaining(['Test Listing', 'Draft Item']),
    );
  });

  it('is not reachable by a buyer', async () => {
    const buyer = await signInBuyer(app);

    const response = await request(app)
      .get('/api/products/mine')
      .set('Cookie', buyer.cookie);

    expect(response.status).toBe(403);
  });

  it('is not shadowed by the /:id route', async () => {
    const seller = await signIn('SELLER', 'Owner', 'owner@khmercraft.test');

    const response = await request(app)
      .get('/api/products/mine')
      .set('Cookie', seller.cookie);

    // If '/:id' matched first this would be a 404 for a product named "mine".
    expect(response.body).toHaveProperty('products');
  });
});

describe('reference data', () => {
  it('returns the category tree with live counts', async () => {
    await makeProduct({ name: 'A Bowl', category: 'Pottery' });
    await Product.updateOne(
      { name: 'A Bowl' },
      { $set: { subcategory: 'Bowls & Plates' } },
    );

    const response = await request(app).get('/api/categories');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(8);

    const pottery = response.body.categories.find(
      (c: { slug: string }) => c.slug === 'pottery',
    );
    expect(pottery.productCount).toBe(1);
    expect(pottery.subcategories).toHaveLength(4);

    const bowls = pottery.subcategories.find(
      (s: { slug: string }) => s.slug === 'bowls-plates',
    );
    expect(bowls.productCount).toBe(1);

    // An empty sub-category is reported, not hidden.
    const vases = pottery.subcategories.find(
      (s: { slug: string }) => s.slug === 'vases',
    );
    expect(vases.productCount).toBe(0);
  });

  it('lists sellers derived from their live products', async () => {
    const seller = await signIn('SELLER', 'Takeo Bamboo', 'takeo@khmercraft.test');
    await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send({ ...newListing, category: 'Bamboo Products' });

    const response = await request(app).get('/api/sellers');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.sellers[0]).toMatchObject({
      name: 'Takeo Bamboo',
      productCount: 1,
      hasAccount: true,
    });
  });

  it('drops a suspended seller from the directory', async () => {
    const seller = await signIn('SELLER', 'Suspended', 'susp@khmercraft.test');
    await request(app)
      .post('/api/products')
      .set('Cookie', seller.cookie)
      .send(newListing);

    await User.updateOne(
      { _id: seller.userId },
      { $set: { status: 'SUSPENDED' } },
    );

    const response = await request(app).get('/api/sellers');
    expect(response.body.total).toBe(0);
  });
});

describe('operational endpoints', () => {
  it('reports liveness without touching the database', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
  });

  it('reports readiness with the database state', async () => {
    const response = await request(app).get('/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ready',
      database: 'connected',
    });
  });
});
