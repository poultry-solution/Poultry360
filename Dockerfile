# ============================================================
# Stage 1: Base — node + pnpm + openssl
# ============================================================
FROM node:22-slim AS base

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# ============================================================
# Stage 2: Dependencies — install ALL deps (incl. devDependencies)
# ============================================================
FROM base AS deps

# python3 + make + g++ needed for bcrypt native compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy workspace root config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace package.json files (must match lockfile specifiers exactly)
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-auth/package.json packages/shared-auth/package.json
COPY packages/utils/package.json packages/utils/package.json

RUN pnpm install --frozen-lockfile

# ============================================================
# Stage 3: Build — compile TypeScript & generate Prisma client
# ============================================================
FROM deps AS build

# Copy shared-types source and build it
COPY packages/shared-types/ packages/shared-types/
RUN pnpm --filter @myapp/shared-types run build

# Copy backend source
COPY apps/backend/ apps/backend/

# Generate Prisma client
RUN cd apps/backend && npx prisma generate

# Build backend TypeScript
RUN pnpm --filter backend run build

# Compile seed.ts separately for use in production
RUN cd apps/backend && npx tsc prisma/seed.ts --outDir prisma/dist --esModuleInterop --skipLibCheck --module commonjs --target es2016

# ============================================================
# Stage 4: Production dependencies only
# ============================================================
FROM deps AS prod-deps

# Prune devDependencies from the already-installed deps
RUN pnpm prune --prod

# ============================================================
# Stage 5: Runner — minimal production image
# ============================================================
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

WORKDIR /app

# Copy production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=prod-deps /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Copy workspace root config (needed for pnpm/prisma)
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-auth/package.json packages/shared-auth/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY apps/frontend/package.json apps/frontend/package.json

# Copy compiled shared-types
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist

# Copy compiled backend
COPY --from=build /app/apps/backend/dist ./apps/backend/dist

# Copy Prisma schema, migrations, and compiled seed
COPY --from=build /app/apps/backend/prisma/schema.prisma ./apps/backend/prisma/schema.prisma
COPY --from=build /app/apps/backend/prisma/migrations ./apps/backend/prisma/migrations
COPY --from=build /app/apps/backend/prisma/dist ./apps/backend/prisma/dist

# Generate Prisma client into prod node_modules (pnpm stores it deep in .pnpm store)
RUN cd apps/backend && npx prisma generate

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
CMD ["node", "apps/backend/dist/index.js"]
