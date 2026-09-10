# syntax=docker/dockerfile:1
# Multi-stage production build for TruckTracker

# ==========================================
# Stage 1: Build the Web Frontend
# ==========================================
FROM node:22-alpine AS web-builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY web/package.json ./web/
COPY server/package.json ./server/

# Install dependencies for web workspace
RUN npm ci --workspace=web

# Copy web source and build
COPY web/ ./web/
RUN npm run build --workspace=web

# ==========================================
# Stage 2: Production Server Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install build dependencies for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY server/package.json ./server/

# Install production dependencies
RUN npm ci --workspace=server --omit=dev

# Copy server application
COPY server/ ./server/

# Copy built frontend assets to web/dist (served directly by Express in production)
COPY --from=web-builder /app/web/dist ./web/dist

# Ensure persistent storage directories exist
RUN mkdir -p /app/server/data /app/server/uploads/photos

EXPOSE 5000

# Volume mount points for SQLite database and uploaded photos
VOLUME ["/app/server/data", "/app/server/uploads/photos"]

WORKDIR /app/server
CMD ["npm", "run", "dev"]
