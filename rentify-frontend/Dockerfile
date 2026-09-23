FROM node:22-bookworm-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

EXPOSE 4200 4300 4400 4600 4700

CMD ["npm", "run", "dev:marketing", "--", "--host", "0.0.0.0"]
