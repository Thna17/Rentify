const AuthService = require("../auth").authService;
const bcrypt = require("bcrypt");
const { Staff, User, Store } = require("../../models");
const { ApiError } = require("../../utils/errors");
const { Op } = require("sequelize");
const { generateAccessToken, generateRefreshToken } = require("../../utils/jwtUtils");

class StaffAuthService extends AuthService {
  constructor() {
    super(Staff, "Staff", false);
    this.cookiePrefix = "staff";
    this.role = "staff";
  }

  generateTokens(entity) {
    const payload = {
      id: entity.id,
      role: "staff",
      storeId: entity.storeId || null,
      merchantId: entity.merchantId,
      permissions: entity.permissions || [],
    };

    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  async signup({ merchantId, storeId, websiteId, permissions, ...params }, transaction) {
    if (merchantId) {
      const merchant = await User.findByPk(merchantId, { transaction });
      if (!merchant) throw new ApiError(404, "Merchant not found");
    }

    if (storeId) {
      const store = await Store.findByPk(storeId, { transaction });
      if (!store) throw new ApiError(404, "Store not found");
    }

    // Validate permissions
    if (!permissions || !Array.isArray(permissions)) {
      throw new ApiError(400, "Permissions must be an array");
    }

    // Create staff with storeId, merchantId, websiteId, and permissions
    const result = await super.signup({
      ...params,
      extraData: { merchantId, storeId, websiteId, permissions },
      transaction,
    });

    return {
      ...result,
      entity: {
        ...result.entity,
        storeId,
        websiteId,
        permissions,
      },
    };
  }

  // Override to include permissions in token payload
  async verifyOtp(params, transaction) {
    const result = await super.verifyOtp(params, transaction);

    // Add permissions to the entity object
    const staff = await this.entityModel.findByPk(result.entity.id, {
      attributes: ["permissions", "storeId", "merchantId", "websiteId", "isActive"],
      transaction,
    });

    if (!staff || !staff.isActive) {
      throw new ApiError(403, "Staff access is inactive");
    }

    return {
      ...result,
      entity: {
        ...result.entity,
        storeId: staff.storeId,
        merchantId: staff.merchantId,
        websiteId: staff.websiteId,
        permissions: staff.permissions,
      },
    };
  }

  // Override to support multi-store selection and permissions in login response
  async login(params, transaction) {
    const { email, phoneNumber, password, storeId } = params;
    let selectedStoreId = storeId;

    const normalizedPhone = phoneNumber ? phoneNumber.replace(/^\+/, "") : null;
    const conditions = [];
    if (email) conditions.push({ email });
    if (normalizedPhone) conditions.push({ phoneNumber: normalizedPhone });

    if (conditions.length > 0) {
      const activeMemberships = await this.entityModel.findAll({
        where: {
          [Op.or]: conditions,
          isActive: true,
        },
        transaction,
      });

      if (!selectedStoreId && activeMemberships.length > 1) {
        throw new ApiError(400, "Multiple store memberships found. Please specify storeId.");
      }
      if (!selectedStoreId && activeMemberships.length === 1) {
        selectedStoreId = activeMemberships[0].storeId;
      }
    }

    const prevStoreIdRequired = this.storeIdRequired;
    if (selectedStoreId) this.storeIdRequired = true;
    let result;
    try {
      result = await super.login({ ...params, storeId: selectedStoreId }, transaction);
    } finally {
      this.storeIdRequired = prevStoreIdRequired;
    }

    // Add permissions to the entity object
    const staff = await this.entityModel.findByPk(result.entity.id, {
      attributes: ["permissions", "storeId", "merchantId", "websiteId", "isActive"],
      transaction,
    });

    if (!staff || !staff.isActive) {
      throw new ApiError(403, "Staff access is inactive");
    }

    if (staff.storeId) {
      const store = await Store.findByPk(staff.storeId, { transaction });
      if (store && store.status !== "active") {
        throw new ApiError(403, "Store is suspended");
      }
    }

    return {
      ...result,
      entity: {
        ...result.entity,
        storeId: staff.storeId,
        merchantId: staff.merchantId,
        websiteId: staff.websiteId,
        permissions: staff.permissions,
      },
    };
  }
}

module.exports = StaffAuthService;
