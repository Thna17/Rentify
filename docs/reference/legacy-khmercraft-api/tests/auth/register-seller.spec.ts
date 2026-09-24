import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import Store from '../../models/Store';
import User from '../../models/User';
import { createApp } from '../../src/app';
import { hashPassword } from '../../src/utils/password';

const app = createApp();
const strongPassword = 'CraftPass123';
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

const registerSeller = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post('/auth/register-seller')
    .send({
      name: 'Sophea Chan',
      email: 'seller@khmercraft.test',
      password: strongPassword,
      confirmPassword: strongPassword,
      storeName: 'Silk Heritage Cambodia',
      category: 'Weaving',
      description: 'Handwoven silk scarves.',
      ...overrides,
    });

describe('POST /auth/register-seller', () => {
  it('creates the account, the store, and signs in immediately — no email verification needed', async () => {
    const response = await registerSeller();

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('SELLER');
    expect(response.body.user.email_verified).toBe(true);
    expect(response.body.store.slug).toBe('silk-heritage-cambodia');
    // Signs the session in right away — no separate login step required.
    expect(response.headers['set-cookie']?.join(';')).toContain('khmercraft_access=');

    const stored = await User.findOne({ email: 'seller@khmercraft.test' });
    expect(stored!.role).toBe('SELLER');
    expect(stored!.email_verified).toBe(true);

    const store = await Store.findOne({ userId: stored!._id });
    expect(store!.storeName).toBe('Silk Heritage Cambodia');
    expect(store!.onboardingStatus).toBe('COMPLETED');
  });

  it('makes the new store visible in the public directory alongside existing stores', async () => {
    await registerSeller();

    const response = await request(app).get('/api/sellers/stores');
    expect(response.body.stores.map((s: { name: string }) => s.name)).toContain(
      'Silk Heritage Cambodia',
    );

    const bySlug = await request(app).get(
      '/api/sellers/stores/silk-heritage-cambodia',
    );
    expect(bySlug.status).toBe(200);
  });

  it('lets the seller sign in immediately afterward, unlike a plain buyer registration', async () => {
    await registerSeller();

    const login = await request(app).post('/auth/login').send({
      email: 'seller@khmercraft.test',
      password: strongPassword,
      expectedRole: 'SELLER',
    });

    expect(login.status).toBe(200);
  });

  it('refuses a second registration for an email that is already a seller', async () => {
    await registerSeller();

    const response = await registerSeller({ storeName: 'A Different Store' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
    // Only the first store exists — the rejected attempt created nothing.
    expect(await Store.countDocuments({})).toBe(1);
  });

  it('upgrades an existing buyer to seller when the password matches', async () => {
    const buyer = await User.create({
      name: 'Dara Sok',
      email: 'buyer-turned-seller@khmercraft.test',
      password_hash: await hashPassword(strongPassword),
      role: 'BUYER',
      status: 'ACTIVE',
      email_verified: true,
    });

    const response = await registerSeller({
      email: 'buyer-turned-seller@khmercraft.test',
      storeName: 'Dara Pottery Studio',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('SELLER');

    const stored = await User.findById(buyer._id);
    expect(stored!.role).toBe('SELLER');
  });

  it('refuses to upgrade an existing account with the wrong password', async () => {
    await User.create({
      name: 'Dara Sok',
      email: 'buyer-turned-seller@khmercraft.test',
      password_hash: await hashPassword(strongPassword),
      role: 'BUYER',
      status: 'ACTIVE',
      email_verified: true,
    });

    const response = await registerSeller({
      email: 'buyer-turned-seller@khmercraft.test',
      password: 'WrongPass123',
      confirmPassword: 'WrongPass123',
      storeName: 'Dara Pottery Studio',
    });

    expect(response.status).toBe(401);
    // The upgrade attempt must not have gone through.
    const stored = await User.findOne({ email: 'buyer-turned-seller@khmercraft.test' });
    expect(stored!.role).toBe('BUYER');
    expect(await Store.countDocuments({})).toBe(0);
  });

  it('rolls the store back to a unique slug when the name collides', async () => {
    await registerSeller();
    const response = await registerSeller({
      email: 'second-seller@khmercraft.test',
      storeName: 'Silk Heritage Cambodia',
    });

    expect(response.status).toBe(201);
    expect(response.body.store.slug).toBe('silk-heritage-cambodia-2');
  });
});
