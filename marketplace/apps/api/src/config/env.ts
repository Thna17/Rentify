const asPositiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  get smtpHost() { return process.env.SMTP_HOST; },
  get smtpPort() { return asPositiveNumber(process.env.SMTP_PORT, 587); },
  get smtpUser() { return process.env.SMTP_USER; },
  get smtpPassword() { return process.env.SMTP_PASSWORD; },
  get mailFrom() { return process.env.MAIL_FROM; },
  /**
   * Whether a real transactional-email provider is actually wired up. Used
   * to decide, at registration time, between requiring email verification
   * (once SMTP_* is set — see .env.example) and auto-verifying accounts
   * (when it isn't, so registration is never a dead end nothing can ever
   * deliver a code for). See auth.service.ts#register.
   */
  get isEmailConfigured() {
    return Boolean(
      this.smtpHost && this.smtpUser && this.smtpPassword && this.mailFrom,
    );
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? 'development';
  },
  /**
   * Required in EVERY environment, not just production. A committed fallback
   * secret means anyone who can read the repository can mint an ADMIN token,
   * and an environment that simply forgets to set NODE_ENV would silently use
   * it. Failing to boot is the safe outcome.
   */
  get jwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -hex 32',
      );
    }
    return secret;
  },
  get jwtExpiresInSeconds() {
    return asPositiveNumber(process.env.JWT_EXPIRES_IN_SECONDS, 15 * 60);
  },
  get refreshTokenExpiresInDays() {
    return asPositiveNumber(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS, 7);
  },
  get resetTokenExpiresInMinutes() {
    return asPositiveNumber(process.env.RESET_TOKEN_EXPIRES_IN_MINUTES, 30);
  },
  get webUrl() {
    return process.env.WEB_URL ?? 'http://localhost:4200';
  },
  get allowedOrigins() {
    return (process.env.CORS_ALLOWED_ORIGINS ?? this.webUrl)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get trustProxy() {
    return process.env.TRUST_PROXY === 'true';
  },
  get maxFailedLogins() {
    return asPositiveNumber(process.env.MAX_FAILED_LOGINS, 5);
  },
  get accountLockMinutes() {
    return asPositiveNumber(process.env.ACCOUNT_LOCK_MINUTES, 15);
  },
  /**
   * ABA PayWay merchant credentials. Deliberately not asserted at boot —
   * unlike JWT_SECRET, a deployment without them is still valid (payment is
   * one feature, not the whole API); `payments.service.ts` throws a clear
   * 500 the moment someone actually tries to check out with ABA_PAYWAY
   * instead. Never log these, and never accept them from a request body.
   */
  get paywayMerchantId() {
    return process.env.PAYWAY_MERCHANT_ID;
  },
  get paywayApiKey() {
    return process.env.PAYWAY_API_KEY;
  },
  /**
   * Sandbox by default on purpose: pointing at the live PayWay endpoint
   * should be an explicit opt-in (setting PAYWAY_BASE_URL in production),
   * never the fallback a forgotten env var quietly lands on.
   */
  get paywayBaseUrl() {
    return process.env.PAYWAY_BASE_URL ?? 'https://checkout-sandbox.payway.com.kh';
  },
  /**
   * Where PayWay's server-to-server webhook reaches this API. Only a real,
   * publicly reachable URL works here — on a local dev machine this must be
   * a tunnel (ngrok, cloudflared) pointed at this API, since ABA's servers
   * cannot reach localhost. Falls back to apiPublicUrl + the callback route.
   */
  get paywayCallbackUrl() {
    return (
      process.env.PAYWAY_CALLBACK_URL ??
      `${this.apiPublicUrl}/api/payments/aba-payway/callback`
    );
  },
  get apiPublicUrl() {
    return process.env.API_PUBLIC_URL ?? 'http://localhost:3001';
  },
};

/**
 * Touch every required setting at boot so a misconfigured environment fails
 * immediately and loudly, instead of at the first login attempt.
 */
export const assertEnv = () => {
  void env.jwtSecret;
};
