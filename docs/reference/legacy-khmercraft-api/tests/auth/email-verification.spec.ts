import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import User from '../../models/User';
import EmailVerificationCode from '../../models/EmailVerificationCode';
import { createApp } from '../../src/app';
import { AppError } from '../../src/errors/app-error';
import { assertEmailConfigured, sendVerificationEmail } from '../../src/utils/email';
import { authService } from '../../src/modules/auth/auth.service';

vi.mock('../../src/utils/email', () => ({ assertEmailConfigured: vi.fn(), sendVerificationEmail: vi.fn() }));
const app = createApp();
let mongo: MongoMemoryServer;
const payload = { name: 'Test Seller', email: 'seller@example.test', password: 'CraftPass123', confirmPassword: 'CraftPass123' };
const deliveredCode = () => vi.mocked(sendVerificationEmail).mock.calls.at(-1)![1];
beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy-for-tests';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});
beforeEach(async () => { await mongoose.connection.db!.dropDatabase(); vi.resetAllMocks(); });
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });

describe('email verification delivery and session boundary', () => {
  it('sends a code, returns email without cookies, then verifies once', async () => {
    const registered = await request(app).post('/auth/register').send(payload);
    expect(registered.status).toBe(201);
    expect(registered.body.email).toBe(payload.email);
    expect(registered.headers['set-cookie']).toBeUndefined();
    expect(registered.body.devCode).toBeUndefined();
    expect((await User.findOne())!.email_verified).toBe(false);
    expect((await EmailVerificationCode.findOne())!.code_hash).not.toBe(deliveredCode());
    const blocked = await request(app).post('/auth/login').send({ email: payload.email, password: payload.password });
    expect(blocked.body.error.code).toBe('EMAIL_NOT_VERIFIED');
    const verified = await request(app).post('/auth/verify-email').send({ email: payload.email, code: deliveredCode() });
    expect(verified.status).toBe(200);
    expect(verified.headers['set-cookie']).toBeDefined();
    const replay = await request(app).post('/auth/verify-email').send({ email: payload.email, code: deliveredCode() });
    expect(replay.status).toBe(400);
    expect(replay.headers['set-cookie']).toBeUndefined();
  });
  it('does not leave a new account behind when delivery fails', async () => {
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new AppError(503, 'Delivery failed', 'EMAIL_DELIVERY_FAILED'));
    expect((await request(app).post('/auth/register').send(payload)).status).toBe(503);
    expect(await User.countDocuments()).toBe(0);
    expect(await EmailVerificationCode.countDocuments()).toBe(0);
  });
  it('registers and signs in immediately, unverified, when mail is unconfigured', async () => {
    // Gating registration on a code nothing can ever deliver would be a
    // permanent dead end, not a security control — see
    // auth.service.ts#register and #isEmailAvailable.
    vi.mocked(assertEmailConfigured).mockImplementationOnce(() => { throw new AppError(503, 'Unavailable', 'EMAIL_NOT_CONFIGURED'); });
    const response = await request(app).post('/auth/register').send(payload);
    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toBeDefined();
    const stored = await User.findOne({ email: payload.email });
    expect(stored!.email_verified).toBe(true);
  });
  it('preserves the previous code when resend delivery fails', async () => {
    await request(app).post('/auth/register').send(payload);
    const code = deliveredCode();
    vi.mocked(sendVerificationEmail).mockRejectedValueOnce(new AppError(503, 'Delivery failed', 'EMAIL_DELIVERY_FAILED'));
    expect((await request(app).post('/auth/resend-code').send({ email: payload.email })).status).toBe(503);
    expect((await request(app).post('/auth/verify-email').send({ email: payload.email, code })).status).toBe(200);
  });
  it('rejects wrong codes and exhausted attempts', async () => {
    await request(app).post('/auth/register').send(payload);
    for (let i = 0; i < 5; i++) {
      await expect(authService.verifyEmail({ email: payload.email, code: '000000' })).rejects.toMatchObject({ code: 'INVALID_CODE' });
    }
    await expect(authService.verifyEmail({ email: payload.email, code: deliveredCode() })).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });
});
