// Internal, service-to-service routes only — never exposed to browsers.
// Guarded by a shared secret header instead of a user session, because the
// caller is the Commerce API, not a signed-in person.
const router = require('express').Router();
const { verifyInternalService } = require('../middlewares/internalAuth');
const controller = require('../controllers/internalController');

router.use(verifyInternalService);
router.get('/store-owner/:storeId', controller.getStoreOwnerContact);
router.get('/website-owner/:websiteId', controller.getWebsiteOwnerContact);

module.exports = router;
