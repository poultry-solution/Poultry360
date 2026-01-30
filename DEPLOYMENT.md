# Poultry360 — Deployment & Future Plans

This document describes the current deployment architecture, subdomain-based routing, build and configuration, migration strategy toward a unified app, shared package approach, and future enhancements. For the target unified architecture and modular refactor plan, see **[UNIFIED_APP_REFACTOR_PLAN.md](./UNIFIED_APP_REFACTOR_PLAN.md)**.

---

## 1. Current vs Unified Deployment Architecture

### 1.1 Current State: Single Frontend, Single Backend

Today Poultry360 runs as:

- **One Next.js app** (`apps/frontend`) — serves all roles (farmer, dealer, company, doctor, admin) via path-based and subdomain-based routing.
- **One Express backend** (`apps/backend`) — single API at `/api/v1`, used by the frontend from all subdomains.

So there is **one deployment** for the frontend and one for the backend. The “unified app” in terms of deployment is already in place: a single Next.js build is deployed and subdomains determine which role UI is shown.

### 1.2 Unified App Vision (Future)

The vision in [UNIFIED_APP_REFACTOR_PLAN.md](./UNIFIED_APP_REFACTOR_PLAN.md) is to:

- Consolidate into a **single Next.js app** under something like `apps/web/` with **modular route groups** by role: `(farmer)/`, `(dealer)/`, `(company)/`, `(doctor)/`, `(admin)/`, plus shared `(auth)/`, `(shared)/`, etc.
- Use **subdomain-based routing** so each role is accessed via its own subdomain (e.g. `dealer.p360.com`).
- Reduce **shared package pain** by moving auth and most shared code into the app and keeping only minimal shared packages (`shared-types`, `utils`).
- Improve **developer experience** (single install, single dev server, no cross-port auth) and **performance** (role-based code splitting, single deployment).

Current `apps/frontend` already follows this idea (one app, role routes, subdomains); the refactor plan is about restructuring that app and trimming shared packages rather than “multiple apps → one app.”

---

## 2. Subdomain Configuration

Deployment uses **one frontend deployment** with **subdomain-based routing**. The Next.js middleware (`apps/frontend/middleware.ts`) rewrites requests so that each subdomain maps to the correct role prefix.

### 2.1 Production Subdomain Map

| Subdomain            | Role(s)       | Route prefix   | Example URL                    |
|----------------------|---------------|----------------|--------------------------------|
| `farmer.p360.com`    | Farmer/Owner/Manager | `/farmer/*`  | `farmer.p360.com/dashboard/home` → `/farmer/dashboard/home` |
| `dealer.p360.com`    | Dealer        | `/dealer/*`    | `dealer.p360.com/dashboard/home` → `/dealer/dashboard/home` |
| `company.p360.com`   | Company       | `/company/*`   | `company.p360.com/dashboard/home` → `/company/dashboard/home` |
| `doctor.p360.com`    | Doctor        | `/doctor/*`    | `doctor.p360.com/dashboard` → `/doctor/dashboard`            |
| `admin.p360.com`     | Super Admin   | `/admin/*`     | `admin.p360.com/dashboard` → `/admin/dashboard`              |
| `p360.com` / `www.p360.com` | —        | (no prefix)    | Landing and auth; no rewrite                                  |

### 2.2 Middleware Behavior

- **Hostname** is read from the request; the first label is treated as the subdomain (e.g. `dealer` from `dealer.p360.com`).
- **Rewrite**: If the path does not already start with the role prefix, the middleware rewrites the URL to add it (e.g. `/dashboard/home` → `/dealer/dashboard/home` on `dealer.p360.com`).
- **Skipped** for:
  - `localhost` without a subdomain (e.g. `localhost:3000`) — use path-based routing only.
  - Main domain: `p360.com`, `www.p360.com`.
  - Paths: `/auth/*`, `/share/*`, `/_next/*`, `/api/*`.

So in production, DNS must point `*.p360.com` (or each subdomain) to the same Next.js deployment; the server does not need separate apps per subdomain.

### 2.3 Cookie Domain (Production)

