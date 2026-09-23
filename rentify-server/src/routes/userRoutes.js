const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth');

const { 
  getUser,
  updateProfile,
  changePassword 
} = require('../controllers/userController');

router.get('/', verifyToken, getUser);
router.patch('/', verifyToken, updateProfile);
router.post('/change-password', verifyToken, changePassword);

module.exports = router;