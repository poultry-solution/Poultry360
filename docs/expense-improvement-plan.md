# Add Expense – Current Behavior & Improvement Plan

## 1. Current flow (batch page Add Expense)

### Where it lives
- **Page:** `apps/frontend/src/app/farmer/dashboard/batches/[id]/page.tsx`
- **Modal:** `apps/frontend/src/components/batches/modals/ExpenseModal.tsx`
- **API:** `POST /expenses` (backend `expenseController.createExpense`)

### Data flow today
1. User opens “Add Expense” on a batch.
2. **Category** is chosen: Feed | Medicine | Hatchery | Other (hardcoded in modal).
3. **Feed:** Dropdown “Select feed from inventory” + Quantity + Rate.  
   - Inventory list comes from `useGetInventoryTableData()` → `inventoryItems` (filtered by FEED).
   - On submit, if `selectedFeedId` is set, payload includes `inventoryItems: [{ itemId: selectedFeedId, quantity, notes }]`.
4. **Medicine:** Same idea – dropdown from inventory (MEDICINE) + quantity + rate, and `inventoryItems` when a medicine is selected.
5. **Hatchery:** Free text (name) + quantity + rate. No inventory.
6. **Other:** Name + quantity + rate. No inventory.
7. Backend creates expense and, when `inventoryItems` is present, creates `InventoryUsage`, decrements `InventoryItem.currentStock`, and creates `InventoryTransaction` (USAGE).

### Intended behavior (what you want)
- Show **real inventory items** (what the user has in stock).
- User **picks an item** and **enters quantity**.
- Expense is saved and that **quantity is subtracted from inventory**.  
- No change to this core idea; we only fix and extend the current implementation.

---

## 2. Current downsides / bugs

### 2.1 Wrong ID sent for inventory (critical)
- **Inventory list** is from **GET /inventory/table** (`getInventoryTableData`).
- That endpoint returns **grouped entity transactions** (by name + unit price + supplier). Each row has **`id: et.id`** = **EntityTransaction id**, not **InventoryItem id**.
- The expense form uses that `id` as `selectedFeedId` / `selectedMedicineId` and sends it as `inventoryItems[].itemId`.
- Backend does `prisma.inventoryItem.findMany({ where: { id: { in: itemIds } } })`, i.e. it expects **InventoryItem ids**.
- **Result:** Either “Inventory item not found” or wrong item updated. Expense may be created but stock is not correctly deducted (or not at all).

**Fix:** Use a source that returns **InventoryItem** records (with `id` = inventory item id and `currentStock`). Use that list for Feed/Medicine dropdowns and send `inventoryItems[].itemId` = `inventoryItem.id`.

### 2.2 Inventory source not aligned with “stock”
- Table API is built for a **purchase/grouping** view (transactions grouped by name/price/supplier), not for “items I have in stock”.
- It does not expose `InventoryItem.currentStock` in a reliable way for each selectable row, and the row `id` is not the item id.
- So we cannot reliably show “X unit available” or enforce “quantity ≤ currentStock” against the real item.

**Fix:** Use an API that returns **InventoryItem** (or a DTO with `inventoryItemId`, `currentStock`, `name`, `unit`, optional `rate`) so the UI shows real stock and validates against it.

### 2.3 Category matching is fragile
- Modal uses hardcoded categories: Feed, Medicine, Hatchery, Other.
- Backend category is resolved by: `expenseCategories.find(cat => cat.name.toLowerCase().includes(ec.toLowerCase()))`.
- If the user has no “Feed” or “Medicine” (or different spelling), the expense can fail or attach to the wrong category.
- No category exists yet for “free-form” expenses (e.g. staff salary) that are **name + amount only**.

**Fix:** Keep category list driven by API (`expenseCategories`), add a dedicated category for “extra” expenses (e.g. “Extra” or “Add extra expenses”), and use a stable way to map modal category to `categoryId` (e.g. by exact name or a dedicated type).

### 2.4 Feed: description uses `feedBrand` but value comes from selection
- For Feed we set `feedBrand` when user selects a feed (from `selectedFeed.name`). So it works if user always selects from dropdown.
- Validation requires `selectedFeedId` and shows error on `feedBrand`. So UX is consistent, but the label “Feed Brand” is a bit misleading when the control is “Select feed from inventory”.

**Fix:** Optional copy/label improvement: e.g. “Feed (from inventory)” and “Medicine (from inventory)” to make it clear the list is from stock.

### 2.5 No “simple” expense type (name + amount only)
- “Other” is name + quantity + rate (amount = quantity × rate).
- There is no option for “just a label and an amount” (e.g. “Staff salary”, “Misc”, “Electricity”) without quantity/rate.

**Fix:** Add category **“Add extra expenses”** (or “Extra”): when selected, form is only **name** + **amount**. No inventory, no quantity/rate. Backend already supports expense with only `amount` and `description` (quantity/unitPrice optional).

