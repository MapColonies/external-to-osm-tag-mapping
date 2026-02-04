# Build stage
FROM node:24-alpine AS build

WORKDIR /tmp/buildApp

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:24-alpine AS production

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV SERVER_PORT=8080

WORKDIR /usr/src/app

# Copy only package files for production deps
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy built app
COPY --from=build /tmp/buildApp/dist ./dist
COPY ./config ./config

USER node
EXPOSE 8080

CMD ["dumb-init", "node", "--import", "./dist/instrumentation.mjs", "./dist/index.js"]