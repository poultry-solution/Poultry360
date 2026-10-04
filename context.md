# Poultry360 — Project Context

> Last checked: 2026-10-04. This is the main long-term work note. When a feature plan is done or
> replaced, move its useful result and any open work here, then remove the old plan file.

## Overview

**Poultry360** is a three-tier management system for the poultry supply chain:

| Tier | Role | Key Features |
|------|------|--------------|
| **Company** | Independent business | Product catalog, company sales, supplier and dealer records |
| **Dealer** | Independent business | Inventory, manual customers and suppliers, product sales, Broiler settlement |
| **Farmer** | Independent business | Farm operations, batch tracking, sales and expenses |
| **Doctor** | Service | Consultations with farmers via real-time chat |
| **Admin** | System | Cross-tier management and reporting |

Each business account owns its own data. The system supports inventory, sales, payments,
vaccinations, reminders, staff access, and real-time notifications without automatic cross-account
sales, payment requests, or balance updates.

---

## Project Structure

```
Poultry360/
├── apps/
│   ├── backend/          # Express 5 API, Prisma, Socket.IO
│   └── frontend/         # Next.js 15 App Router
├── pnpm-workspace.yaml   # pnpm workspaces config
└── package.json
```

> **Note:** The `/packages/` folder is deprecated and no longer used. Do not import from or modify it.

**Stack:** Next.js 15, React 19, TanStack Query, Zustand, Socket.IO, Express 5, Prisma, PostgreSQL, Tailwind CSS, Radix UI

**Run:** `pnpm install && pnpm dev` from repo root

---

## Key Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Project setup and main commands |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Subdomain config, env vars, build process |
| `apps/frontend/src/fetchers/README.md` | TanStack Query patterns |
| `apps/frontend/src/common/README.md` | Shared frontend code |
| `apps/backend/TESTING_SETUP.md` | Backend test setup |

---

## Independent Business Accounts (Critical)

The current product direction is independent accounts. A Company, Dealer, Farmer, Hatchery, or
other business account must not automatically create, update, or settle records in another
account.

- Sales, purchases, inventory, balances, and payments belong to the account that records them.
- Use manual customers and manual suppliers for Dealer operations.
- Do not add new connection requests, shared carts, consignment flows, payment-request flows, or
  cross-account balance synchronization.
- Older connection-related models, routes, and service code remain only for historical data and
  backwards compatibility. Do not extend them for new work.
- One active exception must be handled with care: Company-owned dealer sales and payments still
  use `CompanyDealerAccount`, `CompanyDealerPayment`, and `CompanyDealerAccountService`. This is
  the Company's own ledger flow. Do not remove it just because its model name joins Company and
  Dealer. It must not create a new request, approval, or two-way sync flow.

---

## Authentication & Authorization

### Flow

1. **Login** `POST /auth/login` → returns `accessToken` + sets `refreshToken` as httpOnly cookie
2. **Frontend** stores `accessToken` in Zustand (persisted to localStorage)
3. **Axios interceptor** adds `Authorization: Bearer <token>` to requests
4. **On 401:** interceptor calls `/auth/refresh-token` (uses httpOnly cookie), retries request
5. **On refresh failure:** clears auth, redirects to `/auth/login`

### Roles

| Role | Route Prefix | Default Dashboard |
|------|--------------|-------------------|
| `OWNER`, `MANAGER` | `/farmer/*` | `/farmer/dashboard/home` |
| `DEALER` | `/dealer/*` | `/dealer/dashboard/home` |
| `COMPANY` | `/company/*` | `/company/dashboard/home` |
| `DOCTOR` | `/doctor/*` | `/doctor/dashboard` |
| `SUPER_ADMIN` | `/admin/*` | `/admin/dashboard` |

Backend enforces roles via `authMiddleware(req, res, next, [allowedRoles])`. Frontend uses `AuthGuard` + `RoleBasedMiddleware` for route protection.

### Account Relationships

Do not treat account relationships as a live workflow. New records are independent; any older
linked-account data must remain readable without causing new side effects in another account.

