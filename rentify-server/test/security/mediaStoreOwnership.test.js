const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectBufferType,
  hasDangerousContent,
  sanitizeFilename,
  validateImageFile,
  validatePdfFile,
  validateMediaStoreOwnership,
  getStoreMediaFolder,
} = require('../../src/utils/mediaSecurityValidator');
const uploadController = require('../../src/modules/media/uploadController');
const cloudinaryUploadService = require('../../src/modules/media/cloudinaryUploadService');
const storeService = require('../../src/modules/stores/storeService');

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const MERCHANT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MERCHANT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

// Helper mock response
const createMockRes = () => {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
};

test('mediaSecurityValidator: detects valid image magic numbers and rejects polyglots', () => {
  // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A
  const validPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
  assert.equal(detectBufferType(validPng), 'image/png');

  // Valid JPEG header: FF D8 FF
  const validJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  assert.equal(detectBufferType(validJpeg), 'image/jpeg');

  // Valid GIF header: GIF8
  const validGif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  assert.equal(detectBufferType(validGif), 'image/gif');

  // Valid WebP header: RIFF....WEBP
  const validWebp = Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  assert.equal(detectBufferType(validWebp), 'image/webp');

  // Valid PDF header: %PDF
  const validPdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]);
  assert.equal(detectBufferType(validPdf), 'application/pdf');

  // Random binary
  const randomBytes = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]);
  assert.equal(detectBufferType(randomBytes), null);
});

test('mediaSecurityValidator: detects dangerous executable headers and embedded text scripts', () => {
  // PE/MZ executable
  const mzExe = Buffer.from([0x4D, 0x5A, 0x90, 0x00]);
  assert.equal(hasDangerousContent(mzExe), true);

  // Linux ELF binary
  const elfBin = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01]);
  assert.equal(hasDangerousContent(elfBin), true);

  // Mach-O binary
  const machOBin = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]);
  assert.equal(hasDangerousContent(machOBin), true);

  // Embedded PHP script
  const phpScript = Buffer.from('<?php echo system($_GET["cmd"]); ?>');
  assert.equal(hasDangerousContent(phpScript), true);

  // Embedded Javascript tag
  const jsPayload = Buffer.from('<script>alert(1)</script>');
  assert.equal(hasDangerousContent(jsPayload), true);

  // Embedded SVG with script
  const svgPayload = Buffer.from('<svg onload="alert(1)"></svg>');
  assert.equal(hasDangerousContent(svgPayload), true);

  // Shell script
  const shScript = Buffer.from('#!/bin/bash\nrm -rf /');
  assert.equal(hasDangerousContent(shScript), true);
});

test('mediaSecurityValidator: sanitizes dangerous filenames and path traversal attempts', () => {
  assert.equal(sanitizeFilename('../../../../etc/passwd.png'), 'passwd.png');
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
  assert.equal(sanitizeFilename('payload\0.png'), 'payload.png');
  assert.equal(sanitizeFilename('   spaces-and-symbols!@#$.jpg   '), 'spaces-and-symbols____.jpg');
  assert.equal(sanitizeFilename(''), 'upload.bin');
});

test('mediaSecurityValidator: rejects executable masquerading as image', () => {
  const fakePng = {
    originalname: 'exploit.png',
    mimetype: 'image/png',
    buffer: Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]), // MZ header
  };

  assert.throws(
    () => validateImageFile(fakePng),
    (err) => err.statusCode === 400 && err.message.includes('Dangerous or executable')
  );
});

test('mediaSecurityValidator: rejects disallowed extension even if mime matches', () => {
  const badExt = {
    originalname: 'shell.php',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
  };

  assert.throws(
    () => validateImageFile(badExt),
    (err) => err.statusCode === 400
  );
});

