const test = require("node:test");
const assert = require("node:assert/strict");

const telegramService = require("../../src/modules/notifications/telegramService");

// Storefront customers live in Commerce's database. Core must refuse the lookup
// with a clear error instead of requiring a Customer model it does not have.
test("Core refuses Telegram lookup for customer accounts", async () => {
  await assert.rejects(
    telegramService.findUser("+85512000000", "customer"),
    (error) => {
      assert.doesNotMatch(error.message, /Cannot find module/);
      assert.match(error.message, /handled by the Commerce API/);
      return true;
    }
  );
});

test("Core still rejects unknown Telegram user types", async () => {
  await assert.rejects(telegramService.findUser("+85512000000", "robot"), /Unknown user type/);
});
