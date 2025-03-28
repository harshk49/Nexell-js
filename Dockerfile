# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with error handling
RUN npm ci || (echo "npm ci failed" && exit 1)

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache wget curl tini

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with error handling
RUN npm ci --only=production || (echo "npm ci failed" && exit 1)

# Copy built files from builder stage
COPY --from=builder /app/server.js .
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/models ./models
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/services ./services
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/config ./config

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    PATH=/app/node_modules/.bin:$PATH

# Switch to non-root user
USER node

# Expose port
EXPOSE 5000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Use tini as entrypoint
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"] 