const storeCatalog = require('./storeCatalogService');
const reviewService = require('./productReviewService');
const { categories } = require('../../config/marketplaceTaxonomy');

const respond = (handler) => async (req, res) => {
  try { return await handler(req, res); }
  catch (error) {
    const duplicate = error.name === 'SequelizeUniqueConstraintError';
    return res.status(duplicate ? 409 : (error.statusCode || 500)).json({
      error: duplicate ? 'A SKU with this value already exists' : error.message,
      ...(duplicate || error.code ? { code: duplicate ? 'SKU_DUPLICATE' : error.code } : {}),
    });
  }
};

exports.categories = (_req, res) => res.json({ categories });
exports.listPublic = respond(async (req, res) => res.json(await storeCatalog.listPublic(req.query)));
exports.getPublic = respond(async (req, res) => res.json(await storeCatalog.getPublic(req.params.productId)));
exports.getProductReviews = respond(async (req, res) => res.json(await reviewService.getProductReviews(req.params.productId)));
exports.addProductReview = respond(async (req, res) =>
  res.status(201).json(await reviewService.addProductReview(req.params.productId, req.user, req.body || {})));
exports.listOwn = respond(async (req, res) => res.json(await storeCatalog.listOwn(req.store.storeId, req.query)));
exports.getOwn = respond(async (req, res) => res.json(await storeCatalog.getOwn(req.store.storeId, req.params.productId)));
exports.create = respond(async (req, res) =>
  res.status(201).json(await storeCatalog.create(req.store, req.body || {})));
exports.update = respond(async (req, res) =>
  res.json(await storeCatalog.update(req.store.storeId, req.params.productId, req.body || {})));
exports.getPublicationStatus = respond(async (req, res) => {
  const explanation = await storeCatalog.getPublicationStatus(req.store.storeId, req.params.productId, {
    channel: req.query.channel,
    hostContext: {
      isCustomDomain: req.isCustomDomain || false,
    },
    isPrivileged: true,
  });
  if (!explanation) return res.status(404).json({ error: 'Product not found' });
  return res.json(explanation);
});
