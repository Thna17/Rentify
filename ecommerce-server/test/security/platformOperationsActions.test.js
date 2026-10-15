const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../../modules/admin/platformOperationsController');
const { Product, ProductReview, OrderEvent } = require('../../models');

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('admin can moderate product marketplace visibility, status, and restock', async (t) => {
  const mockProduct = {
    id: 'prod-1',
    marketplaceVisibility: null,
    status: 'active',
    stockQuantity: 5,
    version: 1,
    async update(changes) { Object.assign(this, changes); return this; },
  };
  t.mock.method(Product, 'findByPk', async () => mockProduct);

  const req = {
    params: { id: 'prod-1' },
    body: { marketplaceVisibility: false, status: 'archived', stockQuantity: 25 },
  };
  const res = response();
  await controller.updateProduct(req, res);
  assert.equal(mockProduct.marketplaceVisibility, false);
  assert.equal(mockProduct.status, 'archived');
  assert.equal(mockProduct.stockQuantity, 25);
  assert.equal(mockProduct.version, 2);
  assert.equal(res.body.success, true);
});

test('admin can moderate review status and delete abusive reviews', async (t) => {
  let destroyed = false;
  const mockReview = {
    id: 'rev-1',
    status: 'flagged',
    async update(changes) { Object.assign(this, changes); return this; },
    async destroy() { destroyed = true; },
  };
  t.mock.method(ProductReview, 'findByPk', async () => mockReview);

  const req = { params: { id: 'rev-1' }, body: { status: 'published' } };
  const res = response();
  await controller.updateReview(req, res);
  assert.equal(mockReview.status, 'published');
  assert.equal(res.body.success, true);

  const delRes = response();
  await controller.deleteReview({ params: { id: 'rev-1' } }, delRes);
  assert.equal(destroyed, true);
  assert.equal(delRes.body.success, true);
});

test('admin can triage buyer reports and update resolution notes', async (t) => {
  const mockReport = {
    id: 'rep-1',
    type: 'complaint',
    details: { reason: 'Wrong item' },
    async update(changes) { Object.assign(this, changes); return this; },
  };
  t.mock.method(OrderEvent, 'findOne', async () => mockReport);

  const req = {
    params: { id: 'rep-1' },
    body: { status: 'resolved', resolutionNotes: 'Seller refunded buyer via ABA' },
    user: { id: 'admin-123' },
  };
  const res = response();
  await controller.updateReport(req, res);
  assert.equal(mockReport.details.status, 'resolved');
  assert.equal(mockReport.details.resolutionNotes, 'Seller refunded buyer via ABA');
  assert.equal(mockReport.details.resolvedBy, 'admin-123');
  assert.equal(res.body.success, true);
});
