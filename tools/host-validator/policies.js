// tools/host-validator/policies.js
// Implementation of Release 1 host, domain, and configuration policies.

const MANDATORY_RESERVED_SUBDOMAINS = [
  'admin',
  'api',
  'auth',
  'billing',
  'checkout',
  'mail',
  'marketplace',
  'support',
  'www',
  'app',
  'apps',
  'login',
  'signin',
  'signup',
  'account',
  'accounts',
  'merchant',
  'merchants',
  'seller',
  'sellers',
  'market',
  'dashboard',
  'store',
  'stores',
  'shop',
  'storefront',
  'cart',
  'pay',
  'payment',
  'payments',
  'invoice',
  'email',
  'smtp',
  'static',
  'cdn',
  'assets',
  'media',
  'images',
  'help',
  'status',
  'docs',
  'blog',
  'news',
  'rentify',
  'official',
  'security',
  'test',
  'dev',
  'staging',
  'demo',
];

const RESERVED_SUBDOMAIN_SET = new Set(MANDATORY_RESERVED_SUBDOMAINS);

const RELEASE_1_DECISIONS = {
  canonicalMarketplaceDomain: 'rentifymarket.com',
  canonicalHostedStorefrontParent: 'rentifystore.shop',
  stagingHostedStorefrontParent: 'staging.rentifystore.shop',
  hostedPattern: 'https://<store>.rentifystore.shop',
  customDomainBrowseOnly: true,
  codAcceptedPaymentOnly: true,
  cutluyDeferredPhase: 'Phase 9',
};

// DNS label RFC 1035: lowercase letters, digits, and internal hyphens, 1-63 chars
const DNS_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const LOOPBACK_OR_LOCALHOST_REGEX = /(?:^|\.)localhost$|^127\.\d+\.\d+\.\d+$|^0\.0\.0\.0$|^::1$/i;

/**
 * Validates whether a subdomain label is valid and non-reserved under the hosted storefront domain.
 *
 * @param {string} label
 * @param {Set<string>} [customReserved]
 * @returns {{ valid: boolean, error?: string }}
 */
function isApprovedHostedSubdomain(label, customReserved = new Set()) {
  if (!label || typeof label !== 'string') {
    return { valid: false, error: 'Subdomain label must be a non-empty string' };
  }
  const normalized = label.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 63) {
    return { valid: false, error: `Subdomain length must be between 3 and 63 characters (got ${normalized.length})` };
  }
  if (!DNS_LABEL_REGEX.test(normalized)) {
    return { valid: false, error: 'Subdomain must contain only lowercase alphanumeric characters and hyphens, without leading or trailing hyphens' };
  }
  if (RESERVED_SUBDOMAIN_SET.has(normalized) || customReserved.has(normalized)) {
    return { valid: false, error: `Subdomain "${normalized}" is a reserved system name` };
  }
  return { valid: true };
}

/**
 * Validates whether an origin represents an approved single-label hosted storefront.
 *
 * @param {string} origin
 * @param {string} hostedParent
 * @param {string} targetEnv
 * @returns {boolean}
 */
function isApprovedStorefrontOrigin(origin, hostedParent, targetEnv = 'production') {
  if (!origin || !hostedParent) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.username || parsed.password) return false;
    if (targetEnv === 'production' || targetEnv === 'staging') {
      if (parsed.protocol !== 'https:' || parsed.port) return false;
    }
    const host = parsed.hostname.toLowerCase();
    const parent = hostedParent.toLowerCase();
    if (!host.endsWith(`.${parent}`)) return false;
    const label = host.slice(0, -(parent.length + 1));
    return isApprovedHostedSubdomain(label).valid;
  } catch {
    return false;
  }
}

/**
 * Policy 1: Development / Staging / Production separation and Localhost Prohibition.
 */
