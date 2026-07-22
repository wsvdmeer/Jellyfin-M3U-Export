# Use distroless for maximum security (no shell, minimal packages)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript, then strip dev dependencies so only production
# packages are copied into the final image
RUN npm run build && \
    npm prune --omit=dev

# Production stage - use Google's distroless image (minimal vulnerabilities)
FROM gcr.io/distroless/nodejs20-debian12:nonroot

WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# distroless runs as non-root by default (user 65532)
# No shell, no package manager = minimal attack surface

# Expose port
EXPOSE 3000

# Start the application
CMD ["dist/index.js"]
