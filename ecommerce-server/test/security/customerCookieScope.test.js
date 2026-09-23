const test = require("node:test");
const assert = require("node:assert/strict");

process.env.COOKIE_DOMAIN = ".rentify.test";
const AuthService = require("../../services/authService");
const { hashRefreshToken, compareRefreshToken } = require("../../utils/refreshTokenHash");

const cookieResponse = () => ({
  cookies: [],
  cleared: [],
  cookie(name, value, options) { this.cookies.push({ name, value, options }); },
  clearCookie(name, options) { this.cleared.push({ name, options }); },
});

test("customer sessions are host-only even when central SSO uses COOKIE_DOMAIN", () => {
  const response = cookieResponse();
  const service = new AuthService({}, "Customer", true);
  service.setAuthCookies(response, { accessToken: "access", refreshToken: "refresh" });

  assert.equal(response.cookies.length, 3);
  for (const cookie of response.cookies) assert.equal(cookie.options.domain, undefined);

  service.clearAuthCookies(response);
  for (const cookie of response.cleared) assert.equal(cookie.options.domain, undefined);
});

test("central workforce sessions may use the configured Rentify cookie domain", () => {
  const response = cookieResponse();
  const service = new AuthService({}, "User");
  service.setAuthCookies(response, { accessToken: "access", refreshToken: "refresh" });

  assert.equal(response.cookies[0].options.domain, ".rentify.test");
});

test("customer refresh-token rotation changes the token even in the same second", async () => {
  process.env.JWT_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
  const service = new AuthService({}, "Customer", true);
  const { generateRefreshToken } = require("../../utils/jwtUtils");
  const first = generateRefreshToken("customer-a");
  const customer = {
    id: "customer-a",
    refreshToken: await hashRefreshToken(first),
    refreshTokenExpires: new Date(Date.now() + 60_000),
    async save() {},
  };
  service.entityModel = { findOne: async () => customer };

  const rotated = await service.refreshToken({ refreshToken: first });
  assert.notEqual(rotated.refreshToken, first);
  assert.equal(await compareRefreshToken(rotated.refreshToken, customer.refreshToken), true);
  assert.equal(await compareRefreshToken(first, customer.refreshToken), false);
});
