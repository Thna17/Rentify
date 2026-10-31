const test = require('node:test');
const assert = require('node:assert/strict');
const TelegramBotAuthService = require('../../src/modules/auth/telegramBotAuthService');
const runtimeUrls = require('../../src/config/runtimeUrls');

test('TelegramBotAuthService: session lifecycle and destination routing', async () => {
  const fakeAuthService = {
    generateTokens: (user) => ({
      accessToken: 'fake-access-token-' + user.id,
      refreshToken: 'fake-refresh-token-' + user.id,
    }),
  };

  const service = new TelegramBotAuthService(fakeAuthService);

  // 1. Destination routing
  // Admin -> admin dashboard
  const adminDest = service.resolveDestination({ role: 'admin', hasStore: true });
  assert.equal(adminDest, `${runtimeUrls.adminDashboardUrl}/admin/dashboard`);

  const adminNoStoreDest = service.resolveDestination({ role: 'admin', hasStore: false });
  assert.equal(adminNoStoreDest, `${runtimeUrls.adminDashboardUrl}/admin/dashboard`);

  // Merchant with store -> merchant overview
  const merchantDest = service.resolveDestination({ role: 'user', hasStore: true });
  assert.equal(merchantDest, `${runtimeUrls.merchantDashboardUrl}/overview`);

  // Storeless user -> onboarding /start
  const storelessDest = service.resolveDestination({ role: 'user', hasStore: false });
  assert.equal(storelessDest, `${runtimeUrls.marketingUrl}/start`);

  // 2. Session creation
  const sessionData = await service.createSession({ returnUrl: null });
  assert.ok(sessionData.token.startsWith('auth_'));
  assert.ok(sessionData.botUrl.includes('https://t.me/'));
  assert.ok(sessionData.botUrl.includes(sessionData.token));

  // 3. Get session
  const pendingSession = await service.getSession(sessionData.token);
  assert.ok(pendingSession);
  assert.equal(pendingSession.status, 'pending');

  // 4. Handle Telegram /start auth_<token>
  const fakeTelegramUser = {
    id: 99887711,
    first_name: 'Test',
    last_name: 'TelegramUser',
    username: 'test_tg_user',
  };

  // Mock sendTelegramMessage to avoid network call in unit test
  let sentMessage = null;
  service.sendTelegramMessage = async (chatId, text, options) => {
    sentMessage = { chatId, text, options };
  };

  // Mock userHasStore for this test
  service.userHasStore = async () => false; // storeless user

  // Mock User model methods
  const User = require('../../src/models/User');
  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  const mockUser = {
    id: 'usr-tg-bot-test',
    name: 'Test TelegramUser',
    telegramUserId: '99887711',
    telegramChatId: '99887711',
    isVerified: true,
    role: 'user',
    save: async () => {},
  };

  User.findOne = async () => null; // new user
  User.create = async () => mockUser;

  try {
    const startUpdate = {
      message: {
        chat: { id: 99887711 },
        from: fakeTelegramUser,
        text: `/start ${sessionData.token}`,
      },
    };

    await service.handleWebhookUpdate(startUpdate);

    // Verify session updated to authenticated
    const authSession = await service.getSession(sessionData.token);
    assert.ok(authSession);
    assert.equal(authSession.status, 'authenticated');
    assert.equal(authSession.destination, `${runtimeUrls.marketingUrl}/start`);
    assert.equal(authSession.hasStore, false);
    assert.equal(authSession.accessToken, 'fake-access-token-usr-tg-bot-test');

    // Verify message sent to telegram with callback link
    assert.ok(sentMessage);
    assert.equal(sentMessage.chatId, 99887711);
    assert.ok(sentMessage.text.includes('Rentify'));
    assert.ok(sentMessage.options.reply_markup.inline_keyboard[0][0].url.includes(sessionData.token));
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
});
