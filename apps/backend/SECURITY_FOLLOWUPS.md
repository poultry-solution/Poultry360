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
