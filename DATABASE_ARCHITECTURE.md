# Poultry360 — Database Architecture

This document describes the comprehensive database schema defined in `apps/backend/prisma/schema.prisma`. The database is **PostgreSQL** with **Prisma ORM**.

---

## 1. Overview

The schema supports a three-tier poultry supply chain:

- **Company** — Products, dealers, consignments, company sales, ledger, payment requests
- **Dealer** — Dealer products, sales to farmers/customers, consignments, dealer ledger, carts
- **Farmer (User)** — Farms, batches, expenses, sales, inventory, tracking (mortality, vaccination, feed, weight), reminders, chat

Key design choices:

- **Computed over stored**: Batch current chicks, entity balances, inventory stock, and analytics are computed from transactions rather than stored.
- **Unified categories**: `Category` supports `EXPENSE`, `SALES`, and `INVENTORY` with a unique `(userId, type, name)` per user.
- **Ledger entries**: Both `DealerLedgerEntry` and `CompanyLedgerEntry` store running balances; `EntityTransaction` tracks farmer-level supplier/customer transactions.

---

## 2. Key Enums

### Identity & Access

| Enum | Values |
|------|--------|
| **UserRole** | `OWNER`, `MANAGER`, `DOCTOR`, `DEALER`, `COMPANY`, `SUPER_ADMIN` |
| **UserStatus** | `ACTIVE`, `INACTIVE`, `PENDING_VERIFICATION` |

### Batch & Consignment

| Enum | Values |
|------|--------|
| **BatchStatus** | `ACTIVE`, `COMPLETED` |
| **ConsignmentStatus** | `CREATED`, `ACCEPTED_PENDING_DISPATCH`, `DISPATCHED`, `RECEIVED`, `SETTLED`, `REJECTED`, `CANCELLED` |
| **ConsignmentDirection** | `COMPANY_TO_DEALER`, `DEALER_TO_COMPANY`, `DEALER_TO_FARMER` |

### Ledger & Transactions

| Enum | Values |
|------|--------|
| **TransactionType** | `PURCHASE`, `SALE`, `PAYMENT`, `RECEIPT`, `ADJUSTMENT`, `OPENING_BALANCE`, `USAGE`, `RETURN` |
| **LedgerEntryType** | `SALE`, `PURCHASE`, `PAYMENT_RECEIVED`, `PAYMENT_MADE`, `RETURN`, `ADJUSTMENT`, `OPENING_BALANCE`, `ADVANCE_RECEIVED`, `CONSIGNMENT_INVOICE`, `CONSIGNMENT_SETTLED` |

### Payment Requests

| Enum | Values |
|------|--------|
| **PaymentRequestStatus** | `PENDING`, `ACCEPTED`, `PAYMENT_SUBMITTED`, `VERIFIED`, `REJECTED`, `CANCELLED` |
| **PaymentRequestDirection** | `COMPANY_TO_DEALER`, `DEALER_TO_COMPANY` |
| **DealerSaleRequestStatus** | `PENDING`, `APPROVED`, `REJECTED` |
| **DealerSalePaymentRequestStatus** | `PENDING`, `APPROVED`, `REJECTED` |

### Communication & Notifications

| Enum | Values |
|------|--------|
| **NotificationType** | `CHAT_MESSAGE`, `BATCH_UPDATE`, `MORTALITY_ALERT`, `FEED_WARNING`, `SALES_NOTIFICATION`, `FARM_ALERT`, `EXPENSE_WARNING`, `LOW_INVENTORY`, `SYSTEM`, `VACCINATION_ALERT`, `REMINDER_ALERT`, `REQUEST_ALERT`, plus reminder-specific and legacy types |
| **NotificationStatus** | (used conceptually) — notifications use `read: Boolean` |
| **ConversationStatus** | `ACTIVE`, `CLOSED`, `ARCHIVED` |
| **MessageType** | `TEXT`, `IMAGE`, `FILE`, `VIDEO`, `AUDIO`, `PDF`, `DOC`, `OTHER`, `BATCH_SHARE`, `FARM_SHARE` |

