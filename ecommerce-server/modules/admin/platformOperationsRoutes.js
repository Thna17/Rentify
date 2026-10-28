const router = require('express').Router();
const { verifyCoreAdmin } = require('./verifyCoreAdmin');
const controller = require('./platformOperationsController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyCoreAdmin);
router.get('/overview', safe(controller.overview));
router.get('/moderation/queue', safe(controller.moderationQueue));
router.get('/:resource', safe(controller.list));

router.patch('/products/:id', safe(controller.updateProduct));
router.get('/products/:id/publication-status', safe(controller.productPublicationStatus));
router.post('/products/:id/moderation', safe(controller.recordModeratorDecision));
router.post('/products/:id/appeal/decision', safe(controller.decideAppeal));
router.get('/products/:id/moderation-history', safe(controller.productModerationHistory));
router.post('/inventory/adjust', safe(controller.adjustInventory));
router.patch('/reviews/:id', safe(controller.updateReview));
router.delete('/reviews/:id', safe(controller.deleteReview));
router.patch('/reports/:id', safe(controller.updateReport));
router.get('/reports/:id/facts', safe(controller.reportFacts));
router.post('/reports/:id/retry-linkage', safe(controller.retryReportLinkage));

module.exports = router;