### Onboarding Approval

`User.status = ACTIVE` and onboarding approval are separate checks. A new account with a
`UserOnboardingPayment` record remains blocked while `lockedUntilApproved` is true and its state
is not `PAYMENT_APPROVED`. Super Admin must approve it from **Payment Approvals**; that approval
unlocks the account as well as setting the user status active. Demo and clean local seeds create
approved onboarding records so their accounts can log in immediately.

---

## Frontend Routing

### Subdomain Strategy

Production uses subdomain-based routing. Middleware (`apps/frontend/middleware.ts`) rewrites paths:

| Subdomain | Internal Path |
|-----------|---------------|
| `farmer.p360.com/dashboard` | `/farmer/dashboard` |
| `dealer.p360.com/dashboard` | `/dealer/dashboard` |
| `company.p360.com/dashboard` | `/company/dashboard` |
| `doctor.p360.com/dashboard` | `/doctor/dashboard` |
| `admin.p360.com/dashboard` | `/admin/dashboard` |

**Local dev:** Access routes directly at `localhost:3000/farmer/*`, etc.

### Layout Hierarchy

```
Root Layout (providers)
  └─ Role Layout (AuthGuard)
      └─ Dashboard Layout (Sidebar, Topbar, MobileBottomNav)
          └─ Page
```

### Provider Stack (order matters)

```
AuthProvider → QueryProvider → InventoryProvider → ChatProvider → ToastProvider → LoadingProvider → RoleBasedMiddleware → AuthGuard
```

---

## State Management

### TanStack Query (Server State)

API data uses TanStack Query hooks in `apps/frontend/src/fetchers/`. Keep one typed key family per
domain. Create invalidates list and scoped-list keys; update invalidates detail and related lists;
delete removes the detail key and invalidates lists. See the fetcher README for examples.

### Zustand (Auth State)

`apps/frontend/src/common/store/store.ts` holds `user`, `accessToken`, `isAuthenticated`. Persisted to localStorage.

### React Context

- **ChatContext:** Socket.IO state, messages, typing, presence
- **InventoryContext:** Local UI state for inventory views

---

## Backend Architecture

### API Structure

All routes prefixed with `/api/v1`. Organized by domain in `apps/backend/src/router/`.

| Category | Routes | Purpose |
|----------|--------|---------|
| Auth | `/auth` | Login, register, refresh, logout |
| Dealer | `/dealer/*` | Products, sales, cart, ledger |
| Company | `/company/*` | Products, sales, analytics |
| Farms/Batches | `/farms`, `/batches` | Farm and batch CRUD |
| Inventory | `/inventory` | Stock tracking |
| Communication | `/conversations`, `/messages` | Chat |
| Notifications | `/notifications`, `/reminder-notifications` | Push + reminders |

### Controller-Service Pattern

```
Request → authMiddleware → Controller (validate, extract userId/role) → Service (business logic) → Prisma → Response
```

Services handle transactions, state machines, and domain logic. Controllers handle HTTP concerns.

### Key Services

| Service | Purpose |
|---------|---------|
| `CompanyDealerAccountService` | Active Company-owned dealer sale/payment ledger; keep it one-sided and do not turn it into account sync |
| `DealerService` | Dealer operations, farmer/customer balance-based ledger |
| `farmerFcrService` | Raw FCR, cFCR, freshness, history rebuilds, and dashboard totals for Farmer Broiler batches |
| `SocketService` | JWT socket auth, room management, real-time events |
| `webpushService` | Web Push notifications |
| `ReminderCronService` | Cron job for vaccination/reminder notifications |

---

## Real-time (Socket.IO)

- Socket connections use JWT auth. Conversation rooms handle messages, typing, read state, and
  presence; offline users can receive Web Push.
- Message types are TEXT, IMAGE, VIDEO, AUDIO, PDF, DOC, BATCH_SHARE, and FARM_SHARE.
- Main events are `join_conversation`, `send_message`, `typing_start`/`typing_stop`, and
  `mark_messages_read`.

