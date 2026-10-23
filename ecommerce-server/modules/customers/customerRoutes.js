const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../middlewares/authMiddleware');
const { enforceCustomDomainBoundary } = require('../../middlewares/customDomainBoundary');

const { 
  getCustomer,
  updateProfile,
  changePassword,
  cancelOrderByCustomer
} = require('./customerController');

router.use(enforceCustomDomainBoundary('customer'));

router.get('/', verifyToken, getCustomer);
router.patch('/', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.post(
  '/orders/:orderId/cancel-by-customer',
  verifyToken, 
  cancelOrderByCustomer
);

module.exports = router;