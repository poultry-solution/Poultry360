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

---

## 6. Hatchery staff permissions: split VIEW vs MANAGE (cross-module)

**Status:** deferred (identified 2026-11-01). Needs a schema change + migration + cross-module update, so held for its own PR after the current bundle ships.

### What's wrong

Every account module (farmer, dealer, hatchery, company) uses `*_VIEW_STAFF_MANAGEMENT` as the single gate for **all** staff endpoints. `staffRoutes.ts:40-45` applies that one permission to list, get, create, update, delete, attendance, salaries, and payments — so any staff user with view access can create other staff rows, update salaries, or pay themselves. From the hatchery bug list (bug §10 MEDIUM, Tested): a staff user with the view permission can hit `POST /hatchery/staff/:id/payments` and silently add themselves money.

There is no `*_MANAGE_STAFF_MANAGEMENT` enum value anywhere in `StaffPermission` — the model only knows VIEW.

### Shape of the fix

1. **Schema**: add four new enum values to `StaffPermission`:
   - `FARMER_MANAGE_STAFF_MANAGEMENT`
   - `DEALER_MANAGE_STAFF_MANAGEMENT`
   - `HATCHERY_MANAGE_STAFF_MANAGEMENT`
   - `COMPANY_MANAGE_STAFF_MANAGEMENT`
2. **Migration**: additive only, no backfill. Owners always implicitly have manage; new staff default to VIEW only, so no existing user loses access.
3. **Router**: in `staffRoutes.ts`, keep the blanket VIEW gate for read endpoints (`GET /`, `GET /summary`, `GET /:id`, `GET /:id/transactions`) and add a second gate on the write endpoints that requires MANAGE. Owners bypass as today.
4. **Frontend**: update staff-access UI so owners can grant MANAGE independently of VIEW.
5. **Verification**: curl matrix — owner, staff with VIEW only, staff with MANAGE only, staff with both — on each endpoint.

### Do NOT

- Try to retrofit by making VIEW owner-only (would break staff users who currently legitimately read the staff list).
- Ship without the frontend permission-setter update; without a way to grant MANAGE, no staff would be able to do payments at all.

---

## 7. Hatchery audit coverage gaps

**Status:** deferred (identified 2026-11-01). From hatchery bug list §11 MEDIUM "Some changes are not logged".

### What's wrong

The hatchery audit middleware (`hatcheryAuditMiddleware`) writes one activity row per successful mutation it is wired to. Three gaps:

1. **Account feature toggles** (`accountFeatureController.updateCurrentAccountFeature`) have no audit at all — turning HATCHERY_PURCHASE_BILL_UPLOAD on or off leaves no trace.
2. **Bill details** (`billSettingsController`) edits are not audited.
3. **Upload-only endpoints** (bill uploads, receipt uploads) emit nothing.

Additionally, where audit *is* wired on create endpoints, the record id of the just-created row is sometimes not set on `res.locals.auditTargetId`, so the audit row points to nothing. And the middleware silently skips the write if the hatchery business row is missing — fine for farmers/dealers but masks real audit gaps for owners who finished signup but have no business row yet.

### Shape of the fix

1. Pick a convention: audit every mutation that affects owner-visible data. Add the middleware to the routes that currently skip it.
2. For create endpoints that forget to set `auditTargetId`, backfill from the handler's return value (follow the pattern in `createHatcherySupplier` at `hatcherySupplierController.ts:163`).
3. Change the "no hatchery row" silent-skip to a logged WARN so missed audits surface instead of vanishing.
4. Add a small test that enumerates every hatchery mutation route and asserts it produces an audit row (or is deliberately exempt).

### Do NOT

- Audit reads. The volume would drown the signal.
- Try to retroactively audit historical changes — just close the gap going forward.

---

## 8. Hatchery analytics correctness (two numbers, one hidden tile)

**Status:** deferred (identified 2026-11-01). From hatchery bug list §12 MEDIUMs.

### Context

Three analytics bugs from §12 need resolution. The fourth (§12 "Late dead and unhatched always 0") was fixed on 2026-11-01 — reader switched from the never-written `HatcheryIncubationLoss` LATE_DEAD / UNHATCHED rows to the `lateDead` / `unhatched` columns on `HatcheryHatchResult`.

### 8a. "Hatch % is off" (§12 MEDIUM)

`hatcheryAnalyticsController.ts`, summary reduce block (around line 940-990). Two problems:

- **Date-range mismatch**: `totalEggsSet` is counted all-time; losses are filtered by the chosen date range. Divide a filtered numerator by an all-time denominator — the % is nonsense when a non-"all time" range is picked.
- **In-progress drag**: `hatchability` is computed as 0 for batches still in SETTER or CANDLING stage (nothing has hatched yet). The outer `acc.totalHatchability += hatchability` then averages those zeros into the final number. Only COMPLETED batches should contribute.

