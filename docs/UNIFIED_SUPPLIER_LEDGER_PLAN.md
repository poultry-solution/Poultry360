# Unified Supplier Ledger Plan (v2 — Simplified)

> **Goal**: Unify the 3 supplier pages (dealer/hatchery/medicine) into one, reusing the existing `Dealer` model + `EntityTransaction` system. Minimal schema changes, no new models.

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Where does category live? | **On EntityTransaction** (new `purchaseCategory` field) | A dealer can sell anything — we tag what was bought, not the dealer |
| Payment model | **Khata-style (running account)** | `paymentToPurchaseId` becomes optional. Farmer can pay a general amount without linking to a specific purchase |
| Entry format | **Single-item entries** (current system) | Keep it simple: "Product X, Rs Y, Z quantity". Same UX as today |
| What changes? | **Extend existing, don't replace** | Add fields to Dealer + EntityTransaction. Reuse `InventoryService.processSupplierPurchase()`. Keep company-dealer-farmer flow untouched |
| Data migration | **Hatchery/MedicineSupplier → Dealer** (later phase) | Old tables stay until migration. New entries go through unified system |

---

## Current State

```
3 Models:           Dealer, Hatchery, MedicineSupplier (structurally identical)
3 Controllers:      dealerController, hatcherController, medicalSupplierController
3 Route files:      dealerRoutes, hatcheryRoutes, medicalSupplierRoutes
3 Fetcher files:    dealerQueries, hatcheryQueries, medicalSupplierQueries
3 Frontend pages:   dealer-ledger, hatchery-ledger, medical-supplier-ledger
3 Sidebar entries:  separate nav for each

All share: EntityTransaction + InventoryService.processSupplierPurchase()
Balance:   Computed on demand: SUM(PURCHASE) - SUM(PAYMENT)
Payments:  Bill-linked via paymentToPurchaseId (currently required)
```

## Target State

```
1 Model:            Dealer (with classification + purchaseCategory on transactions)
1 Controller:       dealerController (extended to handle all categories)
1 Route file:       dealerRoutes (extended)
1 Fetcher file:     dealerQueries (extended)
1 Frontend page:    supplier-ledger (unified, 2 tabs: Purchases + Payments)
1 Sidebar entry:    "Supplier Ledger"

Still uses: EntityTransaction + InventoryService.processSupplierPurchase()
Balance:    Same computation, no change
Payments:   paymentToPurchaseId now OPTIONAL (khata-style general payments allowed)
```

---

## What Does NOT Change

- `Company ↔ Dealer ↔ Farmer` connected flow (DealerCompany, DealerFarmer, DealerFarmerAccount, DealerSale, DealerSaleRequest, ConsignmentRequest) — **completely untouched**
- `DealerLedgerEntry` system (dealer-role accounting) — **untouched**
- `DealerProduct`, `DealerSale`, `DealerSaleItem` — **untouched**
- `InventoryService.processSupplierPurchase()` — **reused as-is**, just called with correct category
- `EntityTransaction` structure — **only adds 1 optional field**

---

## Phase 1: Schema Changes

### 1.1 Add `PurchaseCategory` enum

```prisma
enum PurchaseCategory {
  FEED
  MEDICINE
  CHICKS
  EQUIPMENT
  OTHER
}
```

### 1.2 Add `purchaseCategory` field to EntityTransaction

```prisma
model EntityTransaction {
  // ... all existing fields stay ...

  // NEW: What type of item was purchased (for unified supplier tracking)
  purchaseCategory PurchaseCategory?  // null for legacy/payment transactions
}
```

- Only set on PURCHASE transactions (null for PAYMENT, ADJUSTMENT, etc.)
- Existing rows get `null` (backward compatible, no data migration needed)
- The `InventoryService.processSupplierPurchase()` already determines itemType from the supplier FK — we just also write the category

### 1.3 Add `classification` field to Dealer

```prisma
model Dealer {
  // ... all existing fields stay ...

  // NEW: How this dealer was created
  classification String @default("SELF_CREATED") // "SELF_CREATED" | "CONNECTED"
}
```

