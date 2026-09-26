const bcrypt = require("bcrypt");
const { hashRefreshToken, compareRefreshToken } = require("../../utils/refreshTokenHash");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { generateOtp } = require("../../utils/otpUtils");
const { sendEmail } = require("../notifications").emailService;
const otpVerificationEmail = require("./emails/otpVerificationEmail");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../../utils/jwtUtils");
const { ApiError } = require("../../utils/errors");
const notificationService = require("../notifications").notificationService;

class AuthService {
  constructor(entityModel, entityType, storeIdRequired = false) {
    this.entityModel = entityModel;
    this.entityType = entityType;
    this.entityName = entityType;
    this.role = entityType === "Customer" ? "customer" : "user";
    this.storeIdRequired = storeIdRequired;
    this.cookiePrefix = entityType.toLowerCase();
  }

  validateInput({
    email,
    phoneNumber,
    password,
    confirmPassword,
    storeId,
    verificationMethod,
  }) {
    if (!email && !phoneNumber) {
      throw new ApiError(400, "Either email or phone number is required");
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }
    if (phoneNumber && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw new ApiError(400, "Invalid phone number format");
    }
    if (password && password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }
    if (password && confirmPassword && password !== confirmPassword) {
      throw new ApiError(400, "Passwords do not match");
    }
    if (this.storeIdRequired && !storeId) {
      throw new ApiError(400, "Store ID is required");
    }
    if (
      verificationMethod &&
      !["email", "telegram"].includes(verificationMethod)
    ) {
      throw new ApiError(
        400,
        "Invalid verification method. Use 'email' or 'telegram'"
      );
    }
  }