test('mediaSecurityValidator: rejects MIME/content mismatch (GIF bytes with JPEG MIME)', () => {
  const mismatch = {
    originalname: 'image.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  };

  // GIF header does not match declared image/jpeg
  assert.throws(
    () => validateImageFile(mismatch),
    (err) => err.statusCode === 400 && err.message.includes('signature mismatch')
  );
});

test('mediaSecurityValidator: validates and sanitizes safe image', () => {
  const safeImg = {
    originalname: 'my-product 2.png',
    mimetype: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  };

  assert.equal(validateImageFile(safeImg), true);
  assert.equal(safeImg.originalname, 'my-product_2.png');
});

test('mediaSecurityValidator: validates and sanitizes safe PDF file', () => {
  const safePdf = {
    originalname: 'invoice_march.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n%âãÏÓ\n'),
  };

  assert.equal(validatePdfFile(safePdf), true);
  assert.equal(safePdf.originalname, 'invoice_march.pdf');

  // Reject disguised PDF
  const fakePdf = {
    originalname: 'malware.pdf',
    mimetype: 'application/pdf',
    buffer: Buffer.from('<?php eval($_POST["x"]); ?>'),
  };
  assert.throws(
    () => validatePdfFile(fakePdf),
    (err) => err.statusCode === 400
  );
});

test('mediaSecurityValidator: cross-store media reference isolation', () => {
  // Reference to own store media -> OK
  const ownUrl = `https://res.cloudinary.com/rentify/image/upload/v1/rentify/stores/${STORE_A}/products/prod1.jpg`;
  assert.equal(validateMediaStoreOwnership(ownUrl, STORE_A), true);

  // Reference to another store media -> throws 403
  const otherUrl = `https://res.cloudinary.com/rentify/image/upload/v1/rentify/stores/${STORE_B}/products/prod1.jpg`;
  assert.throws(
    () => validateMediaStoreOwnership(otherUrl, STORE_A),
    (err) => err.statusCode === 403 && err.message.includes('Cross-store media reference prohibited')
  );

  // Generic external CDN or demo URL -> OK
  const externalUrl = 'https://images.unsplash.com/photo-123456';
  assert.equal(validateMediaStoreOwnership(externalUrl, STORE_A), true);
});

test('mediaSecurityValidator: getStoreMediaFolder generates strict deterministic path', () => {
  assert.equal(
    getStoreMediaFolder(STORE_A, 'products'),
    `rentify/stores/${STORE_A}/products`
  );
  assert.equal(
    getStoreMediaFolder(STORE_A, 'logo'),
    `rentify/stores/${STORE_A}/logo`
  );
  assert.throws(() => getStoreMediaFolder('../traversal', 'products'));
});

test('uploadController: uploadProductImages enforces store isolation and ignores client folder parameter', async (t) => {
  let uploadedFolder = null;
  t.mock.method(cloudinaryUploadService, 'uploadBuffer', async (buffer, { folder }) => {
    uploadedFolder = folder;
    return {
      url: `https://res.cloudinary.com/rentify/${folder}/item.jpg`,
      publicId: `${folder}/item`,
      width: 800,
      height: 800,
      format: 'jpg',
      bytes: 1024,
    };
  });

  const req = {
    store: { id: STORE_A, status: 'active' },
    user: { id: MERCHANT_A },
    body: { folder: 'injected/arbitrary/path' }, // Malicious client attempt to override folder
    query: { folder: 'another/injected/path' },
    files: [
      {
        buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
        originalname: 'item.jpg',
        mimetype: 'image/jpeg',
      },
    ],
  };

  const res = createMockRes();
  await uploadController.uploadProductImages(req, res);

  assert.equal(res.statusCode, 201);
  // Confirms the uploaded folder is strictly derived from verified store ID, not client input
  assert.equal(uploadedFolder, `rentify/stores/${STORE_A}/products`);
  assert.equal(res.body.images[0].publicId, `rentify/stores/${STORE_A}/products/item`);
});

