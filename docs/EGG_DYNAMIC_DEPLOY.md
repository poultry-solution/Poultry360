# Deploying Egg-Dynamic Migration (EC2 + CI/CD)

## How your setup works

- **CI/CD**: On push to `main` (backend/shared-types changes), GitHub Actions builds the Docker image, pushes to Docker Hub, then SSHs to EC2 and runs `docker compose pull` + `docker compose up -d backend`.
- **On container start**: Your `scripts/docker-entrypoint.sh` runs **`prisma migrate deploy`** (then optionally seed if `SEED_DATABASE=true`). So **migrations run automatically** every time the backend container starts on EC2; you do **not** run them manually in CI/CD.

## Why “reset here” doesn’t fix EC2

- **“Here” (your laptop)**: `prisma migrate reset` uses the **DATABASE_URL in your local `.env`**. So it only affects the DB that URL points to (e.g. local Postgres or a dev URL).
- **EC2**: The “real” app database is on EC2 (or RDS, etc.). That DB is only changed when:
  1. Something on EC2 runs Prisma against it (e.g. the backend container’s entrypoint running `migrate deploy`), or
  2. You run Prisma from a machine that has **DATABASE_URL pointing to the EC2 Postgres** (e.g. from your laptop with `.env` set to EC2, or from inside a container on EC2).

So a reset on your laptop only resets the DB your laptop is connected to. To reset the EC2 database, you must run the reset **against** the EC2 DB (from EC2 or from a client that uses EC2’s DATABASE_URL).

---

## Step-by-step flow

### 1. Create the migration file (locally, once)

You need the **egg-dynamic migration SQL** in the repo so that when the container runs `migrate deploy` on EC2, it has something to apply.

**Option A – You have a local Postgres (or don’t care about local DB):**

```bash
cd apps/backend
pnpm prisma migrate dev --name egg-dynamic
```

- If Prisma says the DB is out of sync and suggests a reset, you can confirm (local DB only).
- This creates a new folder under `prisma/migrations/` (e.g. `20260301xxxxxx_egg_dynamic/migration.sql`).

**Option B – You don’t want to touch any DB yet:**

```bash
cd apps/backend
pnpm prisma migrate dev --name egg-dynamic --create-only
```

- This only creates the migration file; it does **not** apply it. Your DB (local or remote) is unchanged.

After this, you should see something like:

`prisma/migrations/<timestamp>_egg_dynamic/migration.sql`

---

### 2. Push your code (including the new migration)

- Commit **all** egg-dynamic changes: schema, backend, frontend, **and** the new migration folder under `prisma/migrations/`.
- Push to `main` (or your deploy branch).

CI/CD will then build and deploy the new backend image (which includes the new migration file). **Do not** run DB reset in CI/CD; see step 3 for when to reset.

---

### 3. EC2 database: apply the migration (or reset once)

When the new container starts on EC2, entrypoint runs:

```bash
npx prisma migrate deploy
```

- **If the EC2 database is empty or has never had the old egg schema:**  
  `migrate deploy` will apply all migrations, including `egg_dynamic`. No manual step on EC2 needed.

- **If the EC2 database already has the old schema** (e.g. tables like `EggProduction` with `largeCount`/`mediumCount`/`smallCount`, or `EggInventory` with `eggCategory`):  
  The egg-dynamic migration will do destructive changes (drop columns, change enums). That can **fail** or cause errors if Prisma tries to drop columns that still have data. In that case you have two options:

  **3a. One-time reset on EC2 (wipe DB and apply all migrations + seed)**

  Run this **once** against the EC2 Postgres. After that, `migrate deploy` on future deploys will see “already up to date.”

  From your laptop (with `.env` pointing at EC2 Postgres):

  ```bash
  cd apps/backend
  pnpm prisma migrate reset --force
  ```

  Or on EC2, inside the backend container (replace with your compose service name if different):

  ```bash
  cd ~/p360   # or wherever your compose project is
  docker compose exec backend npx prisma migrate reset --force --schema=/app/prisma/schema.prisma
  ```

  (`migrate reset` will drop the DB, recreate it, apply all migrations, and run seed if configured.)

  **3b. Or run reset from EC2 host (without Docker)**

  If you have Node/Prisma on the EC2 host and a `.env` there with `DATABASE_URL` pointing to the Postgres on EC2:

  ```bash
  cd /path/to/repo/apps/backend
  npx prisma migrate reset --force
  ```

After this one-time reset, the EC2 DB has the new schema. Every **future** deploy will only run `migrate deploy`; it will see no pending migrations and do nothing.

---

### 4. Optional: seed on EC2 after reset

Your entrypoint runs seed only if `SEED_DATABASE=true`:

```bash
if [ "$SEED_DATABASE" = "true" ]; then
  npx prisma db seed
fi
```

So either:

- Set `SEED_DATABASE=true` in the environment used by the backend container on EC2 (e.g. in `docker-compose.yml` or your env file) for the **first** start after reset, then set it back to `false` if you don’t want to re-seed on every restart, or  
- Run seed once manually after reset:

  ```bash
  docker compose exec backend npx prisma db seed --schema=/app/prisma/schema.prisma
  ```

---

## Summary

| Step | Where | What |
|------|--------|------|
| 1 | Local | Create migration: `prisma migrate dev --name egg-dynamic` (or `--create-only`). |
| 2 | Local | Commit + push (schema, backend, frontend, **and** `prisma/migrations/..._egg_dynamic/`). |
| 3 | CI/CD | Automatic: build image → deploy to EC2 → container starts → **`prisma migrate deploy`** runs. |
| 4 | EC2 (one-time) | If EC2 DB already had old egg schema: run **`prisma migrate reset`** once (from laptop with EC2 URL, or inside backend container on EC2). After that, deploy will keep using `migrate deploy` only. |

So: **push the migration and code first.** Then either let `migrate deploy` apply it (if DB is empty/new) or do **one** manual reset against the EC2 DB. After that, everything works automatically on each deploy.
