# Farmer → Dealer Purchase Request Flow

## Overview

Implement a catalog-based purchase request flow where **farmers browse a dealer's product catalog, add items to a cart, and create purchase requests**. Dealers can then **approve (with optional discount) or reject** these requests. This mirrors the Company↔Dealer catalog/cart pattern but uses a simple 2-step workflow (no consignment lifecycle).

**Reference implementation:** `apps/frontend/src/app/dealer/dashboard/company/[companyId]/catalog/page.tsx`

---

## Architecture Principles

1. **Simple 2-step workflow**: PENDING → APPROVED/REJECTED (no dispatch, GRN, partial acceptance)
2. **Reuse existing systems**: DealerFarmerAccount for balance, InventoryService for farmer inventory, DealerLedgerEntry for dealer ledger
3. **Mirror the Company↔Dealer cart pattern**: FarmerCart/FarmerCartItem ← modeled after DealerCart/DealerCartItem
4. **Discount at approval time**: Farmer requests at catalog price; dealer applies discount when approving
5. **Books stay in sync**: On approval, both dealer-side (DealerSale, stock, ledger, account) and farmer-side (InventoryItem, Expense, EntityTransaction) are updated atomically

---

## Phase 1: Schema Changes

### 1.1 New Models

Add to `apps/backend/prisma/schema.prisma`:

#### FarmerCart (mirrors DealerCart)
```prisma
model FarmerCart {
  id        String          @id @default(cuid())
  farmerId  String
  farmer    User            @relation("FarmerCarts", fields: [farmerId], references: [id], onDelete: Cascade)
  dealerId  String
  dealer    Dealer          @relation("DealerFarmerCarts", fields: [dealerId], references: [id], onDelete: Cascade)
  items     FarmerCartItem[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([farmerId, dealerId])
  @@index([farmerId])
  @@index([dealerId])
}
```

#### FarmerCartItem (mirrors DealerCartItem)
```prisma
model FarmerCartItem {
  id        String        @id @default(cuid())
  cartId    String
  cart      FarmerCart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   DealerProduct @relation("FarmerCartProducts", fields: [productId], references: [id], onDelete: Cascade)
  quantity  Decimal       @db.Decimal(10, 2)
  unitPrice Decimal       @db.Decimal(10, 2) // Frozen sellingPrice at time of add

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([cartId, productId])
  @@index([cartId])
  @@index([productId])
}
```

#### FarmerPurchaseRequest
```prisma
model FarmerPurchaseRequest {
  id              String                       @id @default(cuid())
  requestNumber   String                       @unique
  status          FarmerPurchaseRequestStatus   @default(PENDING)

  // Amounts — stored at catalog price initially; updated with discount on approval
  totalAmount     Decimal  @db.Decimal(10, 2)
  subtotalAmount  Decimal? @db.Decimal(10, 2) // Original total before discount (set on approval if discount applied)
  discountType    String?                      // "PERCENT" | "FLAT"
  discountValue   Decimal? @db.Decimal(10, 2)

  notes           String?
  date            DateTime @default(now())

  // Approval / Rejection
  reviewedAt      DateTime?
  rejectionReason String?

  // Relationships
  farmerId        String
  farmer          User   @relation("FarmerPurchaseRequests", fields: [farmerId], references: [id], onDelete: Cascade)
  dealerId        String
  dealer          Dealer @relation("DealerPurchaseRequests", fields: [dealerId], references: [id], onDelete: Cascade)
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  // Linked sale (created on approval)
  dealerSaleId    String?     @unique
  dealerSale      DealerSale? @relation(fields: [dealerSaleId], references: [id])

  items           FarmerPurchaseRequestItem[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([farmerId, status])
  @@index([dealerId, status])
  @@index([customerId])
}
```

#### FarmerPurchaseRequestItem
```prisma
model FarmerPurchaseRequestItem {
  id          String  @id @default(cuid())
  quantity    Decimal @db.Decimal(10, 2)
  unitPrice   Decimal @db.Decimal(10, 2) // Catalog price (pre-discount)
  totalAmount Decimal @db.Decimal(10, 2) // quantity * unitPrice

  requestId   String
  request     FarmerPurchaseRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  productId   String
  product     DealerProduct @relation("FarmerPurchaseRequestProducts", fields: [productId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([requestId])
  @@index([productId])
}
```

