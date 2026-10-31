const express = require("express");
const sequelize = require("../../config/db");
const { User, Store, Staff, Website } = require("../../models");
const AuthService = require("./authService");
const { ApiError } = require("../../utils/errors");
const router = express.Router();
const userAuthService = new AuthService(User, "User");
const staffAuthService = new AuthService(Staff, "Staff");
const TelegramBotAuthService = require("./telegramBotAuthService");
const telegramBotAuthService = new TelegramBotAuthService(userAuthService);
const runtimeUrls = require("../../config/runtimeUrls");
const { verifyAccessToken } = require("../../utils/jwtUtils");
const transactionHandler = require("../../utils/transactionHandler");
const responseHandler = require("../../utils/responseHandler");
const { resolveReturnUrl } = require("./returnUrlPolicy");
const { verifyToken } = require('../../middlewares/auth');

// A login endpoint never redirects itself.  Validate navigation hints here so
// clients cannot use the authentication flow as an open-redirect primitive.
const validateReturnUrl = (body = {}) => {
  const candidate = body.returnUrl || body.returnDomain;
  if (candidate) resolveReturnUrl(candidate);
};

const userHasStore = async (userId, transaction) => {
  const storeCount = await Store.count({
    where: { ownerUserId: userId },
    ...(transaction ? { transaction } : {}),
  });
  if (storeCount > 0) return true;
  const websiteCount = await Website.count({
    where: { userId },
    ...(transaction ? { transaction } : {}),
  });
  return websiteCount > 0;
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

router.get(['/session', '/me'], verifyToken, async (req, res) => {
  try {
    if (req.user?.role === 'staff') {
      const staff = await Staff.findByPk(req.user.id, {
        attributes: ['id', 'name', 'email', 'phoneNumber', 'permissions', 'websiteId', 'merchantId', 'isActive'],
      });
      if (!staff || !staff.isActive) return res.status(401).json({ error: 'Session is no longer valid' });
      return res.json({
        user: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          phoneNumber: staff.phoneNumber,
          role: 'staff',
          isVerified: true,
          websiteId: staff.websiteId,
          merchantId: staff.merchantId,
          permissions: staff.permissions,
          hasStore: true,
        },
      });
    }
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phoneNumber', 'role', 'isVerified', 'mfaEnabled'],
    });
    if (!user) return res.status(401).json({ error: 'Session is no longer valid' });
    const hasStore = await userHasStore(user.id);
    return res.json({
      user: {
        ...user.toJSON(),
        hasStore,
      },
    });
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
    const hasStore = await userHasStore(result.entity.id, transaction);
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
      "Verification successful"
    );
  })
);