---

## Environment Variables

```
PORT                 # Server port (default: 8081)
JWT_SECRET           # Access token secret
JWT_REFRESH_SECRET   # Refresh token secret
FRONTEND_URLS        # Comma-separated allowed origins
DATABASE_URL         # PostgreSQL connection string
VAPID_PUBLIC_KEY     # Web push public key
VAPID_PRIVATE_KEY    # Web push private key
NODE_ENV             # development/production/test
```

---

## Development Guidelines

### Adding Features

| Task | Location | Notes |
|------|----------|-------|
| New API route | `apps/backend/src/router/` | Create route file, add to `index.ts` |
| New controller | `apps/backend/src/controller/` | Extract userId from `req.userId`, validate with Zod |
| New service | `apps/backend/src/services/` | Business logic, transactions |
| Schema change | `apps/backend/prisma/schema.prisma` | Run `prisma migrate dev` |
| New query hook | `apps/frontend/src/fetchers/` | Follow `*Keys` + `useGet*`/`useCreate*` pattern |
| New page | `apps/frontend/src/app/[role]/dashboard/` | Use role layout, wrap with AuthGuard |

### Response Format

```typescript
// Success
{ success: true, data: any, message?: string }

// Error
{ message: string, error?: string }
```

### Common Patterns

1. **Independent account changes:** Keep all writes within the acting business account. Do not add cross-account side effects.
2. **New entity:** Add Prisma model → create service → create controller → create route → create frontend query hooks
3. **Role-specific feature:** Add route under role prefix, enforce role in authMiddleware, use role layout on frontend
4. **Real-time feature:** Add socket event handler in SocketService, emit from service layer, handle in ChatContext

---

## Dealer Accounting Notes

- Dealer customers and suppliers are manual, dealer-owned records. Positive `Customer.balance`
  means the customer owes the Dealer; positive `DealerManualCompany.balance` means the Dealer owes
  the supplier. New Dealer work must not write to `CompanyDealerAccount`.
- Estimated profit is normal product sales plus settled Broiler margin minus recorded purchases.
  Broiler proceeds held for a farmer are not Dealer sales or profit.
- Broiler settlement is a small optional add-on. It groups unsettled Broiler sales by source
  farmer, uses the proceeds to clear that farmer's due balance, pays the rest to the farmer, and
  records only the Dealer margin as income.
- `DealerSale.settlementId` stops a second settlement. `BroilerSaleSettlement` keeps the final
  record. The buyer and source farmer must be different manual customers.
- Use **Broiler** in the UI. Some old fields and the route
  `/dealer/dashboard/sales/chicken-by-farmer` still use “chicken” for compatibility.

---

## Dealer Staff Accounts

- `StaffUser` is a login tied to one owner account and uses `/staff-auth/login` with
  `actorType: STAFF`. `Staff` is a separate payroll record; never use it for login.
- Dealer staff work only in their owner's scope. Extra permissions control financial summaries,
  Cash in Hand, and payroll staff work. Staff cannot open Business Activity or Staff Access.
- Disabling a staff login ends its access. Staff do not use normal onboarding or password reset.

---

## Shared Staff Operations and Account Features

Staff Operations is complete for Dealer, Hatchery, Farmer, and Company. All four modules reuse
the same staff login, account feature, permission, lockout, navigation, and audit design.

- `DEALER_STAFF_OPERATIONS`, `HATCHERY_STAFF_OPERATIONS`, `FARMER_STAFF_OPERATIONS`, and
  `COMPANY_STAFF_OPERATIONS` are on by default and can be changed by Super Admin for each account.
- Turning one off blocks new staff login, token refresh/check, and active staff API requests at
  once. It hides staff access, payroll staff work, and owner activity UI without deleting data.
- Staff Access and Business Activity are owner-only in every module. A direct link must not let a
  staff user open them. Staff also cannot read or change the owner's notifications.
