# All Rentify browser apps as static files behind one nginx, chosen by hostname.
# Build context: the repository root (see deploy/vps/compose.yaml).

FROM node:22-bookworm-slim AS rentify-frontend
WORKDIR /src
COPY rentify-frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY rentify-frontend/ ./
ARG VITE_RENTIFY_API_URL
ARG VITE_ECOMMERCE_API_URL
ARG VITE_AUTH_URL
ARG VITE_MERCHANT_DASHBOARD_URL
ARG VITE_MARKETING_URL
ARG VITE_MARKETPLACE_URL
ARG VITE_ADMIN_DASHBOARD_URL
ARG VITE_STOREFRONT_ORIGIN
ARG VITE_HOSTED_STOREFRONT_DOMAIN
ARG VITE_HOSTED_STOREFRONT_BUYER_ENABLED
RUN npx vite build --config apps/core/marketing/vite.config.ts \
 && npx vite build --config apps/core/auth/vite.config.ts \
 && npx vite build --config apps/core/merchant/vite.config.ts

FROM node:22-bookworm-slim AS marketplace
WORKDIR /src
COPY marketplace-frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY marketplace-frontend/ ./
RUN npx ng build --configuration production

FROM node:22-bookworm-slim AS admin
WORKDIR /src
COPY admin-frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY admin-frontend/ ./
RUN npx ng build --configuration production

FROM nginx:1.27-alpine
COPY --from=rentify-frontend /src/dist/apps/core/marketing /srv/marketing
COPY --from=rentify-frontend /src/dist/apps/core/auth /srv/auth
COPY --from=rentify-frontend /src/dist/apps/core/merchant /srv/merchant
COPY --from=marketplace /src/dist/marketplace-frontend/browser /srv/marketplace
COPY --from=admin /src/dist/admin-frontend/browser /srv/admin
COPY deploy/vps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/vps/web/40-rentify-runtime-config.sh /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/40-rentify-runtime-config.sh
