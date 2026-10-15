const test = require('node:test');
const assert = require('node:assert/strict');
const storeService = require('../../src/services/storeService');
const storeSyncService = require('../../src/services/storeSyncService');
const cloudinaryUploadService = require('../../src/services/cloudinaryUploadService');
const controller = require('../../src/controllers/storeController');

const OWNER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORE = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const call = async (req) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await controller.uploadOwnLogo(req, res, (error) => { throw error; });
  // asyncHandler does not return its promise; let it settle.
  await new Promise((resolve) => setImmediate(resolve));
  return res;
};

const mockUpload = (t) =>
  t.mock.method(cloudinaryUploadService, 'uploadBuffer', async (buffer, { folder }) => ({ url: `https://res.cloudinary.com/demo/${folder}/logo.png` }));

test('the owner uploads a logo into their store folder and it is saved on the store', async (t) => {
  t.mock.method(storeService, 'getOwnStore', async () => ({ id: STORE, ownerUserId: OWNER }));
  const upload = mockUpload(t);
  const update = t.mock.method(storeService, 'updateOwnStore', async (changes) => ({ id: STORE, logoUrl: changes.logoUrl }));
  const sync = t.mock.method(storeSyncService, 'syncStore', async () => undefined);

  const res = await call({ user: { id: OWNER }, file: { buffer: Buffer.from('png') } });

  assert.equal(res.statusCode, 200);
  assert.equal(upload.mock.calls[0].arguments[1].folder, `rentify/stores/${STORE}/logo`);
  assert.deepEqual(update.mock.calls[0].arguments[0], {
    ownerUserId: OWNER,
    logoUrl: `https://res.cloudinary.com/demo/rentify/stores/${STORE}/logo/logo.png`,
  });
  assert.equal(res.body.data.logoUrl, update.mock.calls[0].arguments[0].logoUrl);
  assert.equal(sync.mock.callCount(), 1);
});

test('staff cannot change the logo, and nothing is uploaded for them', async (t) => {
  t.mock.method(storeService, 'getOwnStore', async () => ({ id: STORE, ownerUserId: OWNER }));
  const upload = mockUpload(t);
  const res = await call({ user: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }, file: { buffer: Buffer.from('png') } });
  assert.equal(res.statusCode, 403);
  assert.equal(upload.mock.callCount(), 0);
});

test('a missing file or store is refused before uploading', async (t) => {
  const upload = mockUpload(t);
  assert.equal((await call({ user: { id: OWNER } })).statusCode, 400);
  t.mock.method(storeService, 'getOwnStore', async () => null);
  assert.equal((await call({ user: { id: OWNER }, file: { buffer: Buffer.from('png') } })).statusCode, 404);
  assert.equal(upload.mock.callCount(), 0);
});

test('storage outages are reported without saving anything', async (t) => {
  t.mock.method(storeService, 'getOwnStore', async () => ({ id: STORE, ownerUserId: OWNER }));
  t.mock.method(cloudinaryUploadService, 'uploadBuffer', async () => {
    throw Object.assign(new Error('down'), { code: 'CLOUDINARY_NOT_CONFIGURED' });
  });
  const update = t.mock.method(storeService, 'updateOwnStore', async () => assert.fail('must not save'));
  const res = await call({ user: { id: OWNER }, file: { buffer: Buffer.from('png') } });
  assert.equal(res.statusCode, 503);
  assert.equal(update.mock.callCount(), 0);
});
