FROM node:22-bookworm-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

EXPOSE 4800

CMD ["npm", "start", "--", "--host", "0.0.0.0"]
