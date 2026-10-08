FROM node:24.21.0-alpine3.24 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Development target: full dependencies plus nodemon. Selected only by
# compose.override.yaml (`build.target: dev`); the plain `docker build`, and CI,
# build the last stage below, so this one never ships.
FROM node:24.21.0-alpine3.24 AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY package*.json ./
RUN npm ci
USER node
EXPOSE 3000
CMD ["node_modules/.bin/nodemon", "--legacy-watch", "server.js"]

FROM node:24.21.0-alpine3.24
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json server.js run_migration.js ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
CMD ["node", "server.js"]
