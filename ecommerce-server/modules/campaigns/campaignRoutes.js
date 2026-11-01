const router = require('express').Router();
const service = require('./campaignService');
const { verifyCoreAdmin, requireAdminPermission } = require('../admin').verifyCoreAdmin;
const { verifyStoreActor } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');
const safe = fn => async (req,res,next) => {
  try { res.json(await fn(req)); }
  catch(e) {
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'This campaign link is already in use' });
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    next(e);
  }
};
router.get('/marketplace/campaigns', safe(() => service.publicList()));
router.get('/marketplace/campaigns/:slug', safe(req => service.publicDetail(req.params.slug, req.query)));
const admin = [verifyCoreAdmin, requireAdminPermission('catalog:moderate')];
router.get('/admin/campaigns', ...admin, safe(() => service.adminList()));
router.post('/admin/campaigns', ...admin, safe(req => service.save(null, req.body || {}, service.actor(req))));
router.get('/admin/campaigns/:campaignId', ...admin, safe(req => service.adminDetail(req.params.campaignId)));
router.patch('/admin/campaigns/:campaignId', ...admin, safe(req => service.save(req.params.campaignId, req.body || {}, service.actor(req))));
router.post('/admin/campaigns/:campaignId/submissions/:submissionId/decision', ...admin, safe(req => service.review(req.params.campaignId, req.params.submissionId, req.body || {}, service.actor(req))));
const merchant = [verifyStoreActor, createRequireStoreAccess({ permissions: ['products','manage_products'] })];
router.get('/stores/:storeId/campaigns', ...merchant, safe(req => service.merchantList(req.store.storeId)));
router.post('/stores/:storeId/campaigns/:campaignId/submissions', ...merchant, safe(req => service.submit(req.params.campaignId, req.store.storeId, req.body || {}, service.actor(req))));
router.post('/stores/:storeId/campaigns/:campaignId/submissions/:submissionId/withdraw', ...merchant, safe(req => service.withdraw(req.params.campaignId, req.params.submissionId, req.store.storeId, req.body?.revision, service.actor(req))));
module.exports = router;
