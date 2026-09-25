#!/usr/bin/env sh
# Production build of the storefront app for stores on *.mekhla.digital.
# Addresses match deploy/vps/compose.yaml (Rentify on the VPS).
set -e
cd "$(dirname "$0")/../../.."

export VITE_RENTIFY_API_URL=https://rentify-api.mekhla.digital
export VITE_ECOMMERCE_API_URL=https://rentify-commerce.mekhla.digital
export VITE_HOSTED_STOREFRONT_DOMAIN=mekhla.digital
export VITE_HOSTED_STOREFRONT_BUYER_ENABLED=true
export VITE_AUTH_URL=https://rentify-auth.mekhla.digital
export VITE_MERCHANT_DASHBOARD_URL=https://rentify-seller.mekhla.digital
export VITE_MARKETING_URL=https://rentify.mekhla.digital
export VITE_MARKETPLACE_URL=https://rentify-market.mekhla.digital
export VITE_ADMIN_DASHBOARD_URL=https://rentify-admin.mekhla.digital
export VITE_STOREFRONT_ORIGIN=https://rentify.mekhla.digital

npx vite build --config apps/storefront/vite.config.ts