- Each module has a basic work permission plus separate permissions for private totals, analytics,
  cash where used, and payroll staff work. Company daily supplier, purchase, production, product,
  dealer, sale, and payment work belongs to Company Operations; private totals and Analytics are
  separate permissions.
- Farmer Broiler and Layer use one `OWNER` account, one Farmer dashboard, and one staff setup. Do
  not create separate Broiler and Layer staff systems.
- Admin Account Usage is count-only and role-aware. It shows lifetime and last-30-day totals, not
  customer or supplier rows. It does not add billing or plan limits.
- The Admin home uses live account, farm, batch, bird, queue, registration, and activity totals. Do
  not add made-up revenue, rankings, or system-health scores.

The shared feature list is in `apps/backend/src/services/accountFeatureService.ts` and mirrored in
`apps/frontend/src/fetchers/accountFeatureQueries.ts`. Check a feature before its page, query,
poller, provider, or socket work starts, and reuse the same TanStack Query cache key.

---

## Business Activity Audit

- `BusinessAuditLog` is the immutable, account-scoped business trail. It is separate from the
  legacy `AuditLog` model and stores only safe actor, target, action, amount/quantity-style
  metadata, description, timestamp, and archive state—never credentials or full snapshots.
- Phase 1 covers Dealer sales and payments, inventory adjustments, supplier purchases/payments,
  Broiler settlements, staff-login changes, and Super Admin account, Dealer, Company, blog, and
  landing-review changes. Account approval/rejection and feature changes include richer scope
  metadata.
- Dealer owners view their account at `/dealer/dashboard/activity`; staff cannot view activity.
  Super Admin views all records at `/admin/dashboard/activity`.
- Both pages have server-scoped filtering and CSV, Excel, and PDF export. Records older than 10
  days receive `archivedAt` via the backend audit archiver and are hidden by default, not deleted.
- Chat auditing now records only successful sends and soft deletes as `chat.message.sent` and
  `chat.message.deleted`, scoped to the sender and conversation. It stores message type and
  yes/no text/attachment metadata only—never chat content, filenames, URLs, or storage keys.
  Login/logout auditing records only successful normal-user and staff sign-ins/sign-outs as
  `auth.login.succeeded` and `auth.logout.succeeded`. These records are visible and exportable
  only to Super Admin; normal users and staff never receive them. Successful sign-ins also have
  a separate `AuditSecurityMetadata` row containing only IP address, browser family, operating
  system family, device type, and an optional trusted-header country/region. It is visible only to
  Super Admin, expires after 30 days, and is deleted without changing the immutable audit event.
  Never store credentials, tokens, cookies, session IDs, raw user-agent strings, browser versions,
  precise location, or data from an external geo-IP provider. Do not audit page views, exports,
  failed actions, token refreshes, or notifications.

---

## Farmer Raw FCR and cFCR

The old FCR review and the later cFCR plan are complete and replaced by
`apps/backend/src/services/farmerFcrService.ts`.

- FCR and cFCR apply only to Broiler batches. Layer batches return not applicable.
- Raw FCR uses feed in kilograms divided by produced live-weight gain. It includes valid sold-bird
  weight plus the valid weight of birds still alive. Natural deaths and batch-closure deaths are
  not output birds.
- The service keeps current, stale, and final states. Missing or bad feed, weight, sale weight,
  bird counts, or close data returns a clear unavailable state instead of a false zero.
- FCR history is rebuilt from source data and is not an audit log. Rebuilds are safe to repeat and
  can change old points after a feed, weight, sale, mortality, close, or setting edit.
- `FARMER_CFCR` is a Farmer-owned setting, off by default and not controlled by Admin. Turning it
  off hides cFCR fields and charts but does not delete data or change raw FCR.
- New Broiler batches use a 2.00 kg target and a 0.40 correction per kg. Active batch settings can
  be changed; closed batch settings are locked. Old closed batches with no settings stay without
  cFCR.

```text
outputBirdCount = soldBirds + remainingBirds
averageOutputWeightKg = producedLiveWeightKg / outputBirdCount
cFCR = rawFCR + ((targetWeightKg - averageOutputWeightKg) * correctionFactorPerKg)
```