### Tracking & Reminders

| Enum | Values |
|------|--------|
| **VaccinationStatus** | `PENDING`, `COMPLETED`, `MISSED`, `OVERDUE` |
| **ReminderType** | `VACCINATION`, `FEEDING`, `MEDICATION`, `CLEANING`, `WEIGHING`, `SUPPLIER_PAYMENT`, `CUSTOMER_PAYMENT`, `GENERAL` |
| **ReminderStatus** | `PENDING`, `COMPLETED`, `CANCELLED`, `OVERDUE` |
| **RecurrencePattern** | `NONE`, `DAILY`, `WEEKLY`, `MONTHLY`, `CUSTOM` |
| **WeightSource** | `MANUAL`, `SALE`, `SYSTEM` |

### Categories & Inventory

| Enum | Values |
|------|--------|
| **CategoryType** | `EXPENSE`, `SALES`, `INVENTORY` |
| **InventoryItemType** | `FEED`, `CHICKS`, `MEDICINE`, `EQUIPMENT`, `OTHER` |
| **SalesItemType** | `EGGS`, `Chicken_Meat`, `CHICKS`, `FEED`, `MEDICINE`, `EQUIPMENT`, `OTHER` |

### Verification & Audit

| Enum | Values |
|------|--------|
| **DealerVerificationStatus** | `PENDING`, `APPROVED`, `REJECTED` |
| **AuditAction** | `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT` |

### Preferences

| Enum | Values |
|------|--------|
| **Language** | `ENGLISH`, `NEPALI` |
| **CalendarType** | `AD`, `BS` |

---

## 3. Core Entities

### User

Central identity for farmers, company owners, dealers, doctors, and admins.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| phone | String | Unique |
| name | String | |
| companyName, CompanyFarmLocation | String? | Company/farm context |
| password | String | |
| role | UserRole | Default `OWNER` |
| status | UserStatus | Default `PENDING_VERIFICATION` |
| isOnline, lastSeen | Boolean, DateTime? | Presence |
| language, calendarType | Language, CalendarType | Preferences |
| pushSubscription, notificationEnabled, notificationSettings | Json, Boolean, Json? | Push & notification prefs |
| createdAt, updatedAt | DateTime | |

**Relations (summary):** Owned/managed farms, customers, notifications, reminders, vaccinations, auditLogs, categories, dealers/hatcheries/medicineSuppliers, inventoryItems, conversations (farmer/doctor), messages, batchShares, dealerSalesReceived, companySalesMade, consignments (farmer/dispatched/received), payment requests (created/accepted/submitted/reviewed), dealer connections, verification requests, sale requests, etc.

---

### Company

