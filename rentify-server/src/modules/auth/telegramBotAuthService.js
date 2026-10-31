const crypto = require('crypto');
const axios = require('axios');
const { User, Store, Website } = require('../../models');
const { hashRefreshToken } = require('../../utils/refreshTokenHash');
const runtimeUrls = require('../../config/runtimeUrls');
const { getMerchantRedis } = require('../../config/redis');

// In-memory fallback cache if Redis is unavailable or for testing
const memorySessions = new Map();
const SESSION_TTL_SEC = 600; // 10 minutes

class TelegramBotAuthService {
  constructor(authService) {
    this.authService = authService;
  }

  getBotUsername() {
    return process.env.TELEGRAM_BOT_USERNAME || 'rentify168_bot';
  }

  getBotToken() {
    return process.env.TELEGRAM_BOT_TOKEN || '';
  }

  async getRedisClient() {
    try {
      return await getMerchantRedis();
    } catch {
      return null;
    }
  }

  async createSession({ returnUrl } = {}) {
    const token = 'auth_' + crypto.randomBytes(16).toString('hex');
    const session = {
      token,
      status: 'pending',
      returnUrl: returnUrl || null,
      createdAt: Date.now(),
    };

    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.setex(`telegram:auth:${token}`, SESSION_TTL_SEC, JSON.stringify(session));
      } catch (err) {
        console.warn('Redis setex error in createSession:', err.message);
      }
    }
    // Also store in memory
    memorySessions.set(token, {
      ...session,
      expiresAt: Date.now() + SESSION_TTL_SEC * 1000,
    });

    const botUsername = this.getBotUsername();
    return {
      token,
      botUsername,
      botUrl: `https://t.me/${botUsername}?start=${token}`,
      expiresIn: SESSION_TTL_SEC,
    };
  }

  async getSession(token) {
    if (!token) return null;

    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(`telegram:auth:${token}`);
        if (raw) return JSON.parse(raw);
      } catch (err) {
        console.warn('Redis get error in getSession:', err.message);
      }
    }

    const mem = memorySessions.get(token);
    if (mem) {
      if (mem.expiresAt && Date.now() > mem.expiresAt) {
        memorySessions.delete(token);
        return null;
      }
      return mem;
    }
    return null;
  }

  async updateSession(token, updatedData) {
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.setex(`telegram:auth:${token}`, SESSION_TTL_SEC, JSON.stringify(updatedData));
      } catch (err) {
        console.warn('Redis updateSession error:', err.message);
      }
    }
    memorySessions.set(token, {
      ...updatedData,
      expiresAt: Date.now() + SESSION_TTL_SEC * 1000,
    });
  }

  async userHasStore(userId, transaction) {
    const storeCount = await Store.count({
      where: { ownerUserId: userId },
      ...(transaction ? { transaction } : {}),
    });
    if (storeCount > 0) return true;
    const websiteCount = await Website.count({
      where: { userId },
      ...(transaction ? { transaction } : {}),
    });
    return websiteCount > 0;
  }

  resolveDestination({ role, hasStore, returnUrl }) {
    if (role === 'admin') {
      return `${runtimeUrls.adminDashboardUrl}/admin/dashboard`;
    }
    if (returnUrl) {
      try {
        const parsed = new URL(returnUrl);
        const mktHost = new URL(runtimeUrls.marketingUrl).host;
        const isBareMarketing = parsed.host === mktHost && (!parsed.pathname || parsed.pathname === '/');
        if (!isBareMarketing && (parsed.host === new URL(runtimeUrls.marketplaceUrl).host || parsed.host === new URL(runtimeUrls.posUrl).host)) {
          return returnUrl;
        }
      } catch {}
    }
    if (hasStore) {
      if (returnUrl) {
        try {
          const parsed = new URL(returnUrl);
          if (parsed.host === new URL(runtimeUrls.merchantDashboardUrl).host) {
            return returnUrl;
          }
        } catch {}
      }
      return `${runtimeUrls.merchantDashboardUrl}/overview`;
    }
    return `${runtimeUrls.marketingUrl}/start`;
  }

  async handleTelegramStart({ token, telegramUser, chatId, transaction }) {
    const session = await this.getSession(token);
    if (!session || session.status !== 'pending') {
      await this.sendTelegramMessage(
        chatId,
        '⚠️ សម័យចូលគណនីបានផុតកំណត់ ឬមិនត្រឹមត្រូវ។ សូមចូលម្តងទៀតពីគេហទំព័រ Rentify។\n\n⚠️ Login session has expired or is invalid. Please try logging in again from the Rentify website.'
      );
      return { success: false, reason: 'invalid_or_expired_session' };
    }

    const { Op } = require('sequelize');
    const telegramUserId = String(telegramUser.id);
    const telegramChatId = String(chatId || telegramUser.id);

    let user = await User.findOne({
      where: {
        [Op.or]: [
          { telegramUserId },
          { telegramChatId },
        ],
      },
      ...(transaction ? { transaction } : {}),
    });

    if (!user) {
      const fullName =
        [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
        telegramUser.username ||
        'Telegram User';
      user = await User.create(
        {
          name: fullName,
          telegramUserId,
          telegramChatId,
          isVerified: true,
          role: 'user',
          profileImage: 'default.jpg',
        },
        transaction ? { transaction } : undefined
      );
    } else {
      let updated = false;
      if (!user.isVerified) {
        user.isVerified = true;
        updated = true;
      }
      if (!user.telegramUserId) {
        user.telegramUserId = telegramUserId;
        updated = true;
      }
      if (!user.telegramChatId) {
        user.telegramChatId = telegramChatId;
        updated = true;
      }
      if (updated) {
        await user.save(transaction ? { transaction } : undefined);
      }
    }

    const hasStore = await this.userHasStore(user.id, transaction);
    const tokens = this.authService.generateTokens(user);
    user.refreshToken = await hashRefreshToken(tokens.refreshToken);
    user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save(transaction ? { transaction } : undefined);

    const destination = this.resolveDestination({
      role: user.role,
      hasStore,
      returnUrl: session.returnUrl,
    });

    const authenticatedSession = {
      ...session,
      status: 'authenticated',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
      },
      hasStore,
      destination,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      authenticatedAt: Date.now(),
    };

    await this.updateSession(token, authenticatedSession);

    // Send friendly confirmation message with return button in Telegram
    const callbackUrl = `${runtimeUrls.authUrl}/auth/telegram/callback?sessionToken=${token}`;
    const returnButtonText = '🚀 ត្រឡប់ទៅ Rentify (Return to Rentify)';
    const welcomeMessage =
      `🎉 *ការចូលគណនីបានជោគជ័យ!* / *Login Successful!*\n\n` +
      `សូមស្វាគមន៍ *${user.name}* មកកាន់ Rentify។\n` +
      `Welcome to Rentify! សូមចុចប៊ូតុងខាងក្រោមដើម្បីត្រឡប់ទៅកាន់ផ្ទាំងគ្រប់គ្រងរបស់អ្នក / Tap the button below to continue:`;

    await this.sendTelegramMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: returnButtonText,
              url: callbackUrl,
            },
          ],
        ],
      },
    });

    return {
      success: true,
      user,
      destination,
      tokens,
    };
  }

  async sendTelegramMessage(chatId, text, extraOptions = {}) {
    const botToken = this.getBotToken();
    if (!botToken || !chatId) return;
    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: chatId,
          text,
          ...extraOptions,
        },
        { timeout: 10000 }
      );
    } catch (err) {
      console.error('sendTelegramMessage error:', err?.response?.data || err?.message);
    }
  }

  async handleWebhookUpdate(update, transaction) {
    if (!update) return;

    // Handle normal message
    const message = update.message;
    if (!message || !message.text) return;

    const text = message.text.trim();
    const chatId = message.chat?.id;
    const from = message.from;

    if (!from || !chatId) return;

    // Check if command is /start auth_<token> or /start <token>
    const match = text.match(/^\/start(?:@\w+)?(?:\s+(auth_\w+|[a-zA-Z0-9_\-]+))?$/);
    if (match) {
      const token = match[1];
      if (token) {
        await this.handleTelegramStart({
          token,
          telegramUser: from,
          chatId,
          transaction,
        });
      } else {
        // Simple /start without token
        const greeting =
          `សូមស្វាគមន៍មកកាន់ Rentify Bot! 🚀\n\n` +
          `ដើម្បីចូលគណនី សូមចូលទៅកាន់គេហទំព័រ ${runtimeUrls.authUrl} ហើយចុចលើ "បន្តជាមួយ Telegram"។\n\n` +
          `Welcome to Rentify Bot! 🚀\n` +
          `To sign in, please visit ${runtimeUrls.authUrl} and tap "Continue with Telegram".`;
        await this.sendTelegramMessage(chatId, greeting);
      }
    }
  }
}

module.exports = TelegramBotAuthService;