The dashboard uses weighted results, not a simple average:

```text
raw FCR = sum(feedKg) / sum(weightGainKg)
```

Only fresh/final batches are used. cFCR is weighted by weight gain. If eligible batches use
different targets or factors, no single cFCR is shown.

Main migrations:

- `20260930014850_update_fcr_calculation`
- `20260930034410_update_fcr_calculation_2`
- `20260930163426_backfill_farmer_feed_kg`
- `20261001235403_added_cfcr_part`

---

## Purchase Bill Upload

Optional supplier purchase bill images are built for Farmer, Hatchery, Dealer, and Company.

- Each module has its own self-controlled setting, off by default. Admin does not control it.
- Use the shared `ImageUpload` flow, image files only, at most 10 MB, in
  `poultry360/purchase-bills`.
- A bill is optional. Block save and close while upload is running, show a preview before save,
  and show a View link in purchase history only while the feature is on.
- A bill must never change stock, balance, expense, feed, FCR, discount, or payment values.
- Farmer stores the URL in `EntityTransaction.imageUrl`; Hatchery uses
  `HatcherySupplierTxn.receiptImageUrl`; Dealer uses `DealerManualPurchase.billImageUrl`; Company
  uses `CompanyPurchase.billImageUrl`.
- Migration `20261001115141_add_purchase_bill_fields` adds the nullable Dealer and Company fields.
  Apply it in each target database before testing those flows.

Farmer, Hatchery, and Dealer were manually approved during the phased work. Company code and
tests are done, but its migration and manual flow still need to be checked in each target setup.
The final cleanup is also open: safely remove unused Cloudinary files after a cancelled upload or
a deleted/voided purchase, check every purchase entry point, and decide whether exports need URLs.

---

## Connection Workflow Removal Status

The product uses simple manual, account-owned work. Do not bring back connection approval,
payment-request, shared-cart, consignment, or automatic cross-account balance flows.

- Farmer to Dealer cleanup: done.
- Dealer to Farmer cleanup: done.
- Dealer to Company cleanup: main manual flow is in place, but old names and unused code still need
  a careful pass.
- Company to Dealer cleanup: still needs a final UI, backend, test, and data-model review.

Keep old history readable where needed. Remove an old model only after all reads, reports, tests,
and migration needs are known. `companyLedgerController` now returns zero for removed payment
requests, but it still exposes an `activeConsignments` field that needs review. There are also two
Company payment entry paths (`companyDealerAccountController.recordDealerPayment` and
`companyLedgerController.addCompanyPayment`); join them before deleting either one.

Regression checks for this cleanup must cover manual sales, direct payments, ledgers, inventory,
dashboard totals, route links, labels, and old history.

---

## Quick Reference

- **Run dev:** `pnpm dev` from repo root
- **Schema:** `apps/backend/prisma/schema.prisma`
- **Routes:** `apps/backend/src/router/index.ts`
- **Frontend queries:** `apps/frontend/src/fetchers/`
- **Auth store:** `apps/frontend/src/common/store/store.ts`
- **Account features:** `apps/backend/src/services/accountFeatureService.ts`
- **Farmer FCR/cFCR:** `apps/backend/src/services/farmerFcrService.ts`
- **Dealer staff access:** `apps/frontend/src/app/(protected)/dealer/dashboard/staff-access/page.tsx`
- **Staff authentication:** `apps/backend/src/router/staffAuthRoutes.ts`
- **Socket service:** `apps/backend/src/services/socketService.ts`

### Local Seed Commands

- `pnpm --filter backend seed:demo:dealer` — demo dealer with sample data.
- `pnpm --filter backend seed:clean:dealer` — creates one empty local dealer account for accounting checks. It refuses to overwrite
  an existing account. Override the phone/password with `P360_CLEAN_DEALER_PHONE` and
  `P360_CLEAN_DEALER_PASSWORD` if needed.
- Current clean local account: `+9779800360099` with the configured clean-seed password.