- Existing dealer rows default to `"SELF_CREATED"`
- Connected dealers (with `ownerId` set) can be backfilled to `"CONNECTED"` later

### 1.4 Run migration

```bash
cd apps/backend
npx prisma migrate dev --name add-purchase-category-and-classification
```

This is a **purely additive** migration — no data changes, no column removals, no breaking changes.

---

## Phase 2: Shared Types Update

### File: `packages/shared-types/src/index.ts`

### 2.1 Add PurchaseCategory enum

```typescript
export const PurchaseCategorySchema = z.enum(["FEED", "MEDICINE", "CHICKS", "EQUIPMENT", "OTHER"]);
export type PurchaseCategory = z.infer<typeof PurchaseCategorySchema>;
```

### 2.2 Update DealerSchema and CreateDealerSchema

```typescript
// DealerSchema — add classification to response
export const DealerSchema = BaseSchema.extend({
  name: z.string(),
  contact: z.string(),
  address: z.string().nullable(),
  userId: z.string(),
  classification: z.string().optional(), // "SELF_CREATED" | "CONNECTED"
});

// CreateDealerSchema — no change needed
// (classification is auto-set server-side)
```

### 2.3 Update DealerTransactionSchema

```typescript
export const DealerTransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  amount: z.number(),
  quantity: z.number().int().nullable(),
  freeQuantity: z.number().int().nullable(), // NEW
  itemName: z.string().nullable(),
  purchaseCategory: PurchaseCategorySchema.nullable().optional(), // NEW
  date: z.date(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  imageUrl: z.string().nullable(), // NEW
  entityType: z.string(),
  entityId: z.string(),
  paymentToPurchaseId: z.string().nullable().optional(), // NEW (expose for grouping)
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### 2.4 Update DealerDetailResponseSchema

Replace the current `transactionTable` (item-grouped) with two separate arrays:

```typescript
export const DealerDetailResponseSchema = BaseSchema.extend({
  name: z.string(),
  contact: z.string(),
  address: z.string().nullable(),
  userId: z.string(),
  classification: z.string().optional(),
  balance: z.number(),
  thisMonthAmount: z.number().nonnegative(),
  totalTransactions: z.number().int().nonnegative(),

  // Tab 1: Purchase entries
  purchases: z.array(z.object({
    id: z.string(),
    itemName: z.string(),
    purchaseCategory: PurchaseCategorySchema.nullable(),
    quantity: z.number(),
    freeQuantity: z.number(),
    unitPrice: z.number(),
    totalAmount: z.number(),
    date: z.date(),
    description: z.string().nullable(),
    reference: z.string().nullable(),
    imageUrl: z.string().nullable(),
  })),

  // Tab 2: Payment entries (khata-style)
  payments: z.array(z.object({
    id: z.string(),
    amount: z.number(),
    date: z.date(),
    description: z.string().nullable(),
    reference: z.string().nullable(),
    imageUrl: z.string().nullable(),
  })),

  summary: z.object({
    totalPurchases: z.number().nonnegative(),
    totalPayments: z.number().nonnegative(),
    outstandingAmount: z.number().nonnegative(),
    thisMonthPurchases: z.number().nonnegative(),
  }),
});
```

---

## Phase 3: Backend Changes

### 3.1 Extend `dealerController.ts`

#### `addDealerTransaction` — Add purchaseCategory support

Current flow already handles PURCHASE via `InventoryService.processSupplierPurchase()`. Changes:

```
When type === PURCHASE:
  - Accept new field: purchaseCategory (FEED | MEDICINE | CHICKS | EQUIPMENT | OTHER)
  - Default to FEED if not provided (backward compatible)
  - Map purchaseCategory to InventoryItemType for processSupplierPurchase:
      FEED → InventoryItemType.FEED  (dealerId)
      MEDICINE → InventoryItemType.MEDICINE  (dealerId — NOT medicineSupplierId)
      CHICKS → InventoryItemType.CHICKS  (dealerId — NOT hatcheryId)
      EQUIPMENT → InventoryItemType.EQUIPMENT
      OTHER → InventoryItemType.OTHER
  - Pass purchaseCategory to the created EntityTransaction
  - Accept freeQuantity field (currently only hatchery does this)

