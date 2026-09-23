FROM node:22-bookworm-slim AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4001

CMD ["npm", "run", "dev"]
