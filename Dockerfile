# ---------------------------------------------------------
# AutoLog KE Backend - Multi-Stage Production Dockerfile
# Optimized for minimal image size, speed, and non-root security
# ---------------------------------------------------------

# =========================================================
# Stage 1: Build stage (compile TypeScript to JavaScript)
# =========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications first to leverage Docker layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies required for tsc compilation)
RUN npm ci

# Copy full application source code
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# =========================================================
# Stage 2: Production runtime stage
# =========================================================
FROM node:22-alpine AS runner

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=5001

WORKDIR /app

# Create a dedicated non-root system group and user for security hardening
RUN addgroup -g 1001 -S nodejs && \
    adduser -S autolog -u 1001 -G nodejs

# Copy package manifests and install only production runtime dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy compiled JavaScript output from the builder stage with non-root ownership
COPY --from=builder --chown=autolog:nodejs /app/dist ./dist

# Switch to non-root user
USER autolog

# Expose backend API port
EXPOSE 5001

# Start production server
CMD ["node", "dist/server.js"]
