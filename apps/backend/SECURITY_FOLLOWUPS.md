# Security Follow-ups

Pending items surfaced during security audits. Each entry is self-contained so a future reader can pick it up without re-doing the discovery.

---

## 1. Dealer product endpoints leak `costPrice` to staff without finance permission

**Status:** deferred (identified 2026-10-18).

**What leaks:**
`dealerProductController.ts` returns the raw product object (via `...product` spread) on three endpoints that are open to any dealer staff — including those without `DEALER_VIEW_FINANCIAL_SUMMARIES`:

- `getDealerProducts` (`GET /api/dealer-products`) — list view
- `getDealerProductById` (`GET /api/dealer-products/:id`)
- `adjustProductStock` (`POST /api/dealer-products/:id/adjust-stock`) — returns `updatedProduct`

Separately, these write endpoints accept `costPrice` as input but have no permission gate:

- `createDealerProduct` (`POST /api/dealer-products`) — `costPrice` required
- `updateDealerProduct` (`PUT /api/dealer-products/:id`) — `costPrice` optional

**What is already correct (reference pattern):**
`getInventorySummary` (`GET /api/dealer-products/inventory/summary`) already gates its one financial field. See `dealerProductController.ts:541-548, 563` — `canViewFinancialSummaries` check + conditional spread. Replicate that shape.

**Recommended fix (not yet decided — reopen when picked up):**
- Reads: strip `costPrice` from the response payload when `req.actorType === "STAFF"` and `!req.staffPermissions?.includes(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES)`. Keep stock, name, selling price, etc. so day-to-day staff flows aren't broken.
- Writes (`create` / `update`): gate the whole endpoint behind `requireStaffPermission(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES)` at the router level. Both endpoints touch cost data, and a staff member setting a cost they can't read back is a confusing UX.

**Also check during fix:** the `companyProduct` relation included in both read endpoints — it may carry its own cost field that needs the same treatment.

---

## 2. Wider dealer-side cost-leak sweep

**Status:** deferred (identified 2026-10-18).

Only `dealerProductController.ts` was audited for the finance-permission gating issue above. Other dealer surfaces may expose cost prices to staff without `DEALER_VIEW_FINANCIAL_SUMMARIES`. Before closing this out, grep across:

- `src/controller/dealerSaleController.ts` — line-item `unitPrice` / `costPrice` / profit fields
- `src/controller/dealerManualCompanyController.ts` — supplier cost info
- `src/controller/dealerCashInHandController.ts` — may already be gated via `requireStaffPermission` on its router; verify
- `src/controller/dealerLedgerController.ts` — ledger reads are already scoped via `requireOperationalLedgerScope`, but double-check that line-level cost/profit isn't leaked
- `src/controller/companyDealerAccountController.ts` — dealer-facing company account views

Grep: `grep -rn "costPrice\|purchasePrice\|unitCost\|profit\|margin" src/controller/dealer*.ts src/controller/companyDealer*.ts`

For each hit, confirm either (a) the endpoint is owner-only, (b) the field is already stripped for staff without the finance permission, or (c) add a gate following the pattern in follow-up #1.

---

## 3. UTC vs Nepal wall-clock date boundaries — deferred residual quirks

**Status:** partially addressed (frontend defaults fixed 2026-10-18). Residual items below are deferred.

### Convention this codebase uses

**Internally AD, no `NepaliDate` arithmetic for calculation.** BS is a UI-layer formatter only. Date columns in the DB are AD timestamps. The de facto convention everywhere a user picks a date:

- Writer: `date: new Date("2026-10-18")` → stored as `2026-10-18T00:00:00Z` (UTC midnight of the AD day).
- Reader (list filter): `date: { gte: new Date(startDate), lte: new Date(endDate) }` → same UTC-midnight-of-AD-day boundary.

As long as writer and reader both use this, the surface is internally consistent — regardless of where the user physically is.

### The underlying problem

Nepal is UTC +05:45. The 5:45h gap between UTC midnight and Nepal midnight creates two midnight-adjacent failure modes:

1. **Client-local defaults.** The old `new Date().toISOString().split("T")[0]` returns the *client's* local day. A Nepali user whose laptop/browser is set to UTC at 2 AM Nepal time picks "yesterday" without noticing. Fixed 2026-10-18 across ~15 frontend files by switching all date-picker defaults to `getNepalTodayAd()` (which is TZ-independent).

2. **Surfaces that mix UTC-day and Nepal-day semantics on the same table.** The dealer dashboard is the known case:
   - **List filter** (`dealerSaleController.ts`) uses `parseNepalBoundary` → Nepal wall-clock day.
   - **Trend chart** (`dealerSalesTrendService.ts`) uses SQL `+ interval '5 hours 45 minutes'` → Nepal wall-clock day.
   - **Monthly stats** (`dealerController.ts:160, 196, 282, 1342`) use `new Date(); setDate(1); setHours(0,0,0,0)` → AD calendar month in **UTC**.
   During the 5:45h window after UTC midnight, chart buckets and list filter can show a sale that monthly stats haven't picked up yet (or vice-versa).

### Why residual #2 is not being fixed now

- No user has complained about it in testing; the midnight-form-default bug (fixed above) was the actual pain.
- Aligning them cleanly would mean either picking a convention (Nepal wall-clock everywhere on dealer surfaces, or UTC everywhere) and migrating writers to match. Either direction is more invasive than the user-facing bug warrants.
- `getNepalBsMonthWindow` was considered — rejected because it does `NepaliDate` AD → BS → AD arithmetic, which violates the "internally AD only" convention this codebase keeps on purpose.

### If this ever needs picking up

Two options, in order of invasiveness:

- **Option A:** align dealer surfaces by shifting the monthly-stats boundary to Nepal wall-clock (AD calendar month, 00:00 Nepal time on the 1st). No BS math, no schema change — just offset the boundary. Resolves the chart-vs-stats disagreement on dealer dashboards.
- **Option B:** change every "date" column that represents a calendar day (not a moment) from `DateTime` to `@db.Date`. Database-level date-only semantics mean no TZ math anywhere. Correct in theory, requires a schema migration + every Prisma query + seeds + test fixtures. Only worth it if a broader date-handling cleanup is already in flight.

Grep hotspots if revisiting: `grep -rn "setHours(0, 0, 0, 0)\|interval '5 hours 45 minutes'\|parseNepalBoundary\|getNepalBsMonthWindow" src/`.
