# Multi-stage Dockerfile for Block Party (Shared, Server, Client)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install all dependencies including devDependencies for compilation
RUN npm install

# Copy source trees
COPY shared ./shared
COPY server ./server
COPY client ./client

# Compile all workspaces (shared, server, and client)
RUN npm run build

# Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Copy root and workspace manifests
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled artifacts from builder stage
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY server/src/db/schema.sql ./server/dist/db/schema.sql

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
