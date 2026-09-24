const {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwtUtils");
const { Customer } = require("../models");
const { hashRefreshToken, compareRefreshToken } = require("../utils/refreshTokenHash");
const axios = require("axios");
const { sequelize } = require("../config/db");
const cookieConfig = require("../config/cookieConfig");
const { RENTIFY_API_BASE } = require("../config/serviceUrls");

// Marketplace buyers use Core identity even when a browser also carries a
// legacy storefront Customer cookie on the same host (notably localhost).
// Never fall back to a Customer or guest identity for these routes.
const createVerifyCoreBuyer = ({ validate = (accessToken, refreshToken) => axios.post(
  `${RENTIFY_API_BASE}/api/auth/validate-token`, { accessToken, refreshToken },
), errorMessage = 'Rentify buyer sign-in required' } = {}) => async (req, res, next) => {
  const accessToken = req.cookies?.userAccessToken;
  const refreshToken = req.cookies?.userRefreshToken;
  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: errorMessage });
  }
  let validation;
  try { validation = await validate(accessToken, refreshToken); }
  catch (_error) {
    return res.status(401).json({ error: errorMessage });
  }
  const entity = validation.data?.entity;
  if (!validation.data?.valid || !entity?.id) {
    return res.status(401).json({ error: errorMessage });
  }
  req.user = { ...entity, type: 'user' };
  if (validation.data.newAccessToken) {
    res.cookie('userAccessToken', validation.data.newAccessToken, {
      ...cookieConfig, maxAge: 15 * 60 * 1000,
    });
  }
  return next();
};

const verifyCoreBuyer = createVerifyCoreBuyer();
const verifyCoreMerchant = createVerifyCoreBuyer({ errorMessage: 'Merchant authentication required' });
const createVerifyStoreActor = ({ validateStaff = verifyStaffToken,
  verifyMerchant = verifyCoreMerchant } = {}) => async (req, res, next) => {
  if (req.cookies?.staffAccessToken || req.cookies?.staffRefreshToken) {
    const result = await validateStaff(req.cookies.staffAccessToken,
      req.cookies.staffRefreshToken);
    if (result.valid) {
      req.user = { ...result.entity, type: 'staff', permissions: result.permissions };
      return next();
    }
  }
  return verifyMerchant(req, res, next);
};
const verifyStoreActor = createVerifyStoreActor();

// Customer cookies are deliberately host-only.  COOKIE_DOMAIN is reserved for
// central Rentify identities on domains controlled by Rentify.
const customerCookieConfig = () => {
  const options = { ...cookieConfig };
  delete options.domain;
  return options;
};

// Enhanced verifyToken middleware
const verifyToken = async (req, res, next) => {
  // Get tokens from cookies
  const customerAccessToken = req.cookies.customerAccessToken;
  const customerRefreshToken = req.cookies.customerRefreshToken;
  const userAccessToken = req.cookies.userAccessToken;
  const userRefreshToken = req.cookies.userRefreshToken;
  const staffAccessToken = req.cookies.staffAccessToken;
  const staffRefreshToken = req.cookies.staffRefreshToken;

  // 1. Check staff tokens first
  if (staffAccessToken || staffRefreshToken) {
    try {
      const staffValidation = await verifyStaffToken(
        staffAccessToken, 
        staffRefreshToken
      );
      
      if (staffValidation.valid) {
        req.user = {
          ...staffValidation.entity,
          type: "staff",
          permissions: staffValidation.permissions,
        };
        return next();
      }
    } catch (error) {
      console.error("Staff token validation failed");
    }
  }

  // 2. Check customer tokens
  let customer = null;
  
  // Try access token first
  if (customerAccessToken) {
    try {
      const decoded = verifyAccessToken(customerAccessToken);
      customer = await Customer.findByPk(decoded.id);
      if (customer) {
        req.user = {
          id: customer.id,
          type: "customer",
          telegramChatId: customer.telegramChatId,
          email: customer.email,
          sessionId: req.cookies.sessionId,
        };
        return next();
      }
    } catch (accessTokenError) {
      console.log("Customer access token expired or invalid");
    }
  }
  
  // Try refresh token if access token failed
  if (customerRefreshToken) {
    try {
      const decoded = verifyRefreshToken(customerRefreshToken);
      customer = await Customer.findByPk(decoded.id);
      
      if (!customer || !customer.refreshToken) {
        clearCookies(res);
        return next(); // Proceed as guest
      }

      const isMatch = await compareRefreshToken(
        customerRefreshToken,
        customer.refreshToken
      );
      
      if (!isMatch || customer.refreshTokenExpires < new Date()) {
        clearCookies(res);
        return next(); // Proceed as guest
      }

      // Generate new tokens
      const newAccessToken = generateAccessToken(customer.id);
      const newRefreshToken = generateRefreshToken(customer.id);
      
      // Update refresh token in DB
      await customer.update({
        refreshToken: await hashRefreshToken(newRefreshToken),
        refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      // Set new cookies
      res.cookie("customerAccessToken", newAccessToken, {
        ...customerCookieConfig(),
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
      
      res.cookie("customerRefreshToken", newRefreshToken, {
        ...customerCookieConfig(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      req.user = {
        id: customer.id,
        
        type: "customer",
        sessionId: req.cookies.sessionId,
      };
      return next();
    } catch (refreshTokenError) {
      console.error("Customer refresh token validation failed");
      clearCookies(res);
    }
  }

  // 3. Check user tokens (external service)
  if (userAccessToken || userRefreshToken) {
    try {
      const response = await axios.post(
        `${RENTIFY_API_BASE}/api/auth/validate-token`,
        {
          accessToken: userAccessToken,
          refreshToken: userRefreshToken,
        }
      );

      if (response.data.valid) {
        req.user = {
          ...response.data.entity,
          type: "user",
          sessionId: req.cookies.sessionId,
        };
        
        if (response.data.newAccessToken) {
          res.cookie("userAccessToken", response.data.newAccessToken, {
            ...cookieConfig,
            maxAge: 15 * 60 * 1000, // 15 minutes
          });
        }
        return next();
      }
    } catch (err) {
      console.error("User token validation failed");
    }
  }

  // 4. If no valid tokens, treat as guest
  req.user = {
    type: "guest",
  sessionId: req.sessionId || req.cookies.sessionId
  };
  next();
};

// Staff token validation helper
async function verifyStaffToken(staffAccessToken, staffRefreshToken) {
  try {
    const response = await axios.post(
      `${RENTIFY_API_BASE}/api/staff/validate-token`,
      {
        accessToken: staffAccessToken,
        refreshToken: staffRefreshToken,
      }
    );

    if (response.data.valid) {
      return {
        valid: true,
        entity: response.data.entity,
        permissions: response.data.permissions,
      };
    }
  } catch (error) {
    console.error("Staff token validation failed");
  }
  return { valid: false };
}

// Clear authentication cookies
const clearCookies = (res) => {
  const cookieOptions = { ...cookieConfig };

  [
    "customerAccessToken",
    "customerRefreshToken",
    "userAccessToken",
    "userRefreshToken",
    "staffAccessToken",
    "staffRefreshToken",
  ].forEach(cookieName => {
    const options = cookieName.startsWith("customer")
      ? customerCookieConfig()
      : cookieOptions;
    res.clearCookie(cookieName, options);
  });
};

module.exports = { 
  verifyToken, 
  verifyCoreBuyer,
  verifyStoreActor,
  createVerifyStoreActor,
  createVerifyCoreBuyer,
  clearCookies 
};
