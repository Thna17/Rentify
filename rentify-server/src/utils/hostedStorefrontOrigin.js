const isHostedStorefrontOrigin = (value) => {
  const domain = (process.env.HOSTED_STOREFRONT_DOMAIN || '').toLowerCase().trim();
  if (!domain) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.port || parsed.username || parsed.password) return false;
    if (!parsed.hostname.endsWith(`.${domain}`)) return false;
    return /^[a-z0-9-]+$/.test(parsed.hostname.slice(0, -(domain.length + 1)));
  } catch { return false; }
};

module.exports = { isHostedStorefrontOrigin };