#### New Enum
```prisma
enum FarmerPurchaseRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 1.2 Relation Updates

Add reverse relations to existing models:

**User model** — add:
```prisma
farmerCarts             FarmerCart[]              @relation("FarmerCarts")
farmerPurchaseRequests  FarmerPurchaseRequest[]   @relation("FarmerPurchaseRequests")
```

**Dealer model** — add:
```prisma
farmerCarts             FarmerCart[]              @relation("DealerFarmerCarts")
farmerPurchaseRequests  FarmerPurchaseRequest[]   @relation("DealerPurchaseRequests")
```

**DealerProduct model** — add:
```prisma
farmerCartItems             FarmerCartItem[]              @relation("FarmerCartProducts")
farmerPurchaseRequestItems  FarmerPurchaseRequestItem[]   @relation("FarmerPurchaseRequestProducts")
```

**DealerSale model** — add:
```prisma
purchaseRequest  FarmerPurchaseRequest?
```

**Customer model** — add:
```prisma
farmerPurchaseRequests  FarmerPurchaseRequest[]
```

### 1.3 Migration

Run `npx prisma db push` (project uses push due to migration drift).

---

## Phase 2: Backend — Dealer Catalog API for Farmers

### 2.1 Route: `farmerDealerCatalogRoutes.ts`

Mount at: `/farmer/dealer-catalog` (requires OWNER auth)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/:dealerId/products` | `getDealerCatalogProducts` | Browse connected dealer's products |

### 2.2 Controller Logic: `getDealerCatalogProducts`

```
1. Verify farmer-dealer connection (DealerFarmer exists, not archived)
2. Query DealerProduct where dealerId = param, currentStock > 0
3. Support: pagination, search (name), type filter
4. Return: id, name, description, type, unit, sellingPrice, currentStock
   (Do NOT expose costPrice — farmer only sees sellingPrice)
```

---

## Phase 3: Backend — Farmer Cart System

### 3.1 Route: `farmerCartRoutes.ts`

Mount at: `/farmer/cart` (requires OWNER auth)

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/:dealerId` | `getFarmerCart` | Get/create cart for a dealer |
| POST | `/items` | `addItemToFarmerCart` | Add product to cart |
| PUT | `/items/:itemId` | `updateFarmerCartItem` | Update item quantity |
| DELETE | `/items/:itemId` | `removeFarmerCartItem` | Remove item from cart |
| DELETE | `/:dealerId` | `clearFarmerCart` | Clear entire cart |
| POST | `/:dealerId/checkout` | `checkoutFarmerCart` | Create purchase request |

### 3.2 Controller: `farmerCartController.ts`

Mirrors `dealerCartController.ts` with these key differences:

- **getFarmerCart**: Gets/creates `FarmerCart` by `[farmerId, dealerId]`. Verifies dealer connection. Returns cart items with product details and running total.

- **addItemToFarmerCart**: Body `{ dealerId, productId, quantity }`.
  - Validates dealer connection
  - Validates DealerProduct exists and belongs to dealer
  - Checks `currentStock >= quantity`
  - Freezes `unitPrice` from `DealerProduct.sellingPrice`
  - Upserts cart item (if exists: update quantity; if new: create)

- **updateFarmerCartItem**: Validates ownership, checks stock, updates quantity.

- **removeFarmerCartItem / clearFarmerCart**: Standard delete operations.

- **checkoutFarmerCart** (critical):
  ```
  1. Get cart with items + product details
  2. Validate cart not empty
  3. Validate stock for ALL items
  4. Look up Customer record: findFirst({ farmerId, dealerId })
     - If not found: error (farmer must be connected to dealer)
  5. Generate requestNumber: "PR-{timestamp}-{random5}"
  6. Calculate totalAmount = sum(quantity * unitPrice)
  7. Create FarmerPurchaseRequest with items (all at catalog price, no discount)
  8. Clear cart items
  9. Return created request
  ```

---

## Phase 4: Backend — Purchase Request Management

### 4.1 Routes

**Farmer side** — `farmerPurchaseRequestRoutes.ts` at `/farmer/purchase-requests` (OWNER auth):

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/statistics` | `getFarmerPurchaseRequestStats` | Counts by status |
| GET | `/` | `getFarmerPurchaseRequests` | List with pagination/filters |
| GET | `/:id` | `getFarmerPurchaseRequestById` | Detail view |

