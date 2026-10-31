const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const AuthService = require("../../src/modules/auth/authService");

const BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;

function createTelegramAuthData(fields, token = BOT_TOKEN) {
  const checkString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(token).digest();
  const hash = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  return { ...fields, hash };
}

test("Telegram login: auto-creates new user without OTP and marks as verified", async () => {
  let createdData = null;
  const mockUser = {
    id: "usr-new-telegram",
    name: "John Doe",
    telegramUserId: "99887766",
    telegramChatId: "99887766",
    isVerified: true,
    role: "user",
    save: async () => {},
  };

  const mockEntityModel = {
    findOne: async () => null,
    create: async (data) => {
      createdData = data;
      return { ...mockUser, ...data };
    },
  };

  const authService = new AuthService(mockEntityModel, "User");
  const authData = createTelegramAuthData({
    id: 99887766,
    first_name: "John",
    last_name: "Doe",
    username: "johndoe",
    auth_date: Math.floor(Date.now() / 1000),
  });

  const result = await authService.loginWithTelegram({ authData });

  assert.ok(result.accessToken, "access token generated");
  assert.ok(result.refreshToken, "refresh token generated");
  assert.equal(createdData.telegramUserId, "99887766");
  assert.equal(createdData.isVerified, true, "user auto-verified without OTP");
  assert.equal(createdData.name, "John Doe");
});

test("Telegram login: auto-verifies existing unverified user without requiring OTP", async () => {
  let saved = false;
  const existingUser = {
    id: "usr-existing-unverified",
    name: "Existing User",
    telegramUserId: "11223344",
    telegramChatId: "11223344",
    isVerified: false,
    role: "user",
    save: async () => { saved = true; },
  };

  const mockEntityModel = {
    findOne: async () => existingUser,
    create: async () => assert.fail("create should not be called"),
  };

  const authService = new AuthService(mockEntityModel, "User");
  const authData = createTelegramAuthData({
    id: 11223344,
    first_name: "Existing",
    auth_date: Math.floor(Date.now() / 1000),
  });

  const result = await authService.loginWithTelegram({ authData });

  assert.ok(result.accessToken);
  assert.equal(existingUser.isVerified, true, "unverified user was auto-verified");
  assert.equal(saved, true);
});

test("Telegram login: rejects invalid signature", async () => {
  const mockEntityModel = {
    findOne: async () => null,
    create: async () => null,
  };

  const authService = new AuthService(mockEntityModel, "User");
  const invalidAuthData = {
    id: 12345,
    auth_date: Math.floor(Date.now() / 1000),
    hash: "badhash1234567890badhash1234567890badhash1234567890badhash1234567890",
  };

  await assert.rejects(
    async () => authService.loginWithTelegram({ authData: invalidAuthData }),
    /Telegram login could not be verified/
  );
});

test("Telegram login: rejects expired login data", async () => {
  const mockEntityModel = {
    findOne: async () => null,
    create: async () => null,
  };

  const authService = new AuthService(mockEntityModel, "User");
  const expiredAuthData = createTelegramAuthData({
    id: 12345,
    auth_date: Math.floor(Date.now() / 1000) - 100000, // > 24 hours ago
  });

  await assert.rejects(
    async () => authService.loginWithTelegram({ authData: expiredAuthData }),
    /Telegram login has expired/
  );
});
