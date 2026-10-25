// ecommerce-server/middlewares/customDomainBoundary.js
// P2-HOST-003: Custom-domain browse-only enforcement for Commerce API.
// Release 1 DEC-003: Custom domains may perform approved public catalog browsing only.
// Direct customer authentication, cart mutations, checkout, and order history fail closed.

const { extractHostFromRequest, classifyCommerceHost, buildSafeHostedRedirectUrl } = require('../utils/hostBoundary');
const { WebsiteData } = require('../models');

/**
 * Middleware that rejects authentication, cart mutations, checkout, and privileged
 * customer access when requests originate from a custom merchant domain.
 *
 * @param {'auth' | 'checkout' | 'cart' | 'customer'} actionType
 */
function enforceCustomDomainBoundary(actionType = 'checkout') {
  return async (req, res, next) => {
    try {
      const host = extractHostFromRequest(req);
      if (!host) return next();

      // Quick check: if it's an approved hosted storefront or central platform host, pass through
      const initial = classifyCommerceHost(host);
      if (initial.type === 'HOSTED_STOREFRONT' || initial.type === 'CENTRAL_PLATFORM') {
        return next();
      }

      // Check if host matches a registered active custom domain
      let website = null;
      try {
        website = await WebsiteData.findOne({
          where: { domain: host, status: 'active' },
          attributes: ['id', 'domain', 'websiteId', 'storeId', 'subdomain'],
        });
      } catch (err) {
        // If DB lookup fails, continue or fail safe
      }

      const classification = classifyCommerceHost(host, { website });
      if (classification.type === 'CUSTOM_DOMAIN') {
        // Custom domain detected: direct operations must fail closed (browse-only in Release 1)
        const canonicalSub = classification.subdomain || null;
        let hostedUrl = classification.hostedStorefrontUrl || null;
        let hostedCheckoutUrl = null;

        if (canonicalSub) {
          try {
            hostedCheckoutUrl = buildSafeHostedRedirectUrl(canonicalSub, '/checkout');
          } catch {}
        }

        switch (actionType) {
          case 'auth':
            return res.status(403).json({
              statusCode: 403,
              error: 'Direct authentication is disabled on custom domains in Release 1. Customer sign-in is hosted exclusively on the verified storefront domain.',
              code: 'CUSTOM_DOMAIN_AUTH_DISABLED',
              hostedStorefrontUrl: hostedUrl,
            });

          case 'cart':
            return res.status(403).json({
              statusCode: 403,
              error: 'Cart mutations are disabled on custom domains in Release 1. Custom domains are browse-only.',
              code: 'CUSTOM_DOMAIN_CART_DISABLED',
              hostedStorefrontUrl: hostedUrl,
              hostedCheckoutUrl: hostedCheckoutUrl,
            });

          case 'customer':
            return res.status(403).json({
              statusCode: 403,
              error: 'Privileged buyer profile and order history cannot be accessed on custom domains in Release 1.',
              code: 'CUSTOM_DOMAIN_BROWSE_ONLY',
              hostedStorefrontUrl: hostedUrl,
            });

          case 'checkout':
          default:
            return res.status(403).json({
              statusCode: 403,
              error: 'Direct checkout is disabled on custom domains in Release 1. Checkout occurs only on the verified hosted storefront domain under rentifystore.shop.',
              code: 'CUSTOM_DOMAIN_CHECKOUT_DISABLED',
              hostedStorefrontUrl: hostedUrl,
              hostedCheckoutUrl: hostedCheckoutUrl,
            });
        }
      }

      // If unregistered host attempts checkout or auth, let standard auth or CORS handle or block
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  enforceCustomDomainBoundary,
};