**Dealer side** — `dealerPurchaseRequestRoutes.ts` at `/dealer/purchase-requests` (DEALER auth):

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| GET | `/statistics` | `getDealerPurchaseRequestStats` | Counts by status |
| GET | `/` | `getDealerPurchaseRequests` | List incoming requests |
| GET | `/:id` | `getDealerPurchaseRequestById` | Detail view |
| POST | `/:id/approve` | `approvePurchaseRequest` | Approve with optional discount |
| POST | `/:id/reject` | `rejectPurchaseRequest` | Reject with reason |

### 4.2 Service: `farmerPurchaseRequestService.ts`

#### `createPurchaseRequest(data)`

Called by checkout controller. Creates FarmerPurchaseRequest + items in a transaction.

```typescript
{
  farmerId: string;
  dealerId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  notes?: string;
  date: Date;
}
```

- Validates stock for all items (race condition safety)
- Creates request at full catalog prices (no discount)
- Status: PENDING

#### `approvePurchaseRequest(data)` — CRITICAL

Called by dealer. This is the main business logic.

```typescript
{
  requestId: string;
  dealerId: string;       // For ownership check
  discount?: { type: "PERCENT" | "FLAT"; value: number };
}
```

**Transaction flow (mirrors DealerSaleRequestService.approveSaleRequest):**

```
1. Fetch request with items + product details
2. Verify dealer owns this request
3. Verify status == PENDING
4. Re-validate stock for all items

5. Calculate amounts:
   subtotal = sum(item.quantity * item.unitPrice)  // catalog prices
   if discount:
     discountAmount = computeDiscountAmount(subtotal, type, value)
     finalTotal = subtotal - discountAmount
     itemTotals = distributeDiscountToItems(subtotal, discountAmount, items)
   else:
     finalTotal = subtotal
     itemTotals = items.map(i => i.quantity * i.unitPrice)

6. Generate invoiceNumber: "INV-{timestamp}-{random5}"

7. Create DealerSale:
   - invoiceNumber, date, totalAmount = finalTotal
   - subtotalAmount = subtotal (if discount)
   - paidAmount = 0, dueAmount = finalTotal, isCredit = true
   - dealerId, farmerId, customerId
   - Create SaleDiscount if discount applied

8. Account-based: DealerFarmerAccountService.recordSale(dealerId, farmerId, finalTotal, sale.id, tx)
   → balance += finalTotal (farmer now owes dealer)

9. For each item:
   a. Create DealerSaleItem (with discounted unitPrice and totalAmount)
   b. Decrement DealerProduct.currentStock
   c. Create DealerProductTransaction (type: SALE)

10. Create DealerLedgerEntry (type: SALE, amount: finalTotal)

11. Update Customer.balance += finalTotal

12. Update FarmerPurchaseRequest:
    - status = APPROVED, reviewedAt = now()
    - totalAmount = finalTotal (updated if discount)
    - subtotalAmount, discountType, discountValue (if discount)
    - dealerSaleId = sale.id

--- OUTSIDE TRANSACTION ---

13. For each item: InventoryService.processSupplierPurchase({
      dealerId, itemName: product.name,
      quantity, unitPrice: discountedUnitPrice, totalAmount: discountedLineTotal,
      date, description: "Purchase - Invoice {invoiceNumber}",
      reference: invoiceNumber,
      purchaseCategory: product.type,  // Auto-map from DealerProduct.type
      userId: farmerId
    })
```

**Key difference from DealerSaleRequest.approveSaleRequest:**
- No `paidAmount` at request time (full amount is credit)
- Discount applied at approval (by dealer), not at creation
- `purchaseCategory` auto-mapped from `DealerProduct.type` (no farmer selection needed)

#### `rejectPurchaseRequest(data)`

```typescript
{
  requestId: string;
  dealerId: string;
  rejectionReason?: string;
}
```