function checkEnvironmentSeparation(env, targetEnv, report) {
  const nodeEnv = (env.NODE_ENV || '').trim().toLowerCase();
  if (targetEnv === 'production') {
    if (nodeEnv !== 'production') {
      report.errors.push({
        policy: 'Environment Separation',
        field: 'NODE_ENV',
        message: `NODE_ENV must be "production" for production deployment (got "${nodeEnv || 'empty'}")`,
      });
    }
  } else if (targetEnv === 'staging') {
    if (nodeEnv !== 'staging' && nodeEnv !== 'production') {
      report.warnings.push({
        policy: 'Environment Separation',
        field: 'NODE_ENV',
        message: `NODE_ENV is recommended to be "staging" or "production" for staging validation (got "${nodeEnv}")`,
      });
    }
  }

  // Check all configuration strings for localhost in production
  if (targetEnv === 'production') {
    const keysToCheck = [
      'MARKETPLACE_URL',
      'AUTH_URL',
      'RENTIFY_API_URL',
      'ECOMMERCE_API_URL',
      'ADMIN_DASHBOARD_URL',
      'MERCHANT_DASHBOARD_URL',
      'MARKETING_URL',
      'STOREFRONT_ORIGIN',
      'HOSTED_STOREFRONT_DOMAIN',
      'COOKIE_DOMAIN',
      'CORS_ALLOWED_ORIGINS',
      'CORS_ORIGINS',
      'AUTH_RETURN_URL_ALLOWLIST',
    ];

    for (const key of keysToCheck) {
      const val = env[key];
      if (val && typeof val === 'string' && /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(val)) {
        report.errors.push({
          policy: 'Localhost Prohibition in Production',
          field: key,
          message: `Configuration for "${key}" cannot reference localhost, loopback, or 0.0.0.0 in production`,
        });
      }
    }
  }
}

/**
 * Policy 2: Public Service URLs (Core, Commerce, Auth, Marketplace, Admin, Storefront, Marketing).
 */
function checkPublicOrigins(env, targetEnv, report) {
  const urlConfigs = [
    { key: 'MARKETPLACE_URL', requiredInProd: true, expectedProdHost: 'rentifymarket.com' },
    { key: 'AUTH_URL', requiredInProd: true },
    { key: 'RENTIFY_API_URL', requiredInProd: true },
    { key: 'ECOMMERCE_API_URL', requiredInProd: true },
    { key: 'ADMIN_DASHBOARD_URL', requiredInProd: true },
    { key: 'MERCHANT_DASHBOARD_URL', requiredInProd: true },
    { key: 'MARKETING_URL', requiredInProd: false },
    { key: 'STOREFRONT_ORIGIN', requiredInProd: false },
  ];

  for (const item of urlConfigs) {
    const rawVal = env[item.key];
    if (!rawVal) {
      if (targetEnv === 'production' && item.requiredInProd) {
        report.errors.push({
          policy: 'Public Origins',
          field: item.key,
          message: `Mandatory service URL "${item.key}" is missing or empty in production`,
        });
      }
      continue;
    }

    let parsed;
    try {
      parsed = new URL(rawVal);
    } catch {
      report.errors.push({
        policy: 'Public Origins',
        field: item.key,
        message: `Value for "${item.key}" is not a valid absolute URL: "${rawVal}"`,
      });
      continue;
    }

    if (parsed.username || parsed.password) {
      report.errors.push({
        policy: 'Public Origins',
        field: item.key,
        message: `"${item.key}" contains embedded credentials, which is prohibited`,
      });
    }

    if (targetEnv === 'production' || targetEnv === 'staging') {
      if (parsed.protocol !== 'https:') {
        report.errors.push({
          policy: 'HTTPS Requirement',
          field: item.key,
          message: `"${item.key}" must use HTTPS in ${targetEnv}: got "${parsed.protocol}"`,
        });
      }
    }

    if (targetEnv === 'production') {
      if (item.expectedProdHost) {
        const host = parsed.hostname.toLowerCase();
        if (host !== item.expectedProdHost && host !== `www.${item.expectedProdHost}`) {
          report.errors.push({
            policy: 'Production Marketplace Domain (DEC-001)',
            field: item.key,
            message: `"${item.key}" host in production must be "${item.expectedProdHost}" (got "${host}")`,
          });
        }
      }
    }
  }
}

