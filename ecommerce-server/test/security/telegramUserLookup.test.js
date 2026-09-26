const test = require("node:test");
const assert = require("node:assert/strict");

const telegramService = require("../../modules/notifications/telegramService");

// Merchant and staff accounts live in Core's database. Commerce must refuse the
// lookup with a clear error instead of requiring a model it does not have.
for (const userType of ["merchant", "staff"]) {
  test(`Commerce refuses Telegram lookup for ${userType} accounts`, async () => {
    await assert.rejects(
      telegramService.findUser("+85512000000", userType),
      (error) => {
        assert.doesNotMatch(error.message, /Cannot find module/);
        assert.match(error.message, /handled by the Core API/);
        return true;
      }
    );
  });
}
