// utils/cookieUtils.js
const cookieConfig = require("../config/cookieConfig");
const COOKIE_OPTIONS = {
  ...cookieConfig,
};

module.exports = {
  setAuthCookies: (res, { accessToken, refreshToken }, prefix) => {
    res.cookie(`${prefix}AccessToken`, accessToken, {
      ...COOKIE_OPTIONS,
    });
    
    res.cookie(`${prefix}RefreshToken`, refreshToken, COOKIE_OPTIONS);
  },
  
  clearAuthCookies: (res, prefix) => {
    res.clearCookie(`${prefix}AccessToken`, COOKIE_OPTIONS);
    res.clearCookie(`${prefix}RefreshToken`, COOKIE_OPTIONS);
  }
};