For auth to work across subdomains, the refresh-token cookie must be set with a domain that includes all subdomains (e.g. `.p360.com`). Backend auth currently uses a configurable domain; for production it should be set to `.p360.com` via environment (see Environment variables below).

---

## 3. Environment Variables and Configuration

### 3.1 Backend (`apps/backend`)

| Variable             | Purpose                          | Example / notes                                      |
|----------------------|----------------------------------|------------------------------------------------------|
| `PORT`               | HTTP server port                 | Default `8081`                                       |
| `NODE_ENV`           | Environment                      | `development`, `production`, `test`                  |
| `DATABASE_URL`       | PostgreSQL connection string     | Prisma requirement                                   |
| `JWT_SECRET`         | Access token signing             | Required in production                               |
| `JWT_REFRESH_SECRET` | Refresh token signing            | Required in production                               |
| `FRONTEND_URLS`      | CORS and Socket.IO allowed origins | Comma-separated, e.g. `https://farmer.p360.com,https://dealer.p360.com,...` |
| `FRONTEND_URL`       | Fallback if `FRONTEND_URLS` unset| Single origin                                        |
| `VAPID_PUBLIC_KEY`   | Web Push (notifications)         | Optional; required for push                          |
| `VAPID_PRIVATE_KEY`  | Web Push (notifications)         | Optional; required for push                          |
| `R2_BUCKET`          | R2 bucket name (e.g. uploads)    | Optional                                             |
| `R2_ENDPOINT`        | R2 endpoint URL                  | Optional                                             |
| `R2_ACCESS_KEY_ID`   | R2 access key                    | Optional                                             |
| `R2_ACCESS_KEY_SECRET` | R2 secret key                  | Optional                                             |

Production cookie domain for refresh tokens should be set in auth code (e.g. `.p360.com`) when `NODE_ENV === 'production'` (or via a dedicated env var like `COOKIE_DOMAIN`).

### 3.2 Frontend (`apps/frontend`)

| Variable                    | Purpose                    | Example / notes                    |
|-----------------------------|----------------------------|------------------------------------|
| `NEXT_PUBLIC_API_URL`       | Backend API base URL       | `https://api.p360.com/api/v1` (prod) or `http://localhost:8081/api/v1` (dev) |
| `NEXT_PUBLIC_SOCKET_URL`    | Socket.IO server URL       | Same host as API in prod, e.g. `https://api.p360.com` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push public key     | Must match backend VAPID key      |

Build-time: ensure all subdomains and the main domain are included in `FRONTEND_URLS` (backend) so CORS and Socket.IO work for every role.

### 3.3 Root / Workspace

No app-specific env vars at repo root. Each app may use its own `.env` or `.env.local`; production typically uses platform env (e.g. Vercel, Railway) or a secrets manager.

---

## 4. Build Process

### 4.1 Tooling

- **Package manager**: pnpm (workspaces)
- **Workspaces**: `apps/*`, `packages/*` (see `pnpm-workspace.yaml`)
- **TypeScript**: Used in backend, frontend, and shared packages; each package has its own `tsconfig.json`

### 4.2 Root Scripts (`package.json`)

| Script         | Command                                                                 | Description |
|----------------|-------------------------------------------------------------------------|-------------|
| `pnpm dev`     | `pnpm -r --parallel --filter=frontend --filter=backend run dev`         | Run frontend and backend in parallel |
| `pnpm build`   | `pnpm -r run build`                                                     | Build all workspace packages (order implied by dependencies) |
| `pnpm lint`    | `pnpm -r run lint`                                                      | Lint all packages |
| `pnpm build:types`  | `rm -rf packages/shared-types/dist && pnpm --filter @myapp/shared-types build`  | Build shared-types only |
| `pnpm build:auth`   | `rm -rf packages/shared-auth/dist && pnpm --filter @myapp/shared-auth build`   | Build shared-auth only |
| `pnpm build:utils`  | `rm -rf packages/utils/dist && pnpm --filter @myapp/utils build`              | Build utils only |
| `pnpm watch:types`  | `pnpm --filter @myapp/shared-types exec tsc -w`                        | Watch and rebuild shared-types |
| `pnpm watch:auth`   | `pnpm --filter @myapp/shared-auth exec tsc -w`                         | Watch and rebuild shared-auth |

