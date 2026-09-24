import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { makeProduct } from './helpers';

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

describe('GET /api/products', () => {
  it('returns a paginated envelope with applied filters', async () => {
    await makeProduct({ name: 'Alpha Scarf' });
    await makeProduct({ name: 'Beta Bowl', category: 'Pottery' });

    const response = await request(app).get('/api/products');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(2);
    expect(response.body.page).toBe(1);
    expect(response.body.limit).toBe(12);
    expect(response.body.totalPages).toBe(1);
    expect(response.body.appliedFilters.status).toBe('ACTIVE');
    expect(response.body.products).toHaveLength(2);
  });

  it('hides non-active products from the public list', async () => {
    await makeProduct({ name: 'Live Item' });
    await makeProduct({ name: 'Hidden Draft', status: 'DRAFT' });

    const response = await request(app).get('/api/products');

    expect(response.body.total).toBe(1);
    expect(response.body.products[0].name).toBe('Live Item');
  });

  it('searches name, category and seller', async () => {
    await makeProduct({ name: 'Palm Sugar Block', category: 'Palm Sugar' });
    await makeProduct({ name: 'Silk Scarf', sellerName: 'Palm Valley Co' });
    await makeProduct({ name: 'Clay Pot', category: 'Pottery' });

    const byName = await request(app).get('/api/products?search=palm sugar');
    expect(byName.body.total).toBe(1);

    const bySeller = await request(app).get('/api/products?search=Palm Valley');
    expect(bySeller.body.total).toBe(1);
    expect(bySeller.body.products[0].name).toBe('Silk Scarf');
  });

  it('treats a regex metacharacter in search as literal text', async () => {
    await makeProduct({ name: 'Normal Item' });

    // Would throw if the term were interpolated into a RegExp unescaped.
    const response = await request(app).get('/api/products?search=%28%28%28');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(0);
  });

  it('filters by category, accepting a slug or a display name', async () => {
    await makeProduct({ name: 'Bowl', category: 'Palm Sugar' });
    await makeProduct({ name: 'Scarf', category: 'Weaving' });

    const bySlug = await request(app).get('/api/products?category=palm-sugar');
    const byName = await request(app).get('/api/products?category=Palm Sugar');

    expect(bySlug.body.total).toBe(1);
    expect(byName.body.total).toBe(1);
  });

  it('filters by location', async () => {
    await makeProduct({ name: 'A', location: 'Siem Reap' });
    await makeProduct({ name: 'B', location: 'Battambang' });

    const response = await request(app).get('/api/products?location=siem-reap');

    expect(response.body.total).toBe(1);
    expect(response.body.products[0].name).toBe('A');
  });

  it('filters by price range', async () => {
    await makeProduct({ name: 'Cheap', price: 3 });
    await makeProduct({ name: 'Mid', price: 12 });
    await makeProduct({ name: 'Dear', price: 40 });

    const response = await request(app).get(
      '/api/products?priceMin=5&priceMax=20',
    );

    expect(response.body.total).toBe(1);
    expect(response.body.products[0].name).toBe('Mid');
  });

  it('rejects an inverted price range', async () => {
    const response = await request(app).get(
      '/api/products?priceMin=50&priceMax=5',
    );

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('expands the handmade-crafts collection to its categories', async () => {
    await makeProduct({ name: 'Pot', category: 'Pottery' });
    await makeProduct({ name: 'Mat', category: 'Weaving' });
    await makeProduct({ name: 'Rice', category: 'Rice Products' });

    const response = await request(app).get(
      '/api/products?collection=handmade-crafts',
    );

    expect(response.body.total).toBe(2);
  });

  it('treats under-5 as a price ceiling', async () => {
    await makeProduct({ name: 'Cheap', price: 4 });
    await makeProduct({ name: 'Dear', price: 9 });

    const response = await request(app).get('/api/products?collection=under-5');

    expect(response.body.total).toBe(1);
    expect(response.body.products[0].name).toBe('Cheap');
  });

  it('sorts by price low and high', async () => {
    await makeProduct({ name: 'Mid', price: 10 });
    await makeProduct({ name: 'Low', price: 2 });
    await makeProduct({ name: 'High', price: 30 });

    const asc = await request(app).get('/api/products?sort=price-low');
    const desc = await request(app).get('/api/products?sort=price-high');

    expect(asc.body.products[0].name).toBe('Low');
    expect(desc.body.products[0].name).toBe('High');
  });

  it('sorts by popularity using soldCount', async () => {
    await makeProduct({ name: 'Quiet', soldCount: 1 });
    await makeProduct({ name: 'Popular', soldCount: 900 });

    const response = await request(app).get('/api/products?sort=popular');

    expect(response.body.products[0].name).toBe('Popular');
  });

  it('paginates', async () => {
    for (let index = 0; index < 5; index += 1) {
      await makeProduct({ name: `Item ${index}` });
    }

    const response = await request(app).get('/api/products?page=2&limit=2');

    expect(response.body.total).toBe(5);
    expect(response.body.totalPages).toBe(3);
    expect(response.body.products).toHaveLength(2);
  });

  it('caps limit so a caller cannot request the whole table', async () => {
    const response = await request(app).get('/api/products?limit=5000');

    expect(response.status).toBe(422);
  });

  it('returns an empty list rather than an error when nothing matches', async () => {
    await makeProduct({ name: 'Scarf' });

    const response = await request(app).get('/api/products?search=nothinghere');

    expect(response.status).toBe(200);
    expect(response.body.products).toEqual([]);
    expect(response.body.total).toBe(0);
  });
});

describe('GET /api/products/:id', () => {
  it('finds a product by id and includes related products', async () => {
    const product = await makeProduct({ name: 'Main Scarf', category: 'Weaving' });
    await makeProduct({ name: 'Sibling Scarf', category: 'Weaving' });
    await makeProduct({ name: 'Unrelated Pot', category: 'Pottery' });

    const response = await request(app).get(`/api/products/${product._id}`);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Main Scarf');
    expect(response.body.relatedProducts).toHaveLength(1);
    expect(response.body.relatedProducts[0].name).toBe('Sibling Scarf');
  });

  it('finds the same product by slug', async () => {
    await makeProduct({ name: 'Slug Lookup Item' });

    const response = await request(app).get('/api/products/slug-lookup-item');

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Slug Lookup Item');
  });

  it('returns 404 with a clean message for an unknown product', async () => {
    const response = await request(app).get('/api/products/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('Product not found');
  });

  it('returns 404 rather than a cast error for a malformed id', async () => {
    const response = await request(app).get('/api/products/%20%20');

    expect(response.status).toBe(404);
  });
});
