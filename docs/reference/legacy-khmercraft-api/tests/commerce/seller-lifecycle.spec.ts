import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import Store from '../../models/Store';
import User from '../../models/User';
import { AUTH_COOKIE_NAME, signAccessToken } from '../../src/utils/jwt';
import { hashPassword } from '../../src/utils/password';
import { strongPassword } from './helpers';

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

const signIn = async (role: 'BUYER' | 'ADMIN', email: string) => {
  const user = await User.create({
    name: role === 'ADMIN' ? 'Support Staff' : 'Future Seller',
    email,
    password_hash: await hashPassword(strongPassword),
    role,
    status: 'ACTIVE',
  });
  return {
    cookie: [`${AUTH_COOKIE_NAME}=${signAccessToken(String(user._id), role, user.token_version)}`],
    userId: String(user._id),
  };
};

describe('store slugs', () => {
  it('gives a new store a unique, human-readable slug', async () => {
    const owner = await signIn('BUYER', 'owner@khmercraft.test');

    const response = await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', owner.cookie)
      .send({ storeName: 'Silk Heritage Cambodia' });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe('silk-heritage-cambodia');
  });

  it('suffixes a colliding store name rather than failing', async () => {
    const first = await signIn('BUYER', 'first@khmercraft.test');
    const second = await signIn('BUYER', 'second@khmercraft.test');

    await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', first.cookie)
      .send({ storeName: 'Angkor Crafts' });

    const response = await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', second.cookie)
      .send({ storeName: 'Angkor Crafts' });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe('angkor-crafts-2');
  });

  it('looks a public store up by slug or by id', async () => {
    const owner = await signIn('BUYER', 'owner@khmercraft.test');
    const created = await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', owner.cookie)
      .send({ storeName: 'Kampot Pepper Farm' });

    const bySlug = await request(app).get('/api/sellers/stores/kampot-pepper-farm');
    const byId = await request(app).get(`/api/sellers/stores/${created.body.id}`);

    expect(bySlug.status).toBe(200);
    expect(byId.status).toBe(200);
    expect(bySlug.body.id).toBe(byId.body.id);
  });
});

describe('seller application review', () => {
  it('rejects a non-admin trying to review an application', async () => {
    const applicant = await signIn('BUYER', 'applicant@khmercraft.test');
    const application = await request(app)
      .post('/api/sellers/apply')
      .set('Cookie', applicant.cookie)
      .send({
        firstName: 'Sophea',
        lastName: 'Chan',
        phoneNumber: '012345678',
        province: 'Phnom Penh',
        primaryCategory: 'Weaving',
      });

    const response = await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', applicant.cookie)
      .send({ decision: 'APPROVED' });

    expect(response.status).toBe(403);
  });

  it('requires a reason to reject an application', async () => {
    const admin = await signIn('ADMIN', 'admin@khmercraft.test');
    const applicant = await signIn('BUYER', 'applicant@khmercraft.test');
    const application = await request(app)
      .post('/api/sellers/apply')
      .set('Cookie', applicant.cookie)
      .send({
        firstName: 'Sophea',
        lastName: 'Chan',
        phoneNumber: '012345678',
        province: 'Phnom Penh',
        primaryCategory: 'Weaving',
      });

    const response = await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'REJECTED' });

    expect(response.status).toBe(422);
  });

  it('verifies the applicant’s store immediately when approved after onboarding', async () => {
    const admin = await signIn('ADMIN', 'admin@khmercraft.test');
    const applicant = await signIn('BUYER', 'applicant@khmercraft.test');

    const application = await request(app)
      .post('/api/sellers/apply')
      .set('Cookie', applicant.cookie)
      .send({
        firstName: 'Sophea',
        lastName: 'Chan',
        phoneNumber: '012345678',
        province: 'Phnom Penh',
        primaryCategory: 'Weaving',
      });

    await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', applicant.cookie)
      .send({ storeName: 'Sophea Silk' });

    const review = await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'APPROVED' });

    expect(review.status).toBe(200);
    expect(review.body.status).toBe('APPROVED');

    const store = await Store.findOne({ userId: applicant.userId });
    expect(store!.verificationStatus).toBe('VERIFIED');
    expect(store!.verifiedAt).not.toBeNull();

    const publicView = await request(app).get(`/api/sellers/stores/${store!._id}`);
    expect(publicView.body.isVerified).toBe(true);
    // Admin notes and rejection reasons never reach the public response.
    expect(publicView.body.adminNotes).toBeUndefined();
  });

  it('verifies a store created after the application was already approved', async () => {
    const admin = await signIn('ADMIN', 'admin@khmercraft.test');
    const applicant = await signIn('BUYER', 'applicant@khmercraft.test');

    const application = await request(app)
      .post('/api/sellers/apply')
      .set('Cookie', applicant.cookie)
      .send({
        firstName: 'Dara',
        lastName: 'Sok',
        phoneNumber: '098765432',
        province: 'Siem Reap',
        primaryCategory: 'Pottery',
      });

    await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'APPROVED' });

    // The store is created after approval — the ordering shouldn't matter.
    const created = await request(app)
      .post('/api/sellers/my-stores')
      .set('Cookie', applicant.cookie)
      .send({ storeName: 'Dara Pottery Studio' });

    expect(created.body.verificationStatus).toBe('VERIFIED');
  });

  it('rejects an illegal transition, like re-approving an already-approved application', async () => {
    const admin = await signIn('ADMIN', 'admin@khmercraft.test');
    const applicant = await signIn('BUYER', 'applicant@khmercraft.test');

    const application = await request(app)
      .post('/api/sellers/apply')
      .set('Cookie', applicant.cookie)
      .send({
        firstName: 'Sophea',
        lastName: 'Chan',
        phoneNumber: '012345678',
        province: 'Phnom Penh',
        primaryCategory: 'Weaving',
      });

    await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'APPROVED' });

    const again = await request(app)
      .patch(`/api/sellers/apply/${application.body.id}`)
      .set('Cookie', admin.cookie)
      .send({ decision: 'APPROVED' });

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ILLEGAL_TRANSITION');
  });
});
