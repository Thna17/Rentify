const test = require("node:test");
const assert = require("node:assert/strict");
process.env.JWT_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

const AuthService = require("../../src/modules/auth/authService");
const { hashRefreshToken, compareRefreshToken } = require("../../src/utils/refreshTokenHash");

test("refresh rotation replaces the stored hash and logout revokes it", async () => {
  const service = new AuthService({}, "User");
  const entity = {
    id: "merchant-a",
    role: "user",
    refreshToken: null,
    refreshTokenExpires: new Date(Date.now() + 60_000),
    async save() {},
  };
  const initial = service.generateTokens(entity).refreshToken;
  entity.refreshToken = await hashRefreshToken(initial);
  const model = { findOne: async () => entity };
  service.entityModel = model;

  const rotated = await service.refreshToken({ refreshToken: initial });
  assert.notEqual(rotated.refreshToken, initial);
  assert.equal(await compareRefreshToken(rotated.refreshToken, entity.refreshToken), true);
  assert.equal(await compareRefreshToken(initial, entity.refreshToken), false);

  await service.logout({ refreshToken: rotated.refreshToken });
  assert.equal(entity.refreshToken, null);
  assert.equal(entity.refreshTokenExpires, null);
});

test("password reset clears existing refresh state", async () => {
  const crypto = require("crypto");
  const service = new AuthService({}, "User");
  const rawResetToken = "one-time-reset-token";
  const entity = {
    password: "old-hash",
    refreshToken: "old-refresh-hash",
    refreshTokenExpires: new Date(Date.now() + 60_000),
    resetPasswordToken: crypto.createHash("sha256").update(rawResetToken).digest("hex"),
    resetPasswordExpires: new Date(Date.now() + 60_000),
    failedAttempts: 3,
    lockUntil: new Date(Date.now() + 60_000),
    async save() {},
  };
  service.entityModel = { findOne: async () => entity };

  await service.resetPassword({ token: rawResetToken, password: "new-password" });
  assert.equal(entity.refreshToken, null);
  assert.equal(entity.refreshTokenExpires, null);
  assert.equal(entity.resetPasswordToken, null);
  assert.equal(entity.failedAttempts, 0);
});
