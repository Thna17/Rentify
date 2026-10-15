const { UniqueConstraintError } = require('sequelize');
const { Website } = require('../../models');
const { reservedHostedSubdomains } = require('../../utils/hostedStorefrontOrigin');

const MIN_LENGTH = 3;
const MAX_BASE_LENGTH = 40;
const MAX_SUFFIX = 99;

// Names that would look like Rentify's own services or confuse shoppers.
const RESERVED = new Set([
  'www', 'api', 'app', 'apps', 'admin', 'auth', 'login', 'signin', 'signup', 'account', 'accounts',
  'merchant', 'merchants', 'seller', 'sellers', 'marketplace', 'market', 'dashboard', 'store', 'stores',
  'shop', 'storefront', 'checkout', 'cart', 'pay', 'payment', 'payments', 'billing', 'invoice',
  'mail', 'email', 'smtp', 'static', 'cdn', 'assets', 'media', 'images', 'help', 'support', 'status',
  'docs', 'blog', 'news', 'rentify', 'official', 'security', 'test', 'dev', 'staging', 'demo',
]);

/**
 * A subdomain candidate from a store name: ASCII letters and digits joined by
 * hyphens. Names without Latin characters (for example Khmer-only names) and
 * reserved words fall back to `store-<id prefix>`.
 */
const subdomainBase = (name, websiteId) => {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_BASE_LENGTH)
    .replace(/-+$/g, '');
  if (slug.length >= MIN_LENGTH && !RESERVED.has(slug) && !reservedHostedSubdomains().has(slug)) return slug;
  return `store-${String(websiteId || '').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'new'}`;
};

const candidates = (base) => {
  const reserved = reservedHostedSubdomains();
  return [base, ...Array.from({ length: MAX_SUFFIX - 1 }, (_, index) => `${base}-${index + 2}`)].filter(
    (candidate) => !reserved.has(candidate)
  );
};

/**
 * Gives the Website its permanent Rentify subdomain, reusing the one it
 * already has. The unique index on Websites.subdomain is the final arbiter
 * when two stores with the same name publish at once.
 */
const assignSubdomain = async (website, { transaction } = {}) => {
  if (website.subdomain) return website.subdomain;
  const base = subdomainBase(website.name, website.id);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const taken = new Set(
      (await Website.findAll({
        attributes: ['subdomain'],
        where: { subdomain: candidates(base) },
        transaction,
      })).map((row) => row.subdomain)
    );
    const free = candidates(base).find((candidate) => !taken.has(candidate));
    if (!free) throw new Error(`No free subdomain is left for "${base}"`);
    try {
      await website.update({ subdomain: free }, { transaction });
      return free;
    } catch (error) {
      // Someone else took it between the check and the update; drop the unsaved value and look again.
      website.set('subdomain', null);
      if (!(error instanceof UniqueConstraintError)) throw error;
    }
  }
  throw new Error('Could not reserve a subdomain; please try again');
};

module.exports = { assignSubdomain, subdomainBase, RESERVED };