---

## 3. Improvement plan (summary)

| # | Task | Notes |
|---|------|------|
| 1 | **Use correct inventory list for expense** | For Feed and Medicine, load **InventoryItem** list (with `currentStock`, `name`, `unit`, and a rate if needed), not table data. Either use existing GET `/inventory` (with `itemType`) or add a small endpoint like GET `/inventory/for-expense?itemType=FEED\|MEDICINE` that returns items with `id`, `name`, `currentStock`, `unit`, `rate` (e.g. from latest purchase). |
| 2 | **Send InventoryItem id in expense payload** | Ensure `inventoryItems[].itemId` is always `InventoryItem.id`. No change to backend contract; only fix the source of the dropdown and the value stored in `selectedFeedId` / `selectedMedicineId`. |
| 3 | **Validate quantity ≤ currentStock** | In the modal, when an item is selected, validate that entered quantity ≤ that item’s `currentStock`. Show “Only X unit available” and block submit. Backend already enforces stock; this improves UX and avoids unnecessary errors. |
| 4 | **Add category “Add extra expenses”** | Create this category (e.g. in seed or via a one-time migration / default categories) so it exists for users. Expose it in the expense category API and in the batch page dropdown. |
| 5 | **Add “Extra” UI in ExpenseModal** | When category = “Add extra expenses” (or “Extra”): show only **Name** (text) and **Amount** (number). No quantity, no rate, no inventory. Submit `amount`, `description` (e.g. name or name + notes), and `categoryId`. Optionally send `quantity: 1`, `unitPrice: amount` for compatibility if backend expects them; otherwise keep quantity/unitPrice optional. |
| 6 | **Category resolution** | Prefer resolving category by exact name (or by a slug/code) so “Add extra expenses” / “Extra” and “Feed” / “Medicine” / “Hatchery” / “Other” map to the right `categoryId` even if display names differ slightly. |
| 7 | **Optional: Backend validation for “Extra”** | If you want to be strict, backend can allow expense with only `amount` and `description` when category is “Extra” (or a specific categoryId), and not require quantity/unitPrice for that case. |

---

## 4. Suggested implementation order

1. **Backend**
   - Add (if needed) GET `/inventory/for-expense` or ensure GET `/inventory` with `itemType` returns items with `currentStock` and a usable rate, and that the frontend will use `item.id` as `itemId`.
   - Ensure “Add extra expenses” (or “Extra”) category exists (seed or migration).
   - Optionally: for the “Extra” category, allow create expense with only amount + description (quantity/unitPrice optional).

2. **Frontend – data**
   - Replace use of `useGetInventoryTableData()` for the **expense** modal with a call that returns **InventoryItem** list (e.g. `useGetInventoryItems({ itemType })` or new hook that hits `/inventory/for-expense`). Use that list for Feed and Medicine dropdowns; each option value = `item.id` (inventory item id).
   - Keep using `expenseCategories` from API; ensure “Add extra expenses” is included (from seed or default).

3. **Frontend – modal**
   - Add category “Add extra expenses” to the category dropdown.
   - When that category is selected, show only Name + Amount; hide quantity/rate and inventory.
   - For Feed/Medicine: validate quantity ≤ selected item’s `currentStock` and show clear error.
   - Optional: rename labels to “Feed (from inventory)” / “Medicine (from inventory)”.

4. **Testing**
   - Add expense with Feed: select an inventory item, quantity within stock → expense created, stock decreased.
   - Add expense with Medicine: same.
   - Add expense with “Add extra expenses”: name + amount only → expense created, no inventory change.
   - Confirm category list and “Extra” resolution work for your environment.

---

## 5. Files to touch (checklist)

- **Backend**
  - `apps/backend/src/controller/inventoryController.ts` – add or reuse endpoint that returns inventory items with `id`, `currentStock`, `name`, `unit`, rate (for expense dropdown).
  - `apps/backend/src/controller/expenseController.ts` – optional: allow quantity/unitPrice to be omitted for “Extra” category.
  - `apps/backend/prisma/seed.ts` (or category migration) – ensure “Add extra expenses” (or “Extra”) expense category exists.

- **Frontend**
  - `apps/frontend/src/app/farmer/dashboard/batches/[id]/page.tsx` – switch expense inventory source to InventoryItem list; add “Extra” branch in submit; validate quantity ≤ currentStock; pass correct `itemId`.
  - `apps/frontend/src/components/batches/modals/ExpenseModal.tsx` – add “Add extra expenses” option; when selected, show only name + amount; optional label tweaks for Feed/Medicine.

- **Shared types**
  - Only if you add a new API or change request shape (e.g. optional quantity/unitPrice for Extra).

---

This plan fixes the inventory ID bug, aligns the expense flow with “pick from inventory → subtract”, and adds the “Add extra expenses” (name + amount only) flow you asked for.
