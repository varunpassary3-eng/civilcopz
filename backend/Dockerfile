# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies - Use 'npm install' to generate/handle missing lockfiles during stabilization
RUN npm install --only=production

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Default command - can be overridden
CMD ["node", "server.js"]
