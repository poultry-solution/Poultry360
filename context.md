# Poultry360 — Project Context

## Project Overview

**Poultry360** is a three-tier management system for the poultry supply chain:

- **Company** — Top tier: manages products, dealers, accounts, and company-level operations
- **Dealer** — Middle tier: bridges company and farmers; handles sales, payments, and dealer-specific workflows
- **Farmer** — Bottom tier: end users who manage flocks, orders, and farm-level data

The system supports consignments, sales requests, payment requests, inventory, vaccinations, reminders, and real-time notifications across these tiers.

---

## Monorepo Structure

The project uses **pnpm workspaces** for a single-repo setup. Workspace configuration:

- **Config file:** `pnpm-workspace.yaml`
- **Workspace members:** `apps/*`, `packages/*`
- **Package manager:** pnpm (see root `package.json` for version)

---

## Directory Layout

```
/home/sidd/ideas/Poultry360/
├── apps/
│   ├── backend/          # Express API, Prisma, business logic
│   └── frontend/         # Next.js 15 App Router application
├── packages/
│   ├── shared-types/     # Shared TypeScript types and Zod schemas
│   ├── shared-auth/      # Shared authentication utilities and types
│   └── utils/            # Shared utilities (e.g. calendar, Nepali date)
├── pnpm-workspace.yaml
├── package.json
└── context.md
```

- **`/home/sidd/ideas/Poultry360/apps/backend`** — REST API, Prisma schema/migrations, controllers, services, Socket.IO server
- **`/home/sidd/ideas/Poultry360/apps/frontend`** — Next.js app (App Router), UI, company/dealer/farmer dashboards
- **`/home/sidd/ideas/Poultry360/packages/`** — Shared code consumed by both apps: `@myapp/shared-types`, `@myapp/shared-auth`, `@myapp/utils`

---

## Technology Stack

| Layer        | Technology |
|-------------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, TanStack Query, Zustand, Socket.IO Client, Tailwind CSS, Radix UI, Recharts |
| **Backend**  | Express 5, Prisma, PostgreSQL |
| **Real-time**| Socket.IO (server in backend, client in frontend) |
| **Validation** | Zod (backend + shared-types) |
| **Shared**   | TypeScript, `@myapp/shared-types`, `@myapp/shared-auth`, `@myapp/utils` |

---

## Development Setup & Scripts

From the **root** `/home/sidd/ideas/Poultry360/package.json`:

| Script           | Command | Description |
|------------------|--------|-------------|
| `pnpm dev`       | `pnpm -r --parallel --filter=frontend --filter=backend run dev` | Run frontend and backend in parallel |
| `pnpm build`     | `pnpm -r run build` | Build all workspace packages |
| `pnpm lint`      | `pnpm -r run lint` | Lint all workspace packages |
| `pnpm build:types` | `rm -rf packages/shared-types/dist && pnpm --filter @myapp/shared-types build` | Build shared-types only |
| `pnpm build:auth` | `rm -rf packages/shared-auth/dist && pnpm --filter @myapp/shared-auth build` | Build shared-auth only |
| `pnpm build:utils` | `rm -rf packages/utils/dist && pnpm --filter @myapp/utils build` | Build utils only |
| `pnpm watch:types` | `pnpm --filter @myapp/shared-types exec tsc -w` | Watch and rebuild shared-types |
| `pnpm watch:auth` | `pnpm --filter @myapp/shared-auth exec tsc -w` | Watch and rebuild shared-auth |

**Typical workflow:**

1. From repo root: `pnpm install`
2. Build shared packages when needed: `pnpm build:types` (and optionally `build:auth`, `build:utils`), or run `watch:types` / `watch:auth` in separate terminals
3. Start dev: `pnpm dev` (runs both frontend and backend)

**App-level scripts (run from root with filter or from app directory):**

- **Frontend:** `dev`, `build`, `start`, `lint` (Next.js 15)
- **Backend:** `dev` (nodemon), `test`, `test:watch`, `test:coverage`, `seed`

---

## Quick Reference

- **Monorepo:** pnpm workspaces (`pnpm-workspace.yaml`)
- **Layout:** `apps/backend`, `apps/frontend`, `packages/{shared-types, shared-auth, utils}`
- **Stack:** Next.js 15 App Router, Express, Prisma, PostgreSQL, TanStack Query, Zustand, Socket.IO
- **Run everything:** `pnpm dev` from repo root