router.post(
  "/login",
  transactionHandler(async (req, res, transaction) => {
    validateReturnUrl(req.body);
    let result;
    let isStaff = false;
    try {
      result = await userAuthService.login({ ...req.body, req }, transaction);
    } catch (err) {
      if (err.statusCode === 404 || err.message?.toLowerCase().includes("not found")) {
        const where = {
          isActive: true,
          ...(req.body.email ? { email: req.body.email } : { phoneNumber: req.body.phoneNumber }),
          ...(req.body.storeId ? { storeId: req.body.storeId } : {}),
        };
        const activeStaffList = await Staff.findAll({ where, transaction });
        if (activeStaffList.length === 1) {
          result = await staffAuthService.login(req.body, transaction);
          isStaff = true;
        } else if (activeStaffList.length > 1) {
          if (!req.body.storeId) {
            throw new ApiError(400, "Multiple store memberships found. Please specify storeId.");
          }
          result = await staffAuthService.login(req.body, transaction);
          isStaff = true;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }

    if (result.mfaRequired) {
      return responseHandler.success(
        res,
        200,
        {
          mfaRequired: true,
          mfaChallengeToken: result.mfaChallengeToken,
        },
        "MFA verification required"
      );
    }

    if (isStaff) {
      staffAuthService.setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
      return responseHandler.success(
        res,
        200,
        {
          user: {
            ...result.entity,
            role: "staff",
          },
          accessToken: result.accessToken,
          hasStore: true,
        },
        "Staff login successful"
      );
    }

    // The Auth app needs this single, non-sensitive fact to choose a post-login
    // destination. It avoids a client-side follow-up request that can race the
    // cross-origin session cookie being set.
    const hasStore = await userHasStore(result.entity.id, transaction);
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
  "/mfa/challenge",
  transactionHandler(async (req, res, transaction) => {
    validateReturnUrl(req.body);
    const { mfaChallengeToken, mfaToken, recoveryCode } = req.body;
    const result = await userAuthService.verifyMfaChallenge({
      mfaChallengeToken,
      mfaToken,
      recoveryCode,
      req,
      transaction,
    });
    const hasStore = await userHasStore(result.entity.id, transaction);
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
      "MFA verified successfully"
    );
  })
);

// The bot id is the public prefix of the bot token; the widget or bot needs it.
router.get("/telegram-login-config", (req, res) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "rentify168_bot";
  const botId = botToken.split(":")[0];
  res.status(200).json({
    enabled: Boolean(botToken),
    botUsername,
    botId: botId || null,
    mode: "bot",
  });
});

router.post("/telegram/session", async (req, res) => {
  try {
    const { returnUrl } = req.body || {};
    if (returnUrl) validateReturnUrl({ returnUrl });
    const session = await telegramBotAuthService.createSession({ returnUrl });
    res.status(200).json({ success: true, ...session });
  } catch (err) {
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json({ error: err.message });
  }
});

router.get("/telegram/session/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const session = await telegramBotAuthService.getSession(token);
    if (!session) {
      return res.status(404).json({ status: "expired", message: "Session expired or not found" });
    }
    if (session.status === "authenticated") {
      userAuthService.setAuthCookies(res, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      return res.status(200).json({
        status: "authenticated",
        user: session.user,
        accessToken: session.accessToken,
        hasStore: session.hasStore,
        destination: session.destination,
      });
    }
    return res.status(200).json({ status: "pending" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/telegram/callback", async (req, res) => {
  try {
    const sessionToken = req.query.sessionToken || req.query.token;
    if (!sessionToken) {
      return res.redirect(`${runtimeUrls.authUrl}/login?error=missing_token`);
    }
    const session = await telegramBotAuthService.getSession(sessionToken);
    if (!session || session.status !== "authenticated") {
      return res.redirect(`${runtimeUrls.authUrl}/login?error=session_expired`);
    }
    userAuthService.setAuthCookies(res, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    return res.redirect(session.destination);
  } catch (err) {
    return res.redirect(`${runtimeUrls.authUrl}/login?error=auth_failed`);
  }
});

router.post("/telegram/webhook", async (req, res) => {
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secretHeader && secretHeader !== expectedSecret) {
    return res.status(403).json({ error: "Invalid secret token" });
  }

  // Acknowledge Telegram immediately with 200 OK
  res.sendStatus(200);

  try {
    const transaction = await sequelize.transaction();
    try {
      await telegramBotAuthService.handleWebhookUpdate(req.body, transaction);
      await transaction.commit();
    } catch (procErr) {
      await transaction.rollback();
      console.error("Telegram webhook process error:", procErr);
    }
  } catch (txErr) {
    console.error("Telegram webhook transaction error:", txErr);
  }
});

router.post(
  "/login/telegram",
  transactionHandler(async (req, res, transaction) => {
    const result = await userAuthService.loginWithTelegram({
      authData: req.body?.authData || req.body,
      transaction,
    });
    const hasStore = await userHasStore(result.entity.id, transaction);
    userAuthService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    responseHandler.success(
      res,
      200,
      { user: result.entity, accessToken: result.accessToken, hasStore },
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