/**
 * Policy 3: Owned Hosted Storefront Parent Domain (DEC-002).
 */
function checkHostedParent(env, targetEnv, report) {
  const rawParent = (env.HOSTED_STOREFRONT_DOMAIN || '').trim().toLowerCase();
  if (!rawParent) {
    if (targetEnv === 'production' || targetEnv === 'staging') {
      report.errors.push({
        policy: 'Owned Hosted Parent (DEC-002)',
        field: 'HOSTED_STOREFRONT_DOMAIN',
        message: 'HOSTED_STOREFRONT_DOMAIN must be specified for production and staging',
      });
    }
    return;
  }

  if (rawParent.startsWith('http://') || rawParent.startsWith('https://')) {
    report.errors.push({
      policy: 'Owned Hosted Parent (DEC-002)',
      field: 'HOSTED_STOREFRONT_DOMAIN',
      message: 'HOSTED_STOREFRONT_DOMAIN must be a domain name without protocol (e.g. "rentifystore.shop")',
    });
    return;
  }

  if (rawParent.includes('/') || rawParent.includes(':')) {
    report.errors.push({
      policy: 'Owned Hosted Parent (DEC-002)',
      field: 'HOSTED_STOREFRONT_DOMAIN',
      message: 'HOSTED_STOREFRONT_DOMAIN must not contain path, port, or query components',
    });
    return;
  }

  if (targetEnv === 'production') {
    if (rawParent !== RELEASE_1_DECISIONS.canonicalHostedStorefrontParent) {
      report.errors.push({
        policy: 'Owned Hosted Parent (DEC-002)',
        field: 'HOSTED_STOREFRONT_DOMAIN',
        message: `HOSTED_STOREFRONT_DOMAIN in production must be "${RELEASE_1_DECISIONS.canonicalHostedStorefrontParent}" (got "${rawParent}")`,
      });
    }
  } else if (targetEnv === 'staging') {
    const allowedStagingParents = [
      RELEASE_1_DECISIONS.canonicalHostedStorefrontParent,
      RELEASE_1_DECISIONS.stagingHostedStorefrontParent,
    ];
    if (!allowedStagingParents.includes(rawParent)) {
      report.warnings.push({
        policy: 'Owned Hosted Parent (DEC-002)',
        field: 'HOSTED_STOREFRONT_DOMAIN',
        message: `HOSTED_STOREFRONT_DOMAIN in staging is recommended to be "${RELEASE_1_DECISIONS.canonicalHostedStorefrontParent}" or "${RELEASE_1_DECISIONS.stagingHostedStorefrontParent}" (got "${rawParent}")`,
      });
    }
  }

  // Check reserved subdomains env var if provided
  const envReserved = (env.HOSTED_STOREFRONT_RESERVED || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const missingMandatory = MANDATORY_RESERVED_SUBDOMAINS.slice(0, 8).filter(
    (name) => envReserved.length > 0 && !envReserved.includes(name)
  );
  if (missingMandatory.length > 0) {
    report.warnings.push({
      policy: 'Reserved Subdomains',
      field: 'HOSTED_STOREFRONT_RESERVED',
      message: `HOSTED_STOREFRONT_RESERVED should explicitly include mandatory system names: ${missingMandatory.join(', ')} (note: platform defaults enforce these automatically)`,
    });
  }
}

/**
 * Policy 4: Cookie Domain and Cookie Security Flags.
 */
function checkCookiePolicy(env, targetEnv, report) {
  const cookieDomain = (env.COOKIE_DOMAIN || '').trim().toLowerCase();
  const hostedParent = (env.HOSTED_STOREFRONT_DOMAIN || 'rentifystore.shop').trim().toLowerCase();

  if (cookieDomain) {
    // Prohibit cross-storefront session leakage
    if (
      cookieDomain === hostedParent ||
      cookieDomain === `.${hostedParent}` ||
      cookieDomain.endsWith(`.${hostedParent}`)
    ) {
      report.errors.push({
        policy: 'Cookie Domain Isolation',
        field: 'COOKIE_DOMAIN',
        message: `COOKIE_DOMAIN cannot be set to "${cookieDomain}" (broad hosted storefront parent creates cross-storefront session leakage)`,
      });
    }

    // Prohibit public suffix domains (e.g. .com, .shop)
    if (/^\.?(?:com|shop|net|org|digital|store)$/i.test(cookieDomain)) {
      report.errors.push({
        policy: 'Cookie Domain Isolation',
        field: 'COOKIE_DOMAIN',
        message: `COOKIE_DOMAIN cannot be a public suffix or single top-level label: "${cookieDomain}"`,
      });
    }
  }

  // Cookie flags
  if (targetEnv === 'production' || targetEnv === 'staging') {
    if (env.COOKIE_SECURE === 'false') {
      report.errors.push({
        policy: 'Cookie Security Flags',
        field: 'COOKIE_SECURE',
        message: `Cookie "secure" flag must be true in ${targetEnv}`,
      });
    }

    if (env.COOKIE_HTTP_ONLY === 'false') {
      report.errors.push({
        policy: 'Cookie Security Flags',
        field: 'COOKIE_HTTP_ONLY',
        message: `Cookie "httpOnly" flag must be true in ${targetEnv} for authentication cookies`,
      });
    }

    const sameSite = (env.COOKIE_SAMESITE || 'Lax').trim().toLowerCase();
    if (sameSite === 'none' && env.COOKIE_SECURE === 'false') {
      report.errors.push({
        policy: 'Cookie Security Flags',
        field: 'COOKIE_SAMESITE',
        message: 'Cookie SameSite=None requires Secure=true to be accepted by modern browsers',
      });
    }
  }
}

/**
 * Policy 5: Exact Credentialed CORS Allowlists and Wildcard Prohibition.
 */
function checkCorsAllowlists(env, targetEnv, report) {
  const rawOrigins = [
    env.CORS_ALLOWED_ORIGINS,
    env.CORS_ORIGINS,
  ].filter(Boolean).join(',');

  const origins = rawOrigins
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (origin === '*' || origin.toLowerCase() === 'null') {
      report.errors.push({
        policy: 'CORS Wildcard Prohibition',
        field: 'CORS_ALLOWED_ORIGINS',
        message: `Origin "${origin}" is strictly prohibited when credentials are enabled (credentials: true)`,
      });
      continue;
    }

    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      report.errors.push({
        policy: 'CORS Allowed Origins',
        field: 'CORS_ALLOWED_ORIGINS',
        message: `CORS origin "${origin}" is not a valid absolute origin URL`,
      });
      continue;
    }

    if (parsed.pathname !== '/' && parsed.pathname !== '') {
      report.warnings.push({
        policy: 'CORS Allowed Origins',
        field: 'CORS_ALLOWED_ORIGINS',
        message: `CORS origin "${origin}" contains a path component ("${parsed.pathname}"). CORS origins must be origin-only without path.`,
      });
    }

    if (targetEnv === 'production') {
      if (parsed.protocol !== 'https:') {
        report.errors.push({
          policy: 'CORS HTTPS Enforcement',
          field: 'CORS_ALLOWED_ORIGINS',
          message: `CORS origin "${origin}" must use HTTPS in production`,
        });
      }
      if (LOOPBACK_OR_LOCALHOST_REGEX.test(parsed.hostname)) {
        report.errors.push({
          policy: 'Localhost Prohibition in Production',
          field: 'CORS_ALLOWED_ORIGINS',
          message: `CORS origin "${origin}" cannot be localhost or loopback in production`,
        });
      }
    }
  }
}

