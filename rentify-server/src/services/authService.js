const bcrypt = require("bcrypt");
const { hashRefreshToken, compareRefreshToken } = require("../utils/refreshTokenHash");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { generateOtp } = require("../utils/otpUtils");
const { sendEmail } = require("../services/emailService");
const otpVerificationEmail = require("../utils/templates/otpVerificationEmail");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../utils/jwtUtils");
const { ApiError } = require("../utils/errors");
const NotificationService = require("./notificationService");
const notificationService = new NotificationService("merchant"); 
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

  generateTokens(entity) {
    const payload = {
      id: entity.id,
      ...(entity.role && { role: entity.role }),
      ...(entity.permissions && { permissions: entity.permissions }),
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  
  #formatEntityResponse(entity) {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phoneNumber: entity.phoneNumber,
      ...(entity.permissions && { permissions: entity.permissions }),
      ...(entity.storeId && { storeId: entity.storeId }),
    };
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
    extraData = {},
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
 const existingEntity = await this.#findExistingEntity(whereClause, transaction);
    

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
      ...extraData,
    };

    // Create entity
    const entity = await this.entityModel.create(entityData, { transaction });

    // console.log(entity);

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
      entity: this.#formatEntityResponse(entity),
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
  await notificationService.send({
  channel: "email",
  recipient: entity.email,
  message: `Your OTP is: ${newOtp}`,
  options: { subject: "Your Verification Code" }
});
        
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

    const tokens = this.generateTokens(entity);

    entity.refreshToken = await hashRefreshToken(tokens.refreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );

    await entity.save({ transaction });

    return {
      ...tokens,
      entity: this.#formatEntityResponse(entity),
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

    const tokens = this.generateTokens(entity);

    // Update entity with new tokens
    entity.refreshToken = await hashRefreshToken(tokens.refreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ); // 30 days
    entity.failedAttempts = 0;
    entity.lockUntil = null;

    await entity.save({ transaction });

    return {
      ...tokens,
      entity: this.#formatEntityResponse(entity),
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

    const resetToken = generateOtp();
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
        await notificationService.send({
          channel: "email",
          recipient: contactAddress,
          message: `Your Rentify password reset code is: ${resetToken}. It expires in 10 minutes.`,
          options: { subject: "Your Rentify password reset code" },
        });
      } else {
        if (!entity.telegramChatId) {
          throw new ApiError(400, "Link your Telegram account before resetting a phone-based account");
        }
        await notificationService.send({
          channel: "telegram",
          recipient: contactAddress,
          message: `Your Rentify password reset code is: ${resetToken}. It expires in 10 minutes.`,
          options: { chatId: entity.telegramChatId },
        });
      }
    } catch (error) {
      console.error("Failed to send reset token");
      throw new ApiError(500, "Failed to send reset token");
    }

    return {
      message: `Password reset code sent to ${contactMethod}`,
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
    // A password reset invalidates every prior browser session for this identity.
    entity.refreshToken = null;
    entity.refreshTokenExpires = null;
    entity.failedAttempts = 0;
    entity.lockUntil = null;
    await entity.save({ transaction });

    return { message: "Password updated successfully" };
  }

  async logout({ refreshToken, transaction }) {
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
    const tokens = this.generateTokens(entity);

    entity.refreshToken = await hashRefreshToken(tokens.refreshToken);
    entity.refreshTokenExpires = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    await entity.save({ transaction });

    return { ...tokens };
  }

  setAuthCookies(res, tokens) {
    const cookieConfig = require("../config/cookieConfig");

    res.cookie(`${this.cookiePrefix}AccessToken`, tokens.accessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie(`${this.cookiePrefix}RefreshToken`, tokens.refreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.cookie(`authType`, this.entityType.toLowerCase(), {
      ...cookieConfig,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  clearAuthCookies(res) {
    const cookieConfig = require("../config/cookieConfig");
    const options = { ...cookieConfig };

    res.clearCookie(`${this.cookiePrefix}AccessToken`, options);
    res.clearCookie(`${this.cookiePrefix}RefreshToken`, options);
    res.clearCookie("authType", {
      ...options,
      httpOnly: false, // match setAuthCookies
    });
  }

async #findExistingEntity(where, transaction) {
  return this.entityModel.findOne({ where, transaction });
}

  async validateToken(authToken, refreshToken, transaction) {
    if (!authToken && !refreshToken) {
      return { valid: false, error: "No token provided" };
    }

    try {
      // Try access token first
      if (authToken) {
        const decoded = verifyAccessToken(authToken);

        const entity = await this.entityModel.findOne({
          where: { id: decoded.id },
          transaction,
        });

        if (entity) {
          return {
            valid: true,
            entity: {
              id: entity.id,
              email: entity.email,
              phoneNumber: entity.phoneNumber,
              telegramChatId: entity.telegramChatId,
              name: entity.name,
              isVerified: entity.isVerified,
              type: entity.role,
              permissions: entity.permissions,
              ...(this.storeIdRequired && { storeId: entity.storeId }),
            },
          };
        }
      }

      // Try refresh token
      if (refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        const entity = await this.entityModel.findOne({
          where: { id: decoded.id },
          transaction,
        });

        if (!entity || !entity.refreshToken) {
          return { valid: false, error: "Invalid refresh token" };
        }

        const isMatch = await compareRefreshToken(refreshToken, entity.refreshToken);

        if (!isMatch || entity.refreshTokenExpires < Date.now()) {
          return { valid: false, error: "Invalid or expired refresh token" };
        }

        const newAccessToken = generateAccessToken({ id: entity.id });

        return {
          valid: true,
          entity: {
            id: entity.id,
            email: entity.email,
            phoneNumber: entity.phoneNumber,
            telegramChatId: entity.telegramChatId,
            name: entity.name,
            isVerified: entity.isVerified,
            type: entity.role,
            ...(this.storeIdRequired && { storeId: entity.storeId }),
          },
          newAccessToken,
        };
      }
    } catch (err) {
      return { valid: false, error: "Token verification failed" };
    }

    return { valid: false, error: err };
  }
}

module.exports = AuthService;
