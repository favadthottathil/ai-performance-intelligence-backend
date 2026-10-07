FROM node:24.21.0-alpine3.24 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:24.21.0-alpine3.24
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json server.js run_migration.js ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["node", "server.js"]
