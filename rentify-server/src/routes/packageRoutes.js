// routes/packageRoutes.js (updated to include full CRUD routes)
const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { verifyToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/authorization');

router.get('/', packageController.getPackages);
router.get('/:id', packageController.getPackageById);
router.post('/', verifyToken, requireAdmin, packageController.createPackage);
router.put('/:id', verifyToken, requireAdmin, packageController.updatePackage);
router.delete('/:id', verifyToken, requireAdmin, packageController.deletePackage);

module.exports = router;
