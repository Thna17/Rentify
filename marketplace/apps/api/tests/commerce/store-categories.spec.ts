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
import { makeProduct, strongPassword } from './helpers';

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

/** A signed-in seller with a real, completed Store already created. */
const signInSeller = async (name: string, email: string, storeName: string) => {
  const user = await User.create({
    name,
    email,
    password_hash: await hashPassword(strongPassword),
    role: 'SELLER',
    status: 'ACTIVE',
  });
  const store = await Store.create({
    userId: user._id,
    storeName,
    slug: storeName.toLowerCase().replace(/\s+/g, '-'),
    onboardingStatus: 'COMPLETED',
  });
  return {
    cookie: [`${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), 'SELLER', user.token_version)}`],
    userId: String(user._id),
    storeId: String(store._id),
  };
};

describe('store categories — ownership', () => {
  it('requires authentication', async () => {
    const response = await request(app).post('/api/store-categories/my-stores/000000000000000000000000').send({ name: 'Rice' });
    expect(response.status).toBe(401);
  });

  it("404s on another seller's store rather than confirming it exists", async () => {
    const owner = await signInSeller('Owner', 'owner@khmercraft.test', 'Owner Store');
    const stranger = await signInSeller('Stranger', 'stranger@khmercraft.test', 'Stranger Store');

    const response = await request(app)
      .post(`/api/store-categories/my-stores/${owner.storeId}`)
      .set('Cookie', stranger.cookie)
      .send({ name: 'Rice' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('STORE_NOT_FOUND');
  });
});

describe('store categories — CRUD', () => {
  it('creates a category with a slug and lists it back', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');

    const created = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Rice & Grains' });

    expect(created.status).toBe(201);
    expect(created.body.slug).toBe('rice-grains');
    expect(created.body.visible).toBe(true);
    expect(created.body.subcategories).toEqual([]);

    const list = await request(app)
      .get(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie);

    expect(list.status).toBe(200);
    expect(list.body.categories).toHaveLength(1);
    expect(list.body.categories[0].id).toBe(created.body.id);
  });

  it('renames a category and re-slugs it', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const created = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Rice' });

    const renamed = await request(app)
      .patch(`/api/store-categories/my-stores/${seller.storeId}/${created.body.id}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Rice & Grains' });

    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Rice & Grains');
    expect(renamed.body.slug).toBe('rice-grains');
  });

  it('reorders categories', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const a = await request(app).post(`/api/store-categories/my-stores/${seller.storeId}`).set('Cookie', seller.cookie).send({ name: 'A' });
    const b = await request(app).post(`/api/store-categories/my-stores/${seller.storeId}`).set('Cookie', seller.cookie).send({ name: 'B' });

    const reordered = await request(app)
      .patch(`/api/store-categories/my-stores/${seller.storeId}/reorder`)
      .set('Cookie', seller.cookie)
      .send({ orderedIds: [b.body.id, a.body.id] });

    expect(reordered.status).toBe(200);
    expect(reordered.body.categories.map((c: { id: string }) => c.id)).toEqual([b.body.id, a.body.id]);
  });

  it('deletes a category and clears the reference from any product using it', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const category = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Rice' });

    const product = await makeProduct({ name: 'Jasmine Rice 5kg' });
    await Product.updateOne({ _id: product._id }, { $set: { storeCategoryId: category.body.id } });

    const deleted = await request(app)
      .delete(`/api/store-categories/my-stores/${seller.storeId}/${category.body.id}`)
      .set('Cookie', seller.cookie);
    expect(deleted.status).toBe(204);

    const stillListed = await request(app)
      .get(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie);
    expect(stillListed.body.categories).toHaveLength(0);

    const reloaded = await Product.findById(product._id);
    expect(reloaded!.storeCategoryId).toBeUndefined();
  });

  it("a seller cannot delete another seller's category", async () => {
    const owner = await signInSeller('Owner', 'owner@khmercraft.test', 'Owner Store');
    const stranger = await signInSeller('Stranger', 'stranger@khmercraft.test', 'Stranger Store');
    const category = await request(app)
      .post(`/api/store-categories/my-stores/${owner.storeId}`)
      .set('Cookie', owner.cookie)
      .send({ name: 'Rice' });

    const response = await request(app)
      .delete(`/api/store-categories/my-stores/${owner.storeId}/${category.body.id}`)
      .set('Cookie', stranger.cookie);

    expect(response.status).toBe(404);
  });
});

describe('store subcategories — CRUD', () => {
  it('adds, renames, reorders and deletes a subcategory', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const category = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Food' });
    const categoryId = category.body.id;

    const added = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}/${categoryId}/subcategories`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Snacks' });
    expect(added.status).toBe(201);
    expect(added.body.subcategories).toHaveLength(1);
    const subId = added.body.subcategories[0].id;
    expect(added.body.subcategories[0].slug).toBe('snacks');

    const second = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}/${categoryId}/subcategories`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Drinks' });
    const secondId = second.body.subcategories[1].id;

    const reordered = await request(app)
      .patch(`/api/store-categories/my-stores/${seller.storeId}/${categoryId}/subcategories/reorder`)
      .set('Cookie', seller.cookie)
      .send({ orderedIds: [secondId, subId] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.subcategories.map((s: { id: string }) => s.id)).toEqual([secondId, subId]);

    const renamed = await request(app)
      .patch(`/api/store-categories/my-stores/${seller.storeId}/${categoryId}/subcategories/${subId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Snacks & Chips' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.subcategories.find((s: { id: string }) => s.id === subId).name).toBe('Snacks & Chips');

    const removed = await request(app)
      .delete(`/api/store-categories/my-stores/${seller.storeId}/${categoryId}/subcategories/${subId}`)
      .set('Cookie', seller.cookie);
    expect(removed.status).toBe(200);
    expect(removed.body.subcategories.map((s: { id: string }) => s.id)).toEqual([secondId]);
  });

  it('clears a product reference when its subcategory is deleted', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const category = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Food' });
    const added = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}/${category.body.id}/subcategories`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Snacks' });
    const subId = added.body.subcategories[0].id;

    const product = await makeProduct({ name: 'Rice Crackers' });
    await Product.updateOne({ _id: product._id }, { $set: { storeSubcategoryId: subId } });

    await request(app)
      .delete(`/api/store-categories/my-stores/${seller.storeId}/${category.body.id}/subcategories/${subId}`)
      .set('Cookie', seller.cookie);

    const reloaded = await Product.findById(product._id);
    expect(reloaded!.storeSubcategoryId).toBeUndefined();
  });
});

describe('store categories — public read', () => {
  it('only returns visible categories and subcategories, by id or slug', async () => {
    const seller = await signInSeller('Seller', 'seller@khmercraft.test', 'Rice Farm');
    const visible = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Visible Category' });
    const hidden = await request(app)
      .post(`/api/store-categories/my-stores/${seller.storeId}`)
      .set('Cookie', seller.cookie)
      .send({ name: 'Hidden Category' });
    await request(app)
      .patch(`/api/store-categories/my-stores/${seller.storeId}/${hidden.body.id}`)
      .set('Cookie', seller.cookie)
      .send({ visible: false });

    const byId = await request(app).get(`/api/store-categories/stores/${seller.storeId}`);
    expect(byId.status).toBe(200);
    expect(byId.body.categories).toHaveLength(1);
    expect(byId.body.categories[0].name).toBe('Visible Category');

    const bySlug = await request(app).get('/api/store-categories/stores/rice-farm');
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.categories).toHaveLength(1);
  });
});
