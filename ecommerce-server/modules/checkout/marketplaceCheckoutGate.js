const requireMarketplaceCheckoutEnabled = (_req, res, next) => {
  if (process.env.MARKETPLACE_COD_CHECKOUT_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Marketplace COD checkout is not enabled in this environment' });
  }
  return next();
};

const requireStorefrontCheckoutEnabled = (_req, res, next) => {
  if (process.env.STOREFRONT_COD_CHECKOUT_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Storefront COD checkout is not enabled in this environment' });
  }
  return next();
};

module.exports = { requireMarketplaceCheckoutEnabled, requireStorefrontCheckoutEnabled };
