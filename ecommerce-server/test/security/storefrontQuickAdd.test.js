const test = require('node:test');
const assert = require('node:assert/strict');
const StrategyFactory = require('../../modules/catalog/core/factories/StrategyFactory');
const { Category } = require('../../models');
const categoryController = require('../../modules/catalog/categoryController');

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test('each store type lists the quick-add fields its own validation requires', () => {
  const keys = (niche) => StrategyFactory.createStrategy(niche).quickAddFields().map((field) => field.key);
  assert.deepEqual(keys('skincare'), ['skinType', 'ingredients']);
  assert.deepEqual(keys('fashion'), ['fabric', 'sizes']);
  assert.deepEqual(keys('restaurant'), ['preparationTime']);
  assert.deepEqual(keys('ecommerce'), []);

  // Filling exactly those fields satisfies the store type's rules.
  const skincare = StrategyFactory.createStrategy('skincare');
  assert.deepEqual(skincare.validateProduct({ price: 5, nicheAttributes: { skinType: ['Dry'], ingredients: ['Aloe'] } }), []);
  const fashion = StrategyFactory.createStrategy('fashion');
  assert.deepEqual(fashion.validateProduct({ nicheAttributes: { fabric: 'Cotton' } }), []);
  assert.deepEqual(
    fashion.validateOptions([{ name: 'Size', type: 'size', values: [{ value: 'S' }] }]),
    []
  );
});

test('categories need a name and accept only an https photo', async (t) => {
  const created = [];
  t.mock.method(Category, 'create', async (row) => { created.push(row); return row; });

  let res = response();
  await categoryController.createCategory({ params: { websiteId: 'w1' }, body: { name: '   ' } }, res);
  assert.equal(res.statusCode, 400);

  res = response();
  await categoryController.createCategory({ params: { websiteId: 'w1' }, body: { name: 'Soaps', image: 'javascript:alert(1)' } }, res);
  assert.equal(res.statusCode, 400);

  res = response();
  await categoryController.createCategory({ params: { websiteId: 'w1' }, body: { name: '  Soaps ', image: 'https://res.cloudinary.com/demo/soap.jpg' } }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(created, [{ id: undefined, websiteId: 'w1', name: 'Soaps', image: 'https://res.cloudinary.com/demo/soap.jpg', status: 'active' }]);
});
