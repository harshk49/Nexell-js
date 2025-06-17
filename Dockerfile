# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files first for better cache utilization
COPY package*.json ./

# Install dependencies with proper cache mounting
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source code
COPY . .

# Production stage
FROM node:20-alpine AS production

# Set NODE_ENV
ENV NODE_ENV=production \
    PORT=5000

# Install runtime dependencies and security updates
RUN apk update && \
    apk add --no-cache tini curl wget dumb-init && \
    apk upgrade --no-cache

# Create a non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodeuser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder --chown=nodeuser:nodejs /app/server.js .
COPY --from=builder --chown=nodeuser:nodejs /app/routes ./routes
COPY --from=builder --chown=nodeuser:nodejs /app/models ./models
COPY --from=builder --chown=nodeuser:nodejs /app/controllers ./controllers
COPY --from=builder --chown=nodeuser:nodejs /app/services ./services
COPY --from=builder --chown=nodeuser:nodejs /app/middleware ./middleware
COPY --from=builder --chown=nodeuser:nodejs /app/utils ./utils
COPY --from=builder --chown=nodeuser:nodejs /app/config ./config

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nodeuser:nodejs /app && \
    chmod -R 755 /app

# Set path for node modules
ENV PATH=/app/node_modules/.bin:$PATH

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Use dumb-init as entrypoint to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]