test('uploadController: deleteMedia verifies store ownership of media record', async (t) => {
  let destroyedPublicId = null;
  t.mock.method(cloudinaryUploadService, 'destroyPublicId', async (publicId) => {
    destroyedPublicId = publicId;
    return { result: 'ok' };
  });

  // 1. Success case: Store A deletes its own image
  const ownMediaReq = {
    store: { id: STORE_A },
    user: { id: MERCHANT_A },
    body: {
      publicId: `rentify/stores/${STORE_A}/products/prod1`,
    },
  };
  const res1 = createMockRes();
  await uploadController.deleteMedia(ownMediaReq, res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(destroyedPublicId, `rentify/stores/${STORE_A}/products/prod1`);

  // 2. Cross-store deletion attempt: Store A tries to delete Store B's image
  const crossStoreReq = {
    store: { id: STORE_A },
    user: { id: MERCHANT_A },
    body: {
      publicId: `rentify/stores/${STORE_B}/products/secret`,
    },
  };
  const res2 = createMockRes();
  await uploadController.deleteMedia(crossStoreReq, res2);
  assert.equal(res2.statusCode, 403);

  // 3. Deletion attempt outside store namespace
  const rootEscapeReq = {
    store: { id: STORE_A },
    user: { id: MERCHANT_A },
    body: {
      publicId: 'global/system/logo',
    },
  };
  const res3 = createMockRes();
  await uploadController.deleteMedia(rootEscapeReq, res3);
  assert.equal(res3.statusCode, 403);
});

test('media authorization matrix: pre-upload actor access table', async () => {
  const { createRequireStoreAccess } = require('../../src/middlewares/authorization');
  const storeA = { id: STORE_A, ownerUserId: MERCHANT_A, status: 'active' };
  const suspendedStore = { id: STORE_A, ownerUserId: MERCHANT_A, status: 'suspended' };

  const matrixCases = [
    { actor: 'store owner', user: { id: MERCHANT_A, role: 'user' }, store: storeA, expectedStatus: 200 },
    { actor: 'permitted staff', user: { id: 'staff-1', role: 'staff', merchantId: MERCHANT_A, permissions: ['products'] }, store: storeA, expectedStatus: 200 },
    { actor: 'permitted staff (manage_products)', user: { id: 'staff-2', role: 'staff', merchantId: MERCHANT_A, permissions: ['manage_products'] }, store: storeA, expectedStatus: 200 },
    { actor: 'unpermitted staff', user: { id: 'staff-3', role: 'staff', merchantId: MERCHANT_A, permissions: ['orders'] }, store: storeA, expectedStatus: 403 },
    { actor: 'unrelated merchant', user: { id: MERCHANT_B, role: 'user' }, store: storeA, expectedStatus: 403 },
    { actor: 'suspended store', user: { id: MERCHANT_A, role: 'user' }, store: suspendedStore, expectedStatus: 403 },
    { actor: 'unauthenticated public', user: null, store: storeA, expectedStatus: 401 },
  ];

  for (const c of matrixCases) {
    const guard = createRequireStoreAccess({ findStore: async () => c.store });
    const req = {
      user: c.user,
      params: { storeId: STORE_A },
    };
    const res = createMockRes();
    let nextCalled = false;

    await guard(req, res, () => {
      nextCalled = true;
    });

    if (c.expectedStatus === 200) {
      assert.equal(nextCalled, true, `Expected next() for ${c.actor}`);
      assert.equal(req.store.id, STORE_A);
    } else {
      assert.equal(nextCalled, false, `Expected denial for ${c.actor}`);
      assert.equal(res.statusCode, c.expectedStatus, `Expected ${c.expectedStatus} for ${c.actor}`);
    }
  }
});

test('storefront content media isolation: prevents referencing other store assets', () => {
  const { validateStorefrontContent } = require('../../src/modules/websites/storefrontContentFields');

  // 1. Own store media reference -> valid
  const ownFields = {
    'Hero Image': [`https://res.cloudinary.com/rentify/image/upload/rentify/stores/${STORE_A}/website/hero.jpg`],
    'Feature Image': `https://res.cloudinary.com/rentify/image/upload/rentify/stores/${STORE_A}/website/feat.jpg`,
  };
  const ownResult = validateStorefrontContent(ownFields, STORE_A);
  assert.equal(ownResult.errors.length, 0);

  // 2. Cross-store media reference -> rejected
  const crossFields = {
    'Hero Image': [`https://res.cloudinary.com/rentify/image/upload/rentify/stores/${STORE_B}/website/hero.jpg`],
  };
  const crossResult = validateStorefrontContent(crossFields, STORE_A);
  assert.equal(crossResult.errors.length, 1);
  assert.equal(crossResult.errors[0].message, 'Cross-store media reference prohibited');

  // 3. Generic external HTTPS image -> valid
  const externalFields = {
    'Feature Image': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796',
  };
  const externalResult = validateStorefrontContent(externalFields, STORE_A);
  assert.equal(externalResult.errors.length, 0);
});