  async signup({
    name,
    email,
    phoneNumber,
    password,
    confirmPassword,
    storeId,
    verificationMethod,
    transaction,
  }) {
    // Validate input
    this.validateInput({
      email,
      phoneNumber,
      password,
      confirmPassword,
      storeId,
      verificationMethod,
    });

    // Normalize inputs
    const normalizedPhone = phoneNumber ? phoneNumber.replace(/^\+/, "") : null;

    // Build dynamic condition
    const conditions = [];
    if (email) conditions.push({ email });
    if (normalizedPhone) conditions.push({ phoneNumber: normalizedPhone });

    const filteredConditions = conditions.filter((cond) => {
      const val = Object.values(cond)[0];
      return val !== null && val !== undefined;
    });

    if (filteredConditions.length === 0) {
      throw new ApiError(400, "Either email or phone number is required");
    }

    // Build where clause
    const whereClause = this.storeIdRequired
      ? {
          [Op.and]: [{ [Op.or]: filteredConditions }, { storeId }],
        }
      : { [Op.or]: filteredConditions };

    // Find existing entity (duplicate check)
    const existingEntity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (existingEntity) {
      const isEmailMatch =
        email &&
        existingEntity.email &&
        existingEntity.email.toLowerCase() === email.toLowerCase();

      const isPhoneMatch =
        normalizedPhone &&
        existingEntity.phoneNumber &&
        existingEntity.phoneNumber === normalizedPhone;

      if (isEmailMatch) {
        throw new ApiError(
          400,
          `Email already registered${
            this.storeIdRequired ? " for this store" : ""
          }`
        );
      }

      if (isPhoneMatch) {
        throw new ApiError(
          400,
          `Phone number already registered${
            this.storeIdRequired ? " for this store" : ""
          }`
        );
      }

      throw new ApiError(
        400,
        `Account already registered${
          this.storeIdRequired ? " for this store" : ""
        }`
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare data
    const entityData = {
      name,
      email,
      phoneNumber: normalizedPhone,
      password: hashedPassword,
      isVerified: false,
      ...(this.storeIdRequired && { storeId, isGuest: false }),
      ...(!this.storeIdRequired && { role: "user" }),
    };

    // Create entity
    const entity = await this.entityModel.create(entityData, { transaction });

    // Send OTP if needed
    if (verificationMethod === "email") {
      const newOtp = generateOtp();
      entity.otp = newOtp;
      entity.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await entity.save({ transaction });

      const emailTemplate = otpVerificationEmail(newOtp);
      const response = await sendEmail(
        email,
        `🔒 Your Verification Code for ${
          this.storeIdRequired ? "Store" : "Rentify"
        } Account`,
        emailTemplate
      );
    }

    return {
      message:
        verificationMethod === "email"
          ? "Account created. Check email for OTP"
          : "Account created. Please link Telegram to receive OTP",
    };
  }

  async resendOtp({
    email,
    phoneNumber,
    storeId,
    verificationMethod,
    transaction,
  }) {
    this.validateInput({ email, phoneNumber, storeId, verificationMethod });

    const whereClause = this.storeIdRequired
      ? { [Op.or]: [{ email }, { phoneNumber }], storeId }
      : { [Op.or]: [{ email }, { phoneNumber }] };
    const entity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (!entity) {
      throw new ApiError(404, `${this.entityName} not found`);
    }

    const newOtp = generateOtp();
    entity.otp = newOtp;
    entity.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await entity.save({ transaction });

    try {
      if (verificationMethod === "email") {
        if (!entity.email) {
          throw new ApiError(400, "No email associated with this account");
        }
        await notificationService.sendNotification(
          "email",
          entity.email,
          `Your OTP is: ${newOtp}`,
          "Your Verification Code"
        );
      } else if (verificationMethod === "telegram") {
        if (!entity.phoneNumber) {
          throw new ApiError(
            400,
            "No phone number associated with this account"
          );
        }
        await notificationService.sendNotification(
          "telegram",
          entity.phoneNumber,
          `Your verification code is: ${newOtp}`
        );
      }
    } catch (error) {
      console.error("Failed to send OTP");
      throw new ApiError(
        500,
        `Failed to send OTP. ${
          verificationMethod === "telegram"
            ? "Ensure your phone number is linked with @MyOTPBot."
            : "Check your email configuration."
        }`
      );
    }

    return {
      message: `OTP sent to ${
        verificationMethod === "email" ? "email" : "Telegram"
      }`,
    };
  }

  async verifyOtp({
    email,
    phoneNumber,
    otp,
    storeId,
    verificationMethod,
    transaction,
  }) {
    this.validateInput({ email, phoneNumber, storeId, verificationMethod });

    let whereClause;
    if (email) {
      whereClause = this.storeIdRequired ? { email, storeId } : { email };
    } else if (phoneNumber) {
      whereClause = this.storeIdRequired
        ? { phoneNumber, storeId }
        : { phoneNumber };
    } else {
      throw new ApiError(400, "Email or phone number required");
    }

    const entity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (!entity) {
      throw new ApiError(404, `${this.entityName} not found`);
    }

    if (entity.failedAttempts >= 5) {
      throw new ApiError(
        429,
        "Too many OTP attempts. Account temporarily locked."
      );
    }

    if (!entity.otp || entity.otp !== otp || entity.otpExpires < Date.now()) {
      entity.failedAttempts = (entity.failedAttempts || 0) + 1;
      await entity.save({ transaction });
      throw new ApiError(400, "Invalid or expired OTP");
    }

    entity.isVerified = true;
    entity.otp = null;
    entity.otpExpires = null;
    entity.failedAttempts = 0;

    const accessToken = generateAccessToken(entity.id);
    const refreshToken = generateRefreshToken(entity.id);
    entity.refreshToken = await hashRefreshToken(refreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );

    await entity.save({ transaction });

    return {
      accessToken,
      refreshToken,
      entity: {
        id: entity.id,
        email: entity.email,
        phoneNumber: entity.phoneNumber,
        name: entity.name,
        ...(this.storeIdRequired && { storeId: entity.storeId }),
      },
    };
  }

  async login({ email, phoneNumber, password, storeId, transaction }) {
    this.validateInput({ email, phoneNumber, storeId });

    // Normalize phone number if provided
    const normalizedPhone = phoneNumber ? phoneNumber.replace(/^\+/, "") : null;

    // Build dynamic conditions
    const conditions = [];
    if (email) conditions.push({ email });
    if (normalizedPhone) conditions.push({ phoneNumber: normalizedPhone });

    // Build where clause
    const whereClause = this.storeIdRequired
      ? { [Op.and]: [{ [Op.or]: conditions }, { storeId }] }
      : { [Op.or]: conditions };

    const entity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (!entity) {
      throw new ApiError(404, `${this.entityName} not found`);
    }

    // Account lock check
    if (entity.lockUntil && entity.lockUntil > Date.now()) {
      throw new ApiError(429, "Account locked. Try again later.");
    }

    // Password verification
    const isMatch = await bcrypt.compare(password, entity.password);
    if (!isMatch) {
      entity.failedAttempts = (entity.failedAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (entity.failedAttempts >= 5) {
        entity.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }

      await entity.save({ transaction });
      throw new ApiError(400, "Invalid credentials");
    }

    // Account verification check
    if (!entity.isVerified) {
      throw new ApiError(
        400,
        "Account not verified. Please verify with OTP first."
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(entity.id);
    const refreshToken = generateRefreshToken(entity.id);

    // Update entity with new tokens
    entity.refreshToken = await hashRefreshToken(refreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days
    entity.failedAttempts = 0;
    entity.lockUntil = null;

    await entity.save({ transaction });

    return {
      accessToken,
      refreshToken,
      entity: {
        id: entity.id,
        email: entity.email,
        phoneNumber: entity.phoneNumber,
        name: entity.name,
        ...(this.storeIdRequired && { storeId: entity.storeId }),
      },
    };
  }

  async forgotPassword({ email, phoneNumber, storeId, transaction }) {
    this.validateInput({ email, phoneNumber, storeId });

    // Normalize phone number
    const normalizedPhone = phoneNumber ? phoneNumber.replace(/^\+/, "") : null;

    // Build where clause
    const whereClause = {};
    if (email) whereClause.email = email;
    if (normalizedPhone) whereClause.phoneNumber = normalizedPhone;
    if (this.storeIdRequired && storeId) whereClause.storeId = storeId;

    const entity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (!entity) {
      throw new ApiError(404, `${this.entityName} not found`);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    entity.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    entity.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await entity.save({ transaction });

    // Determine contact method
    const contactMethod = entity.email ? "email" : "telegram";
    const contactAddress = entity.email || entity.phoneNumber;

    try {
      if (contactMethod === "email") {
        await notificationService.sendNotification(
          "email",
          contactAddress,
          `Your password reset token: ${resetToken}`,
          "Password Reset Request"
        );
      } else {
        await notificationService.sendNotification(
          "telegram",
          contactAddress,
          `Your password reset token: ${resetToken}`
        );
      }
    } catch (error) {
      console.error("Failed to send reset token");
      throw new ApiError(500, "Failed to send reset token");
    }

    return {
      message: `Reset token sent to ${contactMethod}`,
      resetToken,
      contactMethod,
    };
  }

  async resetPassword({ storeId, token, password, transaction }) {
    // Validate password
    if (!password || password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const whereClause = {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { [Op.gt]: Date.now() },
    };

    if (this.storeIdRequired && storeId) {
      whereClause.storeId = storeId;
    }

    const entity = await this.entityModel.findOne({
      where: whereClause,
      transaction,
    });

    if (!entity) {
      throw new ApiError(400, "Invalid or expired token");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    entity.password = hashedPassword;
    entity.resetPasswordToken = null;
    entity.resetPasswordExpires = null;
    // A password reset invalidates every prior browser session for this customer.
    entity.refreshToken = null;
    entity.refreshTokenExpires = null;
    await entity.save({ transaction });

    return { message: "Password updated successfully" };
  }

  async logout({ refreshToken, ip, userAgent, transaction }) {
    let entityId = null;
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        entityId = decoded.id;
        const entity = await this.entityModel.findOne({
          where: { id: decoded.id },
          transaction,
        });

        if (entity) {
          entity.refreshToken = null;
          entity.refreshTokenExpires = null;
          await entity.save({ transaction });
        }
      } catch (e) {
        // Token verification failed - proceed with logout
      }
    }

    return { message: "Logout successful" };
  }
  // Refresh Token: Generate new access and refresh tokens
  async refreshToken({ refreshToken, transaction }) {
    if (!refreshToken) {
      throw new ApiError(401, "No refresh token provided");
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const entity = await this.entityModel.findOne({
      where: { id: decoded.id },
      transaction,
    });
    if (!entity || !entity.refreshToken) {
      throw new ApiError(401, "Invalid refresh token");
    }

    const isMatch = await compareRefreshToken(refreshToken, entity.refreshToken);
    if (!isMatch || entity.refreshTokenExpires < Date.now()) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const newAccessToken = generateAccessToken(entity.id);
    const newRefreshToken = generateRefreshToken(entity.id);
    entity.refreshToken = await hashRefreshToken(newRefreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    await entity.save({ transaction });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  setAuthCookies(res, tokens) {
    const cookieConfig = require("../../config/cookieConfig");
    // Customer authentication belongs only to the storefront currently serving
    // the request.  In particular, never inherit COOKIE_DOMAIN here: merchant
    // custom domains are unrelated cookie registries.
    const options = { ...cookieConfig };
    if (this.entityType === "Customer") delete options.domain;

    res.cookie(`${this.cookiePrefix}AccessToken`, tokens.accessToken, {
      ...options,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(`${this.cookiePrefix}RefreshToken`, tokens.refreshToken, {
      ...options,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie(`authType`, this.entityType.toLowerCase(), {
      ...options,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res) {
    const cookieConfig = require("../../config/cookieConfig");
    const options = { ...cookieConfig };
    if (this.entityType === "Customer") delete options.domain;

    res.clearCookie(`${this.cookiePrefix}AccessToken`, options);
    res.clearCookie(`${this.cookiePrefix}RefreshToken`, options);
    res.clearCookie("authType", {
      ...options,
      httpOnly: false, // match setAuthCookies
    });
  }
}

module.exports = AuthService;