/**
 * Policy 6: Auth Return URL Allowlist and Open Redirect Defense.
 */
function checkAuthReturnUrls(env, targetEnv, report) {
  const rawList = env.AUTH_RETURN_URL_ALLOWLIST || '';
  if (!rawList) return;

  const hostedParent = (env.HOSTED_STOREFRONT_DOMAIN || 'rentifystore.shop').trim().toLowerCase();
  const serviceKeys = [
    'MARKETPLACE_URL',
    'AUTH_URL',
    'RENTIFY_API_URL',
    'ECOMMERCE_API_URL',
    'ADMIN_DASHBOARD_URL',
    'MERCHANT_DASHBOARD_URL',
    'MARKETING_URL',
    'STOREFRONT_ORIGIN',
  ];
  const approvedHosts = new Set();
  for (const k of serviceKeys) {
    if (env[k]) {
      try {
        approvedHosts.add(new URL(env[k]).hostname.toLowerCase());
      } catch {}
    }
  }

  const entries = rawList.split(',').map((s) => s.trim()).filter(Boolean);
  for (const entry of entries) {
    if (entry.startsWith('//') || entry.startsWith('/')) {
      report.errors.push({
        policy: 'Auth Return URL Allowlist',
        field: 'AUTH_RETURN_URL_ALLOWLIST',
        message: `Return URL "${entry}" cannot be relative or protocol-relative (open redirect hazard)`,
      });
      continue;
    }

    let parsed;
    try {
      parsed = new URL(entry);
    } catch {
      report.errors.push({
        policy: 'Auth Return URL Allowlist',
        field: 'AUTH_RETURN_URL_ALLOWLIST',
        message: `Return URL "${entry}" is not a valid absolute URL`,
      });
      continue;
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      report.errors.push({
        policy: 'Auth Return URL Allowlist',
        field: 'AUTH_RETURN_URL_ALLOWLIST',
        message: `Return URL "${entry}" uses unsupported or unsafe protocol "${parsed.protocol}"`,
      });
      continue;
    }

    if (targetEnv === 'production') {
      if (parsed.protocol !== 'https:') {
        report.errors.push({
          policy: 'Auth Return URL HTTPS Enforcement',
          field: 'AUTH_RETURN_URL_ALLOWLIST',
          message: `Return URL "${entry}" must use HTTPS in production`,
        });
      }
      if (LOOPBACK_OR_LOCALHOST_REGEX.test(parsed.hostname)) {
        report.errors.push({
          policy: 'Localhost Prohibition in Production',
          field: 'AUTH_RETURN_URL_ALLOWLIST',
          message: `Return URL "${entry}" cannot be localhost or loopback in production`,
        });
      }
    }

    // Destination domain check for production / staging
    if (targetEnv === 'production' || targetEnv === 'staging') {
      const host = parsed.hostname.toLowerCase();
      const isApprovedHost = approvedHosts.has(host);
      const isMarketplaceSubdomain = host === 'rentifymarket.com' || host.endsWith('.rentifymarket.com');
      const isStorefrontSubdomain =
        host.endsWith(`.${hostedParent}`) &&
        isApprovedHostedSubdomain(host.slice(0, -(hostedParent.length + 1))).valid;

      if (!isApprovedHost && !isMarketplaceSubdomain && !isStorefrontSubdomain) {
        report.errors.push({
          policy: 'Auth Return URL Destination Safety',
          field: 'AUTH_RETURN_URL_ALLOWLIST',
          message: `Return URL "${entry}" references unapproved destination domain "${host}" (open redirect hazard)`,
        });
      }
    }
  }
}