### 4.3 Build Order and TypeScript

- **Shared packages** (`@myapp/shared-types`, `@myapp/shared-auth`, `@myapp/utils`) are built first (frontend and backend depend on them). Root `pnpm build` runs `pnpm -r run build`, which respects workspace dependency order.
- **TypeScript**: Each package compiles with `tsc` (or Next.js for the frontend). Frontend uses Next.js build (`next build`); backend and shared packages use `tsc` emitting to `dist/`.
- **Deployment**: Build the frontend with `pnpm --filter frontend build` (or from `apps/frontend`: `pnpm build`). Backend: `pnpm --filter backend build` if a build step is defined, then run Node against compiled output or use `ts-node`/nodemon in development.

### 4.4 Production Build (Single Frontend)

```bash
# From repo root
pnpm install
pnpm build
# Then start backend and frontend per your hosting (e.g. start backend process, and for frontend: pnpm --filter frontend start)
```

The frontend is one Next.js build; the same build serves all subdomains. No separate build per role.

---

## 5. Development vs Production Routing

### 5.1 Development

- **URL**: Usually `http://localhost:3000`. The middleware does **not** rewrite when host is `localhost` without a subdomain.
- **Routing**: Use path prefixes directly:
  - `http://localhost:3000/farmer/dashboard/home`
  - `http://localhost:3000/dealer/dashboard/home`
  - `http://localhost:3000/company/dashboard/home`
  - `http://localhost:3000/doctor/dashboard`
  - `http://localhost:3000/admin/dashboard`
- **Auth**: Login at `http://localhost:3000/auth/login`; after login, redirect goes to the role-specific path. No subdomain needed.

### 5.2 Local Subdomain Testing

To test subdomain behavior locally:

1. Add hosts entries, e.g. in `/etc/hosts`:
   - `127.0.0.1 farmer.localhost dealer.localhost company.localhost doctor.localhost admin.localhost`
2. Open `http://farmer.localhost:3000/dashboard/home`, `http://dealer.localhost:3000/dashboard/home`, etc.
3. Middleware treats `farmer.localhost` like `farmer` and rewrites to `/farmer/...`.

### 5.3 Production

- **URLs**: `https://farmer.p360.com`, `https://dealer.p360.com`, etc. All resolve to the same Next.js app.
- **Routing**: Middleware rewrites by subdomain so that e.g. `dealer.p360.com/dashboard/home` becomes `/dealer/dashboard/home`.
- **Auth**: Cookie domain must be `.p360.com` (or equivalent) so refresh token is sent for every subdomain. Backend CORS and Socket.IO must list all frontend origins (`FRONTEND_URLS`).

Summary: same codebase and single build; behavior differs only by host (localhost vs subdomains) and env (API URL, cookie domain, CORS).

---

## 6. Migration Strategy: Multi-App to Unified App

Historically the plan assumed multiple frontends (e.g. separate farmer, doctor, admin apps). Current repo already has **one** Next.js app with role-based routes. The migration described in [UNIFIED_APP_REFACTOR_PLAN.md](./UNIFIED_APP_REFACTOR_PLAN.md) is therefore about:

1. **Restructuring** the existing app into clear route groups `(farmer)/`, `(dealer)/`, `(company)/`, `(doctor)/`, `(admin)/` and shared `(auth)/`, `(shared)/` (optionally under a single `apps/web/`).
2. **Subdomain middleware**: Already in place; extend or refine as needed (e.g. dealer/company were added so all four role subdomains are covered).
3. **Shared code**: Move auth and most shared logic into the app; keep only minimal shared packages to avoid rebuild and symlink pain.
4. **Phased rollout**: Migrate farmer first, then doctor, then dealer/company/admin, with feature flags or path-based toggles if needed.
5. **Single deployment**: Keep one Next.js build and one backend; no separate deployments per role.

