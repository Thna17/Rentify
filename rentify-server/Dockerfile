FROM node:22-bookworm-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]

# Production: runtime dependencies only, no file watching. Used by deploy/vps.
FROM node:22-bookworm-slim AS production

WORKDIR /app
ENV NODE_ENV=production
# The app writes logs (and Commerce uploads) under /app.
RUN chown node:node /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

EXPOSE 3001
USER node

CMD ["node", "src/server.js"]
