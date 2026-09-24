import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import User from '../../models/User';
import { createApp } from '../../src/app';
import { hashPassword } from '../../src/utils/password';

const securityApp = createApp();
const jwtSecret = 'test-secret-with-enough-entropy-for-security-tests';
const strongPassword = 'SecureCraft123';
let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_SECRET = jwtSecret;
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

const createUser = async (
  role: 'BUYER' | 'SELLER' | 'ADMIN' = 'BUYER',
  email = `${role.toLowerCase()}@security.test`,
) =>
  User.create({
    name: `${role} Security Test`,
    email,
    password_hash: await hashPassword(strongPassword),
    role,
    status: 'ACTIVE',
  });

const tokenFor = (
  userId: string,
  role: 'BUYER' | 'SELLER' | 'ADMIN',
  expiresIn: number,
  // Must match the user's token_version or authenticate rejects the token.
  // 0 is the value a freshly created user starts at.
  tokenVersion = 0,
) =>
  jwt.sign({ role, ver: tokenVersion }, jwtSecret, {
    subject: userId,
    expiresIn,
    issuer: 'khmer-craft-api',
    audience: 'khmer-craft-web',
  });

describe('authentication security', () => {
  it('rejects an invalid access token', async () => {
    const response = await request(securityApp)
      .get('/auth/me')
      .set('Authorization', 'Bearer this.is.not-a-valid-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired access token', async () => {
    const buyer = await createUser();
    const expiredToken = tokenFor(buyer.id, 'BUYER', -1);
    const response = await request(securityApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('lets a seller change their own password too', async () => {
    // change-password used to be BUYER-only, which meant a seller could
    // never rotate their password — the account settings equivalent of the
    // EMAIL_NOT_VERIFIED dead end. Sellers are account holders like buyers.
    const seller = await createUser('SELLER');
    const sellerToken = tokenFor(seller.id, 'SELLER', 60);
    const response = await request(securityApp)
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        currentPassword: strongPassword,
        newPassword: 'DifferentPass456',
        confirmPassword: 'DifferentPass456',
      });

    expect(response.status).toBe(200);
  });

  it('rejects a buyer token on a seller-or-admin route', async () => {
    const buyer = await createUser('BUYER');
    const buyerToken = tokenFor(buyer.id, 'BUYER', 60);
    const response = await request(securityApp)
      .post('/api/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        title: 'Protected Product',
        price: 10,
        category: 'Textiles',
        image: 'https://example.test/product.jpg',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects MongoDB and SQL-shaped injection attempts before querying', async () => {
    const operatorInjection = await request(securityApp)
      .post('/auth/login')
      .send({
        email: { $ne: null },
        password: { $ne: null },
        expectedRole: 'BUYER',
      });
    const sqlInjection = await request(securityApp).post('/auth/login').send({
      email: "' OR 1=1 --",
      password: "' OR 1=1 --",
      expectedRole: 'BUYER',
    });

    expect(operatorInjection.status).toBe(400);
    expect(operatorInjection.body.error.code).toBe('PROHIBITED_INPUT');
    expect(sqlInjection.status).toBe(422);
    expect(sqlInjection.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rate limits brute-force login attempts', async () => {
    await createUser();
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(
        await request(securityApp).post('/auth/login').send({
          email: 'buyer@security.test',
          password: 'IncorrectPass999',
          expectedRole: 'BUYER',
        }),
      );
    }

    expect(responses.some((response) => response.status === 429)).toBe(true);
    expect(responses.at(-1)?.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects weak passwords', async () => {
    const response = await request(securityApp).post('/auth/register').send({
      name: 'Weak Password',
      email: 'weak@security.test',
      password: 'password',
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.password).toBeDefined();
  });

  it('rejects invalid and unexpected input', async () => {
    const response = await request(securityApp).post('/auth/register').send({
      name: '',
      email: 'not-an-email',
      password: strongPassword,
      role: 'ADMIN',
    });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rotates refresh tokens and detects reuse', async () => {
    const registration = await request(securityApp).post('/auth/register').send({
      name: 'Refresh Buyer',
      email: 'refresh@security.test',
      password: strongPassword,
      confirmPassword: strongPassword,
    });
    const initialCookies = registration.headers['set-cookie'] as string[];
    const refreshCookie = initialCookies
      .find((cookie) => cookie.startsWith('khmercraft_refresh='))
      ?.split(';')[0];

    expect(refreshCookie).toBeDefined();
    expect(initialCookies.join(' ')).toContain('SameSite=Strict');
    expect(initialCookies.join(' ')).toContain('HttpOnly');

    const rotated = await request(securityApp)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!);
    const reused = await request(securityApp)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie!);

    expect(rotated.status).toBe(200);
    expect(rotated.headers['set-cookie'].join(' ')).toContain(
      'khmercraft_refresh=',
    );
    expect(reused.status).toBe(401);
    expect(reused.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('kills tokens issued before a password change via token_version', async () => {
    const buyer = await createUser('BUYER', 'version@security.test');
    const staleToken = tokenFor(buyer.id, 'BUYER', 3600, 0);

    // The token works while it matches the user's current version.
    const before = await request(securityApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${staleToken}`);
    expect(before.status).toBe(200);

    const changed = await request(securityApp)
      .patch('/auth/change-password')
      .set('Authorization', `Bearer ${staleToken}`)
      .send({
        currentPassword: strongPassword,
        newPassword: 'RotatedCraft456',
        confirmPassword: 'RotatedCraft456',
      });
    expect(changed.status).toBe(200);

    // Same token, same expiry — but the version it carries is now stale.
    const after = await request(securityApp)
      .get('/auth/me')
      .set('Authorization', `Bearer ${staleToken}`);
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('locks an account after repeated failed sign-ins', async () => {
    await createUser('BUYER', 'lockout@security.test');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await request(securityApp).post('/auth/login').send({
        email: 'lockout@security.test',
        password: 'WrongPassword123',
      });
      expect(failed.status).toBe(401);
      expect(failed.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // Asserted on the document rather than through a sixth request: the
    // IP+email rate limiter also trips at five, so an HTTP check here would
    // measure the limiter (429) instead of the account lock. The two are
    // deliberately independent — the limiter resets with its window, the lock
    // follows the account across every IP an attacker uses.
    const locked = await User.findOne({ email: 'lockout@security.test' });
    expect(locked?.locked_until).toBeInstanceOf(Date);
    expect(locked!.locked_until!.getTime()).toBeGreaterThan(Date.now());
    expect(locked?.failed_login_attempts).toBe(0);
  });

  it('rejects an unvalidated product payload and ignores extra fields', async () => {
    const seller = await createUser('SELLER', 'massassign@security.test');
    const sellerToken = tokenFor(seller.id, 'SELLER', 3600);

    const invalid = await request(securityApp)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: 'x', price: -5, category: '', image: 'not-a-url' });

    expect(invalid.status).toBe(422);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const massAssignment = await request(securityApp)
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Silk Scarf',
        price: 25,
        category: 'Textiles',
        image: 'https://example.test/scarf.jpg',
        approved: true,
        seller_id: '000000000000000000000000',
      });

    expect(massAssignment.status).toBe(422);
    expect(massAssignment.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects disallowed CORS origins', async () => {
    const response = await request(securityApp)
      .get('/')
      .set('Origin', 'https://attacker.example');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CORS_REJECTED');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
