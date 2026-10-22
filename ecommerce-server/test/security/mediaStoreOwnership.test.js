const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const ProductController = require('../../modules/catalog/ProductController');
const storeCatalogService = require('../../modules/store-catalog/storeCatalogService');

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';

test('ProductController: CSV upload multer sanitizes path traversal in filenames', () => {
  const req = {};
  const file1 = { originalname: '../../../../etc/passwd.csv' };
  
  let generatedFilename1 = null;
  ProductController.upload.storage.getFilename(req, file1, (err, filename) => {
    generatedFilename1 = filename;
  });

  assert.match(generatedFilename1, /^products-\d+-passwd\.csv$/);
  assert.equal(generatedFilename1.includes('..'), false);
  assert.equal(generatedFilename1.includes('/'), false);

  const file2 = { originalname: '..\\..\\windows\\system32\\cmd.csv' };
  let generatedFilename2 = null;
  ProductController.upload.storage.getFilename(req, file2, (err, filename) => {
    generatedFilename2 = filename;
  });

  assert.match(generatedFilename2, /^products-\d+-cmd\.csv$/);
  assert.equal(generatedFilename2.includes('..'), false);
  assert.equal(generatedFilename2.includes('\\'), false);
});

test('ProductController: CSV upload fileFilter rejects non-csv files', () => {
  const req = {};
  
  // 1. Rejected extension: .php
  ProductController.upload.fileFilter(req, { originalname: 'shell.php', mimetype: 'application/x-php' }, (err, accept) => {
    assert.equal(accept, false);
    assert.match(err.message, /Only CSV files are allowed/);
  });

  // 2. Rejected extension: .png
  ProductController.upload.fileFilter(req, { originalname: 'image.png', mimetype: 'image/png' }, (err, accept) => {
    assert.equal(accept, false);
    assert.match(err.message, /Only CSV files are allowed/);
  });

  // 3. Accepted extension: .csv
  ProductController.upload.fileFilter(req, { originalname: 'valid_products.csv', mimetype: 'text/csv' }, (err, accept) => {
    assert.equal(err, null);
    assert.equal(accept, true);
  });
});

test('storeCatalogService: prevents cross-store product image reference guessing', async (t) => {
  // Mock store models so we can test create without full db
  const storeContext = { storeId: STORE_A, websiteId: null };

  // 1. Cross-store image reference attempt
  const crossStoreImages = [
    { url: `https://res.cloudinary.com/rentify/image/upload/rentify/stores/${STORE_B}/products/secret.jpg` }
  ];

  await assert.rejects(
    async () => {
      await storeCatalogService.create(storeContext, {
        name: 'My Product',
        price: 19.99,
        marketplaceCategory: 'Handmade Crafts',
        stockQuantity: 10,
        status: 'draft',
        images: crossStoreImages,
      });
    },
    (err) => err.statusCode === 403 && err.message.includes('Cross-store media reference prohibited')
  );
});
