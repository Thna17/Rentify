FROM node:22-bookworm-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

EXPOSE 4500

CMD ["npm", "run", "start", "--", "--host", "0.0.0.0"]