### 8b. "Batches tab mixes time ranges" (§12 MEDIUM)

Same file, per-batch rows. Mortality and hatch counts come out as lifetime for the batch; sales and expenses are date-filtered. The "net" column mixes windows and is misleading.

Pick a convention per the UI's expectation (probably: everything date-filtered when a range is active, everything lifetime when "all time" is picked) and apply it consistently to all four numbers per row.

### 8c. "Exposure" tile hidden pending redesign (§12 MEDIUM)

Removed from the UI 2026-11-01 (`apps/frontend/src/app/(protected)/hatchery/dashboard/analytics/_components/OverviewTab.tsx` — `exposure` variable + MetricCard, plus the matching word in the page sub-title). The tile used to show `supplierBalance + partyBalance`, which adds a liability to an asset — the number is neither "what you owe" nor "what you have".

Decide with the owner what financial-exposure UI (if any) actually helps and ship a replacement. Options worth considering: two separate tiles ("Owe suppliers" / "Customers owe you"), a signed net figure, or no exposure UI at all. Backend overview endpoint still returns both fields — frontend just stopped rendering the combined tile.

### Do NOT

- Fix 8a or 8b in isolation; the two bugs share a convention question. Decide the time-range rule first.
- Re-add the Exposure tile without a product call on what the number should actually mean.

---

## 9. Hatchery product decisions needed before coding

**Status:** deferred (identified 2026-11-01). Each needs a product decision; code shape is downstream of the call.

### 9a. "Chicks" expense takes chicks but adds no birds (§5 MEDIUM)

When staff records a CHICKS-category expense inside a parent-flock batch, the chicks are debited from inventory but **not added to the flock's `currentMaleParents` / `currentFemaleParents` counts**. Those birds are then invisible to mortality, sales, and parent-sale handlers.

The code fix is straightforward (increment parent counts), but the shape depends on how sex is captured. Three options:

- Prompt the user for `maleCount` + `femaleCount` at expense-entry time.
- Default to a 50/50 split and let the user adjust later via an edit.
- Add a dedicated "Add parents" entry that is separate from "expense".

### 9b. Running balance column wrong for backdated / deleted rows (§9 MEDIUM)

`balanceAfter` on `HatcheryPartyTxn` and `HatcherySupplierTxn` is written at insert time as "balance just after this txn committed." A backdated payment that lands between two older rows does not recompute the `balanceAfter` on those older rows, so the ledger reads out of order. The dealer ledger has the identical issue.

Two options:

- **Recompute on write**: every time a txn is inserted/deleted/backdated, walk forward and rewrite `balanceAfter` on every later row for that party. Correct but potentially expensive on a chatty party.
- **Compute on read**: store only the delta, derive running balance in the query. More scalable but requires every ledger reader (API + download CSV + bill note) to be updated.

### Do NOT

- Pick a half-fix. Both these need an all-in call; a partial fix would leave the ledger in an in-between state users have to debug.

---

## 10. Hatchery release blockers from the final PDF review

**Status:** must fix before the hatchery PDF work is called complete (reviewed 2026-11-01).

**Sources:** `Hatchery Bug List.pdf` and `poultry360-hatchery-dev-handoff.pdf`.

### 10a. Concurrent incubation starts can still oversell hatchable eggs

`HatcheryIncubationService.createIncubationBatch` reads the available egg stock before `generateCode` takes the per-owner advisory lock. Two transactions can therefore both read the same available stock. The second transaction waits for the code lock, but it does not read the stock again after the first transaction commits. Both transactions then run an unconditional decrement, which can make egg stock negative.

**Location:** `src/services/hatcheryIncubationService.ts`, around the stock read at lines 105-116 and decrement at lines 148-154.

**Required fix:** make the stock change authoritative and atomic. Use either:

- a guarded `updateMany` with `currentStock: { gte: eggsSetCount }`, then require `count === 1`; or
- lock the exact `HatcheryEggStock` row with `SELECT ... FOR UPDATE`, then read and decrement it while the row lock is held.

Keep the incubation create, egg move, stock change and code generation in the same transaction. Add a concurrent test where two starts together request more eggs than are available; exactly one may succeed and stock must never be negative.

### 10b. Free sales are accepted by the API but blocked by the UI

The backend correctly allows a rate or unit price of `0`, as required by the bug list. The frontend still treats the string `"0"` as missing because it uses truthy checks:

