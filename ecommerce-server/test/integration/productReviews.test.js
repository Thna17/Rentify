const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const reviewService = require('../../modules/store-catalog/productReviewService');
const { Product, ProductReview, Order, OrderItem } = require('../../models');

test('product reviews: add, get, summary calculations, and upsert', async (t) => {
  const productId = randomUUID();
  const storeId = randomUUID();
  const buyerId = randomUUID();

  // Mock database rows in-memory for testing
  const mockReviews = new Map();
  const mockProducts = new Map([
    [productId, { id: productId, storeId, name: 'Handmade Silk Scarf' }],
  ]);

  const originalProductFindByPk = Product.findByPk;
  const originalReviewFindAll = ProductReview.findAll;
  const originalReviewFindOne = ProductReview.findOne;
  const originalReviewCreate = ProductReview.create;

  Product.findByPk = async (id) => mockProducts.get(id) || null;
  ProductReview.findAll = async ({ where }) => {
    return [...mockReviews.values()].filter(
      (r) => r.productId === where.productId && r.status === (where.status || 'published'),
    );
  };
  ProductReview.findOne = async ({ where }) => {
    return [...mockReviews.values()].find(
      (r) => r.productId === where.productId && r.buyerUserId === where.buyerUserId,
    ) || null;
  };
  ProductReview.create = async (data) => {
    const row = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
      save: async function () { mockReviews.set(this.id, this); return this; },
    };
    mockReviews.set(row.id, row);
    return row;
  };

  t.after(() => {
    Product.findByPk = originalProductFindByPk;
    ProductReview.findAll = originalReviewFindAll;
    ProductReview.findOne = originalReviewFindOne;
    ProductReview.create = originalReviewCreate;
  });

  // 1. Initial reviews should be empty
  const initial = await reviewService.getProductReviews(productId);
  assert.equal(initial.reviews.length, 0);
  assert.equal(initial.summary.total, 0);
  assert.equal(initial.summary.average, 0);

  // 2. Reject invalid rating
  await assert.rejects(
    () => reviewService.addProductReview(productId, { id: buyerId, name: 'Srey' }, { rating: 6, comment: 'Great' }),
    { message: 'Rating must be an integer between 1 and 5' },
  );

  // 3. Add valid review
  const firstRes = await reviewService.addProductReview(
    productId,
    { id: buyerId, name: 'Srey' },
    { rating: 5, comment: 'Exquisite silk scarf!', isVerifiedPurchase: true },
  );
  assert.equal(firstRes.review.rating, 5);
  assert.equal(firstRes.review.comment, 'Exquisite silk scarf!');
  assert.equal(firstRes.summary.total, 1);
  assert.equal(firstRes.summary.average, 5);
  assert.equal(firstRes.summary.distribution[5], 1);

  // 4. Upsert by the same user updates rating rather than creating duplicate
  const updatedRes = await reviewService.addProductReview(
    productId,
    { id: buyerId, name: 'Srey' },
    { rating: 4, comment: 'Updated: really nice but slightly darker tone' },
  );
  assert.equal(updatedRes.review.rating, 4);
  assert.equal(updatedRes.summary.total, 1);
  assert.equal(updatedRes.summary.average, 4);

  // 5. Another buyer adds a review
  const buyerId2 = randomUUID();
  const secondRes = await reviewService.addProductReview(
    productId,
    { id: buyerId2, name: 'Dara' },
    { rating: 5, comment: 'Loved it, shipped quickly' },
  );
  assert.equal(secondRes.summary.total, 2);
  assert.equal(secondRes.summary.average, 4.5);
  assert.equal(secondRes.summary.distribution[4], 1);
  assert.equal(secondRes.summary.distribution[5], 1);
});