- Verify ownership, verify PENDING status
- Update status to REJECTED, set reviewedAt and rejectionReason
- No financial/inventory changes

---

## Phase 5: Backend — Add Discount to Existing Dealer → Farmer Sale Request

The `DealerSaleRequestService.createSaleRequest()` already supports discount. Wire it up:

### 5.1 Update `dealerSaleRequestController.ts` → `createSaleRequest`

```diff
- const { customerId, items, paidAmount, paymentMethod, notes, date } = req.body;
+ const { customerId, items, paidAmount, paymentMethod, notes, date, discount } = req.body;

  const request = await DealerSaleRequestService.createSaleRequest({
    ...existing fields...,
+   discount: discount?.value > 0
+     ? { type: discount.type, value: Number(discount.value) }
+     : undefined,
  });
```

### 5.2 Ensure discount is displayed

The service already stores `subtotalAmount`, `discountType`, `discountValue` on the request and preserves them on the DealerSale + SaleDiscount. The frontend sale-requests page already shows discount breakdown (added in previous session). This just wires up the creation side.

---

## Phase 6: Frontend — Farmer Cart & Catalog

### 6.1 New Fetcher: `fetchers/farmer/farmerCartQueries.ts`

Mirrors `fetchers/dealer/dealerCartQueries.ts`:

```typescript
// Query keys
farmerCartKeys = { all: ["farmer-cart"], list: (dealerId) => [..., dealerId] }

// Hooks
useGetFarmerCart(dealerId: string)              // GET /farmer/cart/{dealerId}
useAddToFarmerCart()                             // POST /farmer/cart/items
useUpdateFarmerCartItem()                        // PUT /farmer/cart/items/{itemId}
useRemoveFarmerCartItem()                        // DELETE /farmer/cart/items/{itemId}
useClearFarmerCart()                              // DELETE /farmer/cart/{dealerId}
useCheckoutFarmerCart()                           // POST /farmer/cart/{dealerId}/checkout
```

### 6.2 New Fetcher: `fetchers/farmer/farmerDealerCatalogQueries.ts`

```typescript
useGetDealerCatalogProducts(dealerId, params?)   // GET /farmer/dealer-catalog/{dealerId}/products
```

### 6.3 New Page: `/farmer/dashboard/supplier-ledger/[id]/catalog/page.tsx`

**Mirror of:** `dealer/dashboard/company/[companyId]/catalog/page.tsx`

Layout:
- Header: "{Dealer Name} - Product Catalog" with back button to supplier detail
- Filters: Search input + product type dropdown (FEED, CHICKS, MEDICINE, EQUIPMENT, OTHER)
- Main area (3/4 width): Product grid cards showing:
  - Product name, description, type badge
  - Price per unit (sellingPrice)
  - Available stock
  - Quantity selector + "Add to Cart" button
  - "In cart: X" indicator if already in cart
- Sidebar (1/4 width): Cart panel showing:
  - Cart items with quantity +/- controls and remove button
  - Running total
  - "Checkout" button → opens checkout dialog
  - "Clear Cart" button
- Checkout dialog:
  - Order summary (items, quantities, prices, total)
  - Optional notes textarea
  - "Place Order" button → calls checkoutFarmerCart mutation
  - On success: redirect to `/farmer/dashboard/purchase-requests` (or back to supplier detail)

### 6.4 Update: `/farmer/dashboard/supplier-ledger/[id]/page.tsx`

Add a "Browse Products" / "Order Products" button in the header area (only for connected dealers):

```tsx
{supplier.connectionType === "CONNECTED" && (
  <Button onClick={() => router.push(`/farmer/dashboard/supplier-ledger/${supplierId}/catalog`)}>
    <ShoppingCart className="h-4 w-4 mr-2" />
    Order Products
  </Button>
)}
```

---

## Phase 7: Frontend — Farmer Purchase Request List

### 7.1 New Fetcher: `fetchers/farmer/farmerPurchaseRequestQueries.ts`

```typescript
// Query keys
farmerPurchaseRequestKeys = { all: ["farmer-purchase-requests"], ... }

// Hooks
useGetFarmerPurchaseRequests(params?)           // GET /farmer/purchase-requests
useGetFarmerPurchaseRequestById(id)             // GET /farmer/purchase-requests/{id}
useGetFarmerPurchaseRequestStats()              // GET /farmer/purchase-requests/statistics
```

