const express = require("express");
const sequelize = require("../config/db");
const { User, Store } = require("../models");
const AuthService = require("../services/authService");
const { ApiError } = require("../utils/errors");
const router = express.Router();
const userAuthService = new AuthService(User, "User");
const { verifyAccessToken } = require("../utils/jwtUtils");
const transactionHandler = require("../utils/transactionHandler");
const responseHandler = require("../utils/responseHandler");
const { resolveReturnUrl } = require("../utils/returnUrlPolicy");
const { verifyToken } = require('../middlewares/auth');

// A login endpoint never redirects itself.  Validate navigation hints here so
// clients cannot use the authentication flow as an open-redirect primitive.
const validateReturnUrl = (body = {}) => {
  const candidate = body.returnUrl || body.returnDomain;
  if (candidate) resolveReturnUrl(candidate);
};

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

router.get('/session', verifyToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phoneNumber', 'role', 'isVerified'],
    });
    if (!user) return res.status(401).json({ error: 'Session is no longer valid' });
    return res.json({ user });
  } catch (_error) {
    return res.status(500).json({ error: 'Could not load session' });
  }
});

router.post(
  "/signup",
  transactionHandler(async (req, res, transaction) => {
    validateReturnUrl(req.body);
    const result = await userAuthService.signup(req.body, transaction);
    responseHandler.success(res, 201, result, "Account created successfully");
  })
);

router.post(
  "/resend-otp",
  asyncHandler(async (req, res, transaction) => {
    const { email, phoneNumber, verificationMethod, returnDomain } = req.body;
    validateReturnUrl({ returnDomain });
    const result = await userAuthService.resendOtp({
      email,
      phoneNumber,
      verificationMethod,
      transaction,
      returnDomain,
    });
    res.status(200).json(result);
  })
);

router.post(
  "/verify-otp",
  transactionHandler(async (req, res, transaction) => {
    validateReturnUrl(req.body);
    const result = await userAuthService.verifyOtp(req.body, transaction);
    userAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    responseHandler.success(
      res,
      200,
      {
        user: result.entity,
        accessToken: result.accessToken,
      },
      "Verification successful"
    );
  })
);

router.post(
  "/login",
  transactionHandler(async (req, res, transaction) => {
    validateReturnUrl(req.body);
    const result = await userAuthService.login(req.body, transaction);
    // The Auth app needs this single, non-sensitive fact to choose a post-login
    // destination. It avoids a client-side follow-up request that can race the
    // cross-origin session cookie being set.
    const hasStore = Boolean(
      await Store.count({
        where: { ownerUserId: result.entity.id },
        transaction,
      })
    );
    userAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    responseHandler.success(
      res,
      200,
      {
        user: result.entity,
        accessToken: result.accessToken,
        hasStore,
      },
      "Login successful"
    );
  })
);

router.post(
  "/forgot-password",
  asyncHandler(async (req, res, transaction) => {
    const { email, phoneNumber } = req.body;
    const result = await userAuthService.forgotPassword({
      email,
      phoneNumber,
      transaction,
    });
    res.status(200).json(result);
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res, transaction) => {
    const { token, password } = req.body;
    const result = await userAuthService.resetPassword({
      token,
      password,
      transaction,
    });
    res.status(200).json(result);
  })
);
router.post(
  "/logout",
  transactionHandler(async (req, res, transaction) => {
    await userAuthService.logout({
      refreshToken: req.cookies.userRefreshToken,
      transaction,
    });
    userAuthService.clearAuthCookies(res);
    responseHandler.success(res, 200, null, "Logout successful");
  })
);

router.post(
  "/validate-token",
  asyncHandler(async (req, res, transaction) => {
    const { accessToken, refreshToken } = req.body;
    if (!accessToken && !refreshToken) {
      throw new ApiError(401, "No token provided");
    }
    const result = await userAuthService.validateToken(
      accessToken,
      refreshToken,
      transaction
    );
    if (!result.valid) {
      throw new ApiError(401, result.error);
    }
    res.status(200).json(result);
  })
);

router.post(
  "/refresh-token",
  asyncHandler(async (req, res, transaction) => {
    const refreshToken = req.cookies.userRefreshToken;

    const result = await userAuthService.refreshToken({
      refreshToken,
      transaction,
    });
    userAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    res
      .status(200)
      .json({ message: "Token refreshed", accessToken: result.accessToken });
  })
);

router.get(
  "/check-telegram-link",
  asyncHandler(async (req, res, transaction) => {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
      throw new ApiError(400, "Phone number is required");
    }

    const user = await User.findOne({
      where: { phoneNumber },
      transaction,
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    res.status(200).json({
      isLinked: !!user.telegramChatId,
      message: user.telegramChatId
        ? "Telegram account is linked"
        : "Telegram not linked yet",
    });
  })
);

module.exports = router;