Top-tier entity; one per owning user.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name, address | String, String? | |
| ownerId | String | FK → User (unique); `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** owner (User), managedBy (User[]), dealerCompanies, consignments, companySales, ledgerEntries, paymentRequests, verificationRequests, dealerCarts, dealerAccounts (CompanyDealerAccount).

---

### Dealer

Middle-tier entity; can be created by a farmer (userId) and/or owned by a user (ownerId) for login.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name, contact, address | String, String? | |
| userId | String? | FK → User (creator); `onDelete: Cascade` |
| ownerId | String? | FK → User (owner, unique); no cascade |
| createdAt, updatedAt | DateTime | |

**Relations:** user, owner, managers (User[]), companies (DealerCompany[]), farmerConnections (DealerFarmer[]), farmerRequests, transactions (EntityTransaction[]), products (DealerProduct[]), sales (DealerSale[]), saleRequests, salePaymentRequests, consignmentsFrom/To, ledgerEntries, companySales, paymentRequests, verificationRequests, carts, companyAccounts.

**Constraints:** `@@unique([userId, name])`.

---

### Farm

Belongs to one owner; can have many managers (many-to-many with User).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name | String | |
| capacity | Int | |
| description | String? | |
| ownerId | String | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** owner (User), managers (User[]), batches, expenses, sales, inventoryUsages, notifications, reminders, vaccinations.

---

### Batch

One per farm; lifecycle via `BatchStatus`.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| batchNumber | String | Unique per farm |
| startDate, endDate | DateTime, DateTime? | |
| status | BatchStatus | Default `ACTIVE` |
| initialChicks | Int | |
| notes | String? | |
| currentWeight | Decimal? | Denormalized from latest BirdWeight (kg per bird) |
| farmId | String | FK → Farm; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** farm, expenses, sales, mortalities, vaccinations, feedConsumptions, birdWeights, inventoryUsages, notifications, reminders, batchShares.

**Constraints:** `@@unique([farmId, batchNumber])`. **Computed:** Current chicks = `initialChicks - sum(mortalities.count)`.

---

### Customer

Farmer’s customer; can be manual or linked to a connected farmer.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name, phone, category, address | String, String? | |
| balance | Decimal | Default 0 (positive = they owe us) |
| source | String | Default `"MANUAL"` (\| `"CONNECTED"`) |
| farmerId | String? | FK → User (connected farmer); `onDelete: SetNull` |
| userId | String | FK → User (owner); `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** user (CustomerOwner), connectedFarmer (User?), sales, transactions (CustomerTransaction), entityTransactions, dealerSales, saleRequests, salePaymentRequests.

**Constraints:** `@@unique([userId, name])`, `@@unique([userId, farmerId])`.

---

## 4. Business Workflows

### ConsignmentRequest

Consignment lifecycle: created → accepted → dispatched → received → settled (or rejected/cancelled).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| requestNumber | String | Unique |
| direction | ConsignmentDirection | COMPANY_TO_DEALER, DEALER_TO_COMPANY, DEALER_TO_FARMER |
| status | ConsignmentStatus | Default `CREATED` |
| totalAmount | Decimal | |
| requestedQuantity, approvedQuantity, dispatchedQuantity, receivedQuantity | Decimal? | |
| dispatchRef, trackingInfo, grnRef | String? | |
| dispatchedAt, receivedAt | DateTime? | |
| dispatchedById, receivedById | String? | FK → User |
| companySaleId | String? | FK → CompanySale (unique); set when received (S3) |
| fromCompanyId, fromDealerId, toDealerId, toFarmerId | String? | FKs → Company, Dealer, User |
| createdAt, updatedAt | DateTime | |

**Relations:** fromCompany, fromDealer, toDealer, toFarmer, items (ConsignmentItem[]), ledgerEntries (DealerLedgerEntry[]), auditLogs (ConsignmentAuditLog[]), companySale.

**Indexes:** company, dealer, farmer, requestNumber, dispatched/received by, companySaleId.

---

### ConsignmentItem

Line items for a consignment; can reference company Product and/or dealer DealerProduct.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| consignmentId | String | FK → ConsignmentRequest; `onDelete: Cascade` |
| quantity, acceptedQuantity, receivedQuantity | Decimal, Decimal? | |
| unitPrice, totalAmount | Decimal | |
| isAccepted | Boolean | Default false |
| rejectionReason | String? | |
| companyProductId, dealerProductId | String? | FK → Product, DealerProduct; `onDelete: SetNull` |

---

### DealerSale

Dealer’s sale to customer/farmer; can originate from a DealerSaleRequest (farmer approval).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| invoiceNumber | String? | Unique |
| date | DateTime | |
| totalAmount, paidAmount, dueAmount | Decimal | |
| isCredit | Boolean | Default false |
| notes | String? | |
| customerId, farmerId | String? | FK → Customer, User; `onDelete: SetNull` |
| dealerId | String | FK → Dealer; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** customer, farmer, dealer, items (DealerSaleItem[]), transactions (DealerProductTransaction[]), payments (DealerSalePayment[]), paymentRequests (DealerSalePaymentRequest[]), ledgerEntries, saleRequest (DealerSaleRequest?).

