const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/authMiddleware');

const { 
  getCustomer,
  updateProfile,
  changePassword,
  cancelOrderByCustomer
} = require('../controllers/customerController');

router.get('/', verifyToken, getCustomer);
router.patch('/', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);
router.post(
  '/orders/:orderId/cancel-by-customer',
  verifyToken, 
  cancelOrderByCustomer
);

module.exports = router;