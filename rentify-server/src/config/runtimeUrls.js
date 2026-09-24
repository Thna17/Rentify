const normalizeUrl = (value) => value && value.replace(/\/+$/, "");

const local = {
  rentifyApiUrl: "http://localhost:3001",
  ecommerceApiUrl: "http://localhost:4001",
  authUrl: "http://localhost:4300",
  merchantDashboardUrl: "http://localhost:4400",
  marketingUrl: "http://localhost:4200",
  marketplaceUrl: "http://localhost:4201",
  storefrontOrigin: "http://localhost:4700",
};

const pick = (name, fallback) => normalizeUrl(process.env[name] || fallback);
const runtimeUrls = {
  rentifyApiUrl: pick("RENTIFY_API_URL", local.rentifyApiUrl),
  ecommerceApiUrl: pick("ECOMMERCE_API_URL", process.env.ECOMMERCE_API || local.ecommerceApiUrl),
  authUrl: pick("AUTH_URL", local.authUrl),
  merchantDashboardUrl: pick("MERCHANT_DASHBOARD_URL", local.merchantDashboardUrl),
  marketingUrl: pick("MARKETING_URL", local.marketingUrl),
  marketplaceUrl: pick("MARKETPLACE_URL", local.marketplaceUrl),
  storefrontOrigin: pick("STOREFRONT_ORIGIN", local.storefrontOrigin),
};

if (process.env.NODE_ENV === "production") {
  for (const [name, value] of Object.entries(runtimeUrls)) {
    if (/localhost|127\.0\.0\.1/.test(value)) throw new Error(`${name} cannot be localhost in production`);
  }
}

module.exports = runtimeUrls;