---

### CompanySale

Company sale to dealer; can be created from consignment receipt (consignmentId) and linked to CompanyDealerAccount.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| invoiceNumber | String? | Unique |
| date | DateTime | Default now() |
| totalAmount | Decimal | |
| isCredit | Boolean | Default false |
| paymentMethod | String | Default "CASH" |
| notes | String? | |
| companyId, dealerId, soldById | String | FK → Company, Dealer, User; `onDelete: Cascade` |
| consignmentId | String? | Unique FK → ConsignmentRequest |
| accountId | String? | FK → CompanyDealerAccount |
| invoiceImageUrl | String? | |
| createdAt, updatedAt | DateTime | |

**Relations:** company, dealer, soldBy (User), consignment, account, items (CompanySaleItem[]), ledgerEntries (CompanyLedgerEntry[]), paymentRequests (PaymentRequest[]).

---

### PaymentRequest

Company–dealer payment workflow: request → accept → submit proof → verify/reject.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| requestNumber | String | Unique |
| direction | PaymentRequestDirection | COMPANY_TO_DEALER \| DEALER_TO_COMPANY |
| status | PaymentRequestStatus | Default `PENDING` |
| amount | Decimal | |
| paymentMethod, paymentReference, paymentReceiptUrl, paymentDate | String?, DateTime? | Proof fields |
| companyId, dealerId | String | FK → Company, Dealer; `onDelete: Cascade` |
| companySaleId | String? | FK → CompanySale; `onDelete: SetNull` |
| requestedById | String | FK → User |
| acceptedById, acceptedAt | String?, DateTime? | FK → User |
| submittedById, submittedAt | String?, DateTime? | FK → User |
| reviewedById, reviewedAt, reviewNotes | String?, DateTime? | FK → User |
| createdAt, updatedAt | DateTime | |

**Relations:** company, dealer, companySale, requestedBy, acceptedBy, submittedBy, reviewedBy (all User).

---

### DealerSaleRequest / DealerSalePaymentRequest

- **DealerSaleRequest:** Farmer approval for a dealer sale to a customer (linked farmer/customer). On approval, a DealerSale is created (`dealerSaleId`).
- **DealerSalePaymentRequest:** Farmer approval for a payment request against a dealer sale (or ledger-level payment). Links dealer, farmer, customer, optional dealerSale.

---

## 5. Inventory System

### Product (Company catalog)

Company-side product catalog; optional supplier (User).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name, description | String, String? | |
| type | InventoryItemType | FEED, CHICKS, MEDICINE, EQUIPMENT, OTHER |
| unit | String | |
| price, quantity, currentStock, totalPrice | Decimal | |
| imageUrl | String? | |
| supplierId | String? | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** supplier (User?), dealerProducts (DealerProduct[]), consignmentItems, companySaleItems, cartItems (DealerCartItem[]).

---

### Category (Unified)

User-scoped categories for expenses, sales, and inventory.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name | String | |
| type | CategoryType | EXPENSE, SALES, INVENTORY |
| description | String? | |
| userId | String | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** user, expenses, sales, inventoryItems.

**Constraints:** `@@unique([userId, type, name])`.

---

### InventoryItem (Farmer inventory)