When type === PAYMENT:
  - Make paymentToPurchaseId OPTIONAL (currently required)
  - If provided: link to specific purchase (current behavior, with overpayment check)
  - If NOT provided: general khata payment (just reduces overall balance)
```

#### `getDealerById` — Return purchases and payments in separate arrays

Current flow groups transactions by item. New flow:

```
Instead of transactionTable (item-grouped), return:
  purchases: EntityTransaction[] where type = PURCHASE, ordered by date desc
  payments:  EntityTransaction[] where type = PAYMENT, ordered by date desc
  summary:   { totalPurchases, totalPayments, outstandingAmount, thisMonthPurchases }
```

#### `getAllDealers` — Include classification in response

Just add `classification` to the select.

### 3.2 Update `InventoryService.processSupplierPurchase()`

Current logic determines itemType from supplier FK:
```
if (dealerId) → FEED
if (hatcheryId) → CHICKS
if (medicineSupplierId) → MEDICINE
```

Add support for explicit category override when dealerId is used:
```
if (dealerId && purchaseCategory) → map purchaseCategory to InventoryItemType
if (dealerId && !purchaseCategory) → FEED (backward compatible)
if (hatcheryId) → CHICKS (unchanged)
if (medicineSupplierId) → MEDICINE (unchanged)
```

Also add `purchaseCategory` field to the EntityTransaction created inside this method.

### 3.3 No new routes needed

All endpoints already exist on `/api/v1/dealers`:
- `GET /dealers` — list (already works)
- `GET /dealers/:id` — detail (extend response format)
- `POST /dealers` — create (already works)
- `PUT /dealers/:id` — update (already works)
- `DELETE /dealers/:id` — delete (already works)
- `POST /dealers/:id/transactions` — add entry (extend to accept category + optional payment linking)
- `DELETE /dealers/:id/transactions/:txnId` — delete entry (already works)
- `GET /dealers/statistics` — stats (already works)

### 3.4 Keep old routes alive

- `/api/v1/hatcheries/*` — Keep working (no changes)
- `/api/v1/medical-suppliers/*` — Keep working (no changes)

These continue to work for old data. New entries from the unified page go through `/api/v1/dealers/*`.

---

## Phase 4: Frontend Changes

### 4.1 Extend `fetchers/dealers/dealerQueries.ts`

Update `useAddDealerTransaction` to accept new fields:

```typescript
data: {
  type: TransactionType;
  amount: number;
  quantity?: number;
  freeQuantity?: number;          // NEW: for chicks/bonus items
  itemName?: string;
  purchaseCategory?: PurchaseCategory;  // NEW: FEED | MEDICINE | CHICKS | etc.
  date: string;
  description?: string;
  reference?: string;
  unitPrice?: number;
  imageUrl?: string;              // NEW: receipt image
  paymentAmount?: number;         // Existing: optional initial payment
  paymentToPurchaseId?: string;   // Existing: now OPTIONAL
};
```

### 4.2 New Page: `/farmer/dashboard/supplier-ledger/page.tsx`

Build as a new page (don't modify the old dealer-ledger). Uses existing dealer fetcher hooks.

**Page structure:**

```
┌──────────────────────────────────────────────────────┐
│ Supplier Ledger                     [+ Add Supplier] │
├──────────────────────────────────────────────────────┤
│ Stats: Total | Outstanding | This Month              │
├──────────────────────────────────────────────────────┤
│ [Search...]                                          │
├──────────────────────────────────────────────────────┤
│ Supplier Table:                                      │
│ Name | Contact | Balance | This Month | Actions      │
│ Ram Feed     | 98xxx | रू 5,000 (Due) | रू 3,000    │
│ Sita Poultry | 97xxx | रू 0.00       | रू 12,000   │
│ Hari Medical | 96xxx | रू 1,200 (Due) | रू 800     │
└──────────────────────────────────────────────────────┘

Clicking a supplier row expands inline (or navigates):

┌──────────────────────────────────────────────────────┐
│ ← Ram Feed Store                                     │
│ Balance: रू 5,000 | Purchased: रू 25,000 | Paid: रू 20,000
├──────────────────────────────────────────────────────┤
│ [Purchases]  [Payments]      [+ Add Entry] [+ Pay]  │
├──────────────────────────────────────────────────────┤
│ PURCHASES TAB:                                       │
│ Date       | Item        | Cat   | Qty | Rate | Amt  │
│ 2026-02-25 | Feed Supreme| FEED  | 50  | 1500 | 75K │
│ 2026-02-20 | Vitamin Mix | MEDI  | 2   | 500  | 1K  │
│ 2026-02-18 | Day-old     | CHICK | 500+50free| 85 | 42.5K │
├──────────────────────────────────────────────────────┤
│ PAYMENTS TAB:                                        │
│ Date       | Amount    | Note                        │
│ 2026-02-26 | रू 10,000 | Bank transfer               │
│ 2026-02-20 | रू 10,000 | Cash                        │
└──────────────────────────────────────────────────────┘
```

### 4.3 Add Purchase Entry Modal

Same as current dealer-ledger "Add Entry" but with a **category dropdown**:

```
┌──────────────────────────────────────────────────────┐
│ Add Purchase Entry                              [X]  │
├──────────────────────────────────────────────────────┤
│ Category:  [FEED ▼]  (FEED / MEDICINE / CHICKS / OTHER)
│ Item Name: [Broiler Feed _______________]            │
│ Quantity:  [50____]   Free Qty: [5_____] (optional)  │
│ Unit:      [kg____]   Rate:     [1500__]             │
│ Total:     रू 75,000 (auto-calculated)               │
│ Date:      [2026-02-28]                              │
│ Pay Now:   [________] (optional initial payment)     │
│ Reference: [________] (optional bill/invoice no)     │
│ Notes:     [________________________]                │
│                                                      │
│                   [Cancel]  [Save Entry]             │
└──────────────────────────────────────────────────────┘
```

### 4.4 Add Payment Modal (Khata-style)

```
┌──────────────────────────────────────────────────────┐
│ Record Payment                                  [X]  │
├──────────────────────────────────────────────────────┤
│ Balance Due: रू 5,000                                │
│                                                      │
│ Amount:    [________]                                │
│ Date:      [2026-02-28]                              │
│ Reference: [________] (optional)                     │
│ Notes:     [________________________]                │
│                                                      │
│                 [Cancel]  [Record Payment]            │
└──────────────────────────────────────────────────────┘
```

No need to select which purchase to pay against. Just reduces overall balance.

### 4.5 Sidebar Update

**File:** `apps/frontend/src/components/dashboard/Sidebar.tsx`

```diff
- { title: "Dealer Ledger", path: "/farmer/dashboard/dealer-ledger", icon: Users }
- { title: "Medical Supplier", path: "/farmer/dashboard/medical-supplier-ledger", icon: Pill }
- { title: "Hatchery Ledger", path: "/farmer/dashboard/hatchery-ledger", icon: Egg }
+ { title: "Supplier Ledger", path: "/farmer/dashboard/supplier-ledger", icon: Store }
```

Old pages remain accessible via direct URL (for backward compatibility) but are hidden from nav.

---

## Phase 5: Data Migration (Later — Separate PR)

### 5.1 Script: Migrate Hatchery → Dealer

```
For each Hatchery:
  1. Create Dealer { name, contact, address, userId, classification: "SELF_CREATED" }
  2. Update EntityTransaction SET dealerId = newDealerId, purchaseCategory = "CHICKS"
     WHERE hatcheryId = oldHatcheryId
  3. SET hatcheryId = null on those transactions
```

### 5.2 Script: Migrate MedicineSupplier → Dealer

```
For each MedicineSupplier:
  1. Create Dealer { name, contact, address, userId, classification: "SELF_CREATED" }
  2. Update EntityTransaction SET dealerId = newDealerId, purchaseCategory = "MEDICINE"
     WHERE medicineSupplierId = oldSupplierId
  3. SET medicineSupplierId = null on those transactions
```

### 5.3 Cleanup (after migration verified)

- Remove hatchery/medicine sidebar entries (already hidden)
- Remove old pages: `/hatchery-ledger`, `/medical-supplier-ledger`
- Remove old fetchers: `hatcheryQueries.ts`, `medicalSupplierQueries.ts`
- Mark old routes as deprecated (keep for a release cycle)
- Eventually remove: `hatcherController.ts`, `medicalSupplierController.ts`, old route files
- Eventually drop tables: `Hatchery`, `MedicineSupplier` (schema migration)

---

## Implementation Order

```
Phase 1: Schema (1 migration, 2 fields added)
  ├── 1.1 Add PurchaseCategory enum
  ├── 1.2 Add purchaseCategory to EntityTransaction
  ├── 1.3 Add classification to Dealer
  └── 1.4 Run prisma migrate

Phase 2: Shared Types (extend existing schemas)
  ├── 2.1 Add PurchaseCategorySchema
  ├── 2.2 Update DealerSchema (add classification)
  ├── 2.3 Update DealerTransactionSchema (add purchaseCategory, freeQuantity)
  └── 2.4 Update DealerDetailResponseSchema (purchases + payments tabs)

Phase 3: Backend (extend existing controller)
  ├── 3.1 Update addDealerTransaction (accept purchaseCategory, optional paymentToPurchaseId)
  ├── 3.2 Update getDealerById (return purchases + payments separately)
  ├── 3.3 Update InventoryService (accept category override)
  └── 3.4 Update getAllDealers (include classification)

Phase 4: Frontend (new page + sidebar)
  ├── 4.1 Extend dealerQueries.ts (add new fields to mutation)
  ├── 4.2 Build supplier-ledger page (list + detail)
  ├── 4.3 Build Add Entry modal (with category dropdown)
  ├── 4.4 Build Add Payment modal (khata-style)
  └── 4.5 Update Sidebar (3 entries → 1)

Phase 5: Data Migration (separate PR)
  ├── 5.1 Migrate Hatchery → Dealer
  ├── 5.2 Migrate MedicineSupplier → Dealer
  └── 5.3 Cleanup deprecated code
```

---

## Files to Modify

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Add `PurchaseCategory` enum, `purchaseCategory` on EntityTransaction, `classification` on Dealer |
| `packages/shared-types/src/index.ts` | Add `PurchaseCategorySchema`, update Dealer + Transaction schemas |
| `apps/backend/src/controller/dealerController.ts` | Extend `addDealerTransaction` (category, optional payment linking), extend `getDealerById` (2-tab response) |
| `apps/backend/src/services/inventoryService.ts` | Accept explicit `purchaseCategory` override in `processSupplierPurchase` |
| `apps/frontend/src/fetchers/dealers/dealerQueries.ts` | Add new fields to transaction mutation |
| `apps/frontend/src/components/dashboard/Sidebar.tsx` | 3 nav entries → 1 |

## Files to Create

| File | Description |
|------|-------------|
| `apps/frontend/src/app/farmer/dashboard/supplier-ledger/page.tsx` | Unified supplier ledger page |

## Files NOT Touched

| File | Why |
|------|-----|
| `dealerService.ts` | Dealer-role business logic (sales/consignments) — unrelated |
| `dealerLedgerController.ts` | Dealer-role accounting — unrelated |
| `DealerCompany`, `DealerFarmer`, `DealerFarmerAccount` | Connected dealer flow — untouched |
| `ConsignmentRequest`, `DealerSale`, `DealerSaleRequest` | Company-dealer-farmer flow — untouched |
| `hatcherController.ts`, `medicalSupplierController.ts` | Stay alive until Phase 5 migration |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Breaking existing dealer-ledger page | Old page untouched — hidden from nav but still works at old URL |
| Breaking company-dealer-farmer flow | Zero changes to DealerCompany, DealerFarmer, DealerSale, etc. |
| Breaking hatchery/medicine pages | Old pages + routes stay alive until Phase 5 |
| EntityTransaction migration issues | `purchaseCategory` is nullable — existing rows unaffected |
| Balance computation changes | Same formula: `SUM(PURCHASE) - SUM(PAYMENT)` — no change |
