# Poultry360 Frontend

Next.js 15 (App Router) app that serves every role: farmer, dealer, company, hatchery and admin.

## Run locally

From the repo root:

```bash
docker compose -f docker-compose.local.yml up -d   # local database
pnpm dev                                           # API on :8081, web on :3000
```

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base, e.g. `http://localhost:8081/api/v1` |

## Where things live

- Role pages: `src/app/(protected)/{farmer,dealer,company,hatchery,admin}/`
- Shared UI and helpers: `src/common/`
- API queries (TanStack Query): `src/fetchers/`
- Texts (English / Nepali): `src/i18n/en.json`, `src/i18n/ne.json`

See `context.md` at the repo root for the full project overview.