Farmer’s inventory item; belongs to User and Category.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| name, description | String, String? | |
| currentStock, unit, minStock | Decimal | |
| itemType | InventoryItemType | Default OTHER |
| userId, categoryId | String | FK → User, Category; User `onDelete: Cascade`, Category `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Relations:** user, category, transactions (InventoryTransaction[]), usages (InventoryUsage[]), entityTransactions.

**Constraints:** `@@unique([userId, categoryId, name])`. **Computed:** currentStock from transactions and usages.

---

### InventoryTransaction

Movement for an InventoryItem (purchase, sale, adjustment, usage, etc.).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| type | TransactionType | |
| quantity, unitPrice, totalAmount | Decimal | |
| date | DateTime | |
| description | String? | |
| itemId | String | FK → InventoryItem; `onDelete: Restrict` |
| createdAt, updatedAt | DateTime | |

**Index:** `[itemId, date]`.

---

### InventoryUsage

Links inventory consumption to farm/batch/expense; updates stock.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| date | DateTime | |
| quantity, unitPrice, totalAmount | Decimal, Decimal? | |
| notes | String? | |
| itemId | String | FK → InventoryItem; `onDelete: Restrict` |
| expenseId, batchId | String? | FK → Expense, Batch; `onDelete: SetNull` |
| farmId | String | FK → Farm; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Indexes:** farmId+date, batchId, itemId.

---

## 6. Communication

### Conversation

One-to-one farmer–doctor conversation.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| farmerId, doctorId | String | FK → User |
| status | ConversationStatus | Default ACTIVE |
| subject | String? | |
| createdAt, updatedAt | DateTime | |

**Relations:** farmer, doctor (User), messages (Message[]), batchShares (BatchShare[]).

**Constraints:** `@@unique([farmerId, doctorId])`.

---

### Message

Message in a conversation; can reference a BatchShare.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| conversationId, senderId | String | FK → Conversation, User |
| text | String? | |
| messageType | MessageType | Default TEXT |
| read, edited, isDeleted | Boolean | Default false |
| attachmentUrl, attachmentKey, fileName, contentType, fileSize, durationMs, width, height, thumbnailUrl | String?, Int? | Attachment metadata |
| batchShareId | String? | FK → BatchShare |
| createdAt | DateTime | |

**Index:** `[conversationId, createdAt]`. Conversation `onDelete: Cascade`.

---

### Notification

User-scoped notification; optional farm/batch context.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| type | NotificationType | |
| title, body | String | |
| data | Json? | |
| read | Boolean | Default false |
| farmId, batchId | String? | FK → Farm, Batch; `onDelete: Cascade` |
| userId | String | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

---

### BatchShare

Shareable snapshot of batch data (e.g. for chat); optional conversation and sharedWith user.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| shareToken | String | Unique, default cuid |
| batchId, farmerId, sharedWithId, conversationId | String, String? | FK → Batch, User, User?, Conversation? |
| snapshotData | Json | Immutable payload |
| title, description | String? | |
| isPublic | Boolean | Default false |
| expiresAt | DateTime? | |
| viewCount | Int | Default 0 |
| createdAt, updatedAt | DateTime | |

**Relations:** batch, farmer, sharedWith, conversation, views (BatchShareView[]), messages.

---

## 7. Tracking

### Mortality

Death count per batch; optional sale (e.g. sold as meat).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| date | DateTime | |
| count | Int | |
| reason | String? | |
| saleId | String? | FK → Sale (optional) |
| batchId | String | FK → Batch; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

Sale has optional one-to-one mortality (mortalityId). **Computed:** current chicks = batch.initialChicks - sum(mortalities.count).

---

### Vaccination

Scheduled/completed vaccination; can be batch-, farm-, or user-level; can link to Reminder and StandardVaccinationSchedule.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| vaccineName | String | |
| scheduledDate, completedDate | DateTime, DateTime? | |
| status | VaccinationStatus | Default PENDING |
| notes | String? | |
| reminderCreated, reminderId | Boolean, String? | reminderId unique FK → Reminder |
| doseNumber, totalDoses, daysBetweenDoses | Int, Int? | |
| standardScheduleId, batchAge, retryCount | String?, Int? | FK → StandardVaccinationSchedule |
| batchId, farmId | String? | FK → Batch, Farm; `onDelete: Cascade` |
| userId | String | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Indexes:** batchId+scheduledDate, farmId+scheduledDate, userId+scheduledDate, status+scheduledDate, standardScheduleId, batchId+batchAge.

---

### FeedConsumption

Feed consumption per batch.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| date | DateTime | |
| quantity | Decimal | |
| feedType | String | |
| batchId | String | FK → Batch; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Index:** `[batchId, date]`.

---

### BirdWeight

Average weight per bird for a batch on a date; source (MANUAL, SALE, SYSTEM).

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| date | DateTime | |
| avgWeight | Decimal | kg per bird |
| sampleCount | Int | |
| source | WeightSource | Default MANUAL |
| notes | String? | |
| batchId | String | FK → Batch; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Index:** `[batchId, date]`. Batch.currentWeight is denormalized from latest BirdWeight.

---

### Reminder

User reminder; optional farm/batch; optional vaccination link.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| title, description | String, String? | |
| type | ReminderType | |
| status | ReminderStatus | Default PENDING |
| dueDate | DateTime | |
| isRecurring, recurrencePattern, recurrenceInterval, lastTriggered | Boolean, RecurrencePattern, Int?, DateTime? | |
| farmId, batchId | String? | FK → Farm, Batch; `onDelete: Cascade` |
| vaccinationId | String? | Unique FK → Vaccination |
| data | Json? | e.g. supplier/customer IDs |
| userId | String | FK → User; `onDelete: Cascade` |
| createdAt, updatedAt | DateTime | |

**Indexes:** userId+dueDate, userId+status, farmId+batchId+dueDate, type+dueDate, vaccinationId.

---

## 8. Ledger System

### EntityTransaction (Farmer ↔ suppliers/customers)

Farmer-level transactions with dealers, hatcheries, medicine suppliers, and customers; can link to InventoryItem and Expense.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| type | TransactionType | |
| amount | Decimal | |
| quantity, freeQuantity | Int? | |
| itemName | String? | |
| date | DateTime | |
| description, reference | String? | |
| dealerId, hatcheryId, medicineSupplierId, customerId | String? | FK; `onDelete: Cascade` (customer/dealer/hatchery/medicineSupplier) |
| inventoryItemId, expenseId | String? | FK → InventoryItem, Expense; `onDelete: SetNull` |
| paymentToPurchaseId | String? | Self-FK for payment-to-purchase link; `onDelete: SetNull` |
| entityType, entityId | String? | Generic fallback |
| createdAt, updatedAt | DateTime | |

**Indexes:** dealerId+date, hatcheryId+date, medicineSupplierId+date, customerId+date, entityType+entityId+date, inventoryItemId+date, paymentToPurchaseId+date.

**Balance:** Computed per entity from transaction types (e.g. PURCHASE/RECEIPT vs PAYMENT).

---

### DealerLedgerEntry

Running balance per dealer; can reference DealerSale and ConsignmentRequest.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| type | LedgerEntryType | |
| amount, balance | Decimal | |
| date | DateTime | |
| description, reference | String? | |
| dealerId | String | FK → Dealer; `onDelete: Cascade` |
| saleId, consignmentId | String? | FK → DealerSale, ConsignmentRequest; `onDelete: SetNull` |
| partyId, partyType | String? | |
| createdAt | DateTime | |

**Indexes:** dealerId+date, partyId+partyType, saleId, consignmentId.

---

### CompanyLedgerEntry

Running balance per company; can reference CompanySale.

| Field | Type | Notes |
|-------|------|--------|
| id | String (cuid) | PK |
| type | LedgerEntryType | |
| amount, runningBalance | Decimal | |
| date | DateTime | |
| description | String? | |
| companyId | String | FK → Company; `onDelete: Cascade` |
| companySaleId | String? | FK → CompanySale; `onDelete: SetNull` |
| partyId, partyType, transactionId, transactionType, entryType | String?, LedgerEntryType? | |
| createdAt | DateTime | |

**Indexes:** companyId+date, partyId+partyType, companySaleId, transactionId.

---

## 9. Relationship Patterns & Foreign Key Constraints

### Cascade vs SetNull vs Restrict

- **Cascade:** Deleting parent deletes children (e.g. User → Farm, Company → ConsignmentRequest, Dealer → DealerSale, Batch → Mortality).
- **SetNull:** Deleting parent nullifies FK (e.g. Batch → Expense.batchId, Sale.batchId; Customer → Sale.customerId; CompanySale → PaymentRequest.companySaleId).
- **Restrict:** Prevents parent delete if children exist (e.g. InventoryItem → InventoryTransaction, DealerProduct → DealerSaleItem).

### Key relationship patterns

| Pattern | Example |
|--------|--------|
| **One-to-many (required)** | User → Farm (ownerId), Farm → Batch (farmId), Dealer → DealerSale (dealerId) |
| **One-to-many (optional)** | Batch → Expense (batchId?), Sale → SalePayment (saleId) |
| **Many-to-many (join table)** | DealerCompany (dealer ↔ company), DealerFarmer (dealer ↔ farmer), User ↔ Farm (managers), User ↔ Dealer (managers) |
| **One-to-one / unique FK** | Company.ownerId → User, Dealer.ownerId → User, ConsignmentRequest.companySaleId → CompanySale, DealerSaleRequest.dealerSaleId → DealerSale |
| **Self-reference** | EntityTransaction.paymentToPurchaseId → EntityTransaction |

### Unique constraints (selected)

| Model | Constraint |
|-------|------------|
| User | phone |
| Company | ownerId |
| Dealer | ownerId; (userId, name) |
| Farm | (ownerId implicit one-to-many) |
| Batch | (farmId, batchNumber) |
| Category | (userId, type, name) |
| InventoryItem | (userId, categoryId, name) |
| Conversation | (farmerId, doctorId) |
| DealerCompany | (dealerId, companyId) |
| DealerFarmer | (dealerId, farmerId) |
| DealerCart | (dealerId, companyId) |
| CompanyDealerAccount | (companyId, dealerId) |
| ConsignmentRequest | requestNumber; companySaleId |
| PaymentRequest | requestNumber |
| DealerSale | invoiceNumber |
| CompanySale | invoiceNumber; consignmentId |
| DealerSaleRequest | dealerSaleId (1:1 with DealerSale) |
| BatchShare | shareToken |
| Vaccination ↔ Reminder | vaccinationId / reminderId (1:1) |

### Indexes (summary)

Indexes are defined for:

- **Lookup by parent + time:** e.g. `[farmId, date]`, `[dealerId, date]`, `[companyId, date]`, `[batchId, date]`, `[itemId, date]`.
- **Status filtering:** e.g. `[fromCompanyId, status]`, `[dealerId, status]`, `[farmerId, status]`.
- **Unique keys and FKs:** requestNumber, invoiceNumber, shareToken, companySaleId, consignmentId, accountId, etc.

---

## 10. Computed Values (Application Layer)

The schema expects these to be computed in the application, not stored:

1. **Batch current chicks:** `batch.initialChicks - sum(mortalities.count)` for the batch.
2. **Entity balance (dealer/hatchery/medicine supplier/customer):** Sum of EntityTransaction amounts by type (e.g. PURCHASE, RECEIPT, ADJUSTMENT vs PAYMENT, SALE).
3. **InventoryItem currentStock:** From InventoryTransaction and InventoryUsage (purchases vs usages).
4. **CompanyDealerAccount balance:** Maintained via CompanyDealerPayment and CompanySale (stored on account).
5. **FCR (Feed Conversion Ratio):** Total feed consumed / current live weight (from BirdWeight and batch chick count).
6. **Outstanding credit (Sale):** `amount - paidAmount` or sum of SalePayments.
7. **Farm/Batch analytics:** Derived from related expenses, sales, mortalities, vaccinations, feed, and weights.

---

*Schema source: `apps/backend/prisma/schema.prisma`.*
