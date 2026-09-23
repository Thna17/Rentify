const express = require("express");
const sequelize = require("../config/db");
const router = express.Router();
const staffController = require("../controllers/staffController");
const { verifyToken } = require("../middlewares/auth");
const { ApiError } = require("../utils/errors");
const { verifyStaffToken } = require("../middlewares/verifyStaffToken");
const limitMiddleware = require('../middlewares/limitMiddleware');
const asyncHandler = (fn) => async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    req.transaction = transaction; // <-- pass transaction in request
    await fn(req, res, next);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json({ error: err.message });
  }
};

// Merchant creates staff
router.post("/", verifyToken,   limitMiddleware('staff'), asyncHandler(staffController.createStaff));

// Merchant lists their staff
router.get("/", verifyToken, asyncHandler(staffController.listStaff));

router.get(
  "/me",
  verifyStaffToken,
  asyncHandler(staffController.getStaffProfile)
);
router.get("/:id", verifyToken, asyncHandler(staffController.getStaffById));
// Staff login
router.post("/login", asyncHandler(staffController.staffLogin));

// Staff token validation endpoint
router.post(
  "/validate-token",
  asyncHandler(staffController.validateStaffToken)
);

router.post("/resend-otp", asyncHandler(staffController.resendOtp));

router.post("/verify-otp", asyncHandler(staffController.verifyOtp));

router.post("/forgot-password", asyncHandler(staffController.forgotPassword));

router.post("/reset-password", asyncHandler(staffController.resetPassword));

router.post("/refresh-token", asyncHandler(staffController.refreshToken));

router.post("/logout", asyncHandler(staffController.logout));

router.post(
  '/invite', 
  verifyToken, 
  asyncHandler(staffController.sendStaffInvitation)
);

router.post(
  '/accept-invitation', 
  asyncHandler(staffController.acceptStaffInvitation)
);

module.exports = router;
