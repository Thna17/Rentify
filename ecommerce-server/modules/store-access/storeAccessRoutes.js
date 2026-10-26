const router = require('express').Router();
const { requireServiceToken } = require('../../middlewares/requireServiceToken');
const { syncStore } = require('./storeAccessController');
const { getStoreForMerchant } = require('./storeAccessController');
const { getLaunchFacts } = require('./storeAccessController');
const { verifyToken } = require('../../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../../middlewares/requireStoreAccess');

router.post('/sync', requireServiceToken, syncStore);
router.get('/internal/:storeId/launch-facts', requireServiceToken, getLaunchFacts);
router.get('/:storeId', verifyToken,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }),
  getStoreForMerchant);

module.exports = router;
