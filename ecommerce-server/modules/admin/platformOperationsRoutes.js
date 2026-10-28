const router = require('express').Router();
const { verifyCoreAdmin, requireAdminPermission } = require('./verifyCoreAdmin');
const controller = require('./platformOperationsController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyCoreAdmin);

// Overview and moderation queue
router.get('/overview', requireAdminPermission('ops:overview:read'), safe(controller.overview));
router.get('/moderation/queue', requireAdminPermission('catalog:moderate'), safe(controller.moderationQueue));

// Dynamic resource listings
const requireResourcePermission = (req, res, next) => {
  const resource = req.params.resource;
  let requiredClaim = 'ops:overview:read';
  if (resource === 'reports') requiredClaim = 'support:case:read';
  else if (resource === 'products') requiredClaim = 'catalog:moderate';
  else if (resource === 'reviews') requiredClaim = 'review:moderate';
  return requireAdminPermission(requiredClaim)(req, res, next);
};
router.get('/:resource', requireResourcePermission, safe(controller.list));

// Product catalog moderation
router.patch('/products/:id', requireAdminPermission('catalog:moderate'), safe(controller.updateProduct));
router.get('/products/:id/publication-status', requireAdminPermission('catalog:moderate'), safe(controller.productPublicationStatus));
router.post('/products/:id/moderation', requireAdminPermission('catalog:moderate'), safe(controller.recordModeratorDecision));
router.post('/products/:id/appeal/decision', requireAdminPermission('catalog:moderate'), safe(controller.decideAppeal));
router.get('/products/:id/moderation-history', requireAdminPermission('catalog:moderate'), safe(controller.productModerationHistory));

// Inventory adjustment
router.post('/inventory/adjust', requireAdminPermission('inventory:adjust'), safe(controller.adjustInventory));

// Review moderation
router.patch('/reviews/:id', requireAdminPermission('review:moderate'), safe(controller.updateReview));
router.delete('/reviews/:id', requireAdminPermission('review:moderate'), safe(controller.deleteReview));

// Reports and support case linkage
router.patch('/reports/:id', requireAdminPermission('support:case:write'), safe(controller.updateReport));
router.get('/reports/:id/facts', requireAdminPermission('support:case:read'), safe(controller.reportFacts));
router.post('/reports/:id/retry-linkage', requireAdminPermission('support:case:write'), safe(controller.retryReportLinkage));

module.exports = router;
