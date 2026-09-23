const AuthService = require("./authService");
const bcrypt = require("bcrypt");
const { Staff, User } = require("../models");
const { ApiError } = require("../utils/errors");

class StaffAuthService extends AuthService {
  constructor() {
    super(Staff, "Staff", false);
    this.cookiePrefix = "staff";
  }

  async signup({ merchantId,  permissions, ...params }, transaction) {
    // Verify merchant exists

    const merchant = await User.findByPk(merchantId, { transaction });
    if (!merchant) throw new ApiError(404, "Merchant not found");

    // Validate permissions
    if (!permissions || !Array.isArray(permissions)) {
      throw new ApiError(400, "Permissions must be an array");
    }

    // Create staff with merchantId and permissions
    const result = await super.signup({
      ...params,
      extraData: { merchantId, permissions },
      transaction,
    });

    return {
      ...result,
      entity: {
        ...result.entity,
        permissions,
      },
    };
  }

  // Override to include permissions in token payload
  async verifyOtp(params, transaction) {
    const result = await super.verifyOtp(params, transaction);

    // Add permissions to the entity object
    const staff = await this.entityModel.findByPk(result.entity.id, {
      attributes: ["permissions"],
      transaction,
    });

    return {
      ...result,
      entity: {
        ...result.entity,
        permissions: staff.permissions,
      },
    };
  }

  // Override to include permissions in login response
  async login(params, transaction) {
    const result = await super.login(params, transaction);

    // Add permissions to the entity object
    const staff = await this.entityModel.findByPk(result.entity.id, {
      attributes: ["permissions"],
      transaction,
    });

    return {
      ...result,
      entity: {
        ...result.entity,
        permissions: staff.permissions,
      },
    };
  }
}

module.exports = StaffAuthService;
