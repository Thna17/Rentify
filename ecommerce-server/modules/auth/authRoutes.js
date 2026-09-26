const express = require("express");
const { sequelize } = require("../../config/db");
const { Customer, WebsiteData } = require("../../models");
const AuthService = require("./authService");
const { ApiError } = require("../../utils/errors");
const axios = require("axios");
const router = express.Router();
const customerAuthService = new AuthService(Customer, "Customer", true);
const storeValidationMiddleware = require("./storeValidationMiddleware");

// Error handling middleware
const asyncHandler = (fn) => async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    await fn(req, res, transaction);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json({ error: err.message });
  }
};

router.post(
  "/login",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const { email, password, storeId, phoneNumber } = req.body;
    const result = await customerAuthService.login({
      email,
      password,
      phoneNumber,
      storeId,
      transaction,
    });

    customerAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    res.status(200).json({
      message: "Login successful",
      accessToken: result.accessToken,
      customer: result.entity,
    });
  })
);

router.post(
  "/signup",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const {
      name,
      email,
      password,
      confirmPassword,
      storeId,
      phoneNumber,
      verificationMethod,
    } = req.body;
    const result = await customerAuthService.signup({
      name,
      email,
      phoneNumber,
      password,
      confirmPassword,
      storeId,
      transaction,
      verificationMethod,
    });
    res.status(201).json(result);
  })
);
router.post(
  "/resend-otp",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const { email, phoneNumber, verificationMethod, storeId } = req.body;
    const result = await customerAuthService.resendOtp({
      email,
      phoneNumber,
      storeId,
      verificationMethod,
      transaction,
    });
    res.status(200).json(result);
  })
);

router.post(
  "/refresh-token",
  asyncHandler(async (req, res, transaction) => {
    const refreshToken = req.cookies.customerRefreshToken;

    const result = await customerAuthService.refreshToken({
      refreshToken,
      transaction,
    });
    customerAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res
      .status(200)
      .json({ message: "Token refreshed", accessToken: result.accessToken });
  })
);

router.post(
  "/forgot-password",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const { email, phoneNumber, storeId } = req.body;
    const result = await customerAuthService.forgotPassword({
      email,
      phoneNumber,
      storeId,
      transaction,
    });
    res.status(200).json(result);
  })
);

router.post(
  "/reset-password",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const { token, password, storeId } = req.body;
    const result = await customerAuthService.resetPassword({
      storeId,
      token,
      password,
      transaction,
    });
    res.status(200).json(result);
  })
);
router.post(
  "/verify-otp",
  storeValidationMiddleware,
  asyncHandler(async (req, res, transaction) => {
    const { email, otp, storeId, phoneNumber } = req.body;
    const result = await customerAuthService.verifyOtp({
      email,
      otp,
      phoneNumber,
      storeId,
      transaction,
    });
    customerAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res.status(200).json({
      message: "Email verified successfully",
      accessToken: result.accessToken,
      customer: result.entity,
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res, transaction) => {
    const refreshToken = req.cookies.customerRefreshToken;
    const result = await customerAuthService.logout({
      refreshToken,
      transaction,
    });
    customerAuthService.clearAuthCookies(res);
    res.status(200).json(result);
  })
);

router.post(
  "/validate-token",
  asyncHandler(async (req, res, transaction) => {
    const { AccessToken, refreshToken } = req.body;
    if (!authToken && !refreshToken) {
      throw new ApiError(401, "No token provided");
    }

    const result = await customerAuthService.validateToken(
      AccessToken,
      refreshToken,
      transaction
    );

    if (!result.valid) {
      throw new ApiError(401, result.error);
    }

    res.status(200).json(result);
  })
);

router.get(
  "/check-telegram-link",
  asyncHandler(async (req, res, transaction) => {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      throw new ApiError(400, "Phone number is required");
    }

    const customer = await Customer.findOne({
      where: { phoneNumber },
      transaction,
    });

    if (!customer) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      isLinked: !!customer.telegramChatId,
      message: customer.telegramChatId
        ? "Telegram account is linked"
        : "Telegram not linked yet",
    });
  })
);

module.exports = router;