So “migration” here means refactoring the current single app and decommissioning or shrinking shared packages, not merging multiple deployed apps.

---

## 7. Shared Package Strategy and Pain Points

### 7.1 Current Shared Packages

| Package             | Purpose                     | Consumed by      |
|---------------------|-----------------------------|------------------|
| `@myapp/shared-types` | Zod schemas, TS types, enums | backend, frontend |
| `@myapp/shared-auth`  | Auth helpers, types         | frontend (and optionally backend) |
| `@myapp/utils`        | Calendar, Nepali date, etc. | frontend (and optionally backend) |

### 7.2 Pain Points

- **Rebuilds**: Changes to `shared-types` or `shared-auth` require rebuilding the package (`pnpm build:types`, `pnpm build:auth`) before frontend/backend see updates.
- **Watch workflow**: Developers run `pnpm watch:types` or `pnpm watch:auth` in separate terminals; easy to forget and can cause stale types.
- **Symlinks**: Workspace deps use symlinks; some tooling (e.g. certain bundlers or IDEs) can misresolve or cache old output.
- **Versioning**: All apps must align on the same workspace version; no independent versioning per app.

### 7.3 Target Strategy (from UNIFIED_APP_REFACTOR_PLAN.md)

- **Keep minimal**: Only `shared-types` (and possibly `utils`) as thin, stable packages.
- **In-app auth**: Move `shared-auth` logic into the unified app so the frontend (and backend if needed) no longer depend on a separate auth package for UI/auth flows.
- **Fewer packages**: Prefer code in the app’s `(shared)/` or `lib/` over new shared packages to avoid rebuild and sync issues.

---

## 8. Future Enhancements

### 8.1 Modular Architecture and Role-Based Code Splitting

- **Route groups**: Organize by role with clear boundaries so that farmer, dealer, company, doctor, and admin code live in separate segments. This enables:
  - **Role-based code splitting**: Next.js and bundler can split by route so that e.g. dealer users don’t load farmer-only chunks.
  - **Lazy loading**: Heavy role-specific components can be dynamically imported.
- **Shared layout and components**: Keep one shared layout and a common set of UI/forms/charts in a `(shared)/` or similar area to avoid duplication while preserving role-specific entry points.

### 8.2 Subdomain and Auth Consistency

- **Cookie domain**: Centralize production cookie domain (e.g. `COOKIE_DOMAIN=.p360.com`) and use it in backend auth.
- **CORS and Socket.IO**: Ensure `FRONTEND_URLS` (or equivalent) includes every subdomain and the main domain so all roles work from their subdomains.

### 8.3 Observability and Deployment

- **Logging and metrics**: Single deployment makes it easier to add one pipeline for logs and metrics across all roles.
- **Feature flags**: Use env or a feature-flag service to toggle new role-specific or cross-role features without separate builds.

### 8.4 Alignment with UNIFIED_APP_REFACTOR_PLAN.md

The refactor plan’s phases (foundation, doctor migration, shared infrastructure, data layer, testing) and success criteria (single codebase, no shared package pain, role-based code splitting, subdomain routing) are the main roadmap. This document’s deployment and subdomain setup are the operational basis for that plan.

---

## 9. Quick Reference

| Topic              | Location / detail |
|--------------------|--------------------|
| Subdomain → route  | `apps/frontend/middleware.ts` |
| Role routes       | `apps/frontend/src/app/{farmer,dealer,company,doctor,admin}/` |
| Backend env       | `apps/backend` (e.g. `.env`), see §3.1 |
| Frontend env      | `apps/frontend` (e.g. `.env.local`), see §3.2 |
| Build             | `pnpm build` at root; frontend: `pnpm --filter frontend build` |
| Future architecture | [UNIFIED_APP_REFACTOR_PLAN.md](./UNIFIED_APP_REFACTOR_PLAN.md) |
| Database and API | [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md), [context.md](./context.md) |

---

*Last updated to reflect single deployment and subdomain-based routing (farmer, dealer, company, doctor, admin) and reference UNIFIED_APP_REFACTOR_PLAN.md for future architecture.*