### 7.2 New Page: `/farmer/dashboard/purchase-requests/page.tsx`

Simple list page showing farmer's outgoing purchase requests:

- Statistics cards: Pending, Approved, Rejected, Pending Amount
- Status filter tabs or dropdown
- Request cards/rows showing:
  - Request number, date
  - Dealer name
  - Items summary
  - Total amount (shows discount if approved with discount)
  - Status badge (Pending=yellow, Approved=green, Rejected=red)
  - Expandable items detail

### 7.3 Sidebar Navigation Update

Add "Purchase Requests" to `farmerNavigation` in `components/dashboard/Sidebar.tsx`:

```typescript
{ name: "Purchase Requests", href: "/farmer/dashboard/purchase-requests", icon: ShoppingCart }
```

Place it after "Supplier Ledger" in the nav order.

---

## Phase 8: Frontend — Dealer Purchase Request Management

### 8.1 New Fetcher: `fetchers/dealer/dealerPurchaseRequestQueries.ts`

```typescript
// Query keys
dealerPurchaseRequestKeys = { all: ["dealer-purchase-requests"], ... }

// Hooks
useGetDealerPurchaseRequests(params?)           // GET /dealer/purchase-requests
useGetDealerPurchaseRequestById(id)             // GET /dealer/purchase-requests/{id}
useGetDealerPurchaseRequestStats()              // GET /dealer/purchase-requests/statistics
useApprovePurchaseRequest()                      // POST /dealer/purchase-requests/{id}/approve
useRejectPurchaseRequest()                       // POST /dealer/purchase-requests/{id}/reject
```

### 8.2 New Page: `/dealer/dashboard/purchase-requests/page.tsx`

Dealer's view of incoming farmer purchase requests:

- Statistics cards: Pending, Approved, Rejected, Pending Amount
- Status filter + search
- Request cards/rows showing:
  - Request number, date
  - Farmer name, phone
  - Items summary with quantities and catalog prices
  - Total amount
  - Status badge
- **Actions (PENDING only):**
  - **Approve button** → opens approve dialog:
    - Shows items summary at catalog prices
    - **Discount input**: Type selector (Percentage / Flat) + value input
    - Live preview of final amount after discount
    - "Approve" confirmation button
    - Calls `approvePurchaseRequest({ requestId, discount? })`
  - **Reject button** → opens reject dialog:
    - Rejection reason textarea
    - "Reject" confirmation button

### 8.3 Dealer Sidebar Navigation Update

Add "Purchase Requests" to dealer navigation with a badge for pending count.

---

## Phase 9: Frontend — Add Discount UI to Dealer Sale Request Creation

Update the dealer's sale creation form (when selling to a connected farmer) to include discount fields:

- Add discount toggle/checkbox
- Discount type selector: Percentage / Flat Amount
- Discount value input
- Live preview showing: Subtotal, Discount, Final Total
- Pass `discount: { type, value }` in the API call

*(This wires up the already-supported backend discount on DealerSaleRequest creation.)*

---

## Data Flow Summary

### Farmer → Dealer Purchase Request Flow

```
FARMER                                    DEALER
  │                                         │
  ├─ Browse Catalog ──────────────────────► DealerProduct list
  │  (GET /farmer/dealer-catalog/:id/products)
  │                                         │
  ├─ Add to Cart                            │
  │  (POST /farmer/cart/items)              │
  │  FarmerCart + FarmerCartItem created     │
  │                                         │
  ├─ Checkout ──────────────────────────────► FarmerPurchaseRequest (PENDING)
  │  (POST /farmer/cart/:dealerId/checkout)  │  at catalog prices, no discount
  │                                         │
  │                                         ├─ Review request
  │                                         │  (GET /dealer/purchase-requests)
  │                                         │
  │                                         ├─ Approve (with 10% discount)
  │                                         │  (POST /dealer/purchase-requests/:id/approve)
  │                                         │
  │  ◄─────────────────────────────────────┤
  │                                         │
  │  ON APPROVAL:                           │  ON APPROVAL:
  │  InventoryItem created/updated          │  DealerSale created
  │  Expense record created                 │  DealerProduct.currentStock decremented
  │  EntityTransaction (PURCHASE)           │  DealerProductTransaction (SALE)
  │                                         │  DealerFarmerAccount.balance += finalTotal
  │                                         │  DealerLedgerEntry (SALE)
  │                                         │  Customer.balance += finalTotal
  │                                         │  SaleDiscount (if discount applied)
```

