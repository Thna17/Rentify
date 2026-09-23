const sellerReviewService = require('../services/sellerReviewService');
const storeSyncService = require('../services/storeSyncService');
const { Store, SellerApplication, SellerReview } = require('../models');
const { asyncHandler } = require('../utils/helpers');

exports.submit = asyncHandler(async (req, res) => {
  const application = await sellerReviewService.submit(req.user.id, req.body);
  storeSyncService.syncStore(application.storeId).catch(() => {});
  return res.status(202).json({ success: true, data: application });
});

exports.getMine = asyncHandler(async (req, res) => {
  const store = await Store.findOne({ where: { ownerUserId: req.user.id } });
  if (!store) return res.status(404).json({ message: 'Store not found' });
  const application = await SellerApplication.findByPk(store.id);
  return res.json({ success: true, data: application });
});

exports.getForReview = asyncHandler(async (req, res) => {
  const application = await SellerApplication.findByPk(req.params.storeId);
  if (!application) return res.status(404).json({ message: 'Seller application not found' });
  const reviews = await SellerReview.findAll({
    where: { storeId: req.params.storeId }, order: [['createdAt', 'DESC']],
  });
  return res.json({ success: true, data: { application, reviews } });
});

exports.review = asyncHandler(async (req, res) => {
  const result = await sellerReviewService.review({
    storeId: req.params.storeId,
    reviewerUserId: req.user.id,
    decision: req.body?.decision,
    checklist: req.body?.checklist,
    reason: req.body?.reason,
  });
  storeSyncService.syncStore(result.store.id).catch(() => {});
  return res.json({ success: true, data: result });
});
