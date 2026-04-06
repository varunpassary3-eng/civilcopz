# --- Stage 1: Build & Prepare ---
FROM node:20-slim AS builder

WORKDIR /app

# Install system dependencies for Prisma/Node
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates curl python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Monorepo Workspace Metadata: Required for npm dependency resolution
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY backend/prisma ./backend/prisma/

# Substrate Diagnostics: Ensure Prisma engine compatibility
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"

# Install dependencies
RUN npm install --workspace backend --verbose

# Authoritative Source Copy (v10 HARDENING)
COPY backend ./backend/

# Generate Prisma client with full schema context
RUN npx prisma generate --schema=./backend/prisma/schema.prisma

# --- Stage 2: Production Runtime ---
FROM node:20-slim AS runner

WORKDIR /app

# Infrastructure Defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV PRISMA_CLIENT_ENGINE_TYPE="binary"
LABEL version="v4.2-hardened"

# Install runtime substrate (OpenSSL for Prisma + CA certs for GCP/Vault/AWS)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create authoritative non-root user
RUN groupadd -r civilcopz && useradd -r -g civilcopz civilcopz

# Copy only built application and production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend/

# Permissions hardening
RUN chown -R civilcopz:civilcopz /app

USER civilcopz

EXPOSE 4000

# Sovereign Boot: Config is loaded from AWS Secrets Manager at startup
CMD ["node", "backend/server.js"]
