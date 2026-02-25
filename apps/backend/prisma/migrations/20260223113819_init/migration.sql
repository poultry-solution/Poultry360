-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('OWNER', 'MANAGER', 'DOCTOR', 'DEALER', 'COMPANY', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."BatchStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('PURCHASE', 'SALE', 'PAYMENT', 'RECEIPT', 'ADJUSTMENT', 'OPENING_BALANCE', 'USAGE', 'RETURN');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('CHAT_MESSAGE', 'BATCH_UPDATE', 'MORTALITY_ALERT', 'FEED_WARNING', 'SALES_NOTIFICATION', 'FARM_ALERT', 'EXPENSE_WARNING', 'LOW_INVENTORY', 'SYSTEM', 'VACCINATION_ALERT', 'REMINDER_ALERT', 'REQUEST_ALERT', 'VACCINATION_REMINDER', 'FEEDING_REMINDER', 'MEDICATION_REMINDER', 'CLEANING_REMINDER', 'WEIGHING_REMINDER', 'SUPPLIER_PAYMENT_REMINDER', 'CUSTOMER_PAYMENT_REMINDER', 'GENERAL_REMINDER', 'VACCINATION_DUE', 'BATCH_COMPLETION', 'PAYMENT_DUE', 'FEED_REMINDER');

-- CreateEnum
CREATE TYPE "public"."ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VIDEO', 'AUDIO', 'PDF', 'DOC', 'OTHER', 'BATCH_SHARE', 'FARM_SHARE');

-- CreateEnum
CREATE TYPE "public"."NotificationStatus" AS ENUM ('PENDING', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "public"."VaccinationStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('ENGLISH', 'NEPALI');

-- CreateEnum
CREATE TYPE "public"."CalendarType" AS ENUM ('AD', 'BS');

-- CreateEnum
CREATE TYPE "public"."ConsignmentStatus" AS ENUM ('CREATED', 'ACCEPTED_PENDING_DISPATCH', 'DISPATCHED', 'RECEIVED', 'SETTLED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ConsignmentDirection" AS ENUM ('COMPANY_TO_DEALER', 'DEALER_TO_COMPANY', 'DEALER_TO_FARMER');

-- CreateEnum
CREATE TYPE "public"."DealerSaleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."DealerSalePaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('PERCENT', 'FLAT');

-- CreateEnum
CREATE TYPE "public"."DiscountScope" AS ENUM ('SALE', 'ITEM');

-- CreateEnum
CREATE TYPE "public"."LedgerEntryType" AS ENUM ('SALE', 'PURCHASE', 'PAYMENT_RECEIVED', 'PAYMENT_MADE', 'RETURN', 'ADJUSTMENT', 'OPENING_BALANCE', 'ADVANCE_RECEIVED', 'CONSIGNMENT_INVOICE', 'CONSIGNMENT_SETTLED');

-- CreateEnum
CREATE TYPE "public"."PaymentRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'PAYMENT_SUBMITTED', 'VERIFIED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PaymentRequestDirection" AS ENUM ('COMPANY_TO_DEALER', 'DEALER_TO_COMPANY');

-- CreateEnum
CREATE TYPE "public"."DealerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."BatchType" AS ENUM ('BROILER', 'LAYERS');

-- CreateEnum
CREATE TYPE "public"."EggCategory" AS ENUM ('LARGE', 'MEDIUM', 'SMALL');

-- CreateEnum
CREATE TYPE "public"."CategoryType" AS ENUM ('EXPENSE', 'SALES', 'INVENTORY');

-- CreateEnum
CREATE TYPE "public"."InventoryItemType" AS ENUM ('FEED', 'CHICKS', 'MEDICINE', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SalesItemType" AS ENUM ('EGGS', 'Chicken_Meat', 'CHICKS', 'FEED', 'MEDICINE', 'EQUIPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."WeightSource" AS ENUM ('MANUAL', 'SALE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "public"."ReminderType" AS ENUM ('VACCINATION', 'FEEDING', 'MEDICATION', 'CLEANING', 'WEIGHING', 'SUPPLIER_PAYMENT', 'CUSTOMER_PAYMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."RecurrencePattern" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "CompanyFarmLocation" TEXT,
    "password" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'OWNER',
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "language" "public"."Language" NOT NULL DEFAULT 'ENGLISH',
    "calendarType" "public"."CalendarType" NOT NULL DEFAULT 'AD',
    "pushSubscription" JSONB,
    "notificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Batch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "public"."BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "batchType" "public"."BatchType" NOT NULL DEFAULT 'BROILER',
    "initialChicks" INTEGER NOT NULL,
    "notes" TEXT,
    "currentWeight" DECIMAL(6,2),
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EggProduction" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "largeCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "smallCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EggInventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eggCategory" "public"."EggCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EggInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."InventoryItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "unitSellingPrice" DECIMAL(10,2) NOT NULL,
    "unitCostPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "quantity" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "supplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."CategoryType" NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Expense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "quantity" DECIMAL(10,2),
    "weight" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2),
    "farmId" TEXT,
    "batchId" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sale" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "weight" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "itemType" "public"."SalesItemType" NOT NULL DEFAULT 'Chicken_Meat',
    "eggCategory" "public"."EggCategory",
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2) DEFAULT 0,
    "farmId" TEXT,
    "batchId" TEXT,
    "categoryId" TEXT NOT NULL,
    "customerId" TEXT,
    "mortalityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "receiptUrl" TEXT,
    "saleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "minStock" DECIMAL(10,2),
    "itemType" "public"."InventoryItemType" NOT NULL DEFAULT 'OTHER',
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "itemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryUsage" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2),
    "notes" TEXT,
    "itemId" TEXT NOT NULL,
    "expenseId" TEXT,
    "batchId" TEXT,
    "farmId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EntityTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER,
    "freeQuantity" INTEGER,
    "itemName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "imageUrl" TEXT,
    "dealerId" TEXT,
    "hatcheryId" TEXT,
    "medicineSupplierId" TEXT,
    "customerId" TEXT,
    "inventoryItemId" TEXT,
    "expenseId" TEXT,
    "paymentToPurchaseId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "ownerId" TEXT,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerCart" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Hatchery" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hatchery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MedicineSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "address" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicineSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "category" TEXT,
    "address" TEXT,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "farmerId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomerTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "imageUrl" TEXT,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Mortality" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "reason" TEXT,
    "saleId" TEXT,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mortality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Vaccination" (
    "id" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "status" "public"."VaccinationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reminderCreated" BOOLEAN NOT NULL DEFAULT false,
    "reminderId" TEXT,
    "doseNumber" INTEGER NOT NULL DEFAULT 1,
    "totalDoses" INTEGER NOT NULL DEFAULT 1,
    "daysBetweenDoses" INTEGER,
    "standardScheduleId" TEXT,
    "batchAge" INTEGER,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "batchId" TEXT,
    "farmId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StandardVaccinationSchedule" (
    "id" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "dayFrom" INTEGER NOT NULL,
    "dayTo" INTEGER NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardVaccinationSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FeedConsumption" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "feedType" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BirdWeight" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "avgWeight" DECIMAL(6,2) NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "source" "public"."WeightSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "batchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirdWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ReminderType" NOT NULL,
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" "public"."RecurrencePattern" NOT NULL DEFAULT 'NONE',
    "recurrenceInterval" INTEGER,
    "lastTriggered" TIMESTAMP(3),
    "farmId" TEXT,
    "batchId" TEXT,
    "vaccinationId" TEXT,
    "data" JSONB,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "farmId" TEXT,
    "batchId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerCompany" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedVia" TEXT,
    "archivedByDealer" BOOLEAN NOT NULL DEFAULT false,
    "archivedByCompany" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerFarmer" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedVia" TEXT,
    "archivedByDealer" BOOLEAN NOT NULL DEFAULT false,
    "archivedByFarmer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerFarmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerFarmerAccount" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSaleDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "balanceLimit" DECIMAL(10,2),
    "balanceLimitSetAt" TIMESTAMP(3),
    "balanceLimitSetBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerFarmerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerFarmerPayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "receiptImageUrl" TEXT,
    "proofImageUrl" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerFarmerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerVerificationRequest" (
    "id" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" "public"."DealerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRejectedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FarmerVerificationRequest" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "status" "public"."DealerVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectedCount" INTEGER NOT NULL DEFAULT 0,
    "lastRejectedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmerVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "action" "public"."AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "status" "public"."ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "subject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT,
    "messageType" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "attachmentUrl" TEXT,
    "attachmentKey" TEXT,
    "fileName" TEXT,
    "contentType" TEXT,
    "fileSize" INTEGER,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "thumbnailUrl" TEXT,
    "batchShareId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchShare" (
    "id" TEXT NOT NULL,
    "shareToken" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "sharedWithId" TEXT,
    "conversationId" TEXT,
    "snapshotData" JSONB NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BatchShareView" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchShareView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."InventoryItemType" NOT NULL,
    "unit" TEXT NOT NULL,
    "costPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(10,2),
    "sku" TEXT,
    "dealerId" TEXT NOT NULL,
    "companyProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerProductTransaction" (
    "id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "productId" TEXT NOT NULL,
    "dealerSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerProductTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "subtotalAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dueAmount" DECIMAL(10,2),
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "customerId" TEXT,
    "farmerId" TEXT,
    "dealerId" TEXT NOT NULL,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSaleItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerSaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSalePayment" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "paymentMethod" TEXT,
    "saleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerSalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSalePaymentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "public"."DealerSalePaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "proofOfPaymentUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "dealerSaleId" TEXT,
    "isLedgerLevel" BOOLEAN NOT NULL DEFAULT false,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSalePaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSaleRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "status" "public"."DealerSaleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "subtotalAmount" DECIMAL(10,2),
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "dealerId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dealerSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSaleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerSaleRequestItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealerSaleRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsignmentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "direction" "public"."ConsignmentDirection" NOT NULL,
    "status" "public"."ConsignmentStatus" NOT NULL DEFAULT 'CREATED',
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "subtotalAmount" DECIMAL(10,2),
    "discountType" TEXT,
    "discountValue" DECIMAL(10,2),
    "notes" TEXT,
    "requestedQuantity" DECIMAL(10,2),
    "approvedQuantity" DECIMAL(10,2),
    "dispatchedQuantity" DECIMAL(10,2),
    "receivedQuantity" DECIMAL(10,2),
    "dispatchRef" TEXT,
    "trackingInfo" TEXT,
    "grnRef" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "dispatchedById" TEXT,
    "receivedById" TEXT,
    "companySaleId" TEXT,
    "overrideBalanceLimit" BOOLEAN DEFAULT false,
    "fromCompanyId" TEXT,
    "fromDealerId" TEXT,
    "toDealerId" TEXT,
    "toFarmerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsignmentItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "acceptedQuantity" DECIMAL(10,2),
    "receivedQuantity" DECIMAL(10,2),
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "consignmentId" TEXT NOT NULL,
    "companyProductId" TEXT,
    "dealerProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsignmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ConsignmentAuditLog" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "statusFrom" "public"."ConsignmentStatus",
    "statusTo" "public"."ConsignmentStatus" NOT NULL,
    "actorId" TEXT NOT NULL,
    "quantityChange" DECIMAL(10,2),
    "documentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsignmentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DealerLedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "public"."LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "imageUrl" TEXT,
    "dealerId" TEXT NOT NULL,
    "saleId" TEXT,
    "consignmentId" TEXT,
    "partyId" TEXT,
    "partyType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealerLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanySale" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotalAmount" DECIMAL(10,2),
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "soldById" TEXT NOT NULL,
    "consignmentId" TEXT,
    "accountId" TEXT,
    "invoiceImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanySaleItem" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySaleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SaleDiscount" (
    "id" TEXT NOT NULL,
    "type" "public"."DiscountType" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "scope" "public"."DiscountScope" NOT NULL DEFAULT 'SALE',
    "dealerSaleId" TEXT,
    "companySaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyDealerAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalSales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayments" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastSaleDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "balanceLimit" DECIMAL(10,2),
    "balanceLimitSetAt" TIMESTAMP(3),
    "balanceLimitSetBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyDealerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyDealerPayment" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "reference" TEXT,
    "receiptImageUrl" TEXT,
    "proofImageUrl" TEXT,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyDealerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyLedgerEntry" (
    "id" TEXT NOT NULL,
    "type" "public"."LedgerEntryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "runningBalance" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "companySaleId" TEXT,
    "partyId" TEXT,
    "partyType" TEXT,
    "transactionId" TEXT,
    "transactionType" "public"."TransactionType",
    "entryType" "public"."LedgerEntryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "direction" "public"."PaymentRequestDirection" NOT NULL,
    "status" "public"."PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "paymentReceiptUrl" TEXT,
    "paymentDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,
    "companySaleId" TEXT,
    "requestedById" TEXT NOT NULL,
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_CompanyManagedBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyManagedBy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_FarmManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FarmManagers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_DealerManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DealerManagers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Company_ownerId_key" ON "public"."Company"("ownerId");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "public"."Company"("ownerId");

-- CreateIndex
CREATE INDEX "Batch_farmId_startDate_idx" ON "public"."Batch"("farmId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_farmId_batchNumber_key" ON "public"."Batch"("farmId", "batchNumber");

-- CreateIndex
CREATE INDEX "EggProduction_batchId_date_idx" ON "public"."EggProduction"("batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EggProduction_batchId_date_key" ON "public"."EggProduction"("batchId", "date");

-- CreateIndex
CREATE INDEX "EggInventory_userId_idx" ON "public"."EggInventory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EggInventory_userId_eggCategory_key" ON "public"."EggInventory"("userId", "eggCategory");

-- CreateIndex
CREATE INDEX "Category_userId_type_idx" ON "public"."Category"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_type_name_key" ON "public"."Category"("userId", "type", "name");

-- CreateIndex
CREATE INDEX "Expense_farmId_date_idx" ON "public"."Expense"("farmId", "date");

-- CreateIndex
CREATE INDEX "Expense_batchId_idx" ON "public"."Expense"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_mortalityId_key" ON "public"."Sale"("mortalityId");

-- CreateIndex
CREATE INDEX "Sale_farmId_date_idx" ON "public"."Sale"("farmId", "date");

-- CreateIndex
CREATE INDEX "Sale_customerId_idx" ON "public"."Sale"("customerId");

-- CreateIndex
CREATE INDEX "Sale_mortalityId_idx" ON "public"."Sale"("mortalityId");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_date_idx" ON "public"."SalePayment"("saleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_categoryId_name_key" ON "public"."InventoryItem"("userId", "categoryId", "name");

-- CreateIndex
CREATE INDEX "InventoryTransaction_itemId_date_idx" ON "public"."InventoryTransaction"("itemId", "date");

-- CreateIndex
CREATE INDEX "InventoryUsage_farmId_date_idx" ON "public"."InventoryUsage"("farmId", "date");

-- CreateIndex
CREATE INDEX "InventoryUsage_batchId_idx" ON "public"."InventoryUsage"("batchId");

-- CreateIndex
CREATE INDEX "InventoryUsage_itemId_idx" ON "public"."InventoryUsage"("itemId");

-- CreateIndex
CREATE INDEX "EntityTransaction_dealerId_date_idx" ON "public"."EntityTransaction"("dealerId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_hatcheryId_date_idx" ON "public"."EntityTransaction"("hatcheryId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_medicineSupplierId_date_idx" ON "public"."EntityTransaction"("medicineSupplierId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_customerId_date_idx" ON "public"."EntityTransaction"("customerId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_entityType_entityId_date_idx" ON "public"."EntityTransaction"("entityType", "entityId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_inventoryItemId_date_idx" ON "public"."EntityTransaction"("inventoryItemId", "date");

-- CreateIndex
CREATE INDEX "EntityTransaction_paymentToPurchaseId_date_idx" ON "public"."EntityTransaction"("paymentToPurchaseId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_ownerId_key" ON "public"."Dealer"("ownerId");

-- CreateIndex
CREATE INDEX "Dealer_ownerId_idx" ON "public"."Dealer"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_userId_name_key" ON "public"."Dealer"("userId", "name");

-- CreateIndex
CREATE INDEX "DealerCart_dealerId_idx" ON "public"."DealerCart"("dealerId");

-- CreateIndex
CREATE INDEX "DealerCart_companyId_idx" ON "public"."DealerCart"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCart_dealerId_companyId_key" ON "public"."DealerCart"("dealerId", "companyId");

-- CreateIndex
CREATE INDEX "DealerCartItem_cartId_idx" ON "public"."DealerCartItem"("cartId");

-- CreateIndex
CREATE INDEX "DealerCartItem_productId_idx" ON "public"."DealerCartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCartItem_cartId_productId_key" ON "public"."DealerCartItem"("cartId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Hatchery_userId_name_key" ON "public"."Hatchery"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MedicineSupplier_userId_name_key" ON "public"."MedicineSupplier"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_name_key" ON "public"."Customer"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_farmerId_key" ON "public"."Customer"("userId", "farmerId");

-- CreateIndex
CREATE INDEX "CustomerTransaction_customerId_date_idx" ON "public"."CustomerTransaction"("customerId", "date");

-- CreateIndex
CREATE INDEX "Mortality_batchId_date_idx" ON "public"."Mortality"("batchId", "date");

-- CreateIndex
CREATE INDEX "Mortality_saleId_date_idx" ON "public"."Mortality"("saleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccination_reminderId_key" ON "public"."Vaccination"("reminderId");

-- CreateIndex
CREATE INDEX "Vaccination_batchId_scheduledDate_idx" ON "public"."Vaccination"("batchId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_farmId_scheduledDate_idx" ON "public"."Vaccination"("farmId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_userId_scheduledDate_idx" ON "public"."Vaccination"("userId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_status_scheduledDate_idx" ON "public"."Vaccination"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "Vaccination_standardScheduleId_idx" ON "public"."Vaccination"("standardScheduleId");

-- CreateIndex
CREATE INDEX "Vaccination_batchId_batchAge_idx" ON "public"."Vaccination"("batchId", "batchAge");

-- CreateIndex
CREATE INDEX "StandardVaccinationSchedule_dayFrom_dayTo_idx" ON "public"."StandardVaccinationSchedule"("dayFrom", "dayTo");

-- CreateIndex
CREATE INDEX "StandardVaccinationSchedule_isActive_idx" ON "public"."StandardVaccinationSchedule"("isActive");

-- CreateIndex
CREATE INDEX "FeedConsumption_batchId_date_idx" ON "public"."FeedConsumption"("batchId", "date");

-- CreateIndex
CREATE INDEX "BirdWeight_batchId_date_idx" ON "public"."BirdWeight"("batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_vaccinationId_key" ON "public"."Reminder"("vaccinationId");

-- CreateIndex
CREATE INDEX "Reminder_userId_dueDate_idx" ON "public"."Reminder"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_userId_status_idx" ON "public"."Reminder"("userId", "status");

-- CreateIndex
CREATE INDEX "Reminder_farmId_dueDate_idx" ON "public"."Reminder"("farmId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_batchId_dueDate_idx" ON "public"."Reminder"("batchId", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_type_dueDate_idx" ON "public"."Reminder"("type", "dueDate");

-- CreateIndex
CREATE INDEX "Reminder_vaccinationId_idx" ON "public"."Reminder"("vaccinationId");

-- CreateIndex
CREATE INDEX "DealerCompany_dealerId_idx" ON "public"."DealerCompany"("dealerId");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_idx" ON "public"."DealerCompany"("companyId");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_dealerId_idx" ON "public"."DealerCompany"("companyId", "dealerId");

-- CreateIndex
CREATE INDEX "DealerCompany_dealerId_archivedByDealer_idx" ON "public"."DealerCompany"("dealerId", "archivedByDealer");

-- CreateIndex
CREATE INDEX "DealerCompany_companyId_archivedByCompany_idx" ON "public"."DealerCompany"("companyId", "archivedByCompany");

-- CreateIndex
CREATE UNIQUE INDEX "DealerCompany_dealerId_companyId_key" ON "public"."DealerCompany"("dealerId", "companyId");

-- CreateIndex
CREATE INDEX "DealerFarmer_dealerId_idx" ON "public"."DealerFarmer"("dealerId");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_idx" ON "public"."DealerFarmer"("farmerId");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_dealerId_idx" ON "public"."DealerFarmer"("farmerId", "dealerId");

-- CreateIndex
CREATE INDEX "DealerFarmer_dealerId_archivedByDealer_idx" ON "public"."DealerFarmer"("dealerId", "archivedByDealer");

-- CreateIndex
CREATE INDEX "DealerFarmer_farmerId_archivedByFarmer_idx" ON "public"."DealerFarmer"("farmerId", "archivedByFarmer");

-- CreateIndex
CREATE UNIQUE INDEX "DealerFarmer_dealerId_farmerId_key" ON "public"."DealerFarmer"("dealerId", "farmerId");

-- CreateIndex
CREATE INDEX "DealerFarmerAccount_dealerId_idx" ON "public"."DealerFarmerAccount"("dealerId");

-- CreateIndex
CREATE INDEX "DealerFarmerAccount_farmerId_idx" ON "public"."DealerFarmerAccount"("farmerId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerFarmerAccount_dealerId_farmerId_key" ON "public"."DealerFarmerAccount"("dealerId", "farmerId");

-- CreateIndex
CREATE INDEX "DealerFarmerPayment_accountId_paymentDate_idx" ON "public"."DealerFarmerPayment"("accountId", "paymentDate");

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_dealerId_idx" ON "public"."DealerVerificationRequest"("dealerId");

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_companyId_idx" ON "public"."DealerVerificationRequest"("companyId");

-- CreateIndex
CREATE INDEX "DealerVerificationRequest_companyId_status_idx" ON "public"."DealerVerificationRequest"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DealerVerificationRequest_dealerId_companyId_status_key" ON "public"."DealerVerificationRequest"("dealerId", "companyId", "status");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_farmerId_idx" ON "public"."FarmerVerificationRequest"("farmerId");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_dealerId_idx" ON "public"."FarmerVerificationRequest"("dealerId");

-- CreateIndex
CREATE INDEX "FarmerVerificationRequest_dealerId_status_idx" ON "public"."FarmerVerificationRequest"("dealerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FarmerVerificationRequest_farmerId_dealerId_status_key" ON "public"."FarmerVerificationRequest"("farmerId", "dealerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_farmerId_doctorId_key" ON "public"."Conversation"("farmerId", "doctorId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BatchShare_shareToken_key" ON "public"."BatchShare"("shareToken");

-- CreateIndex
CREATE INDEX "BatchShare_shareToken_idx" ON "public"."BatchShare"("shareToken");

-- CreateIndex
CREATE INDEX "BatchShare_batchId_idx" ON "public"."BatchShare"("batchId");

-- CreateIndex
CREATE INDEX "BatchShare_conversationId_idx" ON "public"."BatchShare"("conversationId");

-- CreateIndex
CREATE INDEX "BatchShareView_shareId_idx" ON "public"."BatchShareView"("shareId");

-- CreateIndex
CREATE INDEX "DealerProduct_dealerId_idx" ON "public"."DealerProduct"("dealerId");

-- CreateIndex
CREATE INDEX "DealerProduct_companyProductId_idx" ON "public"."DealerProduct"("companyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerProduct_dealerId_name_costPrice_sellingPrice_key" ON "public"."DealerProduct"("dealerId", "name", "costPrice", "sellingPrice");

-- CreateIndex
CREATE INDEX "DealerProductTransaction_productId_date_idx" ON "public"."DealerProductTransaction"("productId", "date");

-- CreateIndex
CREATE INDEX "DealerProductTransaction_dealerSaleId_idx" ON "public"."DealerProductTransaction"("dealerSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSale_invoiceNumber_key" ON "public"."DealerSale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DealerSale_dealerId_date_idx" ON "public"."DealerSale"("dealerId", "date");

-- CreateIndex
CREATE INDEX "DealerSale_customerId_idx" ON "public"."DealerSale"("customerId");

-- CreateIndex
CREATE INDEX "DealerSale_farmerId_idx" ON "public"."DealerSale"("farmerId");

-- CreateIndex
CREATE INDEX "DealerSale_invoiceNumber_idx" ON "public"."DealerSale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "DealerSale_accountId_idx" ON "public"."DealerSale"("accountId");

-- CreateIndex
CREATE INDEX "DealerSaleItem_saleId_idx" ON "public"."DealerSaleItem"("saleId");

-- CreateIndex
CREATE INDEX "DealerSaleItem_productId_idx" ON "public"."DealerSaleItem"("productId");

-- CreateIndex
CREATE INDEX "DealerSalePayment_saleId_date_idx" ON "public"."DealerSalePayment"("saleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSalePaymentRequest_requestNumber_key" ON "public"."DealerSalePaymentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_dealerSaleId_status_idx" ON "public"."DealerSalePaymentRequest"("dealerSaleId", "status");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_dealerId_status_idx" ON "public"."DealerSalePaymentRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "DealerSalePaymentRequest_farmerId_status_idx" ON "public"."DealerSalePaymentRequest"("farmerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSaleRequest_requestNumber_key" ON "public"."DealerSaleRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DealerSaleRequest_dealerSaleId_key" ON "public"."DealerSaleRequest"("dealerSaleId");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_dealerId_status_idx" ON "public"."DealerSaleRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_farmerId_status_idx" ON "public"."DealerSaleRequest"("farmerId", "status");

-- CreateIndex
CREATE INDEX "DealerSaleRequest_customerId_idx" ON "public"."DealerSaleRequest"("customerId");

-- CreateIndex
CREATE INDEX "DealerSaleRequestItem_requestId_idx" ON "public"."DealerSaleRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "DealerSaleRequestItem_productId_idx" ON "public"."DealerSaleRequestItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentRequest_requestNumber_key" ON "public"."ConsignmentRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ConsignmentRequest_companySaleId_key" ON "public"."ConsignmentRequest"("companySaleId");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_fromCompanyId_status_idx" ON "public"."ConsignmentRequest"("fromCompanyId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_fromDealerId_status_idx" ON "public"."ConsignmentRequest"("fromDealerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_toDealerId_status_idx" ON "public"."ConsignmentRequest"("toDealerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_toFarmerId_status_idx" ON "public"."ConsignmentRequest"("toFarmerId", "status");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_requestNumber_idx" ON "public"."ConsignmentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_dispatchedById_idx" ON "public"."ConsignmentRequest"("dispatchedById");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_receivedById_idx" ON "public"."ConsignmentRequest"("receivedById");

-- CreateIndex
CREATE INDEX "ConsignmentRequest_companySaleId_idx" ON "public"."ConsignmentRequest"("companySaleId");

-- CreateIndex
CREATE INDEX "ConsignmentItem_consignmentId_idx" ON "public"."ConsignmentItem"("consignmentId");

-- CreateIndex
CREATE INDEX "ConsignmentAuditLog_consignmentId_idx" ON "public"."ConsignmentAuditLog"("consignmentId");

-- CreateIndex
CREATE INDEX "ConsignmentAuditLog_actorId_idx" ON "public"."ConsignmentAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_dealerId_date_idx" ON "public"."DealerLedgerEntry"("dealerId", "date");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_partyId_partyType_idx" ON "public"."DealerLedgerEntry"("partyId", "partyType");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_saleId_idx" ON "public"."DealerLedgerEntry"("saleId");

-- CreateIndex
CREATE INDEX "DealerLedgerEntry_consignmentId_idx" ON "public"."DealerLedgerEntry"("consignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySale_invoiceNumber_key" ON "public"."CompanySale"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySale_consignmentId_key" ON "public"."CompanySale"("consignmentId");

-- CreateIndex
CREATE INDEX "CompanySale_companyId_date_idx" ON "public"."CompanySale"("companyId", "date");

-- CreateIndex
CREATE INDEX "CompanySale_dealerId_date_idx" ON "public"."CompanySale"("dealerId", "date");

-- CreateIndex
CREATE INDEX "CompanySale_soldById_idx" ON "public"."CompanySale"("soldById");

-- CreateIndex
CREATE INDEX "CompanySale_invoiceNumber_idx" ON "public"."CompanySale"("invoiceNumber");

-- CreateIndex
CREATE INDEX "CompanySale_consignmentId_idx" ON "public"."CompanySale"("consignmentId");

-- CreateIndex
CREATE INDEX "CompanySale_accountId_idx" ON "public"."CompanySale"("accountId");

-- CreateIndex
CREATE INDEX "CompanySaleItem_saleId_idx" ON "public"."CompanySaleItem"("saleId");

-- CreateIndex
CREATE INDEX "CompanySaleItem_productId_idx" ON "public"."CompanySaleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscount_dealerSaleId_key" ON "public"."SaleDiscount"("dealerSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleDiscount_companySaleId_key" ON "public"."SaleDiscount"("companySaleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_dealerSaleId_idx" ON "public"."SaleDiscount"("dealerSaleId");

-- CreateIndex
CREATE INDEX "SaleDiscount_companySaleId_idx" ON "public"."SaleDiscount"("companySaleId");

-- CreateIndex
CREATE INDEX "CompanyDealerAccount_companyId_idx" ON "public"."CompanyDealerAccount"("companyId");

-- CreateIndex
CREATE INDEX "CompanyDealerAccount_dealerId_idx" ON "public"."CompanyDealerAccount"("dealerId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyDealerAccount_companyId_dealerId_key" ON "public"."CompanyDealerAccount"("companyId", "dealerId");

-- CreateIndex
CREATE INDEX "CompanyDealerPayment_accountId_paymentDate_idx" ON "public"."CompanyDealerPayment"("accountId", "paymentDate");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_companyId_date_idx" ON "public"."CompanyLedgerEntry"("companyId", "date");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_partyId_partyType_idx" ON "public"."CompanyLedgerEntry"("partyId", "partyType");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_companySaleId_idx" ON "public"."CompanyLedgerEntry"("companySaleId");

-- CreateIndex
CREATE INDEX "CompanyLedgerEntry_transactionId_idx" ON "public"."CompanyLedgerEntry"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_requestNumber_key" ON "public"."PaymentRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "PaymentRequest_companyId_status_idx" ON "public"."PaymentRequest"("companyId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_dealerId_status_idx" ON "public"."PaymentRequest"("dealerId", "status");

-- CreateIndex
CREATE INDEX "PaymentRequest_companySaleId_idx" ON "public"."PaymentRequest"("companySaleId");

-- CreateIndex
CREATE INDEX "PaymentRequest_requestedById_idx" ON "public"."PaymentRequest"("requestedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_acceptedById_idx" ON "public"."PaymentRequest"("acceptedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_submittedById_idx" ON "public"."PaymentRequest"("submittedById");

-- CreateIndex
CREATE INDEX "PaymentRequest_reviewedById_idx" ON "public"."PaymentRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "_CompanyManagedBy_B_index" ON "public"."_CompanyManagedBy"("B");

-- CreateIndex
CREATE INDEX "_FarmManagers_B_index" ON "public"."_FarmManagers"("B");

-- CreateIndex
CREATE INDEX "_DealerManagers_B_index" ON "public"."_DealerManagers"("B");

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Batch" ADD CONSTRAINT "Batch_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EggProduction" ADD CONSTRAINT "EggProduction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EggInventory" ADD CONSTRAINT "EggInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sale" ADD CONSTRAINT "Sale_mortalityId_fkey" FOREIGN KEY ("mortalityId") REFERENCES "public"."Mortality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryUsage" ADD CONSTRAINT "InventoryUsage_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_hatcheryId_fkey" FOREIGN KEY ("hatcheryId") REFERENCES "public"."Hatchery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_medicineSupplierId_fkey" FOREIGN KEY ("medicineSupplierId") REFERENCES "public"."MedicineSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "public"."InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "public"."Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EntityTransaction" ADD CONSTRAINT "EntityTransaction_paymentToPurchaseId_fkey" FOREIGN KEY ("paymentToPurchaseId") REFERENCES "public"."EntityTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealer" ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dealer" ADD CONSTRAINT "Dealer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCart" ADD CONSTRAINT "DealerCart_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCart" ADD CONSTRAINT "DealerCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCartItem" ADD CONSTRAINT "DealerCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."DealerCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCartItem" ADD CONSTRAINT "DealerCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Hatchery" ADD CONSTRAINT "Hatchery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MedicineSupplier" ADD CONSTRAINT "MedicineSupplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerTransaction" ADD CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Mortality" ADD CONSTRAINT "Mortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_standardScheduleId_fkey" FOREIGN KEY ("standardScheduleId") REFERENCES "public"."StandardVaccinationSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vaccination" ADD CONSTRAINT "Vaccination_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeedConsumption" ADD CONSTRAINT "FeedConsumption_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BirdWeight" ADD CONSTRAINT "BirdWeight_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "public"."Vaccination"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCompany" ADD CONSTRAINT "DealerCompany_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerCompany" ADD CONSTRAINT "DealerCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmer" ADD CONSTRAINT "DealerFarmer_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmer" ADD CONSTRAINT "DealerFarmer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerAccount" ADD CONSTRAINT "DealerFarmerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerPayment" ADD CONSTRAINT "DealerFarmerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."DealerFarmerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerFarmerPayment" ADD CONSTRAINT "DealerFarmerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerVerificationRequest" ADD CONSTRAINT "DealerVerificationRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerVerificationRequest" ADD CONSTRAINT "DealerVerificationRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" ADD CONSTRAINT "FarmerVerificationRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FarmerVerificationRequest" ADD CONSTRAINT "FarmerVerificationRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_batchShareId_fkey" FOREIGN KEY ("batchShareId") REFERENCES "public"."BatchShare"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShare" ADD CONSTRAINT "BatchShare_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShare" ADD CONSTRAINT "BatchShare_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShare" ADD CONSTRAINT "BatchShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShare" ADD CONSTRAINT "BatchShare_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShareView" ADD CONSTRAINT "BatchShareView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "public"."BatchShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BatchShareView" ADD CONSTRAINT "BatchShareView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProduct" ADD CONSTRAINT "DealerProduct_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProduct" ADD CONSTRAINT "DealerProduct_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProductTransaction" ADD CONSTRAINT "DealerProductTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerProductTransaction" ADD CONSTRAINT "DealerProductTransaction_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSale" ADD CONSTRAINT "DealerSale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."DealerFarmerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleItem" ADD CONSTRAINT "DealerSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleItem" ADD CONSTRAINT "DealerSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePayment" ADD CONSTRAINT "DealerSalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSalePaymentRequest" ADD CONSTRAINT "DealerSalePaymentRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequest" ADD CONSTRAINT "DealerSaleRequest_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" ADD CONSTRAINT "DealerSaleRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."DealerSaleRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerSaleRequestItem" ADD CONSTRAINT "DealerSaleRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."DealerProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_fromCompanyId_fkey" FOREIGN KEY ("fromCompanyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_fromDealerId_fkey" FOREIGN KEY ("fromDealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_toDealerId_fkey" FOREIGN KEY ("toDealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentRequest" ADD CONSTRAINT "ConsignmentRequest_toFarmerId_fkey" FOREIGN KEY ("toFarmerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "public"."ConsignmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentItem" ADD CONSTRAINT "ConsignmentItem_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES "public"."DealerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentAuditLog" ADD CONSTRAINT "ConsignmentAuditLog_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "public"."ConsignmentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConsignmentAuditLog" ADD CONSTRAINT "ConsignmentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."DealerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DealerLedgerEntry" ADD CONSTRAINT "DealerLedgerEntry_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "public"."ConsignmentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySale" ADD CONSTRAINT "CompanySale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."CompanyDealerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySaleItem" ADD CONSTRAINT "CompanySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "public"."CompanySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanySaleItem" ADD CONSTRAINT "CompanySaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES "public"."DealerSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SaleDiscount" ADD CONSTRAINT "SaleDiscount_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerAccount" ADD CONSTRAINT "CompanyDealerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerPayment" ADD CONSTRAINT "CompanyDealerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."CompanyDealerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyDealerPayment" ADD CONSTRAINT "CompanyDealerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyLedgerEntry" ADD CONSTRAINT "CompanyLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyLedgerEntry" ADD CONSTRAINT "CompanyLedgerEntry_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES "public"."CompanySale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompanyManagedBy" ADD CONSTRAINT "_CompanyManagedBy_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CompanyManagedBy" ADD CONSTRAINT "_CompanyManagedBy_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FarmManagers" ADD CONSTRAINT "_FarmManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_FarmManagers" ADD CONSTRAINT "_FarmManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DealerManagers" ADD CONSTRAINT "_DealerManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Dealer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_DealerManagers" ADD CONSTRAINT "_DealerManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
