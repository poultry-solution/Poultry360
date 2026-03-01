# ============================================================
# Stage 1: Base — node + pnpm + build tools
# ============================================================
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# ============================================================
# Stage 2: Build — install all deps, compile TypeScript, generate Prisma
# ============================================================
FROM base AS build

# Copy workspace root config
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all workspace package.json files (must match lockfile)
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-auth/package.json packages/shared-auth/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN pnpm install --frozen-lockfile

# Build shared-types first (backend depends on it)
COPY packages/shared-types/ packages/shared-types/
RUN pnpm --filter @myapp/shared-types run build

# Copy backend source
COPY apps/backend/ apps/backend/

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build backend TypeScript
RUN pnpm --filter backend run build

# Compile seed.ts separately for production use
RUN cd apps/backend && npx tsc prisma/seed.ts --outDir prisma/dist --esModuleInterop --skipLibCheck --module commonjs --target es2016

# ============================================================
# Stage 3: Deploy — isolated prod-only node_modules via pnpm deploy
# ============================================================
FROM build AS deploy

RUN pnpm --filter backend deploy --legacy --prod /app/deployed

# ============================================================
# Stage 4: Runner — minimal production image
# ============================================================
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the isolated deployment (node_modules + package.json)
COPY --from=deploy /app/deployed/node_modules ./node_modules

# Copy compiled backend
COPY --from=build /app/apps/backend/dist ./dist

# Copy Prisma schema, migrations, and compiled seed
COPY --from=build /app/apps/backend/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=build /app/apps/backend/prisma/migrations ./prisma/migrations
COPY --from=build /app/apps/backend/prisma/dist ./prisma/dist

# Copy shared-types dist into node_modules (needed at runtime via workspace: link)
COPY --from=build /app/packages/shared-types/dist ./node_modules/@myapp/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./node_modules/@myapp/shared-types/package.json

# Regenerate Prisma client in prod node_modules
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create non-root user
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

ENV NODE_ENV=production
ENV PORT=8081

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