/**
 * Policy 7: Feature Flags and Release 1 Policies.
 */
function checkFeatureFlags(env, targetEnv, report) {
  // CutLuy deferred to Phase 9 (DEC-027)
  const cutluyEnabled = String(env.CUTLUY_ENABLED || '').trim().toLowerCase() === 'true';
  if (cutluyEnabled && (targetEnv === 'production' || targetEnv === 'staging')) {
    report.errors.push({
      policy: 'CutLuy Release 1 Policy (DEC-027)',
      field: 'CUTLUY_ENABLED',
      message: 'CutLuy QR payments are strictly deferred to Phase 9 and must be disabled (CUTLUY_ENABLED=false) for Release 1',
    });
  }

  // Developer auto-approval forbidden in production (DEC-007)
  const devAutoApproval = String(env.DEV_MARKETPLACE_AUTO_APPROVAL || '').trim().toLowerCase() === 'true';
  if (devAutoApproval && targetEnv === 'production') {
    report.errors.push({
      policy: 'Seller Moderation Policy (DEC-007)',
      field: 'DEV_MARKETPLACE_AUTO_APPROVAL',
      message: 'DEV_MARKETPLACE_AUTO_APPROVAL cannot be enabled in production (manual seller verification required)',
    });
  }

  // Custom domains browse-only (DEC-003)
  const customDomainCheckout = String(env.CUSTOM_DOMAIN_CHECKOUT_ENABLED || '').trim().toLowerCase() === 'true';
  if (customDomainCheckout && targetEnv === 'production') {
    report.errors.push({
      policy: 'Custom Domain Scope (DEC-003)',
      field: 'CUSTOM_DOMAIN_CHECKOUT_ENABLED',
      message: 'Custom domains are browse-only in Release 1; direct checkout on custom domains is prohibited (CUSTOM_DOMAIN_CHECKOUT_ENABLED=false)',
    });
  }

  // Cash on Delivery accepted payment method (DEC-026)
  if (env.MARKETPLACE_COD_CHECKOUT_ENABLED === 'false' && targetEnv === 'production') {
    report.errors.push({
      policy: 'Release 1 Accepted Payment Method (DEC-026)',
      field: 'MARKETPLACE_COD_CHECKOUT_ENABLED',
      message: 'Cash on Delivery (COD) is the mandatory accepted payment method for Release 1 online checkout',
    });
  }
}

