FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV AUTH_DIR=/data/auth
EXPOSE 3020

CMD ["node", "src/server.mjs"]
