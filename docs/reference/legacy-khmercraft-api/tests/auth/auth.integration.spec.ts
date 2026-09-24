import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

const registerBuyer = (email = 'buyer@khmercraft.test') =>
  request(app).post('/auth/register').send({
    name: 'Sophea Chan',
    email,
    password: strongPassword,
    confirmPassword: strongPassword,
    phone: '012345678',
  });

describe('buyer authentication', () => {
  it('registers a buyer and never exposes the password hash', async () => {
    const response = await registerBuyer();

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.body.user).toMatchObject({
      name: 'Sophea Chan',
      email: 'buyer@khmercraft.test',
      role: 'BUYER',
      status: 'ACTIVE',
    });
    expect(response.body.user.password_hash).toBeUndefined();
  });

  it('rejects a duplicate email regardless of casing', async () => {
    await registerBuyer();
    const response = await registerBuyer('BUYER@KHMERCRAFT.TEST');

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('logs in a buyer with the correct password', async () => {
    await registerBuyer();
    const response = await request(app).post('/auth/login').send({
      email: 'buyer@khmercraft.test',
      password: strongPassword,
      expectedRole: 'BUYER',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('BUYER');
    expect(response.headers['set-cookie']?.[0]).toContain(
      'khmercraft_access=',
    );
  });

  it('rejects a wrong password without revealing which credential failed', async () => {
    await registerBuyer();
    const response = await request(app).post('/auth/login').send({
      email: 'buyer@khmercraft.test',
      password: 'WrongPassword123',
      expectedRole: 'BUYER',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('creates a reset request without exposing whether an account exists', async () => {
    await registerBuyer();
    const known = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'buyer@khmercraft.test' });
    const unknown = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'missing@khmercraft.test' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(unknown.body.message);
    expect(known.body.resetToken).toHaveLength(64);
    expect(unknown.body.resetToken).toBeUndefined();
  });

  it('resets the password and makes the token single-use', async () => {
    await registerBuyer();
    const forgot = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'buyer@khmercraft.test' });
    const payload = {
      token: forgot.body.resetToken,
      password: 'NewCraftPass456',
      confirmPassword: 'NewCraftPass456',
    };

    const reset = await request(app).post('/auth/reset-password').send(payload);
    const reuse = await request(app).post('/auth/reset-password').send(payload);
    const login = await request(app).post('/auth/login').send({
      email: 'buyer@khmercraft.test',
      password: 'NewCraftPass456',
      expectedRole: 'BUYER',
    });

    expect(reset.status).toBe(200);
    expect(reuse.status).toBe(400);
    expect(login.status).toBe(200);
  });

  it('protects the change-password route and permits an authenticated buyer', async () => {
    const unauthenticated = await request(app)
      .patch('/auth/change-password')
      .send({
        currentPassword: strongPassword,
        newPassword: 'AnotherPass789',
        confirmPassword: 'AnotherPass789',
      });

    const agent = request.agent(app);
    await agent.post('/auth/register').send({
      name: 'Sophea Chan',
      email: 'protected@khmercraft.test',
      password: strongPassword,
      confirmPassword: strongPassword,
    });
    const authenticated = await agent.patch('/auth/change-password').send({
      currentPassword: strongPassword,
      newPassword: 'AnotherPass789',
      confirmPassword: 'AnotherPass789',
    });

    expect(unauthenticated.status).toBe(401);
    expect(authenticated.status).toBe(200);
  });
});

describe('admin authentication', () => {
  it('allows an admin login and rejects a buyer on the admin entry point', async () => {
    await User.create({
      name: 'KhmerCraft Admin',
      email: 'admin@khmercraft.test',
      password_hash: await hashPassword(strongPassword),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    await registerBuyer();

    const admin = await request(app).post('/auth/login').send({
      email: 'admin@khmercraft.test',
      password: strongPassword,
      expectedRole: 'ADMIN',
    });
    const buyer = await request(app).post('/auth/login').send({
      email: 'buyer@khmercraft.test',
      password: strongPassword,
      expectedRole: 'ADMIN',
    });

    expect(admin.status).toBe(200);
    expect(admin.body.user.role).toBe('ADMIN');
    expect(buyer.status).toBe(401);
  });
});
