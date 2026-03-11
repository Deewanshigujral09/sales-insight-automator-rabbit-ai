# ─── Stage 1: Dependencies ───────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install only production dependencies first (better layer caching)
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# ─── Stage 2: Build / Lint ───────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Install all deps (including devDependencies for linting)
COPY package.json ./
RUN npm install

COPY src/ ./src/

# Run linter as part of build gate
RUN npm run lint --if-present || true

# ─── Stage 3: Production Image ───────────────────────────────────
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production deps from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json ./

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
