const requireMarketplaceCheckoutEnabled = (_req, res, next) => {
  if (process.env.MARKETPLACE_COD_CHECKOUT_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Marketplace COD checkout is not enabled in this environment' });
  }
  return next();
};

module.exports = { requireMarketplaceCheckoutEnabled };
