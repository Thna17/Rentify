const router = require('express').Router();
const { requireServiceToken } = require('../middlewares/requireServiceToken');
const { syncStore } = require('../controllers/storeAccessController');
const { getStoreForMerchant } = require('../controllers/storeAccessController');
const { verifyToken } = require('../middlewares/authMiddleware');
const { createRequireStoreAccess } = require('../middlewares/requireStoreAccess');

router.post('/sync', requireServiceToken, syncStore);
router.get('/:storeId', verifyToken,
  createRequireStoreAccess({ permissions: ['products', 'manage_products'] }),
  getStoreForMerchant);

module.exports = router;