- `apps/frontend/src/app/(protected)/hatchery/dashboard/batches/[id]/page.tsx` — egg sale button checks `!eggUnitPrice`.
- Same file — parent sale button checks `!parentRatePerKg`.
- `apps/frontend/src/app/(protected)/hatchery/dashboard/incubations/[id]/page.tsx` — chick sale handler checks `!unitPrice`.

**Required fix:** distinguish an empty string from numeric zero. Reject only empty, non-finite or negative values. Test egg, parent and chick sales with price `0` through the page.

### 10c. A newly added supplier is not selected reliably

The create-response shape is now correct and the opening balance saves. Auto-select is still racy:

- The page calls `selectSupplier(newSupplierId)`.
- The auto-select effect immediately replaces any id that is not in the currently loaded supplier page with `suppliers[0].id`.
- The backend list is oldest-first and paged to 10 rows, so a new supplier is normally not in the current page for larger accounts.

**Locations:**

- `apps/frontend/src/app/(protected)/hatchery/dashboard/supplier-ledger/page.tsx`, auto-select effect around lines 364-374.
- `src/controller/hatcherySupplierController.ts`, list order around line 37.

**Required fix:** keep the new supplier as an explicit selected object/id until the list can contain it, or change the list/cache/page so the created supplier is present before selection validation runs. Test with 0, fewer than 10, and more than 10 existing suppliers, with and without an active search.

### 10d. Supplier opening-balance date does not follow the handoff

The handoff requires the default opening-balance date to be the day before the supplier's oldest entry. The page currently uses today. A modal-open effect also overwrites the date with `getNowLocalDateTime()`, which sends a local date-time string and brings back the UTC/server date-boundary risk described in the bug list.

**Location:** `apps/frontend/src/app/(protected)/hatchery/dashboard/supplier-ledger/page.tsx`, modal date effects around lines 399-414 and `openOpeningBalanceModal` around lines 583-595.

**Required fix:** derive the oldest transaction date, default to the previous Nepal AD day, and send a date-only value using the same convention as `DateInput`. Do not overwrite the value after opening the modal. Define and document the fallback for a supplier with no entries.

### 10e. Produced chicks from a closed parent batch are still hidden

`listProducedChickStock` filters `incubationBatch.parentBatch.status` to `ACTIVE`. Chicks from a closed parent batch disappear from this page and its totals even though they remain sellable from the incubation page.

**Location:** `src/controller/hatcheryIncubationController.ts`, `listProducedChickStock` around lines 429-440.

**Required fix:** include stock from both active and closed parent batches. Return the parent status so the frontend can show a status badge and include closed batches in the filter when they have chick stock. Add a test for a closed parent batch with remaining chicks.

### 10f. Egg-type validation and the one-hatchable rule are incomplete

Create/update still allow untrimmed or blank names in some paths. Duplicate update errors can expose raw database text. The "only one hatchable type" rule is a read-then-create check, so two quick creates can both pass. A text value such as `"false"` is also truthy in the current handler.

**Location:** `src/controller/hatcheryBatchController.ts`, egg-type handlers around lines 1078-1128.

**Required fix:**

- trim and require a non-empty name on create and update;
- validate `isHatchable` as a real boolean;
- return a short friendly duplicate-name message on create and update;
- enforce the one-hatchable rule in the database or under a per-owner lock/serializable transaction;
- add create, update, duplicate and concurrent-create tests.

---

## 11. Remaining hatchery bug-list work for the next session

**Status:** deferred unless an item is promoted during release review (recorded 2026-11-01).

These items were still open in the final review and were not covered by follow-ups 6-10.

### 11a. Supplier ledger small and date-safety gaps

- Warn before a payment moves a supplier from money owed into an advance. Decide whether the payment should be blocked or allowed after confirmation.
- Decide how the top totals should show supplier advances instead of silently excluding/cancelling them.
- Validate invalid and future transaction dates with a 400 response rather than a database 500.
- Replace the owner-password delete flow for staff. A staff user should not need the owner's password, and a bad confirmation must not trigger an auth refresh/logout flow.
- Decide whether supplier phone numbers must be unique per hatchery; if yes, add normalized storage and a database constraint.

### 11b. Inventory validation and concurrent cost updates

- On create/update, trim name and unit, reject a blank name/unit, and validate finite non-negative `unitPrice` and `minStock` values.
- Return a friendly 400 when a rename/unit change conflicts with an existing item instead of a raw database error.
- Validate reorder quantity and date before Prisma sees them; reject `NaN`, very large unsafe values, invalid dates and future dates according to the chosen date rule.
- Normalize item identity consistently so case or trailing spaces do not create accidental duplicate stock rows. Decide whether names are case-sensitive.
- Make weighted-cost updates safe when two purchases arrive together. The current read-compute-write can use stale stock/cost.
- Make purchase reversal safe against a purchase happening at the same time; do not write a stale fixed `currentStock` value over a newer increment.

