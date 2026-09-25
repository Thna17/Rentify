#!/bin/sh
# Writes the Angular apps' runtime address files from the container environment.
set -e
cat > /srv/marketplace/marketplace-config.js <<JS
window.__RENTIFY_MARKETPLACE__ = {
  coreApiUrl: '${RENTIFY_API_URL}',
  commerceApiUrl: '${ECOMMERCE_API_URL}',
  authUrl: '${AUTH_URL}',
  merchantDashboardUrl: '${MERCHANT_DASHBOARD_URL}',
  adminDashboardUrl: '${ADMIN_DASHBOARD_URL}',
};
JS
cat > /srv/admin/admin-config.js <<JS
window.__RENTIFY_ADMIN__ = {
  coreApiUrl: '${RENTIFY_API_URL}',
  commerceApiUrl: '${ECOMMERCE_API_URL}',
  authUrl: '${AUTH_URL}',
  adminUrl: '${ADMIN_DASHBOARD_URL}',
  marketplaceUrl: '${MARKETPLACE_URL}',
  merchantDashboardUrl: '${MERCHANT_DASHBOARD_URL}',
};
JS
