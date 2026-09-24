import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

const app = createApp();
const password = 'CraftPass123';
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

/**
 * loginRateLimit allows 5 attempts per 15 minutes keyed on IP *and* email,
 * and its counter store is module-level, so it is shared by every test in
 * this file. A test that needs several attempts must therefore use an email
 * no earlier test has spent budget on.
 */
const createSeller = (email = 'seller@khmercraft.test') =>
  request(app)
    .post('/auth/register-seller')
    .send({
      name: 'Sophea Chan',
      email,
      password,
      confirmPassword: password,
      storeName: `Silk Heritage ${email}`,
      category: 'Weaving',
    })
    .expect(201);

const createBuyer = () =>
  request(app)
    .post('/auth/register')
    .send({
      name: 'Dara Sok',
      email: 'buyer@khmercraft.test',
      password,
      confirmPassword: password,
    })
    .expect(201);

/**
 * The web client's single /login page is what every "Sign in" link in the app
 * points at. It used to pin every request to expectedRole: 'BUYER', which the
 * service compares against the account's real role — so a seller with the
 * right password was told "Email or password is incorrect", indistinguishable
 * from a typo. These cover the contract that fix relies on: omitting
 * expectedRole accepts any role, and passing one still narrows correctly for
 * the dedicated /seller/login and /admin/login portals.
 */
describe('POST /auth/login — role handling', () => {
  it('signs a SELLER in when no expectedRole is sent', async () => {
    await createSeller();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'seller@khmercraft.test', password });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('SELLER');
  });

  it('signs a BUYER in when no expectedRole is sent', async () => {
    await createBuyer();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'buyer@khmercraft.test', password });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('BUYER');
  });

  it('rejects a seller asked for as a BUYER — the bug the unified page used to trigger', async () => {
    await createSeller();

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'seller@khmercraft.test', password, expectedRole: 'BUYER' });

    expect(response.status).toBe(401);
  });

  it('still narrows to SELLER for the dedicated seller portal', async () => {
    await createSeller();
    await createBuyer();

    await request(app)
      .post('/auth/login')
      .send({ email: 'seller@khmercraft.test', password, expectedRole: 'SELLER' })
      .expect(200);

    await request(app)
      .post('/auth/login')
      .send({ email: 'buyer@khmercraft.test', password, expectedRole: 'SELLER' })
      .expect(401);
  });

  it('does not count a role mismatch as a failed password attempt', async () => {
    const email = 'portal-mixup@khmercraft.test';
    await createSeller(email);

    // The password is correct every time, so these must not lock the account
    // — otherwise a seller who tried the wrong portal a few times would be
    // shut out of the right one as well.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await request(app)
        .post('/auth/login')
        .send({ email, password, expectedRole: 'BUYER' })
        .expect(401);
    }

    const response = await request(app).post('/auth/login').send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('SELLER');
  });
});