### Discount Flow (Approval)

```
Farmer requests: 100 units × रू 50 = रू 5,000 (catalog price)

Dealer approves with 10% discount:
  subtotal     = रू 5,000
  discount     = 10% of 5,000 = रू 500
  finalTotal   = रू 4,500

Stored on FarmerPurchaseRequest:
  totalAmount    = 4,500 (updated)
  subtotalAmount = 5,000
  discountType   = "PERCENT"
  discountValue  = 10

DealerSale created with:
  totalAmount    = 4,500
  subtotalAmount = 5,000
  SaleDiscount: { type: PERCENT, value: 10 }

DealerFarmerAccount.balance += 4,500 (discounted amount)
Farmer inventory at discounted unit price: 4,500 / 100 = रू 45/unit
```

---

## File Inventory

### New Files (Backend)

| File | Purpose |
|------|---------|
| `src/router/farmerDealerCatalogRoutes.ts` | Catalog browsing routes |
| `src/router/farmerCartRoutes.ts` | Farmer cart CRUD + checkout routes |
| `src/router/farmerPurchaseRequestRoutes.ts` | Farmer-side request list routes |
| `src/router/dealerPurchaseRequestRoutes.ts` | Dealer-side approve/reject routes |
| `src/controller/farmerCartController.ts` | Cart operations + checkout |
| `src/controller/farmerPurchaseRequestController.ts` | Request CRUD + approve/reject |
| `src/services/farmerPurchaseRequestService.ts` | Business logic for create/approve/reject |

### New Files (Frontend)

| File | Purpose |
|------|---------|
| `src/fetchers/farmer/farmerCartQueries.ts` | Cart React Query hooks |
| `src/fetchers/farmer/farmerDealerCatalogQueries.ts` | Catalog browse hooks |
| `src/fetchers/farmer/farmerPurchaseRequestQueries.ts` | Farmer request list hooks |
| `src/fetchers/dealer/dealerPurchaseRequestQueries.ts` | Dealer request management hooks |
| `src/app/farmer/dashboard/supplier-ledger/[id]/catalog/page.tsx` | Catalog + cart page |
| `src/app/farmer/dashboard/purchase-requests/page.tsx` | Farmer request list |
| `src/app/dealer/dashboard/purchase-requests/page.tsx` | Dealer request management |

### Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | New models + relation updates |
| `src/router/index.ts` | Mount new routes |
| `src/controller/dealerSaleRequestController.ts` | Extract `discount` from req.body in `createSaleRequest` |
| `src/app/farmer/dashboard/supplier-ledger/[id]/page.tsx` | Add "Order Products" button |
| `src/components/dashboard/Sidebar.tsx` | Add nav items for farmer + dealer |

---

## Implementation Order

1. **Schema** — Add models, push to DB
2. **Catalog API** — Dealer product browsing for farmers
3. **Cart backend** — CRUD + checkout → creates FarmerPurchaseRequest
4. **Approval backend** — Dealer approve (with discount) / reject
5. **Wire discount to existing DealerSaleRequest creation** (small controller change)
6. **Frontend catalog + cart page** (farmer browses, adds to cart, checks out)
7. **Frontend farmer purchase request list** (farmer tracks their requests)
8. **Frontend dealer purchase request page** (dealer reviews, approves with discount, rejects)
9. **Navigation updates** (sidebar links, "Order Products" button)

---

## Not Included (Out of Scope)

- No multi-step consignment lifecycle (dispatch, GRN, partial acceptance)
- No audit trail / ConsignmentAuditLog
- No balance limit enforcement on farmer purchases (can be added later)
- No notification system (can be layered on top)
- No payment at request time (entire amount is credit; payments are recorded separately via DealerFarmerAccountService)