**Locations:** `src/controller/hatcheryInventoryController.ts` and `src/services/hatcheryInventoryService.ts`.

### 11c. Self-feed production small gaps

- Decide whether renaming a product should also rename its linked stock items.
- Move archive validation and archive write into one transaction.
- Validate very large/unsafe production quantities and return a clear 400.
- Keep the existing protection that restores deleted raw-material rows when undoing a production run.

### 11d. Batch and sale rules

- Decide and enforce whether a closed parent batch may accept production, mortality, expenses or sales. Current handlers mostly check ownership but not closed status.
- Add date rules for records before batch start, records after close, and future records. Keep the rule consistent across production, mortality, expense and sale endpoints.
- Let delete dialogs show the real server reason when egg production, egg sale, parent sale, mortality or expense deletion is blocked. Several confirm handlers await the mutation without catching and displaying its error.
- Re-check lay-rate day grouping against the chosen Nepal/UTC day convention.
- Product decision 9a still covers the separate CHICKS-expense/flock-count problem.

### 11e. Incubation date-order rules

- Reject candling before incubation start.
- Reject transfer before start/candling and hatch results before transfer.
- Decide whether future dates are allowed; enforce the same rule on start, candling, transfer and hatch result.
- Use friendly 400 errors for invalid dates.

### 11f. Party account small gaps

- Add party edit and safe delete flows, including ownership checks and clear rules for parties with history.
- Let the user choose an opening-balance date, or store it as the Nepal date-only day rather than `new Date()` at the current moment.
- Add a stable tie-break to same-day ledger ordering.
- Validate payment amount/date as finite values before database writes.
- Product decision 9b still covers the larger running-balance design.

### 11g. Error and list-state consistency

- Finish using the shared `apiErrorText` helper on hatchery pages so both `{ error }` and `{ message }` response shapes are shown.
- Ensure every required list has separate loading, empty and error states. Do not use an empty-state message as the only error UI where retry is useful.
- Keep wide tables inside their cards at 375px and check the required card grids on a real phone-width browser.

---

## 12. Hatchery release verification and deploy record

**Status:** required before release; safe automated checks pass, manual and focused database checks remain (recorded 2026-11-01).

### Automated coverage

Added `test/api/hatcheryReleaseRegression.api.test.ts` on 2026-11-01. It checks:

- same-time egg, chick and incubation requests do not make stock negative;
- free egg, parent and chick sales work at the API level;
- cross-hatchery party, egg-type, incubation and sale ids are blocked;
- one shared invoice sequence is used for all three hatchery sale types;
- the get-one-sale endpoint works for all three types and hides another owner's sale;
- a hatch result can be deleted before a sale and is blocked after a sale;
- chick stock from a closed parent batch stays visible;
- egg-type names and booleans are checked, duplicate names have a clear error, and same-time requests cannot create two hatchable types.

Still add focused tests for:

- concurrent supplier and party balance writes;
- parent-batch code generation under same-time creates;
- invoice migration/backfill on representative old rows;
- supplier create + opening balance + page selection behaviour (the selection part needs a page test, not an API test).

### Manual checklist from the handoff

Run locally only, at desktop and 375px width, as both owner and staff:

1. Make egg, parent and chick sales with a party and as walk-in sales.
2. Repeat each sale with a zero price after 10b is fixed.
3. Open each bill from its sale row and from the party page.
4. Test Share image, Share PDF, Print and direct print URLs.
5. Test hatch-result delete with no chicks sold, then confirm it is blocked after a partial sale.
6. Test supplier add with opening balance on accounts with more than 10 suppliers.
7. Check every changed page at phone width for page-level horizontal scrolling.

### Migration deploy window

The new hatchery sale columns are nullable so old code can continue writing while the migration runs. An old backend write after the backfill can therefore leave a sale with null `hatcheryOwnerId` and `invoiceNumber`; the new get-one-sale endpoint will not find that row.

Use a maintenance window:

1. Stop hatchery sale writes / old backend instances.
2. Run the migration and backfill.
3. Check all three sale tables for null `hatcheryOwnerId` or `invoiceNumber`.
4. Deploy the new backend and frontend.
5. Re-enable traffic only after the null check passes.

Do not rely on local `HATCHERY_PLAN.md` as the only deploy record because that file is ignored by Git. Keep this checklist, or move it to another tracked runbook before release.

### Known repository-wide check

The frontend production build passes, but full frontend lint still has errors outside the hatchery files. Confirm whether CI treats lint as a release gate and clean those errors in their own small change if needed.
