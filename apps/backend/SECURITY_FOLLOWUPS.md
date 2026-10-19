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

---

## 4. Automatic retry on P2034 for dealer Serializable writes

**Status:** deferred (identified 2026-10-19). Current behaviour is already safe (409 "please try again"); automatic retry is a UX improvement, not a correctness fix.

### Current state

Four dealer write paths use `Prisma.TransactionIsolationLevel.Serializable` to protect ledger balance from write-skew. All four translate a `P2034` (`serialization_failure`) into a 409 "please try again" response so the user retries by hand:

- `DealerService.createDealerSale` (`dealerService.ts:102`)
- `DealerService.createSupplierSettlementSale` (`dealerService.ts:355` area)
- `DealerService.recordAccountPayment` / `recordDealerPayment` (`dealerService.ts:738`)
- `setDealerOpeningBalance` (`dealerController.ts:1013`, Serializable block added 2026-10-19)

### Reviewer's suggestion

Catch the first `P2034` server-side and run the same transaction once more before giving up. One retry absorbs the common case where the conflicting transaction has already committed by the time we retry, so the user never sees the error. A second `P2034` falls through to the existing 409.

### Why we are NOT doing this yet

Need to confirm in production **what actually triggers P2034 today** before adding a silent retry. Two scenarios to distinguish:

1. **Legitimate concurrent writers on the same dealer ledger.** Two staff users on the same account posting sales within the same millisecond, or an API client firing parallel requests. Auto-retry is the correct answer here — it preserves the user's intent.

2. **Duplicate submission from a single user (double-click, flaky network retry).** The two writes represent the *same* sale, not two different ones. Current behaviour: one succeeds, the other returns 409 and the user sees "please try again" and (usually correctly) does nothing. **Auto-retry here is harmful** — the server would silently create two sales when the user only intended one.

Suspicion from product owner: on a normal day, the standard single-click flow should never hit P2034. If it does happen in practice, it's likely scenario 2, which auto-retry would make *worse*, not better.

### Investigation checklist for whoever picks this up

1. Add structured logging to each `P2034` catch (dealerId, actor userId / staffUserId, request IP, timestamp, endpoint). Deploy and let it run for one to two weeks.
2. Classify the samples:
   - Same dealer + same actor within 2 seconds → almost certainly double-submit.
   - Same dealer + two different staff actors → genuine concurrent write.
   - Different dealers → shouldn't be possible (balances are per-dealer); if seen, something else is going on and needs investigation on its own.
3. Based on the mix, pick one of:
   - **Mostly scenario 1** → add the one-shot retry helper. Wrap the four Serializable tx blocks.
   - **Mostly scenario 2** → the real fix is request idempotency (an `Idempotency-Key` header stored for N minutes), not a retry. The frontend already debounces most submit buttons; add one on any that doesn't, and verify no accidental auto-resubmission on auth-token refresh.
   - **Both roughly even** → add idempotency *first*, then auto-retry on top.

### Shape of the retry (for whenever we are ready)

```ts
// apps/backend/src/utils/retryOnSerializationFailure.ts
export async function retryOnceOnSerializationFailure<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error?.code === "P2034") return await fn(); // second P2034 bubbles up to the 409 catch
    throw error;
  }
}
```

Then at each of the four sites, wrap the existing `prisma.$transaction(... Serializable ...)` call in `retryOnceOnSerializationFailure(() => prisma.$transaction(...))`. The current 409 catches stay as the final safety net.

### Do NOT

- Retry more than once. A real logic bug or saturation would spin.
- Add retry at the controller layer where the result object is already built — must wrap the transaction itself so the entire read-compute-write runs again from a fresh snapshot.
- Add retry on anything other than `P2034`. Validation errors, FK violations, etc. must not be retried.

---

## 5. Legacy Broiler settlements still match ledger entries by user text

**Status:** informational only (identified 2026-10-19). Forward fix shipped the same day. Product owner confirmed no production settlements predate the fix, so no backfill is required right now. This note remains as a reference in case legacy data appears later (e.g., import from another environment).

### What the forward fix did

Before: `settleBroilerSales` used `settlement.reference?.trim() || BROILER-SETTLEMENT-${slice-8}` as the key stored on every ledger entry it created, and `reverseSettlement` matched by the same string. A dealer who typed any value as the settlement reference and later typed the same string on an unrelated payment would see the payment's ledger entry destroyed on reverse — references are not unique.

After (2026-10-19, `dealerSaleController.ts:1522`): the create path always writes `BROILER-SETTLEMENT-${full-cuid}` as the ledger key, independent of any user input. New settlements can never collide. The user's own text still lives on `settlement.reference` for display.

### What the reverse path currently does

`reverseSettlement` (`dealerSaleController.ts:1629` onward) tries the safe generated key first and only falls back to the legacy formula (user reference, then slice-8 fallback) when nothing matches. Post-fix settlements never fall through. Pre-fix settlements fall through to the legacy formula — same unsafe matching as before the fix, kept so existing users can still reverse them.

### Risk that remains

A pre-fix settlement whose `settlement.reference` is a non-null, non-generated string. On reverse, we `deleteMany({ dealerId, reference: <user text> })` and could still take out any unrelated ledger entry on the same dealer that reuses that string.

The forward fix stops new occurrences; this note is about the historical set.

### Suggested one-shot backfill

A dedicated script, run once per environment after confirming no in-flight reversals:

1. For each `BroilerSaleSettlement` with `reference IS NOT NULL`:
   - `settlementId = row.id`, `legacyRef = row.reference.trim()`, `newRef = "BROILER-SETTLEMENT-" + row.id`.
   - Find candidate ledger rows: `prisma.dealerLedgerEntry.findMany({ where: { dealerId: row.dealerId, reference: legacyRef } })`.
   - Expected row count = 1 (margin row) + (`creditRecovered > 0` ? 1 : 0) + (`farmerPayout > 0` ? 1 : 0). Compare and classify:
     - count == expected → rewrite `reference = newRef` on each row. Safe.
     - count > expected → ambiguous (user reused the string on an unrelated payment); do NOT touch, log to a report for admin review.
     - count < expected → inconsistent historical data; log for admin review.
2. Produce a CSV: `settlementId, dealerId, legacyRef, rowsFound, action`.

Rows the backfill rewrites are safe to reverse later. Rows flagged ambiguous need admin intervention.

### Do NOT

- Backfill without the expected-count check — the whole point of the fix is to stop blind matching on user text.
- Edit `settlement.reference`; it is a display field and users may be referring to it in external records.
- Run while the dealer sales UI is live for the affected dealer — the window between row read and row write should be as short as possible per-settlement.