/**
 * Policy 8: Secret Presence and Zero-Leakage Diagnostic.
 */
function checkSecretPresence(env, targetEnv, report) {
  const requiredSecrets = [
    { key: 'JWT_SECRET', minLen: 32 },
    { key: 'JWT_REFRESH_SECRET', minLen: 32 },
    { key: 'SESSION_SECRET', minLen: 32 },
    { key: 'COOKIE_SECRET', minLen: 32 },
    { key: 'INTERNAL_SERVICE_SECRET', altKey: 'SERVICE_TO_SERVICE_TOKEN', minLen: 32 },
    { key: 'PAYMENT_CONFIG_ENCRYPTION_KEY', minLen: 32 },
  ];

  if (targetEnv === 'production' || targetEnv === 'staging') {
    requiredSecrets.push({ key: 'DB_PASSWORD', minLen: 16 });
  }

  const weakPlaceholders = new Set([
    'secret',
    'password',
    'changeme',
    'admin',
    '123456',
    'test',
    'default',
    'placeholder',
    'dummy',
  ]);

  for (const item of requiredSecrets) {
    let val = env[item.key];
    if (!val && item.altKey) {
      val = env[item.altKey];
    }

    if (!val || typeof val !== 'string' || !val.trim()) {
      if (targetEnv === 'production' || targetEnv === 'staging') {
        report.errors.push({
          policy: 'Secret Presence',
          field: item.key,
          message: `Mandatory security secret "${item.key}" is missing or empty`,
        });
      }
      continue;
    }

    const trimmed = val.trim();
    if (targetEnv === 'production') {
      if (trimmed.length < item.minLen) {
        report.errors.push({
          policy: 'Secret Strength',
          field: item.key,
          message: `Secret "${item.key}" does not satisfy minimum length requirement (expected >= ${item.minLen} chars, got ${trimmed.length} chars)`,
        });
      }

      if (weakPlaceholders.has(trimmed.toLowerCase())) {
        report.errors.push({
          policy: 'Secret Strength',
          field: item.key,
          message: `Secret "${item.key}" matches a known weak placeholder string`,
        });
      }
    }
  }
}

module.exports = {
  MANDATORY_RESERVED_SUBDOMAINS,
  RESERVED_SUBDOMAIN_SET,
  RELEASE_1_DECISIONS,
  isApprovedHostedSubdomain,
  isApprovedStorefrontOrigin,
  checkEnvironmentSeparation,
  checkPublicOrigins,
  checkHostedParent,
  checkCookiePolicy,
  checkCorsAllowlists,
  checkAuthReturnUrls,
  checkFeatureFlags,
  checkSecretPresence,
};
