--
-- PostgreSQL database dump
--
-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."AuditAction" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT'
);


ALTER TYPE public."AuditAction" OWNER TO poultry360;

--
-- Name: BatchStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."BatchStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED'
);


ALTER TYPE public."BatchStatus" OWNER TO poultry360;

--
-- Name: BatchType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."BatchType" AS ENUM (
    'BROILER',
    'LAYERS'
);


ALTER TYPE public."BatchType" OWNER TO poultry360;

--
-- Name: CalendarType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CalendarType" AS ENUM (
    'AD',
    'BS'
);


ALTER TYPE public."CalendarType" OWNER TO poultry360;

--
-- Name: CashDayCloseSource; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CashDayCloseSource" AS ENUM (
    'USER',
    'SYSTEM'
);


ALTER TYPE public."CashDayCloseSource" OWNER TO poultry360;

--
-- Name: CashMovementDirection; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CashMovementDirection" AS ENUM (
    'IN',
    'OUT'
);


ALTER TYPE public."CashMovementDirection" OWNER TO poultry360;

--
-- Name: CategoryType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CategoryType" AS ENUM (
    'EXPENSE',
    'SALES',
    'INVENTORY'
);


ALTER TYPE public."CategoryType" OWNER TO poultry360;

--
-- Name: CompanyDealerAccountAdjustmentCreatedByRole; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CompanyDealerAccountAdjustmentCreatedByRole" AS ENUM (
    'COMPANY',
    'DEALER'
);


ALTER TYPE public."CompanyDealerAccountAdjustmentCreatedByRole" OWNER TO poultry360;

--
-- Name: CompanyDealerAccountAdjustmentStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CompanyDealerAccountAdjustmentStatus" AS ENUM (
    'PENDING_ACK',
    'ACKNOWLEDGED',
    'DISPUTED'
);


ALTER TYPE public."CompanyDealerAccountAdjustmentStatus" OWNER TO poultry360;

--
-- Name: CompanyDealerAccountAdjustmentType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."CompanyDealerAccountAdjustmentType" AS ENUM (
    'OPENING_BALANCE'
);


ALTER TYPE public."CompanyDealerAccountAdjustmentType" OWNER TO poultry360;

--
-- Name: ConversationStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."ConversationStatus" AS ENUM (
    'ACTIVE',
    'CLOSED',
    'ARCHIVED'
);


ALTER TYPE public."ConversationStatus" OWNER TO poultry360;

--
-- Name: DealerFarmerAccountAdjustmentCreatedByRole; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DealerFarmerAccountAdjustmentCreatedByRole" AS ENUM (
    'DEALER',
    'FARMER'
);


ALTER TYPE public."DealerFarmerAccountAdjustmentCreatedByRole" OWNER TO poultry360;

--
-- Name: DealerFarmerAccountAdjustmentStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DealerFarmerAccountAdjustmentStatus" AS ENUM (
    'PENDING_ACK',
    'ACKNOWLEDGED',
    'DISPUTED'
);


ALTER TYPE public."DealerFarmerAccountAdjustmentStatus" OWNER TO poultry360;

--
-- Name: DealerFarmerAccountAdjustmentType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DealerFarmerAccountAdjustmentType" AS ENUM (
    'OPENING_BALANCE'
);


ALTER TYPE public."DealerFarmerAccountAdjustmentType" OWNER TO poultry360;

--
-- Name: DealerManualCompanyAdjustmentType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DealerManualCompanyAdjustmentType" AS ENUM (
    'OPENING_BALANCE',
    'ADJUSTMENT'
);


ALTER TYPE public."DealerManualCompanyAdjustmentType" OWNER TO poultry360;

--
-- Name: DiscountScope; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DiscountScope" AS ENUM (
    'SALE',
    'ITEM'
);


ALTER TYPE public."DiscountScope" OWNER TO poultry360;

--
-- Name: DiscountType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."DiscountType" AS ENUM (
    'PERCENT',
    'FLAT'
);


ALTER TYPE public."DiscountType" OWNER TO poultry360;

--
-- Name: HatcheryBatchExpenseType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryBatchExpenseType" AS ENUM (
    'INVENTORY',
    'MANUAL'
);


ALTER TYPE public."HatcheryBatchExpenseType" OWNER TO poultry360;

--
-- Name: HatcheryBatchStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryBatchStatus" AS ENUM (
    'ACTIVE',
    'CLOSED'
);


ALTER TYPE public."HatcheryBatchStatus" OWNER TO poultry360;

--
-- Name: HatcheryBatchType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryBatchType" AS ENUM (
    'PARENT_FLOCK',
    'INCUBATION'
);


ALTER TYPE public."HatcheryBatchType" OWNER TO poultry360;

--
-- Name: HatcheryChickGrade; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryChickGrade" AS ENUM (
    'A',
    'B',
    'CULL'
);


ALTER TYPE public."HatcheryChickGrade" OWNER TO poultry360;

--
-- Name: HatcheryChickTxnType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryChickTxnType" AS ENUM (
    'PRODUCTION',
    'SALE',
    'ADJUSTMENT'
);


ALTER TYPE public."HatcheryChickTxnType" OWNER TO poultry360;

--
-- Name: HatcheryEggTxnType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryEggTxnType" AS ENUM (
    'PRODUCTION',
    'SALE',
    'ADJUSTMENT'
);


ALTER TYPE public."HatcheryEggTxnType" OWNER TO poultry360;

--
-- Name: HatcheryIncubationLossType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryIncubationLossType" AS ENUM (
    'INFERTILE',
    'EARLY_DEAD',
    'LATE_DEAD',
    'UNHATCHED',
    'WEAK_CULL'
);


ALTER TYPE public."HatcheryIncubationLossType" OWNER TO poultry360;

--
-- Name: HatcheryIncubationStage; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryIncubationStage" AS ENUM (
    'SETTER',
    'CANDLING',
    'HATCHER',
    'COMPLETED'
);


ALTER TYPE public."HatcheryIncubationStage" OWNER TO poultry360;

--
-- Name: HatcheryInventoryItemType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryInventoryItemType" AS ENUM (
    'FEED',
    'MEDICINE',
    'CHICKS',
    'OTHER'
);


ALTER TYPE public."HatcheryInventoryItemType" OWNER TO poultry360;

--
-- Name: HatcheryInventoryTxnType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryInventoryTxnType" AS ENUM (
    'PURCHASE',
    'USAGE',
    'ADJUSTMENT'
);


ALTER TYPE public."HatcheryInventoryTxnType" OWNER TO poultry360;

--
-- Name: HatcheryPartyTxnType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryPartyTxnType" AS ENUM (
    'SALE',
    'PAYMENT',
    'ADJUSTMENT',
    'OPENING_BALANCE'
);


ALTER TYPE public."HatcheryPartyTxnType" OWNER TO poultry360;

--
-- Name: HatcheryPurchaseCategory; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcheryPurchaseCategory" AS ENUM (
    'FEED',
    'MEDICINE',
    'CHICKS',
    'OTHER'
);


ALTER TYPE public."HatcheryPurchaseCategory" OWNER TO poultry360;

--
-- Name: HatcherySupplierTxnType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."HatcherySupplierTxnType" AS ENUM (
    'PURCHASE',
    'PAYMENT',
    'ADJUSTMENT',
    'OPENING_BALANCE'
);


ALTER TYPE public."HatcherySupplierTxnType" OWNER TO poultry360;

--
-- Name: InventoryItemType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."InventoryItemType" AS ENUM (
    'FEED',
    'CHICKS',
    'MEDICINE',
    'EQUIPMENT',
    'OTHER'
);


ALTER TYPE public."InventoryItemType" OWNER TO poultry360;

--
-- Name: Language; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."Language" AS ENUM (
    'ENGLISH',
    'NEPALI'
);


ALTER TYPE public."Language" OWNER TO poultry360;

--
-- Name: LedgerEntryType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."LedgerEntryType" AS ENUM (
    'SALE',
    'PURCHASE',
    'PAYMENT_RECEIVED',
    'PAYMENT_MADE',
    'RETURN',
    'ADJUSTMENT',
    'OPENING_BALANCE',
    'ADVANCE_RECEIVED',
    'CONSIGNMENT_INVOICE',
    'CONSIGNMENT_SETTLED'
);


ALTER TYPE public."LedgerEntryType" OWNER TO poultry360;

--
-- Name: ListForSaleCategory; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."ListForSaleCategory" AS ENUM (
    'CHICKEN',
    'EGGS',
    'LAYERS',
    'FISH',
    'OTHER'
);


ALTER TYPE public."ListForSaleCategory" OWNER TO poultry360;

--
-- Name: ListForSaleStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."ListForSaleStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);


ALTER TYPE public."ListForSaleStatus" OWNER TO poultry360;

--
-- Name: MessageType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."MessageType" AS ENUM (
    'TEXT',
    'IMAGE',
    'FILE',
    'VIDEO',
    'AUDIO',
    'PDF',
    'DOC',
    'OTHER',
    'BATCH_SHARE',
    'FARM_SHARE'
);


ALTER TYPE public."MessageType" OWNER TO poultry360;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'UNREAD',
    'READ',
    'ARCHIVED'
);


ALTER TYPE public."NotificationStatus" OWNER TO poultry360;

--
-- Name: PurchaseCategory; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."PurchaseCategory" AS ENUM (
    'FEED',
    'MEDICINE',
    'CHICKS',
    'EQUIPMENT',
    'OTHER'
);


ALTER TYPE public."PurchaseCategory" OWNER TO poultry360;

--
-- Name: SalesItemType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."SalesItemType" AS ENUM (
    'EGGS',
    'Chicken_Meat',
    'CHICKS',
    'FEED',
    'MEDICINE',
    'EQUIPMENT',
    'OTHER'
);


ALTER TYPE public."SalesItemType" OWNER TO poultry360;

--
-- Name: StaffStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."StaffStatus" AS ENUM (
    'ACTIVE',
    'STOPPED',
    'ARCHIVED'
);


ALTER TYPE public."StaffStatus" OWNER TO poultry360;

--
-- Name: TransactionType; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."TransactionType" AS ENUM (
    'PURCHASE',
    'SALE',
    'PAYMENT',
    'RECEIPT',
    'ADJUSTMENT',
    'OPENING_BALANCE',
    'USAGE',
    'RETURN'
);


ALTER TYPE public."TransactionType" OWNER TO poultry360;

--
-- Name: UserOnboardingPaymentState; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."UserOnboardingPaymentState" AS ENUM (
    'PENDING_PAYMENT',
    'PENDING_REVIEW',
    'PAYMENT_REJECTED',
    'PAYMENT_APPROVED'
);


ALTER TYPE public."UserOnboardingPaymentState" OWNER TO poultry360;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'MANAGER',
    'DOCTOR',
    'DEALER',
    'COMPANY',
    'SUPER_ADMIN',
    'HATCHERY'
);


ALTER TYPE public."UserRole" OWNER TO poultry360;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'PENDING_VERIFICATION'
);


ALTER TYPE public."UserStatus" OWNER TO poultry360;

--
-- Name: VaccinationStatus; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."VaccinationStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'MISSED',
    'OVERDUE'
);


ALTER TYPE public."VaccinationStatus" OWNER TO poultry360;

--
-- Name: WeightSource; Type: TYPE; Schema: public; Owner: poultry360
--

CREATE TYPE public."WeightSource" AS ENUM (
    'MANUAL',
    'SALE',
    'SYSTEM'
);


ALTER TYPE public."WeightSource" OWNER TO poultry360;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action public."AuditAction" NOT NULL,
    "tableName" text NOT NULL,
    "recordId" text NOT NULL,
    "oldValues" jsonb,
    "newValues" jsonb,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO poultry360;

--
-- Name: Batch; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Batch" (
    id text NOT NULL,
    "batchNumber" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    status public."BatchStatus" DEFAULT 'ACTIVE'::public."BatchStatus" NOT NULL,
    "batchType" public."BatchType" DEFAULT 'BROILER'::public."BatchType" NOT NULL,
    "initialChicks" integer NOT NULL,
    notes text,
    "currentWeight" numeric(6,2),
    "farmId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Batch" OWNER TO poultry360;

--
-- Name: BatchEggInventory; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."BatchEggInventory" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    quantity integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BatchEggInventory" OWNER TO poultry360;

--
-- Name: BatchNote; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."BatchNote" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BatchNote" OWNER TO poultry360;

--
-- Name: BatchShare; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."BatchShare" (
    id text NOT NULL,
    "shareToken" text NOT NULL,
    "batchId" text NOT NULL,
    "farmerId" text NOT NULL,
    "sharedWithId" text,
    "conversationId" text,
    "snapshotData" jsonb NOT NULL,
    title text,
    description text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BatchShare" OWNER TO poultry360;

--
-- Name: BatchShareView; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."BatchShareView" (
    id text NOT NULL,
    "shareId" text NOT NULL,
    "viewerId" text,
    "ipAddress" text,
    "userAgent" text,
    "viewedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."BatchShareView" OWNER TO poultry360;

--
-- Name: BirdWeight; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."BirdWeight" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "avgWeight" numeric(6,2) NOT NULL,
    "sampleCount" integer NOT NULL,
    source public."WeightSource" DEFAULT 'MANUAL'::public."WeightSource" NOT NULL,
    notes text,
    "batchId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."BirdWeight" OWNER TO poultry360;

--
-- Name: Category; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Category" (
    id text NOT NULL,
    name text NOT NULL,
    type public."CategoryType" NOT NULL,
    description text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Category" OWNER TO poultry360;

--
-- Name: Company; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Company" (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ownerId" text NOT NULL
);


ALTER TABLE public."Company" OWNER TO poultry360;

--
-- Name: CompanyDealerAccount; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyDealerAccount" (
    id text NOT NULL,
    "companyId" text NOT NULL,
    "dealerId" text NOT NULL,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    "totalSales" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPayments" numeric(10,2) DEFAULT 0 NOT NULL,
    "lastSaleDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "balanceLimit" numeric(10,2),
    "balanceLimitSetAt" timestamp(3) without time zone,
    "balanceLimitSetBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "openingBalanceCurrent" numeric(10,2),
    "openingBalanceProposed" numeric(10,2),
    "openingBalanceStatus" public."CompanyDealerAccountAdjustmentStatus"
);


ALTER TABLE public."CompanyDealerAccount" OWNER TO poultry360;

--
-- Name: CompanyDealerAccountAdjustment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyDealerAccountAdjustment" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    type public."CompanyDealerAccountAdjustmentType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    notes text,
    "createdByRole" public."CompanyDealerAccountAdjustmentCreatedByRole" NOT NULL,
    "createdById" text NOT NULL,
    status public."CompanyDealerAccountAdjustmentStatus" DEFAULT 'PENDING_ACK'::public."CompanyDealerAccountAdjustmentStatus" NOT NULL,
    "dealerResponseNote" text,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CompanyDealerAccountAdjustment" OWNER TO poultry360;

--
-- Name: CompanyDealerPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyDealerPayment" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    reference text,
    "receiptImageUrl" text,
    "proofImageUrl" text,
    "balanceAfter" numeric(10,2) NOT NULL,
    "recordedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CompanyDealerPayment" OWNER TO poultry360;

--
-- Name: CompanyLedgerEntry; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyLedgerEntry" (
    id text NOT NULL,
    type public."LedgerEntryType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    "runningBalance" numeric(10,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    "companyId" text NOT NULL,
    "companySaleId" text,
    "partyId" text,
    "partyType" text,
    "transactionId" text,
    "transactionType" public."TransactionType",
    "entryType" public."LedgerEntryType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CompanyLedgerEntry" OWNER TO poultry360;

--
-- Name: CompanyPurchase; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyPurchase" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "referenceNumber" text,
    notes text,
    "totalAmount" numeric(12,2) NOT NULL,
    "companyId" text NOT NULL,
    "supplierId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CompanyPurchase" OWNER TO poultry360;

--
-- Name: CompanyPurchaseItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanyPurchaseItem" (
    id text NOT NULL,
    quantity numeric(12,2) NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL,
    "purchaseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "rawMaterialId" text NOT NULL
);


ALTER TABLE public."CompanyPurchaseItem" OWNER TO poultry360;

--
-- Name: CompanySale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanySale" (
    id text NOT NULL,
    "invoiceNumber" text,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "subtotalAmount" numeric(10,2),
    "totalAmount" numeric(10,2) NOT NULL,
    "isCredit" boolean DEFAULT false NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    notes text,
    "companyId" text NOT NULL,
    "dealerId" text NOT NULL,
    "soldById" text NOT NULL,
    "accountId" text,
    "invoiceImageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CompanySale" OWNER TO poultry360;

--
-- Name: CompanySaleItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanySaleItem" (
    id text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "saleId" text NOT NULL,
    "productId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "baseQuantity" numeric(10,2),
    unit text
);


ALTER TABLE public."CompanySaleItem" OWNER TO poultry360;

--
-- Name: CompanySupplierPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CompanySupplierPayment" (
    id text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    reference text,
    "companyId" text NOT NULL,
    "supplierId" text NOT NULL,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."CompanySupplierPayment" OWNER TO poultry360;

--
-- Name: Conversation; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Conversation" (
    id text NOT NULL,
    "farmerId" text NOT NULL,
    "doctorId" text NOT NULL,
    status public."ConversationStatus" DEFAULT 'ACTIVE'::public."ConversationStatus" NOT NULL,
    subject text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Conversation" OWNER TO poultry360;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    category text,
    address text,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    source text DEFAULT 'MANUAL'::text NOT NULL,
    "farmerId" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "archivedById" text,
    "totalSales" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPayments" numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public."Customer" OWNER TO poultry360;

--
-- Name: CustomerTransaction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."CustomerTransaction" (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    reference text,
    "imageUrl" text,
    "customerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


ALTER TABLE public."CustomerTransaction" OWNER TO poultry360;

--
-- Name: Dealer; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Dealer" (
    id text NOT NULL,
    name text NOT NULL,
    contact text NOT NULL,
    address text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "userId" text,
    "ownerId" text,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    classification text DEFAULT 'SELF_CREATED'::text NOT NULL,
    "totalPayments" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPurchases" numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public."Dealer" OWNER TO poultry360;

--
-- Name: DealerCart; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerCart" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "companyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerCart" OWNER TO poultry360;

--
-- Name: DealerCartItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerCartItem" (
    id text NOT NULL,
    "cartId" text NOT NULL,
    "productId" text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerCartItem" OWNER TO poultry360;

--
-- Name: DealerCashDayClose; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerCashDayClose" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "bsDate" text NOT NULL,
    "openingSnapshot" numeric(10,2) NOT NULL,
    "closingSnapshot" numeric(10,2) NOT NULL,
    source public."CashDayCloseSource" NOT NULL,
    "closedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerCashDayClose" OWNER TO poultry360;

--
-- Name: DealerCashMovement; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerCashMovement" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "bsDate" text NOT NULL,
    direction public."CashMovementDirection" NOT NULL,
    amount numeric(10,2) NOT NULL,
    "partyName" text NOT NULL,
    notes text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerCashMovement" OWNER TO poultry360;

--
-- Name: DealerCashSettings; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerCashSettings" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "initialOpening" numeric(10,2) NOT NULL,
    "startBsDate" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerCashSettings" OWNER TO poultry360;

--
-- Name: DealerFarmerAccount; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerFarmerAccount" (
    id text NOT NULL,
    "dealerId" text NOT NULL,
    "farmerId" text NOT NULL,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    "totalSales" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPayments" numeric(10,2) DEFAULT 0 NOT NULL,
    "lastSaleDate" timestamp(3) without time zone,
    "lastPaymentDate" timestamp(3) without time zone,
    "balanceLimit" numeric(10,2),
    "balanceLimitSetAt" timestamp(3) without time zone,
    "balanceLimitSetBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "openingBalanceCurrent" numeric(10,2),
    "openingBalanceStatus" public."DealerFarmerAccountAdjustmentStatus"
);


ALTER TABLE public."DealerFarmerAccount" OWNER TO poultry360;

--
-- Name: DealerFarmerAccountAdjustment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerFarmerAccountAdjustment" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    type public."DealerFarmerAccountAdjustmentType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    notes text,
    "createdByRole" public."DealerFarmerAccountAdjustmentCreatedByRole" NOT NULL,
    "createdById" text NOT NULL,
    status public."DealerFarmerAccountAdjustmentStatus" DEFAULT 'PENDING_ACK'::public."DealerFarmerAccountAdjustmentStatus" NOT NULL,
    "farmerResponseNote" text,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerFarmerAccountAdjustment" OWNER TO poultry360;

--
-- Name: DealerFarmerPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerFarmerPayment" (
    id text NOT NULL,
    "accountId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    reference text,
    "receiptImageUrl" text,
    "proofImageUrl" text,
    "balanceAfter" numeric(10,2) NOT NULL,
    "recordedById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerFarmerPayment" OWNER TO poultry360;

--
-- Name: DealerLedgerEntry; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerLedgerEntry" (
    id text NOT NULL,
    type public."LedgerEntryType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    balance numeric(10,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    reference text,
    "imageUrl" text,
    "dealerId" text NOT NULL,
    "saleId" text,
    "partyId" text,
    "partyType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerLedgerEntry" OWNER TO poultry360;

--
-- Name: DealerManualCompany; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerManualCompany" (
    id text NOT NULL,
    name text NOT NULL,
    phone text,
    address text,
    "dealerId" text NOT NULL,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPurchases" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPayments" numeric(10,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "archivedAt" timestamp(3) without time zone,
    "archivedById" text
);


ALTER TABLE public."DealerManualCompany" OWNER TO poultry360;

--
-- Name: DealerManualCompanyAdjustment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerManualCompanyAdjustment" (
    id text NOT NULL,
    type public."DealerManualCompanyAdjustmentType" DEFAULT 'ADJUSTMENT'::public."DealerManualCompanyAdjustmentType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    "balanceAfter" numeric(10,2) NOT NULL,
    "manualCompanyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerManualCompanyAdjustment" OWNER TO poultry360;

--
-- Name: DealerManualCompanyPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerManualCompanyPayment" (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    "paymentMethod" text DEFAULT 'CASH'::text NOT NULL,
    "paymentDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    reference text,
    "receiptUrl" text,
    "balanceAfter" numeric(10,2) NOT NULL,
    "manualCompanyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "voidedAt" timestamp(3) without time zone,
    "voidedReason" text
);


ALTER TABLE public."DealerManualCompanyPayment" OWNER TO poultry360;

--
-- Name: DealerManualPurchase; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerManualPurchase" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    notes text,
    reference text,
    "manualCompanyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "voidedAt" timestamp(3) without time zone,
    "voidedReason" text,
    "tradeDiscountAmount" numeric(10,2)
);


ALTER TABLE public."DealerManualPurchase" OWNER TO poultry360;

--
-- Name: DealerManualPurchaseItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerManualPurchaseItem" (
    id text NOT NULL,
    "productName" text NOT NULL,
    type public."InventoryItemType" NOT NULL,
    unit text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "baseQuantity" numeric(10,2),
    "costPrice" numeric(10,2) NOT NULL,
    "sellingPrice" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "purchaseId" text NOT NULL,
    "dealerProductId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealerManualPurchaseItem" OWNER TO poultry360;

--
-- Name: DealerProduct; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerProduct" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    type public."InventoryItemType" NOT NULL,
    unit text NOT NULL,
    "costPrice" numeric(10,2) NOT NULL,
    "sellingPrice" numeric(10,2) NOT NULL,
    "currentStock" numeric(10,2) DEFAULT 0 NOT NULL,
    "minStock" numeric(10,2),
    sku text,
    "dealerId" text NOT NULL,
    "companyProductId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "manualCompanyId" text,
    "supplierCompanyId" text,
    "hiddenAt" timestamp(3) without time zone
);


ALTER TABLE public."DealerProduct" OWNER TO poultry360;

--
-- Name: DealerProductTransaction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerProductTransaction" (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    reference text,
    "productId" text NOT NULL,
    "dealerSaleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    unit text
);


ALTER TABLE public."DealerProductTransaction" OWNER TO poultry360;

--
-- Name: DealerProductUnitConversion; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerProductUnitConversion" (
    id text NOT NULL,
    "unitName" text NOT NULL,
    "conversionFactor" numeric(10,4) NOT NULL,
    "dealerProductId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerProductUnitConversion" OWNER TO poultry360;

--
-- Name: DealerSale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerSale" (
    id text NOT NULL,
    "invoiceNumber" text,
    date timestamp(3) without time zone NOT NULL,
    "subtotalAmount" numeric(10,2),
    "totalAmount" numeric(10,2) NOT NULL,
    "paidAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "dueAmount" numeric(10,2),
    "isCredit" boolean DEFAULT false NOT NULL,
    notes text,
    "customerId" text,
    "farmerId" text,
    "dealerId" text NOT NULL,
    "accountId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DealerSale" OWNER TO poultry360;

--
-- Name: DealerSaleItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerSaleItem" (
    id text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    "saleId" text NOT NULL,
    "productId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "baseQuantity" numeric(10,2),
    unit text
);


ALTER TABLE public."DealerSaleItem" OWNER TO poultry360;

--
-- Name: DealerSalePayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DealerSalePayment" (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    "paymentMethod" text,
    "saleId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "linkedLedgerEntryId" text
);


ALTER TABLE public."DealerSalePayment" OWNER TO poultry360;

--
-- Name: DemoEnquiry; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."DemoEnquiry" (
    id text NOT NULL,
    "companyName" text NOT NULL,
    "phoneNumber" text NOT NULL,
    message text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "businessTypes" text[] DEFAULT ARRAY[]::text[] NOT NULL
);


ALTER TABLE public."DemoEnquiry" OWNER TO poultry360;

--
-- Name: EggProduction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."EggProduction" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EggProduction" OWNER TO poultry360;

--
-- Name: EggProductionEntry; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."EggProductionEntry" (
    id text NOT NULL,
    "eggProductionId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."EggProductionEntry" OWNER TO poultry360;

--
-- Name: EggType; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."EggType" (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EggType" OWNER TO poultry360;

--
-- Name: EntityTransaction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."EntityTransaction" (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    amount numeric(10,2) NOT NULL,
    quantity integer,
    "freeQuantity" integer,
    "itemName" text,
    date timestamp(3) without time zone NOT NULL,
    description text,
    reference text,
    "imageUrl" text,
    "dealerId" text,
    "hatcheryId" text,
    "medicineSupplierId" text,
    "customerId" text,
    "inventoryItemId" text,
    "expenseId" text,
    "paymentToPurchaseId" text,
    "entityType" text,
    "entityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "purchaseCategory" public."PurchaseCategory",
    unit text,
    "unitPrice" numeric(10,2),
    "sourceDealerLedgerEntryId" text,
    "expiryDate" timestamp(3) without time zone
);


ALTER TABLE public."EntityTransaction" OWNER TO poultry360;

--
-- Name: Expense; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    quantity numeric(10,2),
    weight numeric(10,2),
    "unitPrice" numeric(10,2),
    "farmId" text,
    "batchId" text,
    "categoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Expense" OWNER TO poultry360;

--
-- Name: Farm; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Farm" (
    id text NOT NULL,
    name text NOT NULL,
    capacity integer NOT NULL,
    description text,
    "ownerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Farm" OWNER TO poultry360;

--
-- Name: FarmerCashDayClose; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."FarmerCashDayClose" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bsDate" text NOT NULL,
    "openingSnapshot" numeric(10,2) NOT NULL,
    "closingSnapshot" numeric(10,2) NOT NULL,
    source public."CashDayCloseSource" NOT NULL,
    "closedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FarmerCashDayClose" OWNER TO poultry360;

--
-- Name: FarmerCashMovement; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."FarmerCashMovement" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "bsDate" text NOT NULL,
    direction public."CashMovementDirection" NOT NULL,
    amount numeric(10,2) NOT NULL,
    "partyName" text NOT NULL,
    notes text,
    "recordedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FarmerCashMovement" OWNER TO poultry360;

--
-- Name: FarmerCashSettings; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."FarmerCashSettings" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "initialOpening" numeric(10,2) NOT NULL,
    "startBsDate" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FarmerCashSettings" OWNER TO poultry360;

--
-- Name: FeedConsumption; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."FeedConsumption" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "feedType" text NOT NULL,
    "batchId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeedConsumption" OWNER TO poultry360;

--
-- Name: Hatchery; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Hatchery" (
    id text NOT NULL,
    name text NOT NULL,
    contact text NOT NULL,
    address text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Hatchery" OWNER TO poultry360;

--
-- Name: HatcheryBatch; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryBatch" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    type public."HatcheryBatchType" DEFAULT 'PARENT_FLOCK'::public."HatcheryBatchType" NOT NULL,
    status public."HatcheryBatchStatus" DEFAULT 'ACTIVE'::public."HatcheryBatchStatus" NOT NULL,
    code text NOT NULL,
    name text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    notes text,
    "initialParents" integer,
    "currentParents" integer,
    "placedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryBatch" OWNER TO poultry360;

--
-- Name: HatcheryBatchExpense; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryBatchExpense" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    type public."HatcheryBatchExpenseType" DEFAULT 'MANUAL'::public."HatcheryBatchExpenseType" NOT NULL,
    category text NOT NULL,
    "itemName" text NOT NULL,
    quantity numeric(12,4),
    unit text,
    "unitPrice" numeric(12,4),
    amount numeric(12,2) NOT NULL,
    note text,
    "inventoryItemId" text,
    "inventoryTxnId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryBatchExpense" OWNER TO poultry360;

--
-- Name: HatcheryBatchMortality; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryBatchMortality" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryBatchMortality" OWNER TO poultry360;

--
-- Name: HatcheryBatchPlacement; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryBatchPlacement" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "inventoryItemId" text NOT NULL,
    quantity integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryBatchPlacement" OWNER TO poultry360;

--
-- Name: HatcheryBusiness; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryBusiness" (
    id text NOT NULL,
    name text NOT NULL,
    contact text NOT NULL,
    address text,
    "ownerId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryBusiness" OWNER TO poultry360;

--
-- Name: HatcheryChickSale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryChickSale" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    grade public."HatcheryChickGrade" NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    "unitPrice" numeric(12,4) NOT NULL,
    amount numeric(12,2) NOT NULL,
    note text,
    "inventoryItemId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "partyId" text
);


ALTER TABLE public."HatcheryChickSale" OWNER TO poultry360;

--
-- Name: HatcheryChickStock; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryChickStock" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    grade public."HatcheryChickGrade" NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryChickStock" OWNER TO poultry360;

--
-- Name: HatcheryChickTxn; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryChickTxn" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    grade public."HatcheryChickGrade" NOT NULL,
    type public."HatcheryChickTxnType" NOT NULL,
    count integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "sourceId" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryChickTxn" OWNER TO poultry360;

--
-- Name: HatcheryEggMove; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggMove" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    "parentBatchId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    count integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryEggMove" OWNER TO poultry360;

--
-- Name: HatcheryEggProduction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggProduction" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryEggProduction" OWNER TO poultry360;

--
-- Name: HatcheryEggProductionLine; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggProductionLine" (
    id text NOT NULL,
    "productionId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    count integer NOT NULL
);


ALTER TABLE public."HatcheryEggProductionLine" OWNER TO poultry360;

--
-- Name: HatcheryEggSale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggSale" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    "unitPrice" numeric(12,4) NOT NULL,
    amount numeric(12,2) NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "partyId" text
);


ALTER TABLE public."HatcheryEggSale" OWNER TO poultry360;

--
-- Name: HatcheryEggStock; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggStock" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryEggStock" OWNER TO poultry360;

--
-- Name: HatcheryEggTxn; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggTxn" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    type public."HatcheryEggTxnType" NOT NULL,
    count integer NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "sourceId" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryEggTxn" OWNER TO poultry360;

--
-- Name: HatcheryEggType; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryEggType" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    name text NOT NULL,
    "isHatchable" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryEggType" OWNER TO poultry360;

--
-- Name: HatcheryHatchResult; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryHatchResult" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    "hatchedA" integer DEFAULT 0 NOT NULL,
    "hatchedB" integer DEFAULT 0 NOT NULL,
    cull integer DEFAULT 0 NOT NULL,
    "lateDead" integer DEFAULT 0 NOT NULL,
    unhatched integer DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryHatchResult" OWNER TO poultry360;

--
-- Name: HatcheryIncubationBatch; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryIncubationBatch" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    "parentBatchId" text NOT NULL,
    "hatchableEggTypeId" text NOT NULL,
    stage public."HatcheryIncubationStage" DEFAULT 'SETTER'::public."HatcheryIncubationStage" NOT NULL,
    code text NOT NULL,
    name text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "eggsSetCount" integer NOT NULL,
    "setterAt" timestamp(3) without time zone,
    "candledAt" timestamp(3) without time zone,
    "transferredAt" timestamp(3) without time zone,
    "hatchedAt" timestamp(3) without time zone,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryIncubationBatch" OWNER TO poultry360;

--
-- Name: HatcheryIncubationLoss; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryIncubationLoss" (
    id text NOT NULL,
    "incubationBatchId" text NOT NULL,
    type public."HatcheryIncubationLossType" NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryIncubationLoss" OWNER TO poultry360;

--
-- Name: HatcheryInventoryItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryInventoryItem" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    "itemType" public."HatcheryInventoryItemType" NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'kg'::text NOT NULL,
    "unitPrice" numeric(12,4) NOT NULL,
    "supplierKey" text DEFAULT 'NONE'::text NOT NULL,
    "currentStock" numeric(12,4) DEFAULT 0 NOT NULL,
    "minStock" numeric(12,4),
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "effectiveUnitCost" numeric(12,4)
);


ALTER TABLE public."HatcheryInventoryItem" OWNER TO poultry360;

--
-- Name: HatcheryInventoryTxn; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryInventoryTxn" (
    id text NOT NULL,
    "itemId" text NOT NULL,
    type public."HatcheryInventoryTxnType" NOT NULL,
    quantity numeric(12,4) NOT NULL,
    "unitPrice" numeric(12,4),
    amount numeric(12,2),
    date timestamp(3) without time zone NOT NULL,
    note text,
    "sourceSupplierTxnId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryInventoryTxn" OWNER TO poultry360;

--
-- Name: HatcheryParentSale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryParentSale" (
    id text NOT NULL,
    "batchId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "partyId" text,
    "totalWeightKg" numeric(12,3) NOT NULL,
    "avgWeightKg" numeric(12,3) NOT NULL,
    "ratePerKg" numeric(12,4) NOT NULL
);


ALTER TABLE public."HatcheryParentSale" OWNER TO poultry360;

--
-- Name: HatcheryParty; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryParty" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    address text,
    "openingBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcheryParty" OWNER TO poultry360;

--
-- Name: HatcheryPartyPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryPartyPayment" (
    id text NOT NULL,
    "partyId" text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    method text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryPartyPayment" OWNER TO poultry360;

--
-- Name: HatcheryPartyTxn; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcheryPartyTxn" (
    id text NOT NULL,
    "partyId" text NOT NULL,
    type public."HatcheryPartyTxnType" NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(12,2) NOT NULL,
    "balanceAfter" numeric(12,2) NOT NULL,
    "sourceType" text,
    "sourceId" text,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."HatcheryPartyTxn" OWNER TO poultry360;

--
-- Name: HatcherySupplier; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcherySupplier" (
    id text NOT NULL,
    "hatcheryOwnerId" text NOT NULL,
    name text NOT NULL,
    contact text,
    address text,
    "openingBalance" numeric(12,2) DEFAULT 0 NOT NULL,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcherySupplier" OWNER TO poultry360;

--
-- Name: HatcherySupplierPurchaseItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcherySupplierPurchaseItem" (
    id text NOT NULL,
    "txnId" text NOT NULL,
    "itemName" text NOT NULL,
    quantity numeric(12,4) NOT NULL,
    "freeQuantity" numeric(12,4) DEFAULT 0 NOT NULL,
    unit text DEFAULT 'kg'::text NOT NULL,
    "unitPrice" numeric(12,4) NOT NULL,
    "totalAmount" numeric(12,2) NOT NULL
);


ALTER TABLE public."HatcherySupplierPurchaseItem" OWNER TO poultry360;

--
-- Name: HatcherySupplierTxn; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."HatcherySupplierTxn" (
    id text NOT NULL,
    "supplierId" text NOT NULL,
    type public."HatcherySupplierTxnType" NOT NULL,
    amount numeric(12,2) NOT NULL,
    "balanceAfter" numeric(12,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    note text,
    "purchaseCategory" public."HatcheryPurchaseCategory",
    "receiptImageUrl" text,
    reference text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."HatcherySupplierTxn" OWNER TO poultry360;

--
-- Name: InventoryItem; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."InventoryItem" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "currentStock" numeric(10,2) DEFAULT 0 NOT NULL,
    unit text NOT NULL,
    "minStock" numeric(10,2),
    "itemType" public."InventoryItemType" DEFAULT 'OTHER'::public."InventoryItemType" NOT NULL,
    "userId" text NOT NULL,
    "categoryId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "unitPrice" numeric(10,2),
    "supplierKey" text,
    "deletedAt" timestamp(3) without time zone,
    "expiryDate" timestamp(3) without time zone,
    "expiryDateKey" text DEFAULT 'NO_EXPIRY'::text NOT NULL
);


ALTER TABLE public."InventoryItem" OWNER TO poultry360;

--
-- Name: InventoryTransaction; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."InventoryTransaction" (
    id text NOT NULL,
    type public."TransactionType" NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalAmount" numeric(10,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    description text,
    "itemId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    unit text,
    "expiryDate" timestamp(3) without time zone
);


ALTER TABLE public."InventoryTransaction" OWNER TO poultry360;

--
-- Name: InventoryUsage; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."InventoryUsage" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2),
    "totalAmount" numeric(10,2),
    notes text,
    "itemId" text NOT NULL,
    "expenseId" text,
    "batchId" text,
    "farmId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."InventoryUsage" OWNER TO poultry360;

--
-- Name: LandingContact; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."LandingContact" (
    id text NOT NULL,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    email text NOT NULL,
    phone text,
    "farmType" text,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LandingContact" OWNER TO poultry360;

--
-- Name: LandingReview; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."LandingReview" (
    id text NOT NULL,
    name text NOT NULL,
    business text NOT NULL,
    address text NOT NULL,
    "phoneNumber" text NOT NULL,
    stars integer NOT NULL,
    review text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LandingReview" OWNER TO poultry360;

--
-- Name: ListForSale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."ListForSale" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "companyName" text NOT NULL,
    category public."ListForSaleCategory" NOT NULL,
    phone text NOT NULL,
    rate numeric(10,2),
    quantity numeric(10,2) NOT NULL,
    unit text NOT NULL,
    "availabilityFrom" timestamp(3) without time zone NOT NULL,
    "availabilityTo" timestamp(3) without time zone NOT NULL,
    "avgWeightKg" numeric(6,2),
    "eggVariants" jsonb,
    "typeVariants" jsonb,
    status public."ListForSaleStatus" DEFAULT 'ACTIVE'::public."ListForSaleStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    address text,
    province text,
    latitude double precision,
    longitude double precision
);


ALTER TABLE public."ListForSale" OWNER TO poultry360;

--
-- Name: MedicineSupplier; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."MedicineSupplier" (
    id text NOT NULL,
    name text NOT NULL,
    contact text NOT NULL,
    address text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MedicineSupplier" OWNER TO poultry360;

--
-- Name: Message; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Message" (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    "senderId" text NOT NULL,
    text text,
    "messageType" public."MessageType" DEFAULT 'TEXT'::public."MessageType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read boolean DEFAULT false NOT NULL,
    edited boolean DEFAULT false NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "attachmentUrl" text,
    "attachmentKey" text,
    "fileName" text,
    "contentType" text,
    "fileSize" integer,
    "durationMs" integer,
    width integer,
    height integer,
    "thumbnailUrl" text,
    "batchShareId" text
);


ALTER TABLE public."Message" OWNER TO poultry360;

--
-- Name: Mortality; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Mortality" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    count integer NOT NULL,
    reason text,
    "saleId" text,
    "batchId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Mortality" OWNER TO poultry360;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "readAt" timestamp(3) without time zone
);


ALTER TABLE public."Notification" OWNER TO poultry360;

--
-- Name: PasswordResetOtp; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."PasswordResetOtp" (
    id text NOT NULL,
    phone text NOT NULL,
    otp text NOT NULL,
    used boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PasswordResetOtp" OWNER TO poultry360;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Product" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    type public."InventoryItemType" NOT NULL,
    unit text NOT NULL,
    "unitSellingPrice" numeric(10,2) NOT NULL,
    "unitCostPrice" numeric(10,2) DEFAULT 0 NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "currentStock" numeric(10,2) DEFAULT 0 NOT NULL,
    "totalPrice" numeric(10,2) NOT NULL,
    "imageUrl" text,
    "supplierId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO poultry360;

--
-- Name: ProductUnitConversion; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."ProductUnitConversion" (
    id text NOT NULL,
    "unitName" text NOT NULL,
    "conversionFactor" numeric(10,4) NOT NULL,
    "productId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductUnitConversion" OWNER TO poultry360;

--
-- Name: ProductionInput; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."ProductionInput" (
    id text NOT NULL,
    quantity numeric(12,2) NOT NULL,
    "productionId" text NOT NULL,
    "rawMaterialId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    "supplierId" text NOT NULL
);


ALTER TABLE public."ProductionInput" OWNER TO poultry360;

--
-- Name: ProductionOutput; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."ProductionOutput" (
    id text NOT NULL,
    "productName" text NOT NULL,
    quantity numeric(12,2) NOT NULL,
    unit text DEFAULT 'kg'::text,
    "productionId" text NOT NULL,
    "productId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ProductionOutput" OWNER TO poultry360;

--
-- Name: ProductionRun; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."ProductionRun" (
    id text NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "referenceNumber" text,
    notes text,
    "companyId" text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductionRun" OWNER TO poultry360;

--
-- Name: PushSubscription; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."PushSubscription" (
    id text NOT NULL,
    "userId" text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone
);


ALTER TABLE public."PushSubscription" OWNER TO poultry360;

--
-- Name: RawMaterial; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."RawMaterial" (
    id text NOT NULL,
    name text NOT NULL,
    unit text NOT NULL,
    "currentStock" numeric(12,2) DEFAULT 0 NOT NULL,
    "companyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."RawMaterial" OWNER TO poultry360;

--
-- Name: Reminder; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Reminder" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    "reminderDate" timestamp(3) without time zone NOT NULL,
    "isNoticed" boolean DEFAULT false NOT NULL,
    "farmId" text,
    "batchId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Reminder" OWNER TO poultry360;

--
-- Name: Sale; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Sale" (
    id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    amount numeric(10,2) NOT NULL,
    quantity numeric(10,2) NOT NULL,
    weight numeric(10,2),
    "unitPrice" numeric(10,2) NOT NULL,
    description text,
    "itemType" public."SalesItemType" DEFAULT 'Chicken_Meat'::public."SalesItemType" NOT NULL,
    "isCredit" boolean DEFAULT false NOT NULL,
    "paidAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "dueAmount" numeric(10,2) DEFAULT 0,
    "farmId" text,
    "batchId" text,
    "categoryId" text NOT NULL,
    "customerId" text,
    "mortalityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "eggTypeId" text,
    "invoiceNumber" text
);


ALTER TABLE public."Sale" OWNER TO poultry360;

--
-- Name: SaleDiscount; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."SaleDiscount" (
    id text NOT NULL,
    type public."DiscountType" NOT NULL,
    value numeric(10,2) NOT NULL,
    scope public."DiscountScope" DEFAULT 'SALE'::public."DiscountScope" NOT NULL,
    "dealerSaleId" text,
    "companySaleId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SaleDiscount" OWNER TO poultry360;

--
-- Name: SaleEggLine; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."SaleEggLine" (
    id text NOT NULL,
    "saleId" text NOT NULL,
    "eggTypeId" text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL
);


ALTER TABLE public."SaleEggLine" OWNER TO poultry360;

--
-- Name: SalePayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."SalePayment" (
    id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    date timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    description text,
    "receiptUrl" text,
    "saleId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SalePayment" OWNER TO poultry360;

--
-- Name: Staff; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Staff" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    name text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone,
    status public."StaffStatus" DEFAULT 'ACTIVE'::public."StaffStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Staff" OWNER TO poultry360;

--
-- Name: StaffPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."StaffPayment" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    amount numeric(12,2) NOT NULL,
    "paidAt" timestamp(3) without time zone NOT NULL,
    note text,
    "receiptImageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StaffPayment" OWNER TO poultry360;

--
-- Name: StaffSalary; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."StaffSalary" (
    id text NOT NULL,
    "staffId" text NOT NULL,
    "monthlyAmount" numeric(12,2) NOT NULL,
    "effectiveFrom" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StaffSalary" OWNER TO poultry360;

--
-- Name: StandardVaccinationSchedule; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."StandardVaccinationSchedule" (
    id text NOT NULL,
    "vaccineName" text NOT NULL,
    "dayFrom" integer NOT NULL,
    "dayTo" integer NOT NULL,
    "isOptional" boolean DEFAULT false NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StandardVaccinationSchedule" OWNER TO poultry360;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Supplier" (
    id text NOT NULL,
    name text NOT NULL,
    contact text,
    address text,
    "companyId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Supplier" OWNER TO poultry360;

--
-- Name: User; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."User" (
    id text NOT NULL,
    phone text NOT NULL,
    name text NOT NULL,
    "companyName" text,
    "CompanyFarmLocation" text,
    password text NOT NULL,
    role public."UserRole" DEFAULT 'OWNER'::public."UserRole" NOT NULL,
    status public."UserStatus" DEFAULT 'PENDING_VERIFICATION'::public."UserStatus" NOT NULL,
    "isOnline" boolean DEFAULT false NOT NULL,
    "lastSeen" timestamp(3) without time zone,
    language public."Language" DEFAULT 'ENGLISH'::public."Language" NOT NULL,
    "calendarType" public."CalendarType" DEFAULT 'AD'::public."CalendarType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO poultry360;

--
-- Name: UserOnboardingPayment; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."UserOnboardingPayment" (
    "userId" text NOT NULL,
    state public."UserOnboardingPaymentState" DEFAULT 'PENDING_PAYMENT'::public."UserOnboardingPaymentState" NOT NULL,
    "lockedUntilApproved" boolean DEFAULT true NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "approvedBy" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedBy" text,
    "rejectionReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserOnboardingPayment" OWNER TO poultry360;

--
-- Name: Vaccination; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."Vaccination" (
    id text NOT NULL,
    "vaccineName" text NOT NULL,
    "scheduledDate" timestamp(3) without time zone NOT NULL,
    "completedDate" timestamp(3) without time zone,
    status public."VaccinationStatus" DEFAULT 'PENDING'::public."VaccinationStatus" NOT NULL,
    notes text,
    "doseNumber" integer DEFAULT 1 NOT NULL,
    "totalDoses" integer DEFAULT 1 NOT NULL,
    "daysBetweenDoses" integer,
    "standardScheduleId" text,
    "batchAge" integer,
    "retryCount" integer DEFAULT 0 NOT NULL,
    "batchId" text,
    "farmId" text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Vaccination" OWNER TO poultry360;

--
-- Name: _CompanyManagedBy; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."_CompanyManagedBy" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_CompanyManagedBy" OWNER TO poultry360;

--
-- Name: _DealerManagers; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."_DealerManagers" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_DealerManagers" OWNER TO poultry360;

--
-- Name: _FarmManagers; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public."_FarmManagers" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


ALTER TABLE public."_FarmManagers" OWNER TO poultry360;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: poultry360
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO poultry360;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."AuditLog" (id, action, "tableName", "recordId", "oldValues", "newValues", "ipAddress", "userAgent", "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Batch; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Batch" (id, "batchNumber", "startDate", "endDate", status, "batchType", "initialChicks", notes, "currentWeight", "farmId", "createdAt", "updatedAt") FROM stdin;
cmna3w4pp002bp101wgv90tfx	Chaitra-14-Khor 2-14-51-33	2026-03-28 00:00:00	2026-03-28 23:59:59	COMPLETED	BROILER	408	\N	2.75	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:06:43.549	2026-03-28 09:30:12.645
cmokzo8b9007snq01s81y159n	Baisakh-25-Ghara 8,9,13,14,15,16	2025-05-08 00:00:00	\N	ACTIVE	LAYERS	16010	\N	\N	cmoiscw9h004xnq01otk5h1pv	2026-04-30 04:33:46.773	2026-04-30 04:33:46.773
cmq8ywcoa0031nr01lqp2d0n8	Jestha-28-Sundabari 10 No.	2026-06-11 00:00:00	\N	ACTIVE	LAYERS	9464	\N	\N	cmq8xtm4v000xnr01buxfymht	2026-06-11 03:58:16.619	2026-06-11 03:58:16.619
cmqoqovv6006knr01xd118ek9	Ashadh-4-Shreegaun 1 No.-10-37-37	2026-06-18 00:00:00	\N	ACTIVE	LAYERS	17144	\N	\N	cmqoqe8xw005wnr01tk7xiryj	2026-06-22 04:52:50.13	2026-06-22 04:52:50.13
\.


--
-- Data for Name: BatchEggInventory; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."BatchEggInventory" (id, "batchId", "eggTypeId", quantity, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BatchNote; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."BatchNote" (id, "batchId", date, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BatchShare; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."BatchShare" (id, "shareToken", "batchId", "farmerId", "sharedWithId", "conversationId", "snapshotData", title, description, "isPublic", "expiresAt", "viewCount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: BatchShareView; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."BatchShareView" (id, "shareId", "viewerId", "ipAddress", "userAgent", "viewedAt") FROM stdin;
\.


--
-- Data for Name: BirdWeight; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."BirdWeight" (id, date, "avgWeight", "sampleCount", source, notes, "batchId", "createdAt", "updatedAt") FROM stdin;
cmna4fz58004np1019q44d6r1	2026-03-28 00:00:00	2.72	287	SALE	Auto-computed from sale #cmna4fz51004hp10179so5z4s	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:22:09.453	2026-03-28 09:22:09.453
cmna4mwmf004vp1013jdabtrr	2026-03-28 00:00:00	2.75	50	SALE	Auto-computed from sale #cmna4mwm8004pp101eju39sqx	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:27:32.776	2026-03-28 09:27:32.776
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Category" (id, name, type, description, "userId", "createdAt", "updatedAt") FROM stdin;
cmn6a06bx000fqr01rt2e97do	Feed	EXPENSE	Feed and nutrition expenses	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:46:45.261	2026-03-25 16:46:45.261
cmn6a06bx000gqr01uddvq4a6	Medicine	EXPENSE	Medicine and vaccination expenses	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:46:45.261	2026-03-25 16:46:45.261
cmn6a06bx000hqr01g4t25sz9	Hatchery	EXPENSE	Hatchery and chick expenses	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:46:45.261	2026-03-25 16:46:45.261
cmn6a06bx000iqr01lga05hy6	Equipment	EXPENSE	Equipment and maintenance expenses	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:46:45.261	2026-03-25 16:46:45.261
cmn6a06bx000jqr01gpdkz2rs	Other	EXPENSE	Other miscellaneous expenses	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:46:45.261	2026-03-25 16:46:45.261
cmn7bp9my0004qk01zm8of61s	Chicken Sales	SALES	Sales of live chickens	cmn69vvcj000cqr01gg2khvs3	2026-03-26 10:22:01.739	2026-03-26 10:22:01.739
cmn7bp9my0005qk01dxbsupfs	Egg Sales	SALES	Sales of eggs	cmn69vvcj000cqr01gg2khvs3	2026-03-26 10:22:01.739	2026-03-26 10:22:01.739
cmn7bp9my0006qk01t59kkln9	Feed Sales	SALES	Sales of feed to other farmers	cmn69vvcj000cqr01gg2khvs3	2026-03-26 10:22:01.739	2026-03-26 10:22:01.739
cmn7bp9my0007qk01fa0lyy2h	Equipment Sales	SALES	Sales of equipment	cmn69vvcj000cqr01gg2khvs3	2026-03-26 10:22:01.739	2026-03-26 10:22:01.739
cmn7bp9my0008qk013voubx5x	Other Sales	SALES	Other sales	cmn69vvcj000cqr01gg2khvs3	2026-03-26 10:22:01.739	2026-03-26 10:22:01.739
cmna3rhmp0013p1012h883l1n	Feed	INVENTORY	Category for Feed items	cmn69vvcj000cqr01gg2khvs3	2026-03-28 09:03:07.009	2026-03-28 09:03:07.009
cmna3uz91001xp101vscc0vvs	Chicks	INVENTORY	Category for Chicks items	cmn69vvcj000cqr01gg2khvs3	2026-03-28 09:05:49.813	2026-03-28 09:05:49.813
cmnbm342p001ilk01kdk4wu88	Feed	EXPENSE	Feed and nutrition expenses	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:23:48.577	2026-03-29 10:23:48.577
cmnbm342p001jlk018oftu1te	Medicine	EXPENSE	Medicine and vaccination expenses	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:23:48.577	2026-03-29 10:23:48.577
cmnbm342p001klk01scdc2bj1	Hatchery	EXPENSE	Hatchery and chick expenses	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:23:48.577	2026-03-29 10:23:48.577
cmnbm342p001llk0144zthsr2	Equipment	EXPENSE	Equipment and maintenance expenses	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:23:48.577	2026-03-29 10:23:48.577
cmnbm342p001mlk01c05hlwyf	Other	EXPENSE	Other miscellaneous expenses	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:23:48.577	2026-03-29 10:23:48.577
cmnbm6a0n001slk013kld57fz	Feed	INVENTORY	Category for Feed items	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:26:16.248	2026-03-29 10:26:16.248
cmnbmc4r40021lk01bbbaph4p	Chicken Sales	SALES	Sales of live chickens	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:30:49.36	2026-03-29 10:30:49.36
cmnbmc4r40022lk01owa4xf7j	Egg Sales	SALES	Sales of eggs	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:30:49.36	2026-03-29 10:30:49.36
cmnbmc4r40023lk01no0embld	Feed Sales	SALES	Sales of feed to other farmers	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:30:49.36	2026-03-29 10:30:49.36
cmnbmc4r40024lk016vlh0ei3	Equipment Sales	SALES	Sales of equipment	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:30:49.36	2026-03-29 10:30:49.36
cmnbmc4r40025lk01jzseob74	Other Sales	SALES	Other sales	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:30:49.36	2026-03-29 10:30:49.36
cmnbmgi4f0029lk01l5nusibe	Chicks	INVENTORY	Category for Chicks items	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:34:13.311	2026-03-29 10:34:13.311
cmnirfkc8000inv01cwotuwfx	Feed	EXPENSE	Feed and nutrition expenses	cmn5w474v0000o401qj8mx3bp	2026-04-03 10:27:50.84	2026-04-03 10:27:50.84
cmnirfkc8000jnv0167daec6k	Medicine	EXPENSE	Medicine and vaccination expenses	cmn5w474v0000o401qj8mx3bp	2026-04-03 10:27:50.84	2026-04-03 10:27:50.84
cmnirfkc8000knv01wf0lr2dk	Hatchery	EXPENSE	Hatchery and chick expenses	cmn5w474v0000o401qj8mx3bp	2026-04-03 10:27:50.84	2026-04-03 10:27:50.84
cmnirfkc8000lnv01f7t1qzng	Equipment	EXPENSE	Equipment and maintenance expenses	cmn5w474v0000o401qj8mx3bp	2026-04-03 10:27:50.84	2026-04-03 10:27:50.84
cmnirfkc8000mnv01c3fxn8t3	Other	EXPENSE	Other miscellaneous expenses	cmn5w474v0000o401qj8mx3bp	2026-04-03 10:27:50.84	2026-04-03 10:27:50.84
cmoisamzz004lnq01tkp78orj	Feed	EXPENSE	Feed and nutrition expenses	cmois9yvt004knq01b2fe36fo	2026-04-28 15:31:42.96	2026-04-28 15:31:42.96
cmoisamzz004mnq01bg2laom2	Medicine	EXPENSE	Medicine and vaccination expenses	cmois9yvt004knq01b2fe36fo	2026-04-28 15:31:42.96	2026-04-28 15:31:42.96
cmoisamzz004nnq01to07jt0o	Hatchery	EXPENSE	Hatchery and chick expenses	cmois9yvt004knq01b2fe36fo	2026-04-28 15:31:42.96	2026-04-28 15:31:42.96
cmoisamzz004onq01ha1xd43r	Equipment	EXPENSE	Equipment and maintenance expenses	cmois9yvt004knq01b2fe36fo	2026-04-28 15:31:42.96	2026-04-28 15:31:42.96
cmoisamzz004pnq01qgd73eu4	Other	EXPENSE	Other miscellaneous expenses	cmois9yvt004knq01b2fe36fo	2026-04-28 15:31:42.96	2026-04-28 15:31:42.96
cmoisfhy90052nq011skfsiir	Chicken Sales	SALES	Sales of live chickens	cmois9yvt004knq01b2fe36fo	2026-04-28 15:35:29.698	2026-04-28 15:35:29.698
cmoisfhy90053nq01r0hgg6ba	Egg Sales	SALES	Sales of eggs	cmois9yvt004knq01b2fe36fo	2026-04-28 15:35:29.698	2026-04-28 15:35:29.698
cmoisfhy90054nq01pzm9hl18	Feed Sales	SALES	Sales of feed to other farmers	cmois9yvt004knq01b2fe36fo	2026-04-28 15:35:29.698	2026-04-28 15:35:29.698
cmoisfhy90055nq017pafputp	Equipment Sales	SALES	Sales of equipment	cmois9yvt004knq01b2fe36fo	2026-04-28 15:35:29.698	2026-04-28 15:35:29.698
cmoisfhya0056nq01vjx8cgzs	Other Sales	SALES	Other sales	cmois9yvt004knq01b2fe36fo	2026-04-28 15:35:29.698	2026-04-28 15:35:29.698
cmokzmyhq007gnq01ormn7ilt	Chicks	INVENTORY	Category for Chicks items	cmois9yvt004knq01b2fe36fo	2026-04-30 04:32:47.39	2026-04-30 04:32:47.39
cmol12cbt0084nq01uwr8pase	Feed	INVENTORY	Category for Feed items	cmois9yvt004knq01b2fe36fo	2026-04-30 05:12:44.777	2026-04-30 05:12:44.777
cmol182tw008onq01qyk3p5tw	Medicine	INVENTORY	Category for Medicine items	cmois9yvt004knq01b2fe36fo	2026-04-30 05:17:12.404	2026-04-30 05:17:12.404
cmopafm5l00b2nq01ms3f1kk3	Feed	EXPENSE	Feed and nutrition expenses	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:05.29	2026-05-03 04:46:05.29
cmopafm5l00b3nq01gknzwzc5	Medicine	EXPENSE	Medicine and vaccination expenses	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:05.29	2026-05-03 04:46:05.29
cmopafm5l00b4nq01ejwpj9ak	Hatchery	EXPENSE	Hatchery and chick expenses	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:05.29	2026-05-03 04:46:05.29
cmopafm5l00b5nq01aofbhhal	Equipment	EXPENSE	Equipment and maintenance expenses	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:05.29	2026-05-03 04:46:05.29
cmopafm5l00b6nq01lc47zmvk	Other	EXPENSE	Other miscellaneous expenses	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:05.29	2026-05-03 04:46:05.29
cmopag0t400b7nq016djsnmkz	Chicken Sales	SALES	Sales of live chickens	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:24.28	2026-05-03 04:46:24.28
cmopag0t400b8nq016gru28kd	Egg Sales	SALES	Sales of eggs	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:24.28	2026-05-03 04:46:24.28
cmopag0t400b9nq01ms9zybh4	Feed Sales	SALES	Sales of feed to other farmers	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:24.28	2026-05-03 04:46:24.28
cmopag0t400banq0199oaetds	Equipment Sales	SALES	Sales of equipment	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:24.28	2026-05-03 04:46:24.28
cmopag0t400bbnq0168mbkp7l	Other Sales	SALES	Other sales	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:46:24.28	2026-05-03 04:46:24.28
cmopam7hr00blnq01zt0nk607	Feed	INVENTORY	Category for Feed items	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:51:12.88	2026-05-03 04:51:12.88
cmopatqmt00c7nq018eq7dtxs	Chicks	INVENTORY	Category for Chicks items	cmopafd8z00b1nq01zcppx8r5	2026-05-03 04:57:04.277	2026-05-03 04:57:04.277
cmq8xzvbp001nnr01s1e7jow2	Medicine	INVENTORY	Category for Medicine items	cmopafd8z00b1nq01zcppx8r5	2026-06-11 03:33:01.141	2026-06-11 03:33:01.141
cmq8y1utb002hnr01cv4gwd7p	Equipment	INVENTORY	Category for Equipment items	cmopafd8z00b1nq01zcppx8r5	2026-06-11 03:34:33.791	2026-06-11 03:34:33.791
cms5yi3yj004vqm01kcoqjl2g	Feed	EXPENSE	Feed and nutrition expenses	cms5yh7jt004qqm01vuu1rojb	2026-07-29 10:43:18.283	2026-07-29 10:43:18.283
cms5yi3yj004wqm01u4j8lkqd	Medicine	EXPENSE	Medicine and vaccination expenses	cms5yh7jt004qqm01vuu1rojb	2026-07-29 10:43:18.283	2026-07-29 10:43:18.283
cms5yi3yj004xqm01dlm8kjos	Hatchery	EXPENSE	Hatchery and chick expenses	cms5yh7jt004qqm01vuu1rojb	2026-07-29 10:43:18.283	2026-07-29 10:43:18.283
cms5yi3yj004yqm01lqzdujhj	Equipment	EXPENSE	Equipment and maintenance expenses	cms5yh7jt004qqm01vuu1rojb	2026-07-29 10:43:18.283	2026-07-29 10:43:18.283
cms5yi3yj004zqm01ltcr84ha	Other	EXPENSE	Other miscellaneous expenses	cms5yh7jt004qqm01vuu1rojb	2026-07-29 10:43:18.283	2026-07-29 10:43:18.283
\.


--
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Company" (id, name, address, "createdAt", "updatedAt", "ownerId") FROM stdin;
cmqa9phgn004inr01cf4lb45b	Khajana	Dang	2026-06-12 01:48:38.183	2026-06-12 01:48:38.183	cmqa9phgh004gnr01kcsln6g2
\.


--
-- Data for Name: CompanyDealerAccount; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyDealerAccount" (id, "companyId", "dealerId", balance, "totalSales", "totalPayments", "lastSaleDate", "lastPaymentDate", "balanceLimit", "balanceLimitSetAt", "balanceLimitSetBy", "createdAt", "updatedAt", "openingBalanceCurrent", "openingBalanceProposed", "openingBalanceStatus") FROM stdin;
\.


--
-- Data for Name: CompanyDealerAccountAdjustment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyDealerAccountAdjustment" (id, "accountId", type, amount, notes, "createdByRole", "createdById", status, "dealerResponseNote", "respondedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: CompanyDealerPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyDealerPayment" (id, "accountId", amount, "paymentMethod", "paymentDate", notes, reference, "receiptImageUrl", "proofImageUrl", "balanceAfter", "recordedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: CompanyLedgerEntry; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyLedgerEntry" (id, type, amount, "runningBalance", date, description, "companyId", "companySaleId", "partyId", "partyType", "transactionId", "transactionType", "entryType", "createdAt") FROM stdin;
\.


--
-- Data for Name: CompanyPurchase; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyPurchase" (id, date, "referenceNumber", notes, "totalAmount", "companyId", "supplierId", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CompanyPurchaseItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanyPurchaseItem" (id, quantity, "unitPrice", "totalAmount", "purchaseId", "createdAt", "rawMaterialId") FROM stdin;
\.


--
-- Data for Name: CompanySale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanySale" (id, "invoiceNumber", date, "subtotalAmount", "totalAmount", "isCredit", "paymentMethod", notes, "companyId", "dealerId", "soldById", "accountId", "invoiceImageUrl", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CompanySaleItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanySaleItem" (id, quantity, "unitPrice", "totalAmount", "saleId", "productId", "createdAt", "baseQuantity", unit) FROM stdin;
\.


--
-- Data for Name: CompanySupplierPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CompanySupplierPayment" (id, amount, "paymentMethod", "paymentDate", notes, reference, "companyId", "supplierId", "recordedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: Conversation; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Conversation" (id, "farmerId", "doctorId", status, subject, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Customer" (id, name, phone, category, address, balance, source, "farmerId", "userId", "createdAt", "updatedAt", "archivedAt", "archivedById", "totalSales", "totalPayments") FROM stdin;
cmn5wjnyr000io4014t7j08fb	Gharthi Poultry 	977 - 			634544.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:29:59.955	2026-03-25 10:29:59.955	\N	\N	0.00	0.00
cmn5wm0ua000mo401roaqdyei	New kissan agro	977 - 			7635.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:31:49.954	2026-03-25 10:31:49.954	\N	\N	0.00	0.00
cmn5wocug000yo4012wdv7dmw	Bijiya Ramiljkla 	977 - 			7400.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:33:38.825	2026-03-25 10:33:38.825	\N	\N	0.00	0.00
cmn5wpila0012o401kjbrewjr	Bhim Bhadhur  Ramiljkla 	977 - 			19475.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:34:32.927	2026-03-25 10:34:32.927	\N	\N	0.00	0.00
cmn5wq04s0016o4014yahzox0	Asharam Chaudhary	977 - 			13835.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:34:55.66	2026-03-25 10:34:55.66	\N	\N	0.00	0.00
cmn5wqiph001ao401pfute89t	Umesh Chaudhary	977 - 			8760.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:35:19.734	2026-03-25 10:35:19.734	\N	\N	0.00	0.00
cmn5wqw7v001eo401utdnshec	Kopila Yogi	977 - 			12155.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:35:37.243	2026-03-25 10:35:37.243	\N	\N	0.00	0.00
cmn5wrqjp001io401nv3ud69l	Tej Oli	977 - 			11860.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:36:16.549	2026-03-25 10:36:16.549	\N	\N	0.00	0.00
cmn5wtswg001mo401et5lidte	Ganga Chaudhary	977 - 			4120.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:37:52.912	2026-03-25 10:37:52.912	\N	\N	0.00	0.00
cmn5wu92e001qo401jg8yi7yr	Parshu Ram Saru	977 - 			58710.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:38:13.862	2026-03-25 10:38:13.862	\N	\N	0.00	0.00
cmn5wvbjv0022o401hn32n9ed	Amar Dangi	977			66645.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:39:03.739	2026-03-25 10:39:34.826	\N	\N	0.00	0.00
cmn5wwk0g0026o401yv59kt41	Babu Ram Neupane	977 - 			156392.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:40:01.36	2026-03-25 10:40:01.36	\N	\N	0.00	0.00
cmn5wwyrn002ao4012j10vo1c	Baliram Gharti	977 - 			157196.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:40:20.483	2026-03-25 10:40:20.483	\N	\N	0.00	0.00
cmn5wxff2002eo4014ra3vnxa	BamNeyshowri 	977 -			471340.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:40:42.063	2026-03-25 10:40:42.063	\N	\N	0.00	0.00
cmn5wxz5r002io401m06n2g7e	Bashanta Devkota	977 -  			66093.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:41:07.647	2026-03-25 10:41:07.647	\N	\N	0.00	0.00
cmn5wyer7002mo401zvcvh9n4	 Bashnata Sharma	977 -			66197.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:41:27.859	2026-03-25 10:41:27.859	\N	\N	0.00	0.00
cmn5wys9m002qo401lzozivyu	Birbal Chau	977 -			758613.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:41:45.371	2026-03-25 10:41:45.371	\N	\N	0.00	0.00
cmn5x0bf1002uo4019g651z9z	Bidhau Chaudhary	977 -			133478.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:42:56.845	2026-03-25 10:42:56.845	\N	\N	0.00	0.00
cmn5x0lj1002yo401uso2ubbf	Bishal Pun	977 - 			50798.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:43:09.949	2026-03-25 10:43:09.949	\N	\N	0.00	0.00
cmn5x116n0032o401eq66bz18	Bishnu Rijal	977 - 			69957.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:43:30.239	2026-03-25 10:43:30.239	\N	\N	0.00	0.00
cmn5x1blp0036o4012ypqdny4	Bishnu malla 	977 - 			81335.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:43:43.742	2026-03-25 10:43:43.742	\N	\N	0.00	0.00
cmn5x1svo003ao401jrg1w1w3	Bohara Poultry 	977 - 			300418.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:44:06.133	2026-03-25 10:44:06.133	\N	\N	0.00	0.00
cmn5x247g003eo4010lt179oa	Chop Lala Khanal	977 - 			98996.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:44:20.812	2026-03-25 10:44:20.812	\N	\N	0.00	0.00
cmn5x2ftm003io401vm9p8egi	Dinesh Chau Majgau	977 - 			140085.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:44:35.866	2026-03-25 10:44:35.866	\N	\N	0.00	0.00
cmn5x2qm6003mo4014d3s2lgw	Deepak Sharma 	977 - 			62384.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:44:49.855	2026-03-25 10:44:49.855	\N	\N	0.00	0.00
cmn5x34lb003qo401xh6mlh3i	Durga Mata Feed Supplier	977 - 			87148.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:45:07.967	2026-03-25 10:45:07.967	\N	\N	0.00	0.00
cmn5x3gxg003uo401w6il4ph8	Ganesh KC	977 - 			147796.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:45:23.956	2026-03-25 10:45:23.956	\N	\N	0.00	0.00
cmn5x3u6b003yo4019x0fbl24	Govinda Chaudhary	977 - 			55005.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:45:41.123	2026-03-25 10:45:41.123	\N	\N	0.00	0.00
cmn5wujgz001uo401wl84xaz6	Bashanta GC 	977 - 			7310.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:38:27.348	2026-04-05 06:50:20.331	\N	\N	7445.00	15000.00
cmn5wnpn4000uo401wwvmc59e	Billu Chaudhary	977 - 			47840.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:33:08.752	2026-04-05 07:09:15.486	\N	\N	50940.00	58160.00
cmn5wv1s8001yo401nypzbgn2	Ranjit Chaudhary	977 - 			318145.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:38:51.08	2026-04-05 07:08:00.362	\N	\N	84105.00	0.00
cmn5xa95i005uo4019vh102ni	Om Prakash Basnet	977 - 			312000.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:50:40.47	2026-04-04 14:10:26.588	2026-04-04 14:10:26.588	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5wi7j0000ao401qblto83l	Parshu  Chaudhary	977 - 			779129.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:28:51.996	2026-04-05 07:08:57.799	\N	\N	48055.00	102000.00
cmn5wbs1z0006o4013qrxxplv	Avash Neupane	9857840565		Tikuligadh	3481575.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:23:52.007	2026-04-05 07:07:46.447	\N	\N	142115.00	151000.00
cmn5wmvdt000qo401adf1txqq	Khinu Chaudhary	977 - 			104612.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:32:29.538	2026-04-05 07:08:38.867	\N	\N	72950.00	0.00
cmn5x9y6k005qo401ce83dddf	Om poultry :	977 - 			6071271.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:50:26.252	2026-04-04 14:10:26.627	2026-04-04 14:10:26.626	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x9eg6005io4012g8a7og4	Narayan Ghimire	977 - 			646630.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:50:00.678	2026-04-04 14:12:15.428	2026-04-04 14:12:15.427	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x93jt005eo401schfl52e	Mukesh Adhikari	977 -			626655.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:49:46.554	2026-04-04 14:12:15.557	2026-04-04 14:12:15.556	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x8u28005ao4016w6swkry	Mohan KC 	977 -			77925.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:49:34.257	2026-04-04 14:12:16.877	2026-04-04 14:12:16.876	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x8j9v0056o401c9awjtz7	Mangal Pariyar	977 - 			293774.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:49:20.276	2026-04-04 14:12:18.686	2026-04-04 14:12:18.685	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x7k02004yo4016r79uboi	Keval KM	977 - 			110662.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:48:34.563	2026-04-04 14:12:27.983	2026-04-04 14:12:27.983	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x79a3004uo4010zgfq3wv	Ishu Musalman	977 -			235785.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:48:20.668	2026-04-04 14:12:28.799	2026-04-04 14:12:28.798	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x5rj1004io401fb7lzlb1	Jhimur Poultry	977 - 			103095.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:47:11.005	2026-04-04 14:12:34.609	2026-04-04 14:12:34.608	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x6rbl004qo401pgikcwxv	Kalika Enterprises 	977 - 			124027.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:47:57.393	2026-04-04 14:12:43.013	2026-04-04 14:12:43.012	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x62o0004mo401wrzomp7c	Kava Poultry	977 - 			238585.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:47:25.44	2026-04-04 14:12:48.567	2026-04-04 14:12:48.567	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x50cc004ao401g057y47v	Hari Paudal 	977 - 			78935.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:46:35.773	2026-04-04 14:13:05.298	2026-04-04 14:13:05.297	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x4pcw0046o4014zkjip50	Hari Narayan Chau:	977 - 			45611.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:46:21.536	2026-04-04 14:13:08.517	2026-04-04 14:13:08.516	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x4fak0042o401ta57xmny	Hari Bhadhur Pun	977 - 			37441.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:46:08.493	2026-04-04 14:15:27.064	2026-04-04 14:15:27.063	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xdnt80072o4015vnijdna	Bunu Budhathoki 	977 - 			5375.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:53:19.436	2026-04-04 14:08:23.621	2026-04-04 14:08:23.62	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xcqew006qo401t6y3dagu	Bikaram Chaudhary	977 - 			18415.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:52:36.153	2026-04-04 14:08:38.28	2026-04-04 14:08:38.28	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xce7z006mo401c65mrdhl	Aashish Paudel 	977 - 			18129.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:52:20.352	2026-04-04 14:08:47.413	2026-04-04 14:08:47.413	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xc2xj006io4018jxtnked	Suraj Shah	977 - 			101722.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:52:05.719	2026-04-04 14:08:55.161	2026-04-04 14:08:55.161	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xbrwl006eo401bbkry8an	Santosh Acharya	977 - 			765844.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:51:51.429	2026-04-04 14:09:02.984	2026-04-04 14:09:02.983	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xbfg4006ao4015zupkvqz	Sandhya Poultry 	977 -			314577.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:51:35.285	2026-04-04 14:09:10.437	2026-04-04 14:09:10.437	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xb67m0066o401u71i3bm7	Sanam Kumar Paudel :	977 - 			116430.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:51:23.315	2026-04-04 14:09:17.701	2026-04-04 14:09:17.701	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xavnz0062o401e3pzoao8	Ruchi Poultry 	977 -			399995.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:51:09.647	2026-04-04 14:09:38.052	2026-04-04 14:09:38.052	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xaioz005yo4015yn791uj	Pashupati 	977 -			128800.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:50:52.835	2026-04-04 14:09:38.054	2026-04-04 14:09:38.054	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xhovo008ao401o0nrs79y	Khuli GC	977 - 			41017.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:56:27.445	2026-04-04 14:07:07.562	2026-04-04 14:07:07.562	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmrym5xbp001qoe01qmmovff8	prem chaudhary	9840634829		Rajpur 6 gangadi	144739.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:23:31.189	2026-07-28 07:47:42.118	\N	\N	0.00	0.00
cmn5xhfy80086o4014fn6ktag	 Jhog Bhadhur Kumar 	977 - 			12390.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:56:15.872	2026-04-04 14:07:22.921	2026-04-04 14:07:22.921	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmnbmr0490045lk01qr8snusq	Eggs XL	9810901501	Chicken	\N	0.00	MANUAL	\N	cmnbm2tdx001hlk01lewrwu1c	2026-03-29 10:42:23.194	2026-03-29 10:42:23.194	\N	\N	0.00	0.00
cmn5xh1yv0082o4010jmjs5nx	Dambar Prasad Chaudhary	977 - 			27860.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:55:57.751	2026-04-04 14:07:30.073	2026-04-04 14:07:30.073	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xgoz0007yo401ln53b0it	Jiban Bhadhur Ramayajhi	977 - 			12260.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:55:40.909	2026-04-04 14:07:35.906	2026-04-04 14:07:35.905	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xg5tc007uo401eo1j3euh	Dinesh chaudhary - Sonpur 	977 -		Sonpur	15512.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:55:16.081	2026-04-04 14:07:44.099	2026-04-04 14:07:44.098	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xfqvg007qo401xg13kgdp	Dinesh Chau - Deupur	977 - 		Deupur	11601.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:54:56.717	2026-04-04 14:07:48.385	2026-04-04 14:07:48.384	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xfd15007mo401rcry6v9q	Gaire Kirana 	977 - 			15252.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:54:38.777	2026-04-04 14:07:53.716	2026-04-04 14:07:53.715	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xf0zo007io4017e7wmdfb	Dulam Das Chaudhary	977 - 			25100.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:54:23.173	2026-04-04 14:07:57.875	2026-04-04 14:07:57.875	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xenmy007eo401x10q1d8p	Dhurba Chaudhary	977 - 			18645.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:54:05.866	2026-04-04 14:08:04.184	2026-04-04 14:08:04.184	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xebo7007ao401c0nj7dcm	Dashrath Chaudhary	977 - 			11870.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:53:50.359	2026-04-04 14:08:08.056	2026-04-04 14:08:08.055	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmrym4tar001moe01rjwz0ye4	punaram budha	9822883518		lamahi 7 banghusri	68892.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:22:39.315	2026-07-24 07:22:39.315	\N	\N	0.00	0.00
cmn5xkbqs008uo401h1ef55de	Rabi Lal Oli	+977			18442.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:58:30.388	2026-04-04 14:06:27.658	2026-04-04 14:06:27.657	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xk02x008qo40182j9e4g8	Prem Lal Dang 	977 - 			62334.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:58:15.273	2026-04-04 14:06:38.769	2026-04-04 14:06:38.768	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xjncx008mo401jv5roobv	Prakash Ghimire	977 - 			40014.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:57:58.785	2026-04-04 14:06:47.478	2026-04-04 14:06:47.477	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xje1a008io4015rek5cns	Nirmal Chau 	977 - 			15028.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:57:46.702	2026-04-04 14:06:54.949	2026-04-04 14:06:54.948	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xispf008eo401gu3s7r3f	Mulli Bdr Adhikari	Unknown			260145.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:57:19.06	2026-04-04 14:07:01.327	2026-04-04 14:07:01.326	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xe2120076o40149w672ar	Chet Ram Chaudhary	977 - 			17677.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:53:37.863	2026-04-04 14:08:14.911	2026-04-04 14:08:14.911	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xdf4c006yo401dsspvboa	Buddha Sapkota	977 - 			33630.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:53:08.173	2026-04-04 14:08:21.575	2026-04-04 14:08:21.574	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5xd2sk006uo401cxf3vccz	Bishnu Gharti	977 - 			19160.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:52:52.196	2026-04-04 14:08:31.241	2026-04-04 14:08:31.241	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x9pfm005mo4010s3sna76	Nareshwor Lamsal:	977 - 			247713.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:50:14.915	2026-04-04 14:10:32.101	2026-04-04 14:10:32.1	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x872s0052o401jgewrrvv	Khagendra Chaudhary- Satbariya	977 - 		Satbariya	52245.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:49:04.469	2026-04-04 14:12:19.54	2026-04-04 14:12:19.539	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5x5f4a004eo401xfv2t8t8	Jaya Kumar Chau:  222618	977 - 			222618.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:46:54.922	2026-04-04 14:12:56.434	2026-04-04 14:12:56.433	cmn5w474v0000o401qj8mx3bp	0.00	0.00
cmn5wj1i7000eo401xb20bno6	Buddhi Ram Chaudhary	977 - 			361350.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-25 10:29:30.847	2026-04-05 07:09:34.412	\N	\N	33090.00	44000.00
cmryllo9r000ooe01185lpxmk	Dilraj budha	1111111		lamahi 5 amiliya	250975.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:07:46.335	2026-07-24 07:07:46.335	\N	\N	0.00	0.00
cmnle3wuq009rqs017tytg5th	Cash-new	........			0.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-04-05 06:38:10.706	2026-04-05 06:47:19.631	\N	\N	7520.00	7520.00
cmne6dutr00aslk0126ljhd9o	Avishek Chaudhary	977 -		Majgau	0.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-03-31 05:27:34.479	2026-04-05 06:47:53.483	\N	\N	14440.00	14440.00
cmrylvqs70016oe01gdu7s37w	laxmi chaudhary	9844714376		lamahi 4 ghumna	16320.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:15:36.152	2026-07-24 07:15:36.152	\N	\N	0.00	0.00
cmrym7eok001uoe01rqy2c94p	raj kumari chaudhary	980-9769265		Gadhawa 5	121908.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:24:40.341	2026-07-24 07:24:40.341	\N	\N	0.00	0.00
cmnldx9rh0089qs01ol2n4x89	Unique Nasta	----			-4990.00	MANUAL	\N	cmn5w474v0000o401qj8mx3bp	2026-04-05 06:33:00.845	2026-04-05 06:53:03.855	\N	\N	3760.00	8750.00
cmrylr1b4000woe01ujs6py15	Bishnu bhandari	+977 980-6269938		gadawa 6	66147.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:11:56.512	2026-07-24 07:17:40.52	\N	\N	0.00	0.00
cmryloywg000soe01iqyiiboi	Narayan ghimire	974-9744819		lamahi 6	322016.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:10:20.08	2026-07-28 08:30:43.452	\N	\N	56240.00	0.00
cmrylu66h0012oe01s8q32yli	ganga gharti	9845752118		lamahi 5	100144.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:14:22.793	2026-07-28 08:21:41.67	\N	\N	19925.00	0.00
cms1hb25i0042lr0172meho0y	Ekendra gharti	+977 9868988062	Farmer	Lamahi 8 uchanimbu	236482.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-26 07:30:51.174	2026-07-28 08:28:49.69	\N	\N	64560.00	0.00
cmrym1ybw001eoe01jqvt5wio	Mukunda shaha	9866929203		lamahi 6	278400.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:20:25.868	2026-07-28 08:28:06.975	\N	\N	35865.00	0.00
cms1nbwqf006clr01e7ocsvpz	Sauriram chaudhary	9847903374	Farmer	Lamahi 4	470545.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-26 10:19:28.503	2026-07-28 08:33:21.75	\N	\N	45435.00	0.00
cms3cr1fl001emy01zhsnma9g	Avash Neupane	\N	\N	\N	20.00	MANUAL	\N	cms3cp2f5000wmy01vfs59bcr	2026-07-27 14:58:51.009	2026-07-28 01:52:19.764	\N	\N	56.00	136.00
cms4e3aom004tth01ukh8y1co	Cash	\N	\N	\N	7650.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-28 08:24:08.662	2026-07-28 08:31:30.401	\N	\N	7650.00	0.00
cmrym36se001ioe01lqoi4vqg	mahes budhathiki	9822932674		Gadawa 5	116039.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:21:23.487	2026-07-28 09:10:44.897	\N	\N	50500.00	0.00
cmrylt07x000yoe01u5fanx1t	dasrath bhandari	9707778638		rajpur 5	148302.00	MANUAL	\N	cmrylfcpv000koe016l646xxp	2026-07-24 07:13:28.413	2026-07-28 08:26:03.339	\N	\N	31375.00	0.00
\.


--
-- Data for Name: CustomerTransaction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."CustomerTransaction" (id, type, amount, date, description, reference, "imageUrl", "customerId", "createdAt", "updatedAt", "deletedAt") FROM stdin;
cmn5wbs220008o401qgvcoabm	OPENING_BALANCE	3483200.00	2026-03-25 10:23:52.01	Opening balance	\N	\N	cmn5wbs1z0006o4013qrxxplv	2026-03-25 10:23:52.011	2026-03-25 10:23:52.011	\N
cmn5wi7j2000co401zdpfh2j5	OPENING_BALANCE	832704.00	2026-03-25 10:28:51.998	Opening balance	\N	\N	cmn5wi7j0000ao401qblto83l	2026-03-25 10:28:51.999	2026-03-25 10:28:51.999	\N
cmn5wj1ia000go4013vq09xs8	OPENING_BALANCE	372890.00	2026-03-25 10:29:30.849	Opening balance	\N	\N	cmn5wj1i7000eo401xb20bno6	2026-03-25 10:29:30.85	2026-03-25 10:29:30.85	\N
cmn5wjnys000ko4017nth7my1	OPENING_BALANCE	634544.00	2026-03-25 10:29:59.956	Opening balance	\N	\N	cmn5wjnyr000io4014t7j08fb	2026-03-25 10:29:59.957	2026-03-25 10:29:59.957	\N
cmn5wm0ub000oo401o52cpd7m	OPENING_BALANCE	7635.00	2026-03-25 10:31:49.955	Opening balance	\N	\N	cmn5wm0ua000mo401roaqdyei	2026-03-25 10:31:49.955	2026-03-25 10:31:49.955	\N
cmn5wmvdw000so401y20o5nr1	OPENING_BALANCE	24442.00	2026-03-25 10:32:29.54	Opening balance	\N	\N	cmn5wmvdt000qo401adf1txqq	2026-03-25 10:32:29.541	2026-03-25 10:32:29.541	\N
cmn5wnpn5000wo401387d1a85	OPENING_BALANCE	55060.00	2026-03-25 10:33:08.753	Opening balance	\N	\N	cmn5wnpn4000uo401wwvmc59e	2026-03-25 10:33:08.754	2026-03-25 10:33:08.754	\N
cmn5wocui0010o401zednqhjn	OPENING_BALANCE	7400.00	2026-03-25 10:33:38.825	Opening balance	\N	\N	cmn5wocug000yo4012wdv7dmw	2026-03-25 10:33:38.826	2026-03-25 10:33:38.826	\N
cmn5wpilc0014o401i1metn5o	OPENING_BALANCE	19475.00	2026-03-25 10:34:32.927	Opening balance	\N	\N	cmn5wpila0012o401kjbrewjr	2026-03-25 10:34:32.928	2026-03-25 10:34:32.928	\N
cmn5wq04v0018o401qw69styk	OPENING_BALANCE	13835.00	2026-03-25 10:34:55.662	Opening balance	\N	\N	cmn5wq04s0016o4014yahzox0	2026-03-25 10:34:55.663	2026-03-25 10:34:55.663	\N
cmn5wqipj001co4017vc10mok	OPENING_BALANCE	8760.00	2026-03-25 10:35:19.735	Opening balance	\N	\N	cmn5wqiph001ao401pfute89t	2026-03-25 10:35:19.735	2026-03-25 10:35:19.735	\N
cmn5wqw7w001go4010ty23qb3	OPENING_BALANCE	12155.00	2026-03-25 10:35:37.244	Opening balance	\N	\N	cmn5wqw7v001eo401utdnshec	2026-03-25 10:35:37.245	2026-03-25 10:35:37.245	\N
cmn5wrqjr001ko401jx6iimy0	OPENING_BALANCE	11860.00	2026-03-25 10:36:16.55	Opening balance	\N	\N	cmn5wrqjp001io401nv3ud69l	2026-03-25 10:36:16.551	2026-03-25 10:36:16.551	\N
cmn5wtswh001oo401zf563301	OPENING_BALANCE	4120.00	2026-03-25 10:37:52.913	Opening balance	\N	\N	cmn5wtswg001mo401et5lidte	2026-03-25 10:37:52.914	2026-03-25 10:37:52.914	\N
cmn5wu92f001so401nlmzo220	OPENING_BALANCE	58710.00	2026-03-25 10:38:13.863	Opening balance	\N	\N	cmn5wu92e001qo401jg8yi7yr	2026-03-25 10:38:13.863	2026-03-25 10:38:13.863	\N
cmn5wujh2001wo401wvev19pm	OPENING_BALANCE	14865.00	2026-03-25 10:38:27.35	Opening balance	\N	\N	cmn5wujgz001uo401wl84xaz6	2026-03-25 10:38:27.351	2026-03-25 10:38:27.351	\N
cmn5wv1s90020o401a15h00nq	OPENING_BALANCE	234040.00	2026-03-25 10:38:51.081	Opening balance	\N	\N	cmn5wv1s8001yo401nypzbgn2	2026-03-25 10:38:51.081	2026-03-25 10:38:51.081	\N
cmn5wvzjb0024o401a2knwjgw	OPENING_BALANCE	66645.00	2026-03-25 10:39:34.822	Opening balance	\N	\N	cmn5wvbjv0022o401hn32n9ed	2026-03-25 10:39:34.823	2026-03-25 10:39:34.823	\N
cmn5wwk0r0028o4010bk3b56j	OPENING_BALANCE	156392.00	2026-03-25 10:40:01.37	Opening balance	\N	\N	cmn5wwk0g0026o401yv59kt41	2026-03-25 10:40:01.371	2026-03-25 10:40:01.371	\N
cmn5wwyro002co401588w2ppk	OPENING_BALANCE	157196.00	2026-03-25 10:40:20.484	Opening balance	\N	\N	cmn5wwyrn002ao4012j10vo1c	2026-03-25 10:40:20.485	2026-03-25 10:40:20.485	\N
cmn5wxff5002go401egept8aa	OPENING_BALANCE	471340.00	2026-03-25 10:40:42.064	Opening balance	\N	\N	cmn5wxff2002eo4014ra3vnxa	2026-03-25 10:40:42.065	2026-03-25 10:40:42.065	\N
cmn5wxz5t002ko4017i7az3zy	OPENING_BALANCE	66093.00	2026-03-25 10:41:07.648	Opening balance	\N	\N	cmn5wxz5r002io401m06n2g7e	2026-03-25 10:41:07.649	2026-03-25 10:41:07.649	\N
cmn5wyer8002oo401nnhs4moa	OPENING_BALANCE	66197.00	2026-03-25 10:41:27.86	Opening balance	\N	\N	cmn5wyer7002mo401zvcvh9n4	2026-03-25 10:41:27.86	2026-03-25 10:41:27.86	\N
cmn5wys9o002so401v2lzf4w0	OPENING_BALANCE	758613.00	2026-03-25 10:41:45.371	Opening balance	\N	\N	cmn5wys9m002qo401lzozivyu	2026-03-25 10:41:45.372	2026-03-25 10:41:45.372	\N
cmn5x0bf3002wo401tahkic8q	OPENING_BALANCE	133478.00	2026-03-25 10:42:56.846	Opening balance	\N	\N	cmn5x0bf1002uo4019g651z9z	2026-03-25 10:42:56.847	2026-03-25 10:42:56.847	\N
cmn5x0lj20030o401nf0gr17p	OPENING_BALANCE	50798.00	2026-03-25 10:43:09.95	Opening balance	\N	\N	cmn5x0lj1002yo401uso2ubbf	2026-03-25 10:43:09.95	2026-03-25 10:43:09.95	\N
cmn5x116o0034o401q3k1bima	OPENING_BALANCE	69957.00	2026-03-25 10:43:30.239	Opening balance	\N	\N	cmn5x116n0032o401eq66bz18	2026-03-25 10:43:30.24	2026-03-25 10:43:30.24	\N
cmn5x1bls0038o401gbsheoac	OPENING_BALANCE	81335.00	2026-03-25 10:43:43.744	Opening balance	\N	\N	cmn5x1blp0036o4012ypqdny4	2026-03-25 10:43:43.744	2026-03-25 10:43:43.744	\N
cmn5x1svq003co40169wsf9um	OPENING_BALANCE	300418.00	2026-03-25 10:44:06.133	Opening balance	\N	\N	cmn5x1svo003ao401jrg1w1w3	2026-03-25 10:44:06.134	2026-03-25 10:44:06.134	\N
cmn5x247h003go401s0vnq4el	OPENING_BALANCE	98996.00	2026-03-25 10:44:20.813	Opening balance	\N	\N	cmn5x247g003eo4010lt179oa	2026-03-25 10:44:20.813	2026-03-25 10:44:20.813	\N
cmn5x2ftn003ko4018700v7de	OPENING_BALANCE	140085.00	2026-03-25 10:44:35.867	Opening balance	\N	\N	cmn5x2ftm003io401vm9p8egi	2026-03-25 10:44:35.868	2026-03-25 10:44:35.868	\N
cmn5x2qm9003oo401tisctycl	OPENING_BALANCE	62384.00	2026-03-25 10:44:49.857	Opening balance	\N	\N	cmn5x2qm6003mo4014d3s2lgw	2026-03-25 10:44:49.857	2026-03-25 10:44:49.857	\N
cmn5x34lc003so401zswjoo73	OPENING_BALANCE	87148.00	2026-03-25 10:45:07.968	Opening balance	\N	\N	cmn5x34lb003qo401xh6mlh3i	2026-03-25 10:45:07.969	2026-03-25 10:45:07.969	\N
cmn5x3gxh003wo401aup9ptx1	OPENING_BALANCE	147796.00	2026-03-25 10:45:23.957	Opening balance	\N	\N	cmn5x3gxg003uo401w6il4ph8	2026-03-25 10:45:23.958	2026-03-25 10:45:23.958	\N
cmn5x3u6c0040o401bixr335t	OPENING_BALANCE	55005.00	2026-03-25 10:45:41.124	Opening balance	\N	\N	cmn5x3u6b003yo4019x0fbl24	2026-03-25 10:45:41.124	2026-03-25 10:45:41.124	\N
cmn5x4fam0044o401ies7gg1e	OPENING_BALANCE	37441.00	2026-03-25 10:46:08.494	Opening balance	\N	\N	cmn5x4fak0042o401ta57xmny	2026-03-25 10:46:08.495	2026-03-25 10:46:08.495	\N
cmn5x4pcx0048o401nfuhkskg	OPENING_BALANCE	45611.00	2026-03-25 10:46:21.537	Opening balance	\N	\N	cmn5x4pcw0046o4014zkjip50	2026-03-25 10:46:21.537	2026-03-25 10:46:21.537	\N
cmn5x50ce004co401tnvgn1cu	OPENING_BALANCE	78935.00	2026-03-25 10:46:35.773	Opening balance	\N	\N	cmn5x50cc004ao401g057y47v	2026-03-25 10:46:35.774	2026-03-25 10:46:35.774	\N
cmn5x5f4b004go401ieoo6vqa	OPENING_BALANCE	222618.00	2026-03-25 10:46:54.923	Opening balance	\N	\N	cmn5x5f4a004eo401xfv2t8t8	2026-03-25 10:46:54.924	2026-03-25 10:46:54.924	\N
cmn5x5rj3004ko401bjcnuhmv	OPENING_BALANCE	103095.00	2026-03-25 10:47:11.007	Opening balance	\N	\N	cmn5x5rj1004io401fb7lzlb1	2026-03-25 10:47:11.007	2026-03-25 10:47:11.007	\N
cmn5x62o1004oo401wh8h13jf	OPENING_BALANCE	238585.00	2026-03-25 10:47:25.441	Opening balance	\N	\N	cmn5x62o0004mo401wrzomp7c	2026-03-25 10:47:25.441	2026-03-25 10:47:25.441	\N
cmn5x6rbm004so401hq9vtt4k	OPENING_BALANCE	124027.00	2026-03-25 10:47:57.394	Opening balance	\N	\N	cmn5x6rbl004qo401pgikcwxv	2026-03-25 10:47:57.395	2026-03-25 10:47:57.395	\N
cmn5x79a5004wo40103m5nduf	OPENING_BALANCE	235785.00	2026-03-25 10:48:20.668	Opening balance	\N	\N	cmn5x79a3004uo4010zgfq3wv	2026-03-25 10:48:20.669	2026-03-25 10:48:20.669	\N
cmn5x7k050050o401txdh8gtg	OPENING_BALANCE	110662.00	2026-03-25 10:48:34.565	Opening balance	\N	\N	cmn5x7k02004yo4016r79uboi	2026-03-25 10:48:34.566	2026-03-25 10:48:34.566	\N
cmn5x872u0054o401awm2j9p2	OPENING_BALANCE	52245.00	2026-03-25 10:49:04.469	Opening balance	\N	\N	cmn5x872s0052o401jgewrrvv	2026-03-25 10:49:04.47	2026-03-25 10:49:04.47	\N
cmn5x8j9x0058o401nygdjrs5	OPENING_BALANCE	293774.00	2026-03-25 10:49:20.277	Opening balance	\N	\N	cmn5x8j9v0056o401c9awjtz7	2026-03-25 10:49:20.277	2026-03-25 10:49:20.277	\N
cmn5x8u2a005co401b3dt82qv	OPENING_BALANCE	77925.00	2026-03-25 10:49:34.257	Opening balance	\N	\N	cmn5x8u28005ao4016w6swkry	2026-03-25 10:49:34.258	2026-03-25 10:49:34.258	\N
cmn5x93jv005go4011fs84k4r	OPENING_BALANCE	626655.00	2026-03-25 10:49:46.555	Opening balance	\N	\N	cmn5x93jt005eo401schfl52e	2026-03-25 10:49:46.555	2026-03-25 10:49:46.555	\N
cmn5x9eg9005ko401h6sldxij	OPENING_BALANCE	646630.00	2026-03-25 10:50:00.681	Opening balance	\N	\N	cmn5x9eg6005io4012g8a7og4	2026-03-25 10:50:00.682	2026-03-25 10:50:00.682	\N
cmn5x9pfo005oo401s4wmec21	OPENING_BALANCE	247713.00	2026-03-25 10:50:14.915	Opening balance	\N	\N	cmn5x9pfm005mo4010s3sna76	2026-03-25 10:50:14.916	2026-03-25 10:50:14.916	\N
cmn5x9y6l005so401hvm0kqmd	OPENING_BALANCE	6071271.00	2026-03-25 10:50:26.253	Opening balance	\N	\N	cmn5x9y6k005qo401ce83dddf	2026-03-25 10:50:26.253	2026-03-25 10:50:26.253	\N
cmn5xa95j005wo401y0kkic8s	OPENING_BALANCE	312000.00	2026-03-25 10:50:40.471	Opening balance	\N	\N	cmn5xa95i005uo4019vh102ni	2026-03-25 10:50:40.472	2026-03-25 10:50:40.472	\N
cmn5xaip00060o401ny2iw6jf	OPENING_BALANCE	128800.00	2026-03-25 10:50:52.836	Opening balance	\N	\N	cmn5xaioz005yo4015yn791uj	2026-03-25 10:50:52.837	2026-03-25 10:50:52.837	\N
cmn5xavo00064o4014l4x2frq	OPENING_BALANCE	399995.00	2026-03-25 10:51:09.648	Opening balance	\N	\N	cmn5xavnz0062o401e3pzoao8	2026-03-25 10:51:09.649	2026-03-25 10:51:09.649	\N
cmn5xb67n0068o401aok5s385	OPENING_BALANCE	116430.00	2026-03-25 10:51:23.315	Opening balance	\N	\N	cmn5xb67m0066o401u71i3bm7	2026-03-25 10:51:23.316	2026-03-25 10:51:23.316	\N
cmn5xbfg6006co401znk80wpf	OPENING_BALANCE	314577.00	2026-03-25 10:51:35.285	Opening balance	\N	\N	cmn5xbfg4006ao4015zupkvqz	2026-03-25 10:51:35.286	2026-03-25 10:51:35.286	\N
cmn5xbrwm006go401667o2nq9	OPENING_BALANCE	765844.00	2026-03-25 10:51:51.43	Opening balance	\N	\N	cmn5xbrwl006eo401bbkry8an	2026-03-25 10:51:51.431	2026-03-25 10:51:51.431	\N
cmn5xc2xk006ko401koknxl38	OPENING_BALANCE	101722.00	2026-03-25 10:52:05.72	Opening balance	\N	\N	cmn5xc2xj006io4018jxtnked	2026-03-25 10:52:05.72	2026-03-25 10:52:05.72	\N
cmn5xce81006oo4015dbw34cx	OPENING_BALANCE	18129.00	2026-03-25 10:52:20.352	Opening balance	\N	\N	cmn5xce7z006mo401c65mrdhl	2026-03-25 10:52:20.353	2026-03-25 10:52:20.353	\N
cmn5xcqex006so4010y482lct	OPENING_BALANCE	18415.00	2026-03-25 10:52:36.153	Opening balance	\N	\N	cmn5xcqew006qo401t6y3dagu	2026-03-25 10:52:36.154	2026-03-25 10:52:36.154	\N
cmn5xdnt90074o401wiy2wsqw	OPENING_BALANCE	5375.00	2026-03-25 10:53:19.437	Opening balance	\N	\N	cmn5xdnt80072o4015vnijdna	2026-03-25 10:53:19.438	2026-03-25 10:53:19.438	\N
cmn5xd2sl006wo40102ncgdsy	OPENING_BALANCE	19160.00	2026-03-25 10:52:52.197	Opening balance	\N	\N	cmn5xd2sk006uo401cxf3vccz	2026-03-25 10:52:52.198	2026-03-25 10:52:52.198	\N
cmn5xdf4e0070o401pwj8vpon	OPENING_BALANCE	33630.00	2026-03-25 10:53:08.173	Opening balance	\N	\N	cmn5xdf4c006yo401dsspvboa	2026-03-25 10:53:08.174	2026-03-25 10:53:08.174	\N
cmn5xe2150078o4018buzq67q	OPENING_BALANCE	17677.00	2026-03-25 10:53:37.865	Opening balance	\N	\N	cmn5xe2120076o40149w672ar	2026-03-25 10:53:37.866	2026-03-25 10:53:37.866	\N
cmn5xebo8007co4017recvbry	OPENING_BALANCE	11870.00	2026-03-25 10:53:50.36	Opening balance	\N	\N	cmn5xebo7007ao401c0nj7dcm	2026-03-25 10:53:50.361	2026-03-25 10:53:50.361	\N
cmn5xenmz007go401aedq2s5n	OPENING_BALANCE	18645.00	2026-03-25 10:54:05.867	Opening balance	\N	\N	cmn5xenmy007eo401x10q1d8p	2026-03-25 10:54:05.868	2026-03-25 10:54:05.868	\N
cmn5xf0zq007ko401eh0vbwwo	OPENING_BALANCE	25100.00	2026-03-25 10:54:23.173	Opening balance	\N	\N	cmn5xf0zo007io4017e7wmdfb	2026-03-25 10:54:23.174	2026-03-25 10:54:23.174	\N
cmn5xfd17007oo40124g0lfto	OPENING_BALANCE	15252.00	2026-03-25 10:54:38.778	Opening balance	\N	\N	cmn5xfd15007mo401rcry6v9q	2026-03-25 10:54:38.779	2026-03-25 10:54:38.779	\N
cmn5xfqvh007so401db930jru	OPENING_BALANCE	11601.00	2026-03-25 10:54:56.717	Opening balance	\N	\N	cmn5xfqvg007qo401xg13kgdp	2026-03-25 10:54:56.718	2026-03-25 10:54:56.718	\N
cmn5xg5ti007wo401sj9bfig7	OPENING_BALANCE	15512.00	2026-03-25 10:55:16.085	Opening balance	\N	\N	cmn5xg5tc007uo401eo1j3euh	2026-03-25 10:55:16.086	2026-03-25 10:55:16.086	\N
cmn5xgoz20080o4018aekxj15	OPENING_BALANCE	12260.00	2026-03-25 10:55:40.909	Opening balance	\N	\N	cmn5xgoz0007yo401ln53b0it	2026-03-25 10:55:40.91	2026-03-25 10:55:40.91	\N
cmn5xh1yw0084o4011g8j4xzh	OPENING_BALANCE	27860.00	2026-03-25 10:55:57.752	Opening balance	\N	\N	cmn5xh1yv0082o4010jmjs5nx	2026-03-25 10:55:57.753	2026-03-25 10:55:57.753	\N
cmn5xhfy90088o4014j1iyi0g	OPENING_BALANCE	12390.00	2026-03-25 10:56:15.873	Opening balance	\N	\N	cmn5xhfy80086o4014fn6ktag	2026-03-25 10:56:15.874	2026-03-25 10:56:15.874	\N
cmn5xhovq008co401jb8r2k39	OPENING_BALANCE	41017.00	2026-03-25 10:56:27.446	Opening balance	\N	\N	cmn5xhovo008ao401o0nrs79y	2026-03-25 10:56:27.446	2026-03-25 10:56:27.446	\N
cmn5xisph008go401hm2otxlg	OPENING_BALANCE	34080.00	2026-03-25 10:57:19.061	Opening balance	\N	\N	cmn5xispf008eo401gu3s7r3f	2026-03-25 10:57:19.062	2026-03-25 10:57:19.062	\N
cmn5xje1b008ko4011ol6ggxx	OPENING_BALANCE	15028.00	2026-03-25 10:57:46.703	Opening balance	\N	\N	cmn5xje1a008io4015rek5cns	2026-03-25 10:57:46.704	2026-03-25 10:57:46.704	\N
cmn5xjncy008oo401n97izvao	OPENING_BALANCE	40014.00	2026-03-25 10:57:58.785	Opening balance	\N	\N	cmn5xjncx008mo401jv5roobv	2026-03-25 10:57:58.786	2026-03-25 10:57:58.786	\N
cmn5xk02y008so4011uipi2s9	OPENING_BALANCE	62334.00	2026-03-25 10:58:15.274	Opening balance	\N	\N	cmn5xk02x008qo40182j9e4g8	2026-03-25 10:58:15.275	2026-03-25 10:58:15.275	\N
cmn5xkbqt008wo401wz5a8e4s	OPENING_BALANCE	18442.00	2026-03-25 10:58:30.389	Opening balance	\N	\N	cmn5xkbqs008uo401h1ef55de	2026-03-25 10:58:30.39	2026-03-25 10:58:30.39	\N
cmn60esp9000bqr01qtu2nr1l	OPENING_BALANCE	260145.00	2026-03-25 12:18:11.276	Opening balance	\N	\N	cmn5xispf008eo401gu3s7r3f	2026-03-25 12:18:11.277	2026-03-25 12:18:11.277	\N
cmnkee7i3005snv01ip38twhb	OPENING_BALANCE	31662.00	2026-04-04 13:58:24.89	Opening balance	\N	\N	cmn5wmvdt000qo401adf1txqq	2026-04-04 13:58:24.891	2026-04-04 13:58:24.891	\N
cmnkefmsp005ynv01gz5bnakx	OPENING_BALANCE	833074.00	2026-04-04 13:59:31.369	Opening balance	\N	\N	cmn5wi7j0000ao401qblto83l	2026-04-04 13:59:31.37	2026-04-04 13:59:31.37	\N
cmnkegghc0064nv01az6eqge7	OPENING_BALANCE	3490460.00	2026-04-04 14:00:09.839	Opening balance	\N	\N	cmn5wbs1z0006o4013qrxxplv	2026-04-04 14:00:09.84	2026-04-04 14:00:09.84	\N
cmnkeirmi006anv01c9finex5	OPENING_BALANCE	372260.00	2026-04-04 14:01:57.594	Opening balance	\N	\N	cmn5wj1i7000eo401xb20bno6	2026-04-04 14:01:57.594	2026-04-04 14:01:57.594	\N
cmnkekckt006knv01e67fgxj8	OPENING_BALANCE	55060.00	2026-04-04 14:03:11.405	Opening balance	\N	\N	cmn5wnpn4000uo401wwvmc59e	2026-04-04 14:03:11.405	2026-04-04 14:03:11.405	\N
cmryllo9t000qoe013dztpwl7	OPENING_BALANCE	250975.00	2026-07-24 07:07:46.337	Opening balance	\N	\N	cmryllo9r000ooe01185lpxmk	2026-07-24 07:07:46.337	2026-07-24 07:07:46.337	\N
cmryloywj000uoe01u8qghg5n	OPENING_BALANCE	265776.00	2026-07-24 07:10:20.083	Opening balance	\N	\N	cmryloywg000soe01iqyiiboi	2026-07-24 07:10:20.083	2026-07-24 07:10:20.083	\N
cmrylt07y0010oe01ujgecf6a	OPENING_BALANCE	116927.00	2026-07-24 07:13:28.414	Opening balance	\N	\N	cmrylt07x000yoe01u5fanx1t	2026-07-24 07:13:28.414	2026-07-24 07:13:28.414	\N
cmrylu66k0014oe01atgz7kv5	OPENING_BALANCE	80219.00	2026-07-24 07:14:22.795	Opening balance	\N	\N	cmrylu66h0012oe01s8q32yli	2026-07-24 07:14:22.796	2026-07-24 07:14:22.796	\N
cmrylvqs90018oe01aspdshw3	OPENING_BALANCE	16320.00	2026-07-24 07:15:36.152	Opening balance	\N	\N	cmrylvqs70016oe01gdu7s37w	2026-07-24 07:15:36.153	2026-07-24 07:15:36.153	\N
cmrylyed7001aoe01e58hgqv7	OPENING_BALANCE	66147.00	2026-07-24 07:17:40.027	Opening balance	\N	\N	cmrylr1b4000woe01ujs6py15	2026-07-24 07:17:40.028	2026-07-24 07:17:40.028	\N
cmrylyequ001coe01lldrnmyz	OPENING_BALANCE	66147.00	2026-07-24 07:17:40.518	Opening balance	\N	\N	cmrylr1b4000woe01ujs6py15	2026-07-24 07:17:40.518	2026-07-24 07:17:40.518	\N
cmrym1yby001goe01v87ncgye	OPENING_BALANCE	242535.00	2026-07-24 07:20:25.869	Opening balance	\N	\N	cmrym1ybw001eoe01jqvt5wio	2026-07-24 07:20:25.87	2026-07-24 07:20:25.87	\N
cmrym36sh001koe01m02jwep7	OPENING_BALANCE	65539.00	2026-07-24 07:21:23.488	Opening balance	\N	\N	cmrym36se001ioe01lqoi4vqg	2026-07-24 07:21:23.489	2026-07-24 07:21:23.489	\N
cmrym4taz001ooe01u0l0z8ln	OPENING_BALANCE	68892.00	2026-07-24 07:22:39.321	Opening balance	\N	\N	cmrym4tar001moe01rjwz0ye4	2026-07-24 07:22:39.323	2026-07-24 07:22:39.323	\N
cmrym5xbs001soe01n76svpwq	OPENING_BALANCE	144739.00	2026-07-24 07:23:31.191	Opening balance	\N	\N	cmrym5xbp001qoe01qmmovff8	2026-07-24 07:23:31.192	2026-07-24 07:23:31.192	\N
cmrym7eom001woe01gbgntpwr	OPENING_BALANCE	121908.00	2026-07-24 07:24:40.341	Opening balance	\N	\N	cmrym7eok001uoe01rqy2c94p	2026-07-24 07:24:40.342	2026-07-24 07:24:40.342	\N
cms1hb25k0044lr01bk91h5o7	OPENING_BALANCE	171922.00	2026-07-26 07:30:51.175	Opening balance	\N	\N	cms1hb25i0042lr0172meho0y	2026-07-26 07:30:51.176	2026-07-26 07:30:51.176	\N
cms1nbwqh006elr01ro2m50a6	OPENING_BALANCE	425110.00	2026-07-26 10:19:28.505	Opening balance	\N	\N	cms1nbwqf006clr01e7ocsvpz	2026-07-26 10:19:28.506	2026-07-26 10:19:28.506	\N
cms3cr1fn001gmy01c7ct2gr3	OPENING_BALANCE	100.00	2026-07-27 14:58:51.011	Opening balance	\N	\N	cms3cr1fl001emy01zhsnma9g	2026-07-27 14:58:51.011	2026-07-27 14:58:51.011	\N
\.


--
-- Data for Name: Dealer; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Dealer" (id, name, contact, address, "createdAt", "updatedAt", "userId", "ownerId", balance, classification, "totalPayments", "totalPurchases") FROM stdin;
cmn5w47520002o4011ahlygxj	Manakamna Poultry and Feed Udyog	+9779857831027	\N	2026-03-25 10:17:58.311	2026-03-25 10:17:58.311	\N	cmn5w474v0000o401qj8mx3bp	0.00	SELF_CREATED	0.00	0.00
cmna3qpcz0011p1015pzp0jb3	Manakamana Feed Supplier [Non connected]	977 -	\N	2026-03-28 09:02:30.371	2026-03-28 09:32:50.102	cmn69vvcj000cqr01gg2khvs3	\N	0.00	SELF_CREATED	161278.90	161278.90
cmqxyu7wy00benr01ezh57ym6	Others	2	\N	2026-06-28 15:50:51.539	2026-07-09 06:53:36.379	cmopafd8z00b1nq01zcppx8r5	\N	0.00	SELF_CREATED	0.00	0.00
cmq8xyq1p001lnr01oeoe3y88	Purchased/ Stock Medicine	9809502777	Ghara Stock	2026-06-11 03:32:07.646	2026-07-09 06:54:26.727	cmopafd8z00b1nq01zcppx8r5	\N	93296.00	SELF_CREATED	0.00	93296.00
cmnbm5cbu001qlk01ovix3iur	Dang feed industries	082416005	Tulsipur	2026-03-29 10:25:32.586	2026-03-29 10:49:56.226	cmnbm2tdx001hlk01lewrwu1c	\N	0.00	SELF_CREATED	0.00	0.00
cmnbmf4qg0027lk01co9ykzj3	Hi lay breeder hatchery	98578211853	\N	2026-03-29 10:33:09.304	2026-03-29 10:50:17.685	cmnbm2tdx001hlk01lewrwu1c	\N	-4200000.00	SELF_CREATED	4200000.00	0.00
cmokzipv2007enq013wf9vhwj	Hy-Lay Breeders Hatchery Pvt Ltd	985-5058943	Chitwan	2026-04-30 04:29:29.582	2026-04-30 04:32:47.419	cmois9yvt004knq01b2fe36fo	\N	1412730.00	SELF_CREATED	0.00	1412730.00
cmokzukhp0082nq01qzfk04zt	Khajana Agro Feed Department	984-7890955	Sundabari	2026-04-30 04:38:42.494	2026-04-30 04:38:42.494	cmois9yvt004knq01b2fe36fo	\N	0.00	SELF_CREATED	0.00	0.00
cmokzthkr0080nq01yuv2nlrx	Rapti Feed Industries	9801339119	Satbariya	2026-04-30 04:37:52.059	2026-04-30 05:12:44.796	cmois9yvt004knq01b2fe36fo	\N	113175.00	SELF_CREATED	0.00	113175.00
cmol15vly008mnq010dq5crcw	Kantipur vet Distributors	984-8974646	Ktm	2026-04-30 05:15:29.734	2026-04-30 05:17:12.417	cmois9yvt004knq01b2fe36fo	\N	28275.00	SELF_CREATED	0.00	28275.00
cmol1aaay008ynq01zw76e3os	Siddarth Agri Center	982-2838833	Ghorahi	2026-04-30 05:18:55.403	2026-04-30 05:19:49.925	cmois9yvt004knq01b2fe36fo	\N	18400.00	SELF_CREATED	0.00	18400.00
cmoqlldm900dnnq01giqfcv83	Hyline breeders	215	\N	2026-05-04 02:46:16.113	2026-06-22 04:50:18.181	cmopafd8z00b1nq01zcppx8r5	\N	3913050.00	SELF_CREATED	0.00	3913050.00
cmqxxnfg1006snr0101f2d8cj	Staff Expenses	1	\N	2026-06-28 15:17:35.09	2026-06-28 15:17:35.09	cmopafd8z00b1nq01zcppx8r5	\N	0.00	SELF_CREATED	0.00	0.00
cmopalj4700bjnq010dbqep07	Rapti feed	9840404600	\N	2026-05-03 04:50:41.287	2026-07-09 07:21:26.868	cmopafd8z00b1nq01zcppx8r5	\N	369250.00	SELF_CREATED	0.00	369250.00
cmrylfcq0000moe019s79ka4f	sushan poultry and feeds suppliers	+9779857840134	Lamahi 5 dang	2026-07-24 07:02:51.432	2026-07-24 07:02:51.432	\N	cmrylfcpv000koe016l646xxp	0.00	SELF_CREATED	0.00	0.00
cms3cp2fc000ymy01h6wp1mxp	testcompanyname	+9771111111111	\N	2026-07-27 14:57:18.984	2026-07-27 14:57:18.984	\N	cms3cp2f5000wmy01vfs59bcr	0.00	SELF_CREATED	0.00	0.00
\.


--
-- Data for Name: DealerCart; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerCart" (id, "dealerId", "companyId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DealerCartItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerCartItem" (id, "cartId", "productId", quantity, "unitPrice", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DealerCashDayClose; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerCashDayClose" (id, "dealerId", "bsDate", "openingSnapshot", "closingSnapshot", source, "closedAt") FROM stdin;
cms47i03x000rth01qalvkywg	cms3cp2fc000ymy01h6wp1mxp	2083-04-12	1000.00	2000.00	USER	2026-07-28 05:19:37.485
\.


--
-- Data for Name: DealerCashMovement; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerCashMovement" (id, "dealerId", "bsDate", direction, amount, "partyName", notes, "recordedById", "createdAt") FROM stdin;
cms47hvzy000pth0142jpi68q	cms3cp2fc000ymy01h6wp1mxp	2083-04-12	IN	1000.00	test	\N	cms3cp2f5000wmy01vfs59bcr	2026-07-28 05:19:32.159
\.


--
-- Data for Name: DealerCashSettings; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerCashSettings" (id, "dealerId", "initialOpening", "startBsDate", "createdAt", "updatedAt") FROM stdin;
cms4762t5000fth01aaasgdhm	cms3cp2fc000ymy01h6wp1mxp	1000.00	2083-04-12	2026-07-28 05:10:21.114	2026-07-28 05:10:21.114
\.


--
-- Data for Name: DealerFarmerAccount; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerFarmerAccount" (id, "dealerId", "farmerId", balance, "totalSales", "totalPayments", "lastSaleDate", "lastPaymentDate", "balanceLimit", "balanceLimitSetAt", "balanceLimitSetBy", "createdAt", "updatedAt", "openingBalanceCurrent", "openingBalanceStatus") FROM stdin;
\.


--
-- Data for Name: DealerFarmerAccountAdjustment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerFarmerAccountAdjustment" (id, "accountId", type, amount, notes, "createdByRole", "createdById", status, "farmerResponseNote", "respondedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: DealerFarmerPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerFarmerPayment" (id, "accountId", amount, "paymentMethod", "paymentDate", notes, reference, "receiptImageUrl", "proofImageUrl", "balanceAfter", "recordedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: DealerLedgerEntry; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerLedgerEntry" (id, type, amount, balance, date, description, reference, "imageUrl", "dealerId", "saleId", "partyId", "partyType", "createdAt") FROM stdin;
cms3zriji004bo701vphn4a8f	PAYMENT_RECEIVED	20.00	-79.00	2026-07-28 00:00:00	Payment received	\N	\N	cms3cp2fc000ymy01h6wp1mxp	\N	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-28 01:43:04.35
cms4e13iv004rth01enxk42ki	SALE	19925.00	100375.00	2026-07-19 06:15:00	Sale - Invoice 654	654	\N	cmrylfcq0000moe019s79ka4f	cms4e13il004lth01v4epmkah	cmrym1ybw001eoe01jqvt5wio	CUSTOMER	2026-07-28 08:22:26.072
cms4e8ekd0061th01grlclv6l	SALE	15940.00	169030.00	2026-07-24 06:15:00	Sale - Invoice 659	659	\N	cmrylfcq0000moe019s79ka4f	cms4e8ek2005vth01gl52vvsl	cmrym1ybw001eoe01jqvt5wio	CUSTOMER	2026-07-28 08:28:06.973
cmnldl8rp000vqs01euq7z4em	SALE	7370.00	7370.00	2026-03-15 06:15:00	Sale - Invoice INV-001	INV-001	\N	cmn5w47520002o4011ahlygxj	cmnldl8rd000pqs0155k3mli5	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 06:23:39.685
cmnldn5ig001zqs01uwza4alu	SALE	21885.00	43845.00	2026-03-15 06:15:00	Sale - Invoice INV-004	INV-004	\N	cmn5w47520002o4011ahlygxj	cmnldn5i7001pqs01ie298gak	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:25:08.776
cmnldpbwf002rqs01oexovelt	SALE	3610.00	54900.00	2026-03-16 06:15:00	Sale - Invoice INV-006	INV-006	\N	cmn5w47520002o4011ahlygxj	cmnldpbw9002lqs01d9hf7hsm	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:26:50.368
cmnldqrix003rqs01cror0tgy	SALE	3685.00	76710.00	2026-03-17 06:15:00	Sale - Invoice INV-009	INV-009	\N	cmn5w47520002o4011ahlygxj	cmnldqrim003lqs012so3hzdz	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:27:57.274
cmnldr5cm0043qs01g6k2danw	SALE	3685.00	80395.00	2026-03-17 06:15:00	Sale - Invoice INV-010	INV-010	\N	cmn5w47520002o4011ahlygxj	cmnldr5cb003xqs0171a8g4np	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:28:15.19
cmnlds3iw004rqs01va1urtf6	SALE	14440.00	109575.00	2026-03-17 06:15:00	Sale - Invoice INV-012	INV-012	\N	cmn5w47520002o4011ahlygxj	cmnlds3iq004lqs01tkfpmryr	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:28:59.48
cmnldtic4005jqs015557o2xc	SALE	3685.00	145900.00	2026-03-19 06:15:00	Sale - Invoice INV-014	INV-014	\N	cmn5w47520002o4011ahlygxj	cmnldtiby005dqs01qicmp8tl	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:30:05.332
cmnldwmrh0083qs01idmvile8	SALE	14665.00	207720.00	2026-03-22 06:15:00	Sale - Invoice INV-021	INV-021	\N	cmn5w47520002o4011ahlygxj	cmnldwmr8007tqs01bt7ktl5p	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 06:32:31.037
cmnle8oqx00bzqs0102nwkmmw	SALE	7220.00	316470.00	2026-03-27 06:15:00	Sale - Invoice INV-031	INV-031	\N	cmn5w47520002o4011ahlygxj	cmnle8oqm00btqs01e02z5fu9	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:41:53.481
cmnlebeoa00d7qs0127cst1if	SALE	10830.00	356480.00	2026-03-27 06:15:00	Sale - Invoice INV-034	INV-034	\N	cmn5w47520002o4011ahlygxj	cmnlebeo300d1qs014k27o7k1	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:44:00.395
cmnlefoer00f3qs015cycx55k	PAYMENT_RECEIVED	7520.00	371195.00	2026-04-05 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmnle3wuq009rqs017tytg5th	CUSTOMER	2026-04-05 06:47:19.636
cmnlegej100f5qs01jdv8d86x	PAYMENT_RECEIVED	14440.00	356755.00	2026-04-05 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmne6dutr00aslk0126ljhd9o	CUSTOMER	2026-04-05 06:47:53.486
cmnlehy4d00f9qs01r3s5fbjj	PAYMENT_RECEIVED	7220.00	342535.00	2026-03-15 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:49:05.533
cmnlektvn00frqs01dk0cfktk	PAYMENT_RECEIVED	8000.00	210095.00	2026-03-19 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:51:20.004
cmnlenhk600fzqs01ulsoz4k1	PAYMENT_RECEIVED	20000.00	134125.00	2026-03-24 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:53:24.007
cmnleuj9500gnqs014r3viv2a	PAYMENT_RECEIVED	4000.00	-10155.00	2026-04-01 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:58:52.793
cmnleutxg00gpqs011zucletx	PAYMENT_RECEIVED	12000.00	-22155.00	2026-04-03 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:59:06.628
cms4ecrj3006tth01eotzpx48	SALE	3850.00	233155.00	2026-07-24 06:15:00	Sale - Invoice 662	662	\N	cmrylfcq0000moe019s79ka4f	cms4ecriw006nth01unysu45e	cms4e3aom004tth01ukh8y1co	CUSTOMER	2026-07-28 08:31:30.399
cms4ef5g40079th015z5m0js8	SALE	11955.00	261050.00	2026-07-27 06:15:00	Sale - Invoice 664	664	\N	cmrylfcq0000moe019s79ka4f	cms4ef5fu0073th01kk9appsw	cms1nbwqf006clr01e7ocsvpz	CUSTOMER	2026-07-28 08:33:21.748
cms3cukfx002qmy016sezfnje	PAYMENT_RECEIVED	100.00	-100.00	2026-07-27 00:00:00	Payment received	\N	\N	cms3cp2fc000ymy01h6wp1mxp	\N	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:01:35.614
cms3esrem0027qm017azlrh29	SALE	2.00	-93.00	2026-07-27 06:15:00	Sale - Invoice BILL-3	BILL-3	\N	cms3cp2fc000ymy01h6wp1mxp	cms3esrea001zqm01g1cgx13u	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:56:10.558
cms3esrem0029qm01volmypn8	PAYMENT_RECEIVED	2.00	-95.00	2026-07-27 06:15:00	Payment received - Invoice BILL-3	BILL-3	\N	cms3cp2fc000ymy01h6wp1mxp	cms3esrea001zqm01g1cgx13u	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:56:10.558
cmnleu9vo00glqs017cuwarph	PAYMENT_RECEIVED	7420.00	-6155.00	2026-04-01 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:58:40.644
cmnlf52sn00ieqs01p6icd42h	SALE	11130.00	-11025.00	2026-03-31 06:15:00	Sale - Invoice INV-040	INV-040	\N	cmn5w47520002o4011ahlygxj	cmnlf52sb00i8qs01862fdgzs	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 07:07:04.679
cmnlf5iqy00iuqs01c7elhpqc	SALE	11280.00	255.00	2026-03-31 06:15:00	Sale - Invoice INV-041	INV-041	\N	cmn5w47520002o4011ahlygxj	cmnlf5iqq00ikqs01h5ojglr0	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 07:07:25.354
cmnlf5z0t00jaqs013kssx47g	SALE	18700.00	18955.00	2026-03-31 06:15:00	Sale - Invoice INV-042	INV-042	\N	cmn5w47520002o4011ahlygxj	cmnlf5z0l00j0qs01ovvcup3q	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 07:07:46.446
cmnlf7i2t00kqqs019b1mh61s	SALE	7495.00	52420.00	2026-04-03 06:15:00	Sale - Invoice INV-046	INV-046	\N	cmn5w47520002o4011ahlygxj	cmnlf7i2l00kgqs01ma4ow4zu	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 07:08:57.798
cmnldlsua0017qs01ugws4a27	SALE	7220.00	14590.00	2026-04-05 06:15:00	Sale - Invoice INV-002	INV-002	\N	cmn5w47520002o4011ahlygxj	cmnldlstz0011qs0110cxto1q	cmne6dutr00aslk0126ljhd9o	CUSTOMER	2026-04-05 06:24:05.698
cmnldmegb001jqs0192d3wy1l	SALE	7370.00	21960.00	2026-03-15 06:15:00	Sale - Invoice INV-003	INV-003	\N	cmn5w47520002o4011ahlygxj	cmnldmeg3001dqs01ei7fvhr5	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:24:33.708
cmnldnse5002fqs01vtlmtkme	SALE	7445.00	51290.00	2026-03-15 06:15:00	Sale - Invoice INV-005	INV-005	\N	cmn5w47520002o4011ahlygxj	cmnldnsdw0025qs01o6nq6mwq	cmn5wujgz001uo401wl84xaz6	CUSTOMER	2026-04-05 06:25:38.429
cmnldtyua005vqs01m7waiq5s	SALE	3610.00	149510.00	2026-03-19 06:15:00	Sale - Invoice INV-015	INV-015	\N	cmn5w47520002o4011ahlygxj	cmnldtyu3005pqs01qjovl6jz	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:30:26.722
cmnlduesq0067qs01stdrfept	SALE	10830.00	160340.00	2026-03-20 06:15:00	Sale - Invoice INV-016	INV-016	\N	cmn5w47520002o4011ahlygxj	cmnlduesk0061qs01nzswcg6m	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:30:47.403
cmnlduthy006jqs01tin7ucgw	SALE	14440.00	174780.00	2026-03-20 06:15:00	Sale - Invoice INV-017	INV-017	\N	cmn5w47520002o4011ahlygxj	cmnlduthu006dqs01iir7ivnz	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:31:06.455
cmnldvdyj006zqs01ho235j56	SALE	7370.00	182150.00	2026-03-20 06:15:00	Sale - Invoice INV-018	INV-018	\N	cmn5w47520002o4011ahlygxj	cmnldvdyc006pqs01r6bcbl8k	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:31:32.971
cmnldvqa5007bqs01zgg8vvkh	SALE	7220.00	189370.00	2026-03-21 06:15:00	Sale - Invoice INV-019	INV-019	\N	cmn5w47520002o4011ahlygxj	cmnldvqa00075qs01kqn5uva9	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:31:48.941
cmnldxobd008hqs01nisuqtvo	SALE	3760.00	211480.00	2026-03-23 06:15:00	Sale - Invoice INV-022	INV-022	\N	cmn5w47520002o4011ahlygxj	cmnldxob2008bqs01kylzrkrj	cmnldx9rh0089qs01ol2n4x89	CUSTOMER	2026-04-05 06:33:19.705
cmnldy3ug008tqs01kt2bmj2m	SALE	32490.00	243970.00	2026-03-23 06:15:00	Sale - Invoice INV-023	INV-023	\N	cmn5w47520002o4011ahlygxj	cmnldy3ua008nqs01tb0psllt	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:33:39.833
cmnle3bhv009lqs01ryawo4z6	SALE	7220.00	251190.00	2026-03-24 06:15:00	Sale - Invoice INV-024	INV-024	\N	cmn5w47520002o4011ahlygxj	cmnle3bhp009fqs01zel1x6u7	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:37:43.028
cmnlf8abu00leqs01ijfpjyx8	SALE	3710.00	63550.00	2026-04-03 06:15:00	Sale - Invoice INV-048	INV-048	\N	cmn5w47520002o4011ahlygxj	cmnlf8abo00l8qs01hair4c1u	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 07:09:34.41
cmnle9c6300cbqs01qqdqhrdt	SALE	3610.00	320080.00	2026-03-27 06:15:00	Sale - Invoice INV-032	INV-032	\N	cmn5w47520002o4011ahlygxj	cmnle9c5r00c5qs01epkxy86u	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:42:23.835
cmnle9wj000crqs01983g59hv	SALE	25570.00	345650.00	2026-03-27 06:15:00	Sale - Invoice INV-033	INV-033	\N	cmn5w47520002o4011ahlygxj	cmnle9wir00chqs015a028h1g	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:42:50.22
cmnledb8z00e7qs01ffh9ycjz	SALE	3710.00	367510.00	2026-03-29 06:15:00	Sale - Invoice INV-037	INV-037	\N	cmn5w47520002o4011ahlygxj	cmnledb8t00e1qs01t3gkcepv	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:45:29.267
cmnlednci00ejqs01im65ypow	SALE	7420.00	374930.00	2026-03-29 06:15:00	Sale - Invoice INV-038	INV-038	\N	cmn5w47520002o4011ahlygxj	cmnledncc00edqs01q7yxbmwc	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:45:44.946
cmnleibl600fbqs01a5x9s19h	PAYMENT_RECEIVED	8000.00	334535.00	2026-03-16 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:49:22.986
cmnlejb7c00fhqs01qj4ms7vl	PAYMENT_RECEIVED	4000.00	263535.00	2026-03-17 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:50:09.144
cmnlejumy00flqs011glbkcwi	PAYMENT_RECEIVED	4000.00	244535.00	2026-03-18 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:50:34.33
cmnlel2g100ftqs0181qsgd2y	PAYMENT_RECEIVED	40000.00	170095.00	2026-03-21 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:51:31.105
cmnlen20h00fxqs01ml9bfu51	PAYMENT_RECEIVED	8750.00	154125.00	2026-03-23 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmnldx9rh0089qs01ol2n4x89	CUSTOMER	2026-04-05 06:53:03.857
cmnlensdh00g1qs01lovblozv	PAYMENT_RECEIVED	8000.00	126125.00	2026-03-24 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:53:38.021
cmnleoh3h00g3qs0136si7f1s	PAYMENT_RECEIVED	28000.00	98125.00	2026-03-26 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:54:10.062
cmnlep5rk00g5qs0113xboe7f	PAYMENT_RECEIVED	14440.00	83685.00	2026-03-26 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:54:42.032
cmnleqncx00g9qs017wei37yp	PAYMENT_RECEIVED	8000.00	70685.00	2026-03-29 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:55:51.489
cmnler82700gdqs01m3ppvtuy	PAYMENT_RECEIVED	7420.00	59265.00	2026-03-29 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:56:18.319
cmnlerqxm00ghqs017nukhlec	PAYMENT_RECEIVED	44000.00	5265.00	2026-03-29 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:56:42.779
cms3eunbj000jo701eoeb2l1w	SALE	14.00	-79.00	2026-07-27 06:15:00	Sale - Invoice INV-003	INV-003	\N	cms3cp2fc000ymy01h6wp1mxp	cms3eunb5000bo701bs3m8pzy	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:57:38.575
cms3eunbj000lo701dyqzevhw	PAYMENT_RECEIVED	14.00	-93.00	2026-07-27 06:15:00	Payment received - Invoice INV-003	INV-003	\N	cms3cp2fc000ymy01h6wp1mxp	cms3eunb5000bo701bs3m8pzy	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:57:38.575
cms3eelun000hqm01og6qond2	SALE	2.00	-98.00	2026-07-27 06:15:00	Sale - Invoice INV-001	INV-001	\N	cms3cp2fc000ymy01h6wp1mxp	cms3eelua000bqm01l5qm90r5	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:45:10.176
cms403f3m005fo7014kwhhus1	SALE	15.00	-64.00	2026-07-28 06:15:00	Sale - Invoice INV-005	INV-005	\N	cms3cp2fc000ymy01h6wp1mxp	cms403f3c0059o701lvjfe9xx	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-28 01:52:19.762
cms4e413p0051th014hf0plmc	SALE	3800.00	104175.00	2026-07-20 06:15:00	Sale - Invoice 655	655	\N	cmrylfcq0000moe019s79ka4f	cms4e413f004vth011some1i7	cms4e3aom004tth01ukh8y1co	CUSTOMER	2026-07-28 08:24:42.901
cms4e5r61005hth016jrr25s6	SALE	31375.00	135550.00	2026-07-21 06:15:00	Sale - Invoice 656	656	\N	cmrylfcq0000moe019s79ka4f	cms4e5r5q0053th01rqlg44vf	cmrylt07x000yoe01u5fanx1t	CUSTOMER	2026-07-28 08:26:03.338
cms4e9biw0069th01u87ehj34	SALE	32280.00	201310.00	2026-07-24 06:15:00	Sale - Invoice 660	660	\N	cmrylfcq0000moe019s79ka4f	cms4e9bik0063th019xo8k1j1	cms1hb25i0042lr0172meho0y	CUSTOMER	2026-07-28 08:28:49.688
cmnlf6q0x00jyqs01lru1kjbw	SALE	3710.00	37505.00	2026-04-03 06:15:00	Sale - Invoice INV-044	INV-044	\N	cmn5w47520002o4011ahlygxj	cmnlf6q0r00jsqs01y0v9umfy	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 07:08:21.441
cmnlf73gx00kaqs01ndwebzf5	SALE	7420.00	44925.00	2026-04-03 06:15:00	Sale - Invoice INV-045	INV-045	\N	cmn5w47520002o4011ahlygxj	cmnlf73gr00k4qs01guys76wu	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 07:08:38.865
cmnlf7vq400l2qs013c0uebqj	SALE	7420.00	59840.00	2026-04-03 06:15:00	Sale - Invoice INV-047	INV-047	\N	cmn5w47520002o4011ahlygxj	cmnlf7vpy00kwqs01vem1jpwb	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 07:09:15.485
cmnldpx890033qs013leqzdyi	SALE	3685.00	58585.00	2026-03-16 06:15:00	Sale - Invoice INV-007	INV-007	\N	cmn5w47520002o4011ahlygxj	cmnldpx7x002xqs01r6lw8f2m	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:27:18.01
cmnldqckv003fqs01e27xaorc	SALE	14440.00	73025.00	2026-03-17 06:15:00	Sale - Invoice INV-008	INV-008	\N	cmn5w47520002o4011ahlygxj	cmnldqckp0039qs01vp0y84u0	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:27:37.904
cmnldrko1004fqs01cqdd41al	SALE	14740.00	95135.00	2026-03-17 06:15:00	Sale - Invoice INV-011	INV-011	\N	cmn5w47520002o4011ahlygxj	cmnldrknw0049qs01wi1cc6it	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 06:28:35.042
cmnldstwk0057qs01m2kfeavz	SALE	32640.00	142215.00	2026-03-17 06:15:00	Sale - Invoice INV-013	INV-013	\N	cmn5w47520002o4011ahlygxj	cmnldstwb004xqs01ilhdo7kc	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:29:33.668
cmnldw2ua007nqs01lj1fn5x5	SALE	3685.00	193055.00	2026-03-21 06:15:00	Sale - Invoice INV-020	INV-020	\N	cmn5w47520002o4011ahlygxj	cmnldw2ty007hqs011kkt69wg	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:32:05.218
cms3egnfn0011qm01xp5w4jwe	SALE	3.00	-95.00	2026-07-27 06:15:00	Sale - Invoice INV-002	INV-002	\N	cms3cp2fc000ymy01h6wp1mxp	cms3egnfd000vqm0163uyhzdd	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-27 15:46:45.54
cms3zpyjj003to70190m3u63c	SALE	20.00	-59.00	2026-07-28 06:15:00	Sale - Invoice INV-004	INV-004	\N	cms3cp2fc000ymy01h6wp1mxp	cms3zpyj8003no701vdh8e6oj	cms3cr1fl001emy01zhsnma9g	CUSTOMER	2026-07-28 01:41:51.775
cms4dybvp0043th01nio9uh38	SALE	28245.00	28245.00	2026-07-19 06:15:00	Sale - Invoice 651	651	\N	cmrylfcq0000moe019s79ka4f	cms4dybva003xth018tnkkvhc	cmryloywg000soe01iqyiiboi	CUSTOMER	2026-07-28 08:20:16.934
cmnle4cth009zqs01pzijqvd5	SALE	7520.00	258710.00	2026-03-24 06:15:00	Sale - Invoice INV-025	INV-025	\N	cmn5w47520002o4011ahlygxj	cmnle4ct6009tqs011kd0h3qc	cmnle3wuq009rqs017tytg5th	CUSTOMER	2026-04-05 06:38:31.398
cmnle4ygs00abqs017i5rvwh7	SALE	10830.00	269540.00	2026-03-24 06:15:00	Sale - Invoice INV-026	INV-026	\N	cmn5w47520002o4011ahlygxj	cmnle4ygn00a5qs010fzvx5p8	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 06:38:59.453
cmnle5l3y00anqs01rui4a8vi	SALE	7220.00	276760.00	2026-03-24 06:15:00	Sale - Invoice INV-027	INV-027	\N	cmn5w47520002o4011ahlygxj	cmnle5l3s00ahqs01ojlhfsiu	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:39:28.798
cmnle73qc00azqs01ntgxkysu	SALE	7220.00	283980.00	2026-03-26 06:15:00	Sale - Invoice INV-028	INV-028	\N	cmn5w47520002o4011ahlygxj	cmnle73q600atqs01rmwvuhbo	cmne6dutr00aslk0126ljhd9o	CUSTOMER	2026-04-05 06:40:39.589
cmnle7hid00bbqs01ohkts8ir	SALE	3610.00	287590.00	2026-03-26 06:15:00	Sale - Invoice INV-029	INV-029	\N	cmn5w47520002o4011ahlygxj	cmnle7hi700b5qs01o9h5fby6	cmn5wmvdt000qo401adf1txqq	CUSTOMER	2026-04-05 06:40:57.445
cmnle82cw00bnqs01dmsvdbcl	SALE	21660.00	309250.00	2026-03-27 06:15:00	Sale - Invoice INV-030	INV-030	\N	cmn5w47520002o4011ahlygxj	cmnle82cq00bhqs01vg3nyd61	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 06:41:24.464
cmnlebrne00djqs0185heme7s	SALE	3610.00	360090.00	2026-03-27 06:15:00	Sale - Invoice INV-035	INV-035	\N	cmn5w47520002o4011ahlygxj	cmnlebrn200ddqs01t502k0ao	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:44:17.211
cmnlecy9d00dvqs01pek5xaaf	SALE	3710.00	363800.00	2026-03-29 06:15:00	Sale - Invoice INV-036	INV-036	\N	cmn5w47520002o4011ahlygxj	cmnlecy9700dpqs01u6jay1ky	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:45:12.433
cmnledzbh00evqs01udzqwj0c	SALE	3785.00	378715.00	2026-03-29 06:15:00	Sale - Invoice INV-039	INV-039	\N	cmn5w47520002o4011ahlygxj	cmnledzbc00epqs01w8hhndp9	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:46:00.462
cmnlehg4b00f7qs01anhjorpz	PAYMENT_RECEIVED	7000.00	349755.00	2026-03-15 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:48:42.203
cmnleilzo00fdqs01hxja23hi	PAYMENT_RECEIVED	12000.00	322535.00	2026-03-16 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:49:36.468
cmnleivxz00ffqs01pb97upif	PAYMENT_RECEIVED	55000.00	267535.00	2026-03-16 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wbs1z0006o4013qrxxplv	CUSTOMER	2026-04-05 06:49:49.367
cmnlejju500fjqs0153aiqthj	PAYMENT_RECEIVED	15000.00	248535.00	2026-03-17 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wujgz001uo401wl84xaz6	CUSTOMER	2026-04-05 06:50:20.333
cmnlek7o800fnqs016zbwap39	PAYMENT_RECEIVED	14440.00	230095.00	2026-03-18 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:50:51.224
cmnlekknd00fpqs01zfpr1xy4	PAYMENT_RECEIVED	12000.00	218095.00	2026-03-19 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:51:08.042
cmnleldgx00fvqs01om8lko65	PAYMENT_RECEIVED	7220.00	162875.00	2026-03-23 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wnpn4000uo401wwvmc59e	CUSTOMER	2026-04-05 06:51:45.393
cmnlepnjo00g7qs01v4dqqz5a	PAYMENT_RECEIVED	5000.00	78685.00	2026-03-26 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:55:05.076
cmnleque000gbqs018qyjrld7	PAYMENT_RECEIVED	4000.00	66685.00	2026-03-29 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:56:00.601
cmnlerhid00gfqs01q5o7uxmf	PAYMENT_RECEIVED	10000.00	49265.00	2026-03-29 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wi7j0000ao401qblto83l	CUSTOMER	2026-04-05 06:56:30.565
cmnletz4600gjqs012kt9yuv2	PAYMENT_RECEIVED	4000.00	1265.00	2026-04-01 00:00:00	Payment received	\N	\N	cmn5w47520002o4011ahlygxj	\N	cmn5wj1i7000eo401xb20bno6	CUSTOMER	2026-04-05 06:58:26.694
cmnlf69rb00jmqs0144d6w4br	SALE	14840.00	33795.00	2026-03-31 06:15:00	Sale - Invoice INV-043	INV-043	\N	cmn5w47520002o4011ahlygxj	cmnlf69r100jgqs01i1061k1z	cmn5wv1s8001yo401nypzbgn2	CUSTOMER	2026-04-05 07:08:00.359
cms4dza30004bth0147iuarci	SALE	32280.00	60525.00	2026-07-19 06:15:00	Sale - Invoice 652	652	\N	cmrylfcq0000moe019s79ka4f	cms4dza2s0045th01hsun30l4	cms1hb25i0042lr0172meho0y	CUSTOMER	2026-07-28 08:21:01.261
cms4e059g004jth01k0bo66hv	SALE	19925.00	80450.00	2026-07-19 06:15:00	Sale - Invoice 653	653	\N	cmrylfcq0000moe019s79ka4f	cms4e059b004dth014hw1tx0s	cmrylu66h0012oe01s8q32yli	CUSTOMER	2026-07-28 08:21:41.669
cms4e79xs005tth01kibi7b6p	SALE	17540.00	153090.00	2026-07-21 06:15:00	Sale - Invoice 657	657	\N	cmrylfcq0000moe019s79ka4f	cms4e79xg005jth01j4nwzebs	cms1nbwqf006clr01e7ocsvpz	CUSTOMER	2026-07-28 08:27:14.32
cms4ebray006lth01iqtm6agk	SALE	27995.00	229305.00	2026-07-24 06:15:00	Sale - Invoice 661	661	\N	cmrylfcq0000moe019s79ka4f	cms4ebrai006bth01sh9eol9z	cmryloywg000soe01iqyiiboi	CUSTOMER	2026-07-28 08:30:43.45
cms4edv3x0071th01y5svrgnj	SALE	15940.00	249095.00	2026-07-24 06:15:00	Sale - Invoice 663	663	\N	cmrylfcq0000moe019s79ka4f	cms4edv3q006vth01f94djhk4	cms1nbwqf006clr01e7ocsvpz	CUSTOMER	2026-07-28 08:32:21.693
cms4fr89q0093th01gl3vwz5x	SALE	50500.00	311550.00	2026-07-28 06:15:00	Sale - Invoice 665	665	\N	cmrylfcq0000moe019s79ka4f	cms4fr89g008tth01bx2j2lkx	cmrym36se001ioe01lqoi4vqg	CUSTOMER	2026-07-28 09:10:44.895
\.


--
-- Data for Name: DealerManualCompany; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerManualCompany" (id, name, phone, address, "dealerId", balance, "totalPurchases", "totalPayments", "createdAt", "updatedAt", "archivedAt", "archivedById") FROM stdin;
cmnldzh3f0091qs019y2t4vfc	Khajana Fresh House	\N	\N	cmn5w47520002o4011ahlygxj	20910.00	20910.00	0.00	2026-04-05 06:34:43.66	2026-04-05 06:35:59.324	\N	\N
cms1a9b230001lr01n2ecqvdv	rapti feed industries pvt ltd	9801339109	\N	cmrylfcq0000moe019s79ka4f	0.00	0.00	0.00	2026-07-26 04:13:32.091	2026-07-28 08:01:31.319	2026-07-28 07:59:51.772	cmrylfcpv000koe016l646xxp
cms1hr4pp005alr01vijoy08i	Hatchery	\N	\N	cmrylfcq0000moe019s79ka4f	0.00	43500.00	43500.00	2026-07-26 07:43:20.989	2026-07-29 09:02:02.48	\N	\N
cmne5bkm3004flk0136ykq7fz	Palpa Bhairav Hatchery	\N	Palpa	cmn5w47520002o4011ahlygxj	243315.00	0.00	0.00	2026-03-31 04:57:48.315	2026-03-31 04:57:48.318	\N	\N
cmne5c589004jlk0115f0015p	Rapti Hatchery	\N	\N	cmn5w47520002o4011ahlygxj	260327.00	0.00	0.00	2026-03-31 04:58:15.033	2026-03-31 04:58:15.036	\N	\N
cmne5cwsa004nlk01buuo00z4	Arawati Hatchery	\N	\N	cmn5w47520002o4011ahlygxj	811375.00	0.00	0.00	2026-03-31 04:58:50.747	2026-03-31 04:58:50.749	\N	\N
cmne5dq1w004rlk01xfqxotmd	Swargwadari Feed	\N	\N	cmn5w47520002o4011ahlygxj	1883537.00	0.00	0.00	2026-03-31 04:59:28.677	2026-03-31 04:59:28.681	\N	\N
cmne5e97f004vlk014cxr2m7m	Shikar hatchery	\N	\N	cmn5w47520002o4011ahlygxj	129800.00	0.00	0.00	2026-03-31 04:59:53.5	2026-03-31 04:59:53.503	\N	\N
cms4dj70t002bth01ynkpxj33	Rapti feed industries Pvt Ltd	9801339109	Lamahi dang	cmrylfcq0000moe019s79ka4f	8480.00	353470.00	344990.00	2026-07-28 08:08:30.797	2026-07-29 09:03:11.997	\N	\N
cms2suzas00dmlr01evtbltvk	Rapti feed industries PvtLtd	9801330109	\N	cmrylfcq0000moe019s79ka4f	0.00	0.00	0.00	2026-07-27 05:42:02.549	2026-07-28 08:05:13.289	2026-07-28 07:59:56.373	cmrylfcpv000koe016l646xxp
cmne58m9x004blk015vxd5zh8	Rapti Feed PVT.Ltd	977	Lamahi,8	cmn5w47520002o4011ahlygxj	4651793.50	559982.50	367500.00	2026-03-31 04:55:30.502	2026-04-10 05:59:31.541	\N	\N
cms1n3a41005mlr01c7bg8lyc	Surya vet	\N	\N	cmrylfcq0000moe019s79ka4f	0.00	0.00	0.00	2026-07-26 10:12:45.938	2026-07-28 08:06:54.49	\N	\N
cms3cqd3p0018my01a9qlnqja	Nimnus	9857831027	Lamahi	cms3cp2fc000ymy01h6wp1mxp	120.00	120.00	100.00	2026-07-27 14:58:19.478	2026-07-28 01:51:49.058	\N	\N
\.


--
-- Data for Name: DealerManualCompanyAdjustment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerManualCompanyAdjustment" (id, type, amount, date, notes, "balanceAfter", "manualCompanyId", "createdAt") FROM stdin;
cmne58ma0004dlk018ircyug0	OPENING_BALANCE	4494311.00	2026-03-31 04:55:30.505	Opening balance	4494311.00	cmne58m9x004blk015vxd5zh8	2026-03-31 04:55:30.505
cmne5bkm4004hlk01lf4fp7xa	OPENING_BALANCE	243315.00	2026-03-31 04:57:48.317	Opening balance	243315.00	cmne5bkm3004flk0136ykq7fz	2026-03-31 04:57:48.317
cmne5c58a004llk01zrk6sd14	OPENING_BALANCE	260327.00	2026-03-31 04:58:15.035	Opening balance	260327.00	cmne5c589004jlk0115f0015p	2026-03-31 04:58:15.035
cmne5cwsb004plk014uq0wj4l	OPENING_BALANCE	811375.00	2026-03-31 04:58:50.748	Opening balance	811375.00	cmne5cwsa004nlk01buuo00z4	2026-03-31 04:58:50.748
cmne5dq1z004tlk019zk5h1hf	OPENING_BALANCE	1883537.00	2026-03-31 04:59:28.679	Opening balance	1883537.00	cmne5dq1w004rlk01xfqxotmd	2026-03-31 04:59:28.679
cmne5e97h004xlk01h7v0tv0b	OPENING_BALANCE	129800.00	2026-03-31 04:59:53.501	Opening balance	129800.00	cmne5e97f004vlk014cxr2m7m	2026-03-31 04:59:53.501
cmnkc0eod000wnv014uazxs54	OPENING_BALANCE	4459311.00	2026-04-04 12:51:41.771	Opening balance	4459311.00	cmne58m9x004blk015vxd5zh8	2026-04-04 12:51:41.774
cms3cqd3s001amy019pzs7qik	OPENING_BALANCE	100.00	2026-07-27 14:58:19.48	Opening balance	100.00	cms3cqd3p0018my01a9qlnqja	2026-07-27 14:58:19.48
\.


--
-- Data for Name: DealerManualCompanyPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerManualCompanyPayment" (id, amount, "paymentMethod", "paymentDate", notes, reference, "receiptUrl", "balanceAfter", "manualCompanyId", "createdAt", "voidedAt", "voidedReason") FROM stdin;
cmne67844009mlk0102x4lamg	29736.00	CASH	2026-03-31 05:22:25.108	Discount from all bills till 12/17	\N	\N	4505755.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:22:25.109	2026-03-31 06:45:50.103	wrong
cmne632vj009klk01w6wrgf1l	60000.00	CASH	2026-03-31 05:19:11.694	\N	\N	\N	4535491.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:19:11.695	2026-03-31 06:46:01.1	wrong
cmne62vzj009ilk01978xp1nw	55000.00	CASH	2026-03-31 05:19:02.767	\N	\N	\N	4595491.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:19:02.767	2026-03-31 06:46:17.951	wrong
cmne61s9z009alk014o02irym	35000.00	CASH	2026-03-31 05:18:11.303	\N	\N	\N	4803491.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:18:11.303	2026-03-31 06:46:34.154	wrong
cmne620ob009clk01azogdlwi	48000.00	CASH	2026-03-31 05:18:22.186	\N	\N	\N	4755491.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:18:22.187	2026-03-31 06:46:41.937	wrong
cmne62bm2009elk016r19vu1q	84500.00	CASH	2026-03-31 05:18:36.361	\N	\N	\N	4670991.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:18:36.362	2026-03-31 06:46:47.249	wrong
cmne62qrp009glk01sszmylkg	20500.00	CASH	2026-03-31 05:18:56.004	\N	\N	\N	4650491.00	cmne58m9x004blk015vxd5zh8	2026-03-31 05:18:56.005	2026-03-31 06:46:53.67	wrong
cmnkcokj90046nv01ye2u2uxe	48000.00	CASH	2026-04-04 13:10:29.108	Receipt.No 5010	\N	\N	4743081.00	cmne58m9x004blk015vxd5zh8	2026-04-04 13:10:29.109	\N	\N
cmnkcpb8m0048nv01i4gucied	84500.00	CASH	2026-04-04 13:11:03.71	Receipt.No 5014	\N	\N	4658581.00	cmne58m9x004blk015vxd5zh8	2026-04-04 13:11:03.719	\N	\N
cmnkcqkog004anv017ulsuypa	20500.00	CASH	2026-04-04 13:12:02.607	Receipt.No 5016	\N	\N	4638081.00	cmne58m9x004blk015vxd5zh8	2026-04-04 13:12:02.608	\N	\N
cmnkcruks004cnv01p1paliuo	55000.00	CASH	2026-04-04 13:13:02.091	Receipt.No 3199	\N	\N	4583081.00	cmne58m9x004blk015vxd5zh8	2026-04-04 13:13:02.092	\N	\N
cmnkcsd9l004env01rd56qd6g	60000.00	CASH	2026-04-04 13:13:26.313	Receipt.No   3252	\N	\N	4523081.00	cmne58m9x004blk015vxd5zh8	2026-04-04 13:13:26.314	\N	\N
cmnlfcwww00luqs01xhb3jzgt	99500.00	CASH	2026-04-05 07:13:10.303	till 22	\N	\N	4503333.50	cmne58m9x004blk015vxd5zh8	2026-04-05 07:13:10.304	2026-04-05 07:20:49.887	date wrong
cmnlfn7iv00mmqs01l2c44a73	99500.00	CASH	2026-04-03 06:15:00	\N	\N	\N	4503333.50	cmne58m9x004blk015vxd5zh8	2026-04-05 07:21:10.615	\N	\N
cms1hsznq005klr01scjsf4u2	13500.00	CASH	2026-07-21 06:15:00	\N	\N	\N	0.00	cms1hr4pp005alr01vijoy08i	2026-07-26 07:44:47.75	\N	\N
cms3cuz6k0032my01im8uikk0	100.00	CASH	2026-07-27 06:15:00	\N	\N	\N	100.00	cms3cqd3p0018my01a9qlnqja	2026-07-27 15:01:54.717	\N	\N
cms4cpk840013th01gkl6j7xm	30000.00	CASH	2026-07-28 06:15:00	\N	\N	\N	0.00	cms1hr4pp005alr01vijoy08i	2026-07-28 07:45:28.228	\N	\N
cms4ffi1m007tth01dg35vef2	11167.50	CASH	2026-07-16 06:15:00	Old stock	\N	\N	242532.50	cms4dj70t002bth01ynkpxj33	2026-07-28 09:01:37.69	2026-07-28 09:06:19.135	I want to add more
cms4eyujo007hth01rsrvldlg	3822.50	CASH	2026-07-16 06:15:00	\N	\N	\N	246255.00	cms4dj70t002bth01ynkpxj33	2026-07-28 08:48:40.741	2026-07-28 09:06:30.77	I want to add more
cms4fp2a0008nth010w1m5l86	14990.00	CASH	2026-07-16 06:15:00	\N	\N	\N	246355.00	cms4dj70t002bth01ynkpxj33	2026-07-28 09:09:03.816	\N	\N
cms5uv3ax002bqm01fryuzxou	130000.00	BANK_TRANSFER	2026-07-19 06:15:00	Qr Nabil bank	\N	\N	-130000.00	cms1hr4pp005alr01vijoy08i	2026-07-29 09:01:25.497	2026-07-29 09:02:02.481	Wrong
cms5uwfe6002hqm019hcj2gax	130000.00	BANK_TRANSFER	2026-07-19 06:15:00	Qr nabil	\N	\N	208480.00	cms4dj70t002bth01ynkpxj33	2026-07-29 09:02:27.823	\N	\N
cms5uwv97002vqm014a644xei	100000.00	BANK_TRANSFER	2026-07-23 06:15:00	Qr nabil	\N	\N	108480.00	cms4dj70t002bth01ynkpxj33	2026-07-29 09:02:48.379	\N	\N
cms5uxdha003dqm01q9683vi2	100000.00	BANK_TRANSFER	2026-07-28 06:15:00	Qr nabil	\N	\N	8480.00	cms4dj70t002bth01ynkpxj33	2026-07-29 09:03:11.998	\N	\N
\.


--
-- Data for Name: DealerManualPurchase; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerManualPurchase" (id, date, "totalAmount", notes, reference, "manualCompanyId", "createdAt", "voidedAt", "voidedReason", "tradeDiscountAmount") FROM stdin;
cmne5jqbo005blk01b6s32tof	2026-03-31 05:04:08.963	49333.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:04:08.964	2026-03-31 05:05:33.345	wrong entry	\N
cmne5yfxy0095lk01v5qivpr2	2026-03-31 05:15:35.35	17975.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:15:35.351	2026-03-31 06:47:22.391	date is wrong	\N
cmne5obok005xlk01qnllkvk0	2026-03-31 05:07:43.267	49327.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:07:43.268	2026-03-31 06:47:29.044	date is wrong	\N
cmne5quu9006blk01nb5wdldy	2026-03-31 00:00:00	3485.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:09:41.41	2026-03-31 06:47:34.71	date is wrong	\N
cmne5qjg40065lk01vv2hhlwd	2026-03-31 00:00:00	3535.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:09:26.644	2026-03-31 06:47:41.043	date is wrong	\N
cmne5uzhb008tlk010fcv50wh	2026-03-31 00:00:00	34850.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:12:54.047	2026-03-31 06:47:44.799	date is wrong	\N
cmne5uvo8008nlk018z5rmwx9	2026-03-31 00:00:00	7245.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:12:49.112	2026-03-31 06:47:48.987	date is wrong	\N
cmne5uki6008hlk01b52m3gn6	2026-03-31 00:00:00	17425.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:12:34.638	2026-03-31 06:47:53.378	date is wrong	\N
cmne5tua50085lk01xuectsv9	2026-03-31 00:00:00	7245.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:12:00.654	2026-03-31 06:47:59.346	date is wrong	\N
cmne5tjts007zlk018vtxx1yk	2026-03-31 00:00:00	38335.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:11:47.105	2026-03-31 06:48:04.897	date is wrong	\N
cmne5tcdw007tlk01tqb7pehm	2026-03-31 00:00:00	10605.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:11:37.461	2026-03-31 06:48:10.807	date is wrong	\N
cmne5t48g007nlk015mkf9ttm	2026-03-31 00:00:00	7245.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:11:26.896	2026-03-31 06:48:16.136	date is wrong	\N
cmne5rd5m006hlk019m9xdr9x	2026-03-31 00:00:00	3622.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:10:05.147	2026-03-31 06:48:34.126	date is wrong	\N
cmne5rn2n006nlk01vet3lm3s	2026-03-31 00:00:00	21210.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:10:17.999	2026-03-31 06:48:39.652	date is wrong	\N
cmne5s9on006zlk014tcs0m4t	2026-03-31 00:00:00	3535.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:10:47.303	2026-03-31 06:48:44.802	date is wrong	\N
cmne5sfbo0075lk01yzhdby5b	2026-03-31 00:00:00	3485.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:10:54.612	2026-03-31 06:48:50.504	date is wrong	\N
cmne5svdy007hlk01u2k1ugyv	2026-03-31 00:00:00	10455.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:11:15.43	2026-03-31 06:48:55.601	date is wrong	\N
cmne5u69p008blk013tb50wc8	2026-03-31 00:00:00	45305.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:12:16.189	2026-03-31 06:49:01.19	date is wrong	\N
cmne5ry30006tlk015ui65kpq	2026-03-31 00:00:00	55760.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:10:32.268	2026-03-31 06:49:12.361	date is wrong	\N
cmne5sokl007blk017xkxc0oy	2026-03-31 00:00:00	3535.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-03-31 05:11:06.597	2026-03-31 06:49:16.528	date is wrong	\N
cmnkc6ym3001gnv01z1vjxj89	2026-03-15 06:15:00	47507.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 12:56:47.548	\N	\N	1820.00
cmnkc982q001wnv017g2z1p00	2026-03-18 06:15:00	6820.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 12:58:33.122	\N	\N	200.00
cmnkccjb10027nv01yfcxqfa8	2026-03-18 06:15:00	77602.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:01:07.645	\N	\N	2990.00
cmnkcdlka002hnv01jxqlxyza	2026-03-20 06:15:00	6760.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:01:57.227	\N	\N	260.00
cmnkceceu002qnv0122sq24u2	2026-03-20 06:15:00	13590.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:02:32.022	\N	\N	400.00
cmnkcfilu0031nv01crrdskzy	2026-03-22 06:15:00	54105.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:03:26.706	\N	\N	2080.00
cmnkcgskz003bnv01748o4rku	2026-03-25 06:15:00	50600.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:04:26.292	\N	\N	1950.00
cmnkchfqh003inv012wv0t4g7	2026-03-26 06:15:00	16925.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:04:56.298	\N	\N	500.00
cmnkcih43003qnv01ohs08lak	2026-03-27 06:15:00	40535.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:05:44.739	\N	\N	1560.00
cmnkck7yb003znv01ks4m0ixb	2026-03-29 06:15:00	17325.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-04 13:07:06.179	\N	\N	650.00
cmnle13h30097qs01ucqyyr90	2026-03-23 06:15:00	20910.00	\N	\N	cmnldzh3f0091qs019y2t4vfc	2026-04-05 06:35:59.319	\N	\N	\N
cmnlf2h9800hfqs01vz3firro	2026-03-31 06:15:00	55517.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-05 07:05:03.452	\N	\N	2080.00
cmnlf3uzt00hvqs016wuogovb	2026-04-05 06:15:00	24235.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-05 07:06:07.913	\N	\N	910.00
cmnsgyzw6000wnq01gndshez8	2026-03-31 06:15:00	3722.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:32:43.446	\N	\N	\N
cmnsgzrbh0014nq01kvg818nk	2026-03-31 06:15:00	7270.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:33:18.989	\N	\N	\N
cmnshjnsd001cnq01yt62mede	2026-03-31 06:15:00	44525.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:48:47.534	\N	\N	2080.00
cmnshm3q2001wnq01lp03lrcv	2026-04-01 06:15:00	2725.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:50:41.498	\N	\N	910.00
cmnshw1y8002inq014ee4yxgi	2026-04-05 06:15:00	69437.50	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:58:25.76	\N	\N	2600.00
cmnshxgpb002snq01ndk65el8	2026-04-09 06:15:00	20780.00	\N	\N	cmne58m9x004blk015vxd5zh8	2026-04-10 05:59:31.536	\N	\N	780.00
cms1ai294000ylr01zmkco1hu	2026-07-20 06:15:00	15040.00	\N	\N	cms1a9b230001lr01n2ecqvdv	2026-07-26 04:20:20.584	2026-07-26 06:46:04.675	I want to make kg to bags	400.00
cms1ajrvs001blr01wc1fwolo	2026-07-24 06:15:00	105290.00	\N	\N	cms1a9b230001lr01n2ecqvdv	2026-07-26 04:21:40.457	2026-07-26 06:47:20.015	becose i want to edit	2900.00
cms1hsc73005glr01e3horcrv	2026-07-26 06:15:00	13500.00	\N	\N	cms1hr4pp005alr01vijoy08i	2026-07-26 07:44:17.343	\N	\N	\N
cms1n41oe005slr01h8da2jqz	2026-07-26 06:15:00	0.00	\N	\N	cms1n3a41005mlr01c7bg8lyc	2026-07-26 10:13:21.662	\N	\N	\N
cms1ngwlu006ilr01p2sbt3vr	2026-07-26 06:15:00	0.00	\N	\N	cms1n3a41005mlr01c7bg8lyc	2026-07-26 10:23:21.618	\N	\N	\N
cms3cs6xa001omy011n8m08be	2026-07-27 06:15:00	0.00	\N	\N	cms3cqd3p0018my01a9qlnqja	2026-07-27 14:59:44.782	2026-07-27 15:00:17.976	wrong data	\N
cms3ctu5d002cmy01oz88ykb8	2026-07-27 06:15:00	100.00	\N	\N	cms3cqd3p0018my01a9qlnqja	2026-07-27 15:01:01.538	\N	\N	\N
cms402rel004zo701gao50ai7	2026-07-28 06:15:00	20.00	\N	\N	cms3cqd3p0018my01a9qlnqja	2026-07-28 01:51:49.053	\N	\N	\N
cms4cp6s3000zth01rcliiyzs	2026-07-28 06:15:00	30000.00	\N	\N	cms1hr4pp005alr01vijoy08i	2026-07-28 07:45:10.804	\N	\N	\N
cms1acwbn000jlr01jq01fks7	2026-07-26 06:15:00	126025.00	\N	\N	cms1a9b230001lr01n2ecqvdv	2026-07-26 04:16:19.62	2026-07-28 08:01:31.32	I want to add new bill	3800.00
cms2t3e2y00eslr019qje244m	2026-07-24 06:15:00	105290.00	\N	\N	cms2suzas00dmlr01evtbltvk	2026-07-27 05:48:34.955	2026-07-28 08:03:40.818	I way to	2900.00
cms2t0v0600eflr01px7e6pz4	2026-07-20 06:15:00	15040.00	\N	\N	cms2suzas00dmlr01evtbltvk	2026-07-27 05:46:36.918	2026-07-28 08:04:41.899	I want to correct bill	400.00
cms2swrvn00dslr014uthrm88	2026-07-19 06:15:00	17625.00	\N	\N	cms2suzas00dmlr01evtbltvk	2026-07-27 05:43:26.244	2026-07-28 08:04:59.592	I want to correct bill	800.00
cms2sz2hu00e2lr01wv0tsvku	2026-07-19 06:15:00	108400.00	\N	\N	cms2suzas00dmlr01evtbltvk	2026-07-27 05:45:13.314	2026-07-28 08:05:13.289	I want to correct bill	3000.00
cms4dkscw002lth01fe7iwjq2	2026-07-19 06:15:00	108400.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:09:45.104	\N	\N	3000.00
cms4dpr0c0036th01cdb3twgc	2026-07-24 06:15:00	105290.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:13:36.636	\N	\N	2900.00
cms4dmkpq002sth01oj2a4cm8	2026-07-28 06:15:00	17625.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:11:08.511	2026-07-28 08:14:56.807	I want to edit bill	800.00
cms4du1mg003gth01ko4dzstd	2026-07-19 06:15:00	17625.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:16:57.016	\N	\N	800.00
cms4dw1g9003sth01dqfl8s4e	2026-07-20 06:15:00	15040.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:18:30.105	\N	\N	400.00
cms4exwug007dth01o6e4ut38	2026-07-16 06:15:00	3722.50	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 08:47:57.065	2026-07-28 08:55:06.787	I want add more	100.00
cms4fdyvw007pth01j394a81y	2026-07-16 06:15:00	11167.50	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 09:00:26.204	2026-07-28 09:04:10.612	I want to add more	300.00
cms4fompc008jth01lguxjjqm	2026-07-16 06:15:00	14990.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-28 09:08:43.632	\N	\N	300.00
cms5usp2m0027qm017svqaat2	2026-07-28 06:15:00	92125.00	\N	\N	cms4dj70t002bth01ynkpxj33	2026-07-29 08:59:33.743	\N	\N	\N
\.


--
-- Data for Name: DealerManualPurchaseItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerManualPurchaseItem" (id, "productName", type, unit, quantity, "baseQuantity", "costPrice", "sellingPrice", "totalAmount", "purchaseId", "dealerProductId", "createdAt") FROM stdin;
cmne5jqbo005dlk01wvg8h58o	B0-Rapti	FEED	kg	50.00	\N	72.45	75.20	3622.50	cmne5jqbo005blk01b6s32tof	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:04:08.964
cmne5jqbo005elk01rwh3akwk	B1-Rapti	FEED	kg	400.00	\N	70.69	73.70	28276.00	cmne5jqbo005blk01b6s32tof	cmne5jqbg0053lk01ydcco2ok	2026-03-31 05:04:08.964
cmne5jqbo005flk01zrazrsy3	B2-Rapti	FEED	kg	250.00	\N	69.74	72.20	17435.00	cmne5jqbo005blk01b6s32tof	cmne5jqbl0057lk01y71867iz	2026-03-31 05:04:08.964
cmne5obok005zlk01nbj24nvw	B0-Rapti	FEED	kg	50.00	\N	72.45	75.20	3622.50	cmne5obok005xlk01qnllkvk0	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:07:43.268
cmne5obok0060lk01ezj6wzx1	B1-Rapti	FEED	kg	400.00	\N	70.70	73.70	28280.00	cmne5obok005xlk01qnllkvk0	cmne5oboc005plk01nf29b7sx	2026-03-31 05:07:43.268
cmne5obok0061lk012lq9tcjd	B2-Rapti	FEED	kg	250.00	\N	69.70	72.20	17425.00	cmne5obok005xlk01qnllkvk0	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:07:43.268
cmne5qjg40067lk01vxpg8s6l	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmne5qjg40065lk01vv2hhlwd	cmne5oboc005plk01nf29b7sx	2026-03-31 05:09:26.644
cmne5quua006dlk01nhxt15p5	B2-Rapti	FEED	kg	50.00	\N	69.70	72.20	3485.00	cmne5quu9006blk01nb5wdldy	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:09:41.41
cmne5rd5m006jlk01e5du4rr1	B0-Rapti	FEED	kg	50.00	\N	72.45	75.20	3622.50	cmne5rd5m006hlk019m9xdr9x	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:10:05.147
cmne5rn2n006plk010rkkidxt	B1-Rapti	FEED	kg	300.00	\N	70.70	73.70	21210.00	cmne5rn2n006nlk01vet3lm3s	cmne5oboc005plk01nf29b7sx	2026-03-31 05:10:17.999
cmne5ry30006vlk01juku303k	B2-Rapti	FEED	kg	800.00	\N	69.70	72.20	55760.00	cmne5ry30006tlk015ui65kpq	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:10:32.268
cmne5s9on0071lk011t6zcmfi	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmne5s9on006zlk014tcs0m4t	cmne5oboc005plk01nf29b7sx	2026-03-31 05:10:47.303
cmne5sfbo0077lk0132ze6how	B2-Rapti	FEED	kg	50.00	\N	69.70	72.20	3485.00	cmne5sfbo0075lk01yzhdby5b	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:10:54.612
cmne5sokl007dlk019xrkoepn	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmne5sokl007blk017xkxc0oy	cmne5oboc005plk01nf29b7sx	2026-03-31 05:11:06.597
cmne5svdy007jlk01kdpbrcg7	B2-Rapti	FEED	kg	150.00	\N	69.70	72.20	10455.00	cmne5svdy007hlk01u2k1ugyv	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:11:15.43
cmne5t48g007plk018mizqdoz	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmne5t48g007nlk015mkf9ttm	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:11:26.896
cmne5tcdw007vlk01poor6bet	B1-Rapti	FEED	kg	150.00	\N	70.70	73.70	10605.00	cmne5tcdw007tlk01tqb7pehm	cmne5oboc005plk01nf29b7sx	2026-03-31 05:11:37.461
cmne5tjts0081lk01d13qof30	B2-Rapti	FEED	kg	550.00	\N	69.70	72.20	38335.00	cmne5tjts007zlk018vtxx1yk	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:11:47.105
cmne5tua60087lk019krv3bsb	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmne5tua50085lk01xuectsv9	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:12:00.654
cmne5u69p008dlk01n06mslgr	B2-Rapti	FEED	kg	650.00	\N	69.70	72.20	45305.00	cmne5u69p008blk013tb50wc8	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:12:16.189
cmne5uki6008jlk0186pc3cmg	B2-Rapti	FEED	kg	250.00	\N	69.70	72.20	17425.00	cmne5uki6008hlk01b52m3gn6	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:12:34.638
cmne5uvo8008plk013dhorw5f	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmne5uvo8008nlk018z5rmwx9	cmne5jqb9004zlk01znbq4p47	2026-03-31 05:12:49.112
cmne5uzhb008vlk01p8jtie92	B2-Rapti	FEED	kg	500.00	\N	69.70	72.20	34850.00	cmne5uzhb008tlk010fcv50wh	cmne5oboh005tlk01ucqxgfsw	2026-03-31 05:12:54.047
cmne5yfxz0097lk019qut5bd8	B1-Rapti-New-Rate	FEED	kg	50.00	\N	72.70	75.70	3635.00	cmne5yfxy0095lk01v5qivpr2	cmne5yfxo008xlk01h6sloe3u	2026-03-31 05:15:35.351
cmne5yfxz0098lk014y8vc4tu	B2-Rapti-New-Rate	FEED	kg	200.00	\N	71.70	74.20	14340.00	cmne5yfxy0095lk01v5qivpr2	cmne5yfxw0091lk01uzf382ss	2026-03-31 05:15:35.351
cmnkc6ym3001inv016f9xhvwb	B0-Rapti	FEED	kg	50.00	\N	72.45	75.20	3622.50	cmnkc6ym3001gnv01z1vjxj89	cmne5jqb9004zlk01znbq4p47	2026-04-04 12:56:47.548
cmnkc6ym3001jnv016e5mal93	B1-Rapti	FEED	kg	400.00	\N	70.70	73.70	28280.00	cmnkc6ym3001gnv01z1vjxj89	cmne5oboc005plk01nf29b7sx	2026-04-04 12:56:47.548
cmnkc6ym3001knv01lsyq7h3s	B2-Rapti	FEED	kg	250.00	\N	69.70	72.20	17425.00	cmnkc6ym3001gnv01z1vjxj89	cmne5oboh005tlk01ucqxgfsw	2026-04-04 12:56:47.548
cmnkc982q001ynv01ab9nuqiq	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmnkc982q001wnv017g2z1p00	cmne5oboc005plk01nf29b7sx	2026-04-04 12:58:33.122
cmnkc982q001znv0166h3h48q	B2-Rapti	FEED	kg	50.00	\N	69.70	72.20	3485.00	cmnkc982q001wnv017g2z1p00	cmne5oboh005tlk01ucqxgfsw	2026-04-04 12:58:33.122
cmnkccjb10029nv01pza8jrsm	B1-Rapti	FEED	kg	300.00	\N	70.70	73.70	21210.00	cmnkccjb10027nv01yfcxqfa8	cmne5oboc005plk01nf29b7sx	2026-04-04 13:01:07.645
cmnkccjb1002anv010bgod09m	B0-Rapti	FEED	kg	50.00	\N	72.45	75.20	3622.50	cmnkccjb10027nv01yfcxqfa8	cmne5jqb9004zlk01znbq4p47	2026-04-04 13:01:07.645
cmnkccjb1002bnv01a9fl7oo3	B2-Rapti	FEED	kg	800.00	\N	69.70	72.20	55760.00	cmnkccjb10027nv01yfcxqfa8	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:01:07.645
cmnkcdlkb002jnv01vubpu58i	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmnkcdlka002hnv01jxqlxyza	cmne5oboc005plk01nf29b7sx	2026-04-04 13:01:57.227
cmnkcdlkb002knv01k87y5y4r	B2-Rapti	FEED	kg	50.00	\N	69.70	72.20	3485.00	cmnkcdlka002hnv01jxqlxyza	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:01:57.227
cmnkceceu002snv013s87biyb	B1-Rapti	FEED	kg	50.00	\N	70.70	73.70	3535.00	cmnkceceu002qnv0122sq24u2	cmne5oboc005plk01nf29b7sx	2026-04-04 13:02:32.022
cmnkceceu002tnv01qhqgcroy	B2-Rapti	FEED	kg	150.00	\N	69.70	72.20	10455.00	cmnkceceu002qnv0122sq24u2	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:02:32.022
cmnkcfilu0033nv01qxgh2kr2	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmnkcfilu0031nv01crrdskzy	cmne5jqb9004zlk01znbq4p47	2026-04-04 13:03:26.706
cmnkcfilu0034nv01a85os52k	B1-Rapti	FEED	kg	150.00	\N	70.70	73.70	10605.00	cmnkcfilu0031nv01crrdskzy	cmne5oboc005plk01nf29b7sx	2026-04-04 13:03:26.706
cmnkcfilu0035nv01v9jptqae	B2-Rapti	FEED	kg	550.00	\N	69.70	72.20	38335.00	cmnkcfilu0031nv01crrdskzy	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:03:26.706
cmnkcgsl0003dnv01p1s19b86	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmnkcgskz003bnv01748o4rku	cmne5jqb9004zlk01znbq4p47	2026-04-04 13:04:26.292
cmnkcgsl0003env01zg88y57d	B2-Rapti	FEED	kg	650.00	\N	69.70	72.20	45305.00	cmnkcgskz003bnv01748o4rku	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:04:26.292
cmnkchfqh003knv01j8656wr4	B2-Rapti	FEED	kg	250.00	\N	69.70	72.20	17425.00	cmnkchfqh003inv012wv0t4g7	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:04:56.298
cmnkcih43003snv01etufjp07	B0-Rapti	FEED	kg	100.00	\N	72.45	75.20	7245.00	cmnkcih43003qnv01ohs08lak	cmne5jqb9004zlk01znbq4p47	2026-04-04 13:05:44.739
cmnkcih43003tnv01nd3xdbty	B2-Rapti	FEED	kg	500.00	\N	69.70	72.20	34850.00	cmnkcih43003qnv01ohs08lak	cmne5oboh005tlk01ucqxgfsw	2026-04-04 13:05:44.739
cmnkck7yb0041nv016t2ybtyf	B1-Rapti-New-Rate	FEED	kg	50.00	\N	72.70	75.70	3635.00	cmnkck7yb003znv01ks4m0ixb	cmne5yfxo008xlk01h6sloe3u	2026-04-04 13:07:06.179
cmnkck7yb0042nv01xrge6zuz	B2-Rapti-New-Rate	FEED	kg	200.00	\N	71.70	74.20	14340.00	cmnkck7yb003znv01ks4m0ixb	cmne5yfxw0091lk01uzf382ss	2026-04-04 13:07:06.179
cmnle13h30099qs0191tzelxp	b2-khajana-300	FEED	kg	300.00	\N	69.70	72.20	20910.00	cmnle13h30097qs01ucqyyr90	cmnle13gy0093qs01yac3y7qz	2026-04-05 06:35:59.319
cmnlf2h9800hhqs019uqyt4dn	B0-Rapti-New-Rate	FEED	kg	50.00	\N	74.45	77.20	3722.50	cmnlf2h9800hfqs01vz3firro	cmnlf2h8s00h7qs01690wwf38	2026-04-05 07:05:03.452
cmnlf2h9800hiqs01p4y5d2zo	B1-Rapti-New-Rate	FEED	kg	100.00	\N	72.70	75.70	7270.00	cmnlf2h9800hfqs01vz3firro	cmne5yfxo008xlk01h6sloe3u	2026-04-05 07:05:03.452
cmnlf2h9800hjqs01vadtue51	B2-Rapti-New-Rate	FEED	kg	650.00	\N	71.70	74.20	46605.00	cmnlf2h9800hfqs01vz3firro	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:05:03.452
cmnlf3uzt00hxqs01uav8zm85	B1-Rapti-New-Rate	FEED	kg	50.00	\N	72.70	75.70	3635.00	cmnlf3uzt00hvqs016wuogovb	cmne5yfxo008xlk01h6sloe3u	2026-04-05 07:06:07.913
cmnlf3uzt00hyqs01n4aa4x0n	B2-Rapti-New-Rate	FEED	kg	300.00	\N	71.70	74.20	21510.00	cmnlf3uzt00hvqs016wuogovb	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:06:07.913
cmnsgyzw6000ynq01deqgfs4i	b0	FEED	kg	50.00	\N	74.45	0.00	3722.50	cmnsgyzw6000wnq01gndshez8	cmnsgyzw1000snq01m3w57cm5	2026-04-10 05:32:43.446
cmnsgzrbh0016nq01xdlt0ra5	b1	FEED	kg	100.00	\N	72.70	0.00	7270.00	cmnsgzrbh0014nq01kvg818nk	cmnsgzrbc0010nq018rztgi5x	2026-04-10 05:33:18.989
cmnshjnsd001enq01f4uu108z	b2	FEED	kg	650.00	\N	71.70	0.00	46605.00	cmnshjnsd001cnq01yt62mede	cmnshjns80018nq01qbvp4zj0	2026-04-10 05:48:47.534
cmnshm3q2001ynq012pepxm4d	b1	FEED	kg	50.00	\N	72.70	0.00	3635.00	cmnshm3q2001wnq01lp03lrcv	cmnsgzrbc0010nq018rztgi5x	2026-04-10 05:50:41.498
cmnshw1y8002knq015zj4ht78	b0	FEED	kg	50.00	\N	74.45	0.00	3722.50	cmnshw1y8002inq014ee4yxgi	cmnsgyzw1000snq01m3w57cm5	2026-04-10 05:58:25.76
cmnshw1y8002lnq01t2dqsdhm	b1	FEED	kg	200.00	\N	72.70	0.00	14540.00	cmnshw1y8002inq014ee4yxgi	cmnsgzrbc0010nq018rztgi5x	2026-04-10 05:58:25.76
cmnshw1y8002mnq0199chnno9	b2	FEED	kg	750.00	\N	71.70	0.00	53775.00	cmnshw1y8002inq014ee4yxgi	cmnshjns80018nq01qbvp4zj0	2026-04-10 05:58:25.76
cmnshxgpb002unq01pppwf7fi	b1	FEED	kg	50.00	\N	72.70	0.00	3635.00	cmnshxgpb002snq01ndk65el8	cmnsgzrbc0010nq018rztgi5x	2026-04-10 05:59:31.536
cmnshxgpb002vnq01214u9lnv	b2	FEED	kg	250.00	\N	71.70	0.00	17925.00	cmnshxgpb002snq01ndk65el8	cmnshjns80018nq01qbvp4zj0	2026-04-10 05:59:31.536
cms1acwbn000llr01223xzs37	B2	FEED	kg	2.00	\N	3685.00	0.00	7370.00	cms1acwbn000jlr01jq01fks7	cms1acwb70003lr01876jz2y3	2026-07-26 04:16:19.62
cms1acwbn000mlr01754vlbs5	b2 happy pellet 	FEED	kg	3.00	\N	3685.00	0.00	11055.00	cms1acwbn000jlr01jq01fks7	cms1acwbd0007lr01vp2qsech	2026-07-26 04:16:19.62
cms1acwbn000nlr01j8suhtzf	b1	FEED	kg	17.00	\N	3735.00	0.00	63495.00	cms1acwbn000jlr01jq01fks7	cms1acwbh000blr0129eup693	2026-07-26 04:16:19.62
cms1acwbn000olr01xohe0u0f	b2	FEED	kg	13.00	\N	3685.00	0.00	47905.00	cms1acwbn000jlr01jq01fks7	cms1acwbk000flr01787vdozz	2026-07-26 04:16:19.62
cms1ai2940010lr017i0cbbie	b1	FEED	kg	2.00	\N	3885.00	0.00	7770.00	cms1ai294000ylr01zmkco1hu	cms1ai28v000qlr01dmfxjajq	2026-07-26 04:20:20.584
cms1ai2940011lr01hml6dsh4	b2	FEED	kg	2.00	\N	3835.00	0.00	7670.00	cms1ai294000ylr01zmkco1hu	cms1ai291000ulr01px0f7l6e	2026-07-26 04:20:20.584
cms1ajrvt001dlr018169p36d	b0	FEED	kg	6.00	\N	3822.50	0.00	22935.00	cms1ajrvs001blr01wc1fwolo	cms1ajrvi0013lr01cdmd3w8u	2026-07-26 04:21:40.457
cms1ajrvt001elr01x7tetvpz	b1	FEED	kg	10.00	\N	3735.00	0.00	37350.00	cms1ajrvs001blr01wc1fwolo	cms1acwbh000blr0129eup693	2026-07-26 04:21:40.457
cms1ajrvt001flr0199v6u67l	b2	FEED	kg	13.00	\N	3685.00	0.00	47905.00	cms1ajrvs001blr01wc1fwolo	cms1acwbk000flr01787vdozz	2026-07-26 04:21:40.457
cms1hsc73005ilr01gdobac58	Boiler chicks	CHICKS	pcs	300.00	\N	45.00	0.00	13500.00	cms1hsc73005glr01e3horcrv	cms1hsc6y005clr01dctbr7jn	2026-07-26 07:44:17.343
cms1n41oe005ulr01mwkhfcub	Vet medicine	OTHER	pcs	1.00	\N	0.00	0.00	0.00	cms1n41oe005slr01h8da2jqz	cms1n41o9005olr017j1mc3jv	2026-07-26 10:13:21.662
cms1ngwlu006klr01p6qqzhaj	Vet medicine	OTHER	kg	1.00	\N	0.00	0.00	0.00	cms1ngwlu006ilr01p2sbt3vr	cms1n41o9005olr017j1mc3jv	2026-07-26 10:23:21.618
cms2swrvo00dulr01yj2ie295	B2	FEED	bags	5.00	\N	3685.00	3985.00	18425.00	cms2swrvn00dslr014uthrm88	cms2swrvh00dolr019vh5pdcr	2026-07-27 05:43:26.244
cms2sz2hu00e4lr01y3bhgu2l	B1	FEED	bags	17.00	\N	3735.00	4035.00	63495.00	cms2sz2hu00e2lr01wv0tsvku	cms2sz2ho00dwlr013e6enfgu	2026-07-27 05:45:13.314
cms2sz2hu00e5lr01ilgmugfb	B2	FEED	bags	13.00	\N	3685.00	3985.00	47905.00	cms2sz2hu00e2lr01wv0tsvku	cms2swrvh00dolr019vh5pdcr	2026-07-27 05:45:13.314
cms2t0v0600ehlr01g7rwpuo2	B1	FEED	bags	2.00	\N	3885.00	4000.00	7770.00	cms2t0v0600eflr01px7e6pz4	cms2t0uzx00e7lr01qpbvw6jt	2026-07-27 05:46:36.918
cms2t0v0600eilr01j9j9j36a	B2	FEED	bags	2.00	\N	3835.00	4000.00	7670.00	cms2t0v0600eflr01px7e6pz4	cms2t0v0300eblr01gz6sje37	2026-07-27 05:46:36.918
cms2t3e2z00eulr01o5zmkiaf	B0	FEED	bags	6.00	\N	3822.50	4125.00	22935.00	cms2t3e2y00eslr019qje244m	cms2t3e2n00eklr01jxc4d9si	2026-07-27 05:48:34.955
cms2t3e2z00evlr01mv83z89c	B1	FEED	bags	10.00	\N	3735.00	4035.00	37350.00	cms2t3e2y00eslr019qje244m	cms2sz2ho00dwlr013e6enfgu	2026-07-27 05:48:34.955
cms2t3e2z00ewlr01p92dlobr	B2	FEED	bags	13.00	\N	3685.00	3985.00	47905.00	cms2t3e2y00eslr019qje244m	cms2swrvh00dolr019vh5pdcr	2026-07-27 05:48:34.955
cms3cs6xa001qmy01kgw6xxtk	b1	FEED	kg	100.00	\N	0.00	0.00	0.00	cms3cs6xa001omy011n8m08be	cms3cs6x5001kmy01p1u5ty6r	2026-07-27 14:59:44.782
cms3ctu5e002emy0114glhjl1	b1	FEED	kg	100.00	\N	1.00	2.00	100.00	cms3ctu5d002cmy01oz88ykb8	cms3ctu450028my01dxz94bu8	2026-07-27 15:01:01.538
cms402rel0051o701xj4vu7mz	test-min stock	FEED	kg	2.00	\N	10.00	15.00	20.00	cms402rel004zo701gao50ai7	cms402ref004vo701d01oekj7	2026-07-28 01:51:49.053
cms4cp6s30011th01t1dk56o4	Chicks	CHICKS	pcs	400.00	\N	75.00	85.00	30000.00	cms4cp6s3000zth01rcliiyzs	cms4cp6ry000vth01u43pigco	2026-07-28 07:45:10.804
cms4dkscw002nth01ye3vstda	B1	FEED	bags	17.00	\N	3735.00	4035.00	63495.00	cms4dkscw002lth01fe7iwjq2	cms4dkscj002dth01ampkjqvj	2026-07-28 08:09:45.104
cms4dkscw002oth01rnctygxk	B2	FEED	bags	13.00	\N	3685.00	0.00	47905.00	cms4dkscw002lth01fe7iwjq2	cms4dkscr002hth01d3gx0m81	2026-07-28 08:09:45.104
cms4dmkpr002uth01v3afsu5y	B2	FEED	kg	5.00	\N	3685.00	0.00	18425.00	cms4dmkpq002sth01oj2a4cm8	cms4dkscr002hth01d3gx0m81	2026-07-28 08:11:08.511
cms4dpr0c0038th01kbviqzvr	B0	FEED	bags	6.00	\N	3822.50	4125.00	22935.00	cms4dpr0c0036th01cdb3twgc	cms4dpqzw002wth0133z1ix2x	2026-07-28 08:13:36.636
cms4dpr0c0039th01sm8tb8tv	B1	FEED	bags	10.00	\N	3735.00	4035.00	37350.00	cms4dpr0c0036th01cdb3twgc	cms4dkscj002dth01ampkjqvj	2026-07-28 08:13:36.636
cms4dpr0c003ath01up5w1jvo	B2	FEED	bags	13.00	\N	3685.00	3985.00	47905.00	cms4dpr0c0036th01cdb3twgc	cms4dpr080032th0149yb5sz8	2026-07-28 08:13:36.636
cms4du1mg003ith01hhql2qwg	B2	FEED	bags	5.00	\N	3685.00	3985.00	18425.00	cms4du1mg003gth01ko4dzstd	cms4dpr080032th0149yb5sz8	2026-07-28 08:16:57.016
cms4dw1g9003uth01jw639n51	B1 bags	FEED	bags	2.00	\N	3885.00	4000.00	7770.00	cms4dw1g9003sth01dqfl8s4e	cms4dw1fx003kth018304ju3l	2026-07-28 08:18:30.105
cms4dw1g9003vth01ttzsri0e	B2 bags	FEED	bags	2.00	\N	3835.00	0.00	7670.00	cms4dw1g9003sth01dqfl8s4e	cms4dw1g6003oth01u4qq3vcq	2026-07-28 08:18:30.105
cms4exwug007fth01otnvdc0l	B0	FEED	bags	1.00	\N	3822.50	4125.00	3822.50	cms4exwug007dth01o6e4ut38	cms4dpqzw002wth0133z1ix2x	2026-07-28 08:47:57.065
cms4fdyvw007rth01jofy0mm8	Bo	FEED	bags	3.00	\N	3822.50	4125.00	11467.50	cms4fdyvw007pth01j394a81y	cms4fdyvq007lth01jiqt5vqj	2026-07-28 09:00:26.204
cms4fompc008lth015y6emxmg	B0	FEED	bags	4.00	\N	3822.50	4125.00	15290.00	cms4fompc008jth01lguxjjqm	cms4dpqzw002wth0133z1ix2x	2026-07-28 09:08:43.632
cms5usp2n0029qm01e4ghxj9u	B2	FEED	bags	25.00	\N	3685.00	3985.00	92125.00	cms5usp2m0027qm017svqaat2	cms4dpr080032th0149yb5sz8	2026-07-29 08:59:33.743
\.


--
-- Data for Name: DealerProduct; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerProduct" (id, name, description, type, unit, "costPrice", "sellingPrice", "currentStock", "minStock", sku, "dealerId", "companyProductId", "createdAt", "updatedAt", "manualCompanyId", "supplierCompanyId", "hiddenAt") FROM stdin;
cms1acwb70003lr01876jz2y3	B2	\N	FEED	kg	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:16:19.604	2026-07-28 08:01:31.306	cms1a9b230001lr01n2ecqvdv	\N	\N
cms1ai28v000qlr01dmfxjajq	b1	\N	FEED	kg	3885.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:20:20.575	2026-07-27 05:57:59.592	cms1a9b230001lr01n2ecqvdv	\N	2026-07-27 05:57:59.591
cmnlf2h8s00h7qs01690wwf38	B0-Rapti-New-Rate	\N	FEED	kg	74.45	77.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:05:03.437	2026-04-05 07:07:46.44	cmne58m9x004blk015vxd5zh8	\N	\N
cmne5yfxo008xlk01h6sloe3u	B1-Rapti-New-Rate	\N	FEED	kg	72.70	75.70	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:15:35.341	2026-04-05 07:08:57.791	cmne58m9x004blk015vxd5zh8	\N	\N
cms1ajrvi0013lr01cdmd3w8u	b0	\N	FEED	kg	3822.50	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:21:40.447	2026-07-27 05:58:01.16	cms1a9b230001lr01n2ecqvdv	\N	2026-07-27 05:58:01.159
cmne5yfxw0091lk01uzf382ss	B2-Rapti-New-Rate	\N	FEED	kg	71.70	74.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:15:35.348	2026-04-05 07:09:34.407	cmne58m9x004blk015vxd5zh8	\N	\N
cmnsgyzw1000snq01m3w57cm5	b0	\N	FEED	kg	74.45	0.00	100.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-10 05:32:43.441	2026-04-10 05:58:25.747	cmne58m9x004blk015vxd5zh8	\N	\N
cms1acwbd0007lr01vp2qsech	b2 happy pellet 	\N	FEED	kg	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:16:19.61	2026-07-28 08:01:31.311	cms1a9b230001lr01n2ecqvdv	\N	\N
cmnsgzrbc0010nq018rztgi5x	b1	\N	FEED	kg	72.70	0.00	400.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-10 05:33:18.984	2026-04-10 05:59:31.526	cmne58m9x004blk015vxd5zh8	\N	\N
cmnshjns80018nq01qbvp4zj0	b2	\N	FEED	kg	71.70	0.00	1650.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-10 05:48:47.529	2026-04-10 05:59:31.533	cmne58m9x004blk015vxd5zh8	\N	\N
cmne5jqbl0057lk01y71867iz	B2-Rapti	\N	FEED	kg	69.74	72.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:04:08.961	2026-04-04 12:54:23.464	cmne58m9x004blk015vxd5zh8	\N	2026-04-04 12:54:23.463
cmne5jqbg0053lk01ydcco2ok	B1-Rapti	\N	FEED	kg	70.69	73.70	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:04:08.956	2026-04-04 12:54:29.086	cmne58m9x004blk015vxd5zh8	\N	2026-04-04 12:54:29.085
cms3ctu450028my01dxz94bu8	b1	\N	FEED	kg	1.00	2.00	80.00	\N	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 15:01:01.493	2026-07-28 01:41:51.767	cms3cqd3p0018my01a9qlnqja	\N	\N
cmnle13gy0093qs01yac3y7qz	b2-khajana-300	\N	FEED	kg	69.70	72.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:35:59.314	2026-04-05 07:05:18.439	cmnldzh3f0091qs019y2t4vfc	\N	2026-04-05 07:05:18.439
cmne5oboh005tlk01ucqxgfsw	B2-Rapti	\N	FEED	kg	69.70	72.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:07:43.265	2026-04-05 07:05:23.05	cmne58m9x004blk015vxd5zh8	\N	2026-04-05 07:05:23.049
cmne5oboc005plk01nf29b7sx	B1-Rapti	\N	FEED	kg	70.70	73.70	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:07:43.26	2026-04-05 07:05:26.757	cmne58m9x004blk015vxd5zh8	\N	2026-04-05 07:05:26.757
cmne5jqb9004zlk01znbq4p47	B0-Rapti	\N	FEED	kg	72.45	75.20	0.00	\N	\N	cmn5w47520002o4011ahlygxj	\N	2026-03-31 05:04:08.949	2026-04-05 07:05:32.999	cmne58m9x004blk015vxd5zh8	\N	2026-04-05 07:05:32.998
cms1n41o9005olr017j1mc3jv	Vet medicine	\N	OTHER	pcs	0.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 10:13:21.658	2026-07-28 08:27:14.311	cms1n3a41005mlr01c7bg8lyc	\N	\N
cms2swrvh00dolr019vh5pdcr	B2	\N	FEED	bags	3685.00	3985.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-27 05:43:26.237	2026-07-28 08:05:13.286	cms2suzas00dmlr01evtbltvk	\N	\N
cms2t0uzx00e7lr01qpbvw6jt	B1	\N	FEED	bags	3885.00	4000.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-27 05:46:36.909	2026-07-28 08:04:41.893	cms2suzas00dmlr01evtbltvk	\N	\N
cms3cs6x5001kmy01p1u5ty6r	b1	\N	FEED	kg	0.00	0.00	0.00	\N	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 14:59:44.777	2026-07-27 15:00:41.971	cms3cqd3p0018my01a9qlnqja	\N	2026-07-27 15:00:41.97
cms1acwbh000blr0129eup693	b1	\N	FEED	kg	3735.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:16:19.613	2026-07-28 08:01:31.314	cms1a9b230001lr01n2ecqvdv	\N	\N
cms1ai291000ulr01px0f7l6e	b2	\N	FEED	kg	3835.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:20:20.581	2026-07-26 07:49:57.065	cms1a9b230001lr01n2ecqvdv	\N	2026-07-26 07:49:57.065
cms402ref004vo701d01oekj7	test-min stock	\N	FEED	kg	10.00	15.00	1.00	1.00	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-28 01:51:49.048	2026-07-28 01:52:19.755	cms3cqd3p0018my01a9qlnqja	\N	\N
cms2t0v0300eblr01gz6sje37	B2	\N	FEED	bags	3835.00	4000.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-27 05:46:36.915	2026-07-28 08:04:41.896	cms2suzas00dmlr01evtbltvk	\N	\N
cms1acwbk000flr01787vdozz	b2	\N	FEED	kg	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 04:16:19.617	2026-07-28 08:01:31.317	cms1a9b230001lr01n2ecqvdv	\N	\N
cms2t3e2n00eklr01jxc4d9si	B0	\N	FEED	bags	3822.50	4125.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-27 05:48:34.943	2026-07-28 08:03:40.809	cms2suzas00dmlr01evtbltvk	\N	\N
cms4dkscj002dth01ampkjqvj	B1	\N	FEED	bags	3735.00	4035.00	3.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:09:45.091	2026-07-28 08:31:30.394	cms4dj70t002bth01ynkpxj33	\N	\N
cms1fw9bj001xlr0158c130jn	b2	\N	FEED	bags	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:51:21.008	2026-07-28 07:52:24.671	\N	\N	\N
cms2sz2ho00dwlr013e6enfgu	B1	\N	FEED	bags	3735.00	4035.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-27 05:45:13.308	2026-07-28 08:05:13.284	cms2suzas00dmlr01evtbltvk	\N	\N
cms1fzw4m002jlr01g8is0zyv	b1	\N	FEED	bags	3885.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:54:10.535	2026-07-28 07:53:12.619	\N	\N	\N
cms1fxzsj0026lr01adswc4p9	B2	\N	FEED	bags	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:52:41.971	2026-07-28 07:52:13.693	\N	\N	\N
cms1fzw4t002nlr0174269kvm	B2	\N	FEED	bags	3835.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:54:10.541	2026-07-28 07:53:12.621	\N	\N	\N
cms1fxzsn002alr013o5ca0pe	b2 happy pellet	\N	FEED	bags	3685.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:52:41.975	2026-07-28 07:52:13.696	\N	\N	\N
cms1g1v9h002wlr01epjoqbao	b0	\N	FEED	bags	3822.50	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:55:42.725	2026-07-28 07:51:59.021	\N	\N	\N
cms1fw9bd001tlr01qp9w7uac	B1	\N	FEED	bags	3735.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 06:51:21.001	2026-07-28 07:52:24.669	\N	\N	\N
cms4dw1fx003kth018304ju3l	B1 bags	\N	FEED	bags	3885.00	4000.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:18:30.094	2026-07-28 08:30:43.438	cms4dj70t002bth01ynkpxj33	\N	\N
cms4dw1g6003oth01u4qq3vcq	B2 bags	\N	FEED	bags	3835.00	0.00	1.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:18:30.102	2026-07-28 08:24:42.894	cms4dj70t002bth01ynkpxj33	\N	\N
cms4dpqzw002wth0133z1ix2x	B0	\N	FEED	bags	3822.50	4125.00	3.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:13:36.62	2026-07-28 09:10:44.886	cms4dj70t002bth01ynkpxj33	\N	\N
cms4dkscr002hth01d3gx0m81	B2	\N	FEED	bags	3685.00	0.00	1.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:09:45.1	2026-07-28 08:33:21.741	cms4dj70t002bth01ynkpxj33	\N	\N
cms1hsc6y005clr01dctbr7jn	Boiler chicks	\N	CHICKS	pcs	45.00	0.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-26 07:44:17.339	2026-07-28 08:26:03.329	cms1hr4pp005alr01vijoy08i	\N	\N
cms4fdyvq007lth01jiqt5vqj	Bo	\N	FEED	bags	3822.50	4125.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 09:00:26.199	2026-07-28 09:04:10.608	cms4dj70t002bth01ynkpxj33	\N	\N
cms4dpr080032th0149yb5sz8	B2	\N	FEED	bags	3685.00	3985.00	25.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:13:36.632	2026-07-29 08:59:33.737	cms4dj70t002bth01ynkpxj33	\N	\N
cms4cp6ry000vth01u43pigco	Chicks	\N	CHICKS	pcs	75.00	85.00	0.00	\N	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 07:45:10.799	2026-07-28 09:10:44.886	cms1hr4pp005alr01vijoy08i	\N	\N
\.


--
-- Data for Name: DealerProductTransaction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerProductTransaction" (id, type, quantity, "unitPrice", "totalAmount", date, description, reference, "productId", "dealerSaleId", "createdAt", "updatedAt", unit) FROM stdin;
cmne5jqbc0051lk01xbji8tzr	PURCHASE	50.00	72.45	3622.50	2026-03-31 05:04:08.951	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:04:08.952	2026-03-31 05:04:08.952	kg
cmne5jqbi0055lk01osqiquda	PURCHASE	400.00	70.69	28276.00	2026-03-31 05:04:08.957	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqbg0053lk01ydcco2ok	\N	2026-03-31 05:04:08.958	2026-03-31 05:04:08.958	kg
cmne5jqbm0059lk019fwmg8a2	PURCHASE	250.00	69.74	17435.00	2026-03-31 05:04:08.962	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqbl0057lk01y71867iz	\N	2026-03-31 05:04:08.963	2026-03-31 05:04:08.963	kg
cmne5ljfc005hlk01qkdm7njc	RETURN	50.00	72.45	3622.50	2026-03-31 05:05:33.335	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5jqbo005blk01b6s32tof	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:05:33.336	2026-03-31 05:05:33.336	kg
cmne5ljfg005jlk015dgczhsm	RETURN	400.00	70.69	28276.00	2026-03-31 05:05:33.339	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5jqbo005blk01b6s32tof	cmne5jqbg0053lk01ydcco2ok	\N	2026-03-31 05:05:33.34	2026-03-31 05:05:33.34	kg
cmne5ljfi005llk01pghoc1qn	RETURN	250.00	69.74	17435.00	2026-03-31 05:05:33.342	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5jqbo005blk01b6s32tof	cmne5jqbl0057lk01y71867iz	\N	2026-03-31 05:05:33.343	2026-03-31 05:05:33.343	kg
cmne5obo9005nlk01s997rmr8	PURCHASE	50.00	72.45	3622.50	2026-03-31 05:07:43.257	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:07:43.258	2026-03-31 05:07:43.258	kg
cmne5oboe005rlk0177cki5x1	PURCHASE	400.00	70.70	28280.00	2026-03-31 05:07:43.262	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:07:43.263	2026-03-31 05:07:43.263	kg
cmne5oboi005vlk01pwoe81jp	PURCHASE	250.00	69.70	17425.00	2026-03-31 05:07:43.266	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:07:43.267	2026-03-31 05:07:43.267	kg
cmne5qjg00063lk01rt1iabfy	PURCHASE	50.00	70.70	3535.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:09:26.64	2026-03-31 05:09:26.64	kg
cmne5quu70069lk01rwspmve6	PURCHASE	50.00	69.70	3485.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:09:41.407	2026-03-31 05:09:41.407	kg
cmne5rd5j006flk01udmy0bo5	PURCHASE	50.00	72.45	3622.50	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:10:05.144	2026-03-31 05:10:05.144	kg
cmne5rn2l006llk01z5gwi1af	PURCHASE	300.00	70.70	21210.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:10:17.997	2026-03-31 05:10:17.997	kg
cmne5ry2y006rlk01osg4r7tf	PURCHASE	800.00	69.70	55760.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:10:32.267	2026-03-31 05:10:32.267	kg
cmne5s9ol006xlk017fp8148x	PURCHASE	50.00	70.70	3535.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:10:47.301	2026-03-31 05:10:47.301	kg
cmne5sfbm0073lk012wjxdoi1	PURCHASE	50.00	69.70	3485.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:10:54.611	2026-03-31 05:10:54.611	kg
cmne5sokk0079lk0156tsd64b	PURCHASE	50.00	70.70	3535.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:11:06.596	2026-03-31 05:11:06.596	kg
cmne5svdw007flk01kjdba6mz	PURCHASE	150.00	69.70	10455.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:11:15.429	2026-03-31 05:11:15.429	kg
cmne5t48e007llk01crixg5zf	PURCHASE	100.00	72.45	7245.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:11:26.895	2026-03-31 05:11:26.895	kg
cmne5tcdv007rlk01x1ws5e7k	PURCHASE	150.00	70.70	10605.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 05:11:37.459	2026-03-31 05:11:37.459	kg
cmne5tjtr007xlk01c7r7jndb	PURCHASE	550.00	69.70	38335.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:11:47.103	2026-03-31 05:11:47.103	kg
cmne5tua40083lk01b4rb3oiw	PURCHASE	100.00	72.45	7245.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:12:00.653	2026-03-31 05:12:00.653	kg
cmne5u69n0089lk01dsc6n231	PURCHASE	650.00	69.70	45305.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:12:16.188	2026-03-31 05:12:16.188	kg
cmne5uki5008flk01dudx4kat	PURCHASE	250.00	69.70	17425.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:12:34.637	2026-03-31 05:12:34.637	kg
cmne5uvo6008llk01kqv02byb	PURCHASE	100.00	72.45	7245.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 05:12:49.111	2026-03-31 05:12:49.111	kg
cmne5uzh9008rlk014fjbuouy	PURCHASE	500.00	69.70	34850.00	2026-03-31 00:00:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 05:12:54.046	2026-03-31 05:12:54.046	kg
cmne5yfxs008zlk01mqlz2283	PURCHASE	50.00	72.70	3635.00	2026-03-31 05:15:35.343	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxo008xlk01h6sloe3u	\N	2026-03-31 05:15:35.344	2026-03-31 05:15:35.344	kg
cmne5yfxx0093lk016dbn4usd	PURCHASE	200.00	71.70	14340.00	2026-03-31 05:15:35.349	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxw0091lk01uzf382ss	\N	2026-03-31 05:15:35.349	2026-03-31 05:15:35.349	kg
cmne98h7500hslk01bogpwmcr	RETURN	50.00	72.70	3635.00	2026-03-31 06:47:22.385	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5yfxy0095lk01v5qivpr2	cmne5yfxo008xlk01h6sloe3u	\N	2026-03-31 06:47:22.386	2026-03-31 06:47:22.386	kg
cmne98h7800hulk01ye9f0dti	RETURN	200.00	71.70	14340.00	2026-03-31 06:47:22.388	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5yfxy0095lk01v5qivpr2	cmne5yfxw0091lk01uzf382ss	\N	2026-03-31 06:47:22.389	2026-03-31 06:47:22.389	kg
cmne98mby00hwlk015srp3z85	RETURN	50.00	72.45	3622.50	2026-03-31 06:47:29.037	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5obok005xlk01qnllkvk0	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 06:47:29.038	2026-03-31 06:47:29.038	kg
cmne98mc000hylk019xbyo0cf	RETURN	400.00	70.70	28280.00	2026-03-31 06:47:29.04	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5obok005xlk01qnllkvk0	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:47:29.04	2026-03-31 06:47:29.04	kg
cmne98mc200i0lk01rcq6ag84	RETURN	250.00	69.70	17425.00	2026-03-31 06:47:29.042	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5obok005xlk01qnllkvk0	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:47:29.042	2026-03-31 06:47:29.042	kg
cmne98qpg00i2lk01f8kkd1n8	RETURN	50.00	69.70	3485.00	2026-03-31 06:47:34.708	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5quu9006blk01nb5wdldy	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:47:34.708	2026-03-31 06:47:34.708	kg
cmne98vlb00i4lk018bp35yxf	RETURN	50.00	70.70	3535.00	2026-03-31 06:47:41.038	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5qjg40065lk01vv2hhlwd	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:47:41.039	2026-03-31 06:47:41.039	kg
cmne98yhp00i6lk01wb5ggnym	RETURN	500.00	69.70	34850.00	2026-03-31 06:47:44.797	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5uzhb008tlk010fcv50wh	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:47:44.797	2026-03-31 06:47:44.797	kg
cmne991q100i8lk01n6lhnics	RETURN	100.00	72.45	7245.00	2026-03-31 06:47:48.985	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5uvo8008nlk018z5rmwx9	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 06:47:48.986	2026-03-31 06:47:48.986	kg
cmne9954000ialk01i8t21e5v	RETURN	250.00	69.70	17425.00	2026-03-31 06:47:53.376	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5uki6008hlk01b52m3gn6	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:47:53.377	2026-03-31 06:47:53.377	kg
cmne999pr00iclk01d5fdd9jz	RETURN	100.00	72.45	7245.00	2026-03-31 06:47:59.342	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5tua50085lk01xuectsv9	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 06:47:59.343	2026-03-31 06:47:59.343	kg
cmne99e0000ielk019dyc8uzh	RETURN	550.00	69.70	38335.00	2026-03-31 06:48:04.895	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5tjts007zlk018vtxx1yk	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:48:04.896	2026-03-31 06:48:04.896	kg
cmne99ik500iglk01w2di1h83	RETURN	150.00	70.70	10605.00	2026-03-31 06:48:10.805	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5tcdw007tlk01tqb7pehm	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:48:10.805	2026-03-31 06:48:10.805	kg
cmne99mo600iilk01tj56ps9l	RETURN	100.00	72.45	7245.00	2026-03-31 06:48:16.133	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5t48g007nlk015mkf9ttm	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 06:48:16.134	2026-03-31 06:48:16.134	kg
cmne9a0jw00iolk01d5amukbn	RETURN	50.00	72.45	3622.50	2026-03-31 06:48:34.124	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5rd5m006hlk019m9xdr9x	cmne5jqb9004zlk01znbq4p47	\N	2026-03-31 06:48:34.125	2026-03-31 06:48:34.125	kg
cmne9a4te00iqlk01yprucufy	RETURN	300.00	70.70	21210.00	2026-03-31 06:48:39.65	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5rn2n006nlk01vet3lm3s	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:48:39.651	2026-03-31 06:48:39.651	kg
cmne9a8sg00islk01xnczr9lk	RETURN	50.00	70.70	3535.00	2026-03-31 06:48:44.8	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5s9on006zlk014tcs0m4t	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:48:44.8	2026-03-31 06:48:44.8	kg
cmne9ad6u00iulk01o3hz10hv	RETURN	50.00	69.70	3485.00	2026-03-31 06:48:50.502	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5sfbo0075lk01yzhdby5b	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:48:50.503	2026-03-31 06:48:50.503	kg
cmne9ah4f00iwlk01ukqlnd1b	RETURN	150.00	69.70	10455.00	2026-03-31 06:48:55.599	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5svdy007hlk01u2k1ugyv	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:48:55.6	2026-03-31 06:48:55.6	kg
cmne9alfm00iylk01csxcf3y8	RETURN	650.00	69.70	45305.00	2026-03-31 06:49:01.185	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5u69p008blk013tb50wc8	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:49:01.186	2026-03-31 06:49:01.186	kg
cmne9au1z00j4lk01n2xilwtp	RETURN	800.00	69.70	55760.00	2026-03-31 06:49:12.358	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5ry30006tlk015ui65kpq	cmne5oboh005tlk01ucqxgfsw	\N	2026-03-31 06:49:12.359	2026-03-31 06:49:12.359	kg
cmne9ax9q00j6lk01la14t4vp	RETURN	50.00	70.70	3535.00	2026-03-31 06:49:16.526	Void manual purchase from Rapti Feed PVT.Ltd	VOID_PURCHASE:cmne5sokl007blk017xkxc0oy	cmne5oboc005plk01nf29b7sx	\N	2026-03-31 06:49:16.527	2026-03-31 06:49:16.527	kg
cmnkc6ylt001anv01mfb71nag	PURCHASE	50.00	72.45	3622.50	2026-03-15 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-04-04 12:56:47.537	2026-04-04 12:56:47.537	kg
cmnkc6yly001cnv01z0um2spk	PURCHASE	400.00	70.70	28280.00	2026-03-15 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 12:56:47.542	2026-04-04 12:56:47.542	kg
cmnkc6ym2001env0110z9zk55	PURCHASE	250.00	69.70	17425.00	2026-03-15 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 12:56:47.546	2026-04-04 12:56:47.546	kg
cmnkc982j001snv01mqcftg33	PURCHASE	50.00	70.70	3535.00	2026-03-18 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 12:58:33.115	2026-04-04 12:58:33.115	kg
cmnkc982p001unv01i9wqnn9b	PURCHASE	50.00	69.70	3485.00	2026-03-18 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 12:58:33.121	2026-04-04 12:58:33.121	kg
cmnkccjar0021nv01cttrn5ct	PURCHASE	300.00	70.70	21210.00	2026-03-18 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 13:01:07.636	2026-04-04 13:01:07.636	kg
cmnkccjav0023nv01y7ktrcwp	PURCHASE	50.00	72.45	3622.50	2026-03-18 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-04-04 13:01:07.64	2026-04-04 13:01:07.64	kg
cmnkccjaz0025nv01hh0etr6j	PURCHASE	800.00	69.70	55760.00	2026-03-18 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:01:07.644	2026-04-04 13:01:07.644	kg
cmnkcdlk4002dnv01iyd0vdxu	PURCHASE	50.00	70.70	3535.00	2026-03-20 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 13:01:57.221	2026-04-04 13:01:57.221	kg
cmnkcdlk9002fnv01ozl3abla	PURCHASE	50.00	69.70	3485.00	2026-03-20 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:01:57.225	2026-04-04 13:01:57.225	kg
cmnkcecen002mnv01pbq1cvoq	PURCHASE	50.00	70.70	3535.00	2026-03-20 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 13:02:32.014	2026-04-04 13:02:32.014	kg
cmnkceces002onv01a95z9oi7	PURCHASE	150.00	69.70	10455.00	2026-03-20 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:02:32.021	2026-04-04 13:02:32.021	kg
cmnkcfilk002vnv01v9f8757d	PURCHASE	100.00	72.45	7245.00	2026-03-22 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-04-04 13:03:26.696	2026-04-04 13:03:26.696	kg
cmnkcfilp002xnv01zbluqx7k	PURCHASE	150.00	70.70	10605.00	2026-03-22 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboc005plk01nf29b7sx	\N	2026-04-04 13:03:26.701	2026-04-04 13:03:26.701	kg
cmnkcfilt002znv01vkjhde3m	PURCHASE	550.00	69.70	38335.00	2026-03-22 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:03:26.705	2026-04-04 13:03:26.705	kg
cmnkcgskt0037nv0137fjucbg	PURCHASE	100.00	72.45	7245.00	2026-03-25 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-04-04 13:04:26.285	2026-04-04 13:04:26.285	kg
cmnkcgsky0039nv01lt2kyprd	PURCHASE	650.00	69.70	45305.00	2026-03-25 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:04:26.29	2026-04-04 13:04:26.29	kg
cmnkchfqg003gnv01gywg59tv	PURCHASE	250.00	69.70	17425.00	2026-03-26 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:04:56.296	2026-04-04 13:04:56.296	kg
cmnkcih3x003mnv015e2dlafp	PURCHASE	100.00	72.45	7245.00	2026-03-27 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5jqb9004zlk01znbq4p47	\N	2026-04-04 13:05:44.734	2026-04-04 13:05:44.734	kg
cmnkcih41003onv015mfum4ia	PURCHASE	500.00	69.70	34850.00	2026-03-27 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5oboh005tlk01ucqxgfsw	\N	2026-04-04 13:05:44.738	2026-04-04 13:05:44.738	kg
cmnkck7y4003vnv01d72tkemd	PURCHASE	50.00	72.70	3635.00	2026-03-29 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxo008xlk01h6sloe3u	\N	2026-04-04 13:07:06.172	2026-04-04 13:07:06.172	kg
cmnkck7y9003xnv01eos38yr6	PURCHASE	200.00	71.70	14340.00	2026-03-29 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxw0091lk01uzf382ss	\N	2026-04-04 13:07:06.178	2026-04-04 13:07:06.178	kg
cmnldl8rh000tqs015p071wb1	SALE	100.00	73.70	7370.00	2026-03-15 06:15:00	Sale - Invoice INV-001	INV-001	cmne5oboc005plk01nf29b7sx	cmnldl8rd000pqs0155k3mli5	2026-04-05 06:23:39.677	2026-04-05 06:23:39.677	kg
cmnldlsu20015qs01nltm5ydq	SALE	100.00	72.20	7220.00	2026-04-05 06:15:00	Sale - Invoice INV-002	INV-002	cmne5oboh005tlk01ucqxgfsw	cmnldlstz0011qs0110cxto1q	2026-04-05 06:24:05.69	2026-04-05 06:24:05.69	kg
cmnldmeg6001hqs01psifzdyt	SALE	100.00	73.70	7370.00	2026-03-15 06:15:00	Sale - Invoice INV-003	INV-003	cmne5oboc005plk01nf29b7sx	cmnldmeg3001dqs01ei7fvhr5	2026-04-05 06:24:33.702	2026-04-05 06:24:33.702	kg
cmnldn5ia001vqs01svk5worl	SALE	150.00	73.70	11055.00	2026-03-15 06:15:00	Sale - Invoice INV-004	INV-004	cmne5oboc005plk01nf29b7sx	cmnldn5i7001pqs01ie298gak	2026-04-05 06:25:08.77	2026-04-05 06:25:08.77	kg
cmnldn5ia001xqs01dhpj2xmv	SALE	150.00	72.20	10830.00	2026-03-15 06:15:00	Sale - Invoice INV-004	INV-004	cmne5oboh005tlk01ucqxgfsw	cmnldn5i7001pqs01ie298gak	2026-04-05 06:25:08.77	2026-04-05 06:25:08.77	kg
cmnldnsdz002bqs01qk5ogoj4	SALE	50.00	75.20	3760.00	2026-03-15 06:15:00	Sale - Invoice INV-005	INV-005	cmne5jqb9004zlk01znbq4p47	cmnldnsdw0025qs01o6nq6mwq	2026-04-05 06:25:38.423	2026-04-05 06:25:38.423	kg
cmnldnse0002dqs01oa92mcn1	SALE	50.00	73.70	3685.00	2026-03-15 06:15:00	Sale - Invoice INV-005	INV-005	cmne5oboc005plk01nf29b7sx	cmnldnsdw0025qs01o6nq6mwq	2026-04-05 06:25:38.423	2026-04-05 06:25:38.423	kg
cmnldpbwb002pqs01jg69nqbf	SALE	50.00	72.20	3610.00	2026-03-16 06:15:00	Sale - Invoice INV-006	INV-006	cmne5oboh005tlk01ucqxgfsw	cmnldpbw9002lqs01d9hf7hsm	2026-04-05 06:26:50.363	2026-04-05 06:26:50.363	kg
cmnldpx810031qs01p846wfbo	SALE	50.00	73.70	3685.00	2026-03-16 06:15:00	Sale - Invoice INV-007	INV-007	cmne5oboc005plk01nf29b7sx	cmnldpx7x002xqs01r6lw8f2m	2026-04-05 06:27:18.001	2026-04-05 06:27:18.001	kg
cmnldqckr003dqs0177ylpyhh	SALE	200.00	72.20	14440.00	2026-03-17 06:15:00	Sale - Invoice INV-008	INV-008	cmne5oboh005tlk01ucqxgfsw	cmnldqckp0039qs01vp0y84u0	2026-04-05 06:27:37.9	2026-04-05 06:27:37.9	kg
cmnldqrip003pqs01wgd0wxi6	SALE	50.00	73.70	3685.00	2026-03-17 06:15:00	Sale - Invoice INV-009	INV-009	cmne5oboc005plk01nf29b7sx	cmnldqrim003lqs012so3hzdz	2026-04-05 06:27:57.266	2026-04-05 06:27:57.266	kg
cmnldr5cd0041qs01bx56kaqa	SALE	50.00	73.70	3685.00	2026-03-17 06:15:00	Sale - Invoice INV-010	INV-010	cmne5oboc005plk01nf29b7sx	cmnldr5cb003xqs0171a8g4np	2026-04-05 06:28:15.181	2026-04-05 06:28:15.181	kg
cmnldrkny004dqs019kmbha2y	SALE	200.00	73.70	14740.00	2026-03-17 06:15:00	Sale - Invoice INV-011	INV-011	cmne5oboc005plk01nf29b7sx	cmnldrknw0049qs01wi1cc6it	2026-04-05 06:28:35.038	2026-04-05 06:28:35.038	kg
cmnlds3is004pqs01wixlizg9	SALE	200.00	72.20	14440.00	2026-03-17 06:15:00	Sale - Invoice INV-012	INV-012	cmne5oboh005tlk01ucqxgfsw	cmnlds3iq004lqs01tkfpmryr	2026-04-05 06:28:59.476	2026-04-05 06:28:59.476	kg
cmnldstwe0053qs01ayr8qadu	SALE	50.00	75.20	3760.00	2026-03-17 06:15:00	Sale - Invoice INV-013	INV-013	cmne5jqb9004zlk01znbq4p47	cmnldstwb004xqs01ilhdo7kc	2026-04-05 06:29:33.661	2026-04-05 06:29:33.661	kg
cmnldstwe0055qs01oxo0g9q9	SALE	400.00	72.20	28880.00	2026-03-17 06:15:00	Sale - Invoice INV-013	INV-013	cmne5oboh005tlk01ucqxgfsw	cmnldstwb004xqs01ilhdo7kc	2026-04-05 06:29:33.661	2026-04-05 06:29:33.661	kg
cmnldtic0005hqs01dvvbf461	SALE	50.00	73.70	3685.00	2026-03-19 06:15:00	Sale - Invoice INV-014	INV-014	cmne5oboc005plk01nf29b7sx	cmnldtiby005dqs01qicmp8tl	2026-04-05 06:30:05.328	2026-04-05 06:30:05.328	kg
cmnldtyu5005tqs01a1wccq9v	SALE	50.00	72.20	3610.00	2026-03-19 06:15:00	Sale - Invoice INV-015	INV-015	cmne5oboh005tlk01ucqxgfsw	cmnldtyu3005pqs01qjovl6jz	2026-04-05 06:30:26.717	2026-04-05 06:30:26.717	kg
cmnlduesn0065qs01pzbby3l0	SALE	150.00	72.20	10830.00	2026-03-20 06:15:00	Sale - Invoice INV-016	INV-016	cmne5oboh005tlk01ucqxgfsw	cmnlduesk0061qs01nzswcg6m	2026-04-05 06:30:47.399	2026-04-05 06:30:47.399	kg
cmnlduthv006hqs01quyr67kn	SALE	200.00	72.20	14440.00	2026-03-20 06:15:00	Sale - Invoice INV-017	INV-017	cmne5oboh005tlk01ucqxgfsw	cmnlduthu006dqs01iir7ivnz	2026-04-05 06:31:06.452	2026-04-05 06:31:06.452	kg
cmnldvdye006vqs01miq71g3y	SALE	50.00	75.20	3760.00	2026-03-20 06:15:00	Sale - Invoice INV-018	INV-018	cmne5jqb9004zlk01znbq4p47	cmnldvdyc006pqs01r6bcbl8k	2026-04-05 06:31:32.966	2026-04-05 06:31:32.966	kg
cmnldvdye006xqs01843rgtb6	SALE	50.00	72.20	3610.00	2026-03-20 06:15:00	Sale - Invoice INV-018	INV-018	cmne5oboh005tlk01ucqxgfsw	cmnldvdyc006pqs01r6bcbl8k	2026-04-05 06:31:32.966	2026-04-05 06:31:32.966	kg
cmnldvqa20079qs0123o78rl9	SALE	100.00	72.20	7220.00	2026-03-21 06:15:00	Sale - Invoice INV-019	INV-019	cmne5oboh005tlk01ucqxgfsw	cmnldvqa00075qs01kqn5uva9	2026-04-05 06:31:48.938	2026-04-05 06:31:48.938	kg
cmnldw2u1007lqs0178j0lwvb	SALE	50.00	73.70	3685.00	2026-03-21 06:15:00	Sale - Invoice INV-020	INV-020	cmne5oboc005plk01nf29b7sx	cmnldw2ty007hqs011kkt69wg	2026-04-05 06:32:05.209	2026-04-05 06:32:05.209	kg
cmnldwmrb007zqs01svookecb	SALE	150.00	73.70	11055.00	2026-03-22 06:15:00	Sale - Invoice INV-021	INV-021	cmne5oboc005plk01nf29b7sx	cmnldwmr8007tqs01bt7ktl5p	2026-04-05 06:32:31.031	2026-04-05 06:32:31.031	kg
cmnldwmrb0081qs01tadh9gco	SALE	50.00	72.20	3610.00	2026-03-22 06:15:00	Sale - Invoice INV-021	INV-021	cmne5oboh005tlk01ucqxgfsw	cmnldwmr8007tqs01bt7ktl5p	2026-04-05 06:32:31.031	2026-04-05 06:32:31.031	kg
cmnldxob5008fqs01m7y5vfbc	SALE	50.00	75.20	3760.00	2026-03-23 06:15:00	Sale - Invoice INV-022	INV-022	cmne5jqb9004zlk01znbq4p47	cmnldxob2008bqs01kylzrkrj	2026-04-05 06:33:19.697	2026-04-05 06:33:19.697	kg
cmnldy3uc008rqs01d0y3m5zc	SALE	450.00	72.20	32490.00	2026-03-23 06:15:00	Sale - Invoice INV-023	INV-023	cmne5oboh005tlk01ucqxgfsw	cmnldy3ua008nqs01tb0psllt	2026-04-05 06:33:39.828	2026-04-05 06:33:39.828	kg
cmnle13h00095qs01cfgxqqza	PURCHASE	300.00	69.70	20910.00	2026-03-23 06:15:00	Purchase from Khajana Fresh House	\N	cmnle13gy0093qs01yac3y7qz	\N	2026-04-05 06:35:59.316	2026-04-05 06:35:59.316	kg
cmnle3bhr009jqs01q48c2wqn	SALE	100.00	72.20	7220.00	2026-03-24 06:15:00	Sale - Invoice INV-024	INV-024	cmne5oboh005tlk01ucqxgfsw	cmnle3bhp009fqs01zel1x6u7	2026-04-05 06:37:43.023	2026-04-05 06:37:43.023	kg
cmnle4cta009xqs01ruj0gkkj	SALE	100.00	75.20	7520.00	2026-03-24 06:15:00	Sale - Invoice INV-025	INV-025	cmne5jqb9004zlk01znbq4p47	cmnle4ct6009tqs011kd0h3qc	2026-04-05 06:38:31.389	2026-04-05 06:38:31.389	kg
cmnle4ygp00a9qs012ua2znjo	SALE	150.00	72.20	10830.00	2026-03-24 06:15:00	Sale - Invoice INV-026	INV-026	cmne5oboh005tlk01ucqxgfsw	cmnle4ygn00a5qs010fzvx5p8	2026-04-05 06:38:59.449	2026-04-05 06:38:59.449	kg
cmnle5l3u00alqs0159sh0l5i	SALE	100.00	72.20	7220.00	2026-03-24 06:15:00	Sale - Invoice INV-027	INV-027	cmne5oboh005tlk01ucqxgfsw	cmnle5l3s00ahqs01ojlhfsiu	2026-04-05 06:39:28.794	2026-04-05 06:39:28.794	kg
cmnle73q800axqs01vkb7dg1b	SALE	100.00	72.20	7220.00	2026-03-26 06:15:00	Sale - Invoice INV-028	INV-028	cmne5oboh005tlk01ucqxgfsw	cmnle73q600atqs01rmwvuhbo	2026-04-05 06:40:39.585	2026-04-05 06:40:39.585	kg
cmnle7hi900b9qs012rulg0gq	SALE	50.00	72.20	3610.00	2026-03-26 06:15:00	Sale - Invoice INV-029	INV-029	cmne5oboh005tlk01ucqxgfsw	cmnle7hi700b5qs01o9h5fby6	2026-04-05 06:40:57.441	2026-04-05 06:40:57.441	kg
cmnle82cs00blqs01lobb12of	SALE	300.00	72.20	21660.00	2026-03-27 06:15:00	Sale - Invoice INV-030	INV-030	cmne5oboh005tlk01ucqxgfsw	cmnle82cq00bhqs01vg3nyd61	2026-04-05 06:41:24.46	2026-04-05 06:41:24.46	kg
cmnle8oqp00bxqs012y6yan7f	SALE	100.00	72.20	7220.00	2026-03-27 06:15:00	Sale - Invoice INV-031	INV-031	cmne5oboh005tlk01ucqxgfsw	cmnle8oqm00btqs01e02z5fu9	2026-04-05 06:41:53.473	2026-04-05 06:41:53.473	kg
cmnle9c5u00c9qs01kljmv1po	SALE	50.00	72.20	3610.00	2026-03-27 06:15:00	Sale - Invoice INV-032	INV-032	cmne5oboh005tlk01ucqxgfsw	cmnle9c5r00c5qs01epkxy86u	2026-04-05 06:42:23.826	2026-04-05 06:42:23.826	kg
cmnle9wiu00cnqs01ygi20d0m	SALE	100.00	75.20	7520.00	2026-03-27 06:15:00	Sale - Invoice INV-033	INV-033	cmne5jqb9004zlk01znbq4p47	cmnle9wir00chqs015a028h1g	2026-04-05 06:42:50.214	2026-04-05 06:42:50.214	kg
cmnle9wiu00cpqs015111huk4	SALE	250.00	72.20	18050.00	2026-03-27 06:15:00	Sale - Invoice INV-033	INV-033	cmnle13gy0093qs01yac3y7qz	cmnle9wir00chqs015a028h1g	2026-04-05 06:42:50.214	2026-04-05 06:42:50.214	kg
cmnlebeo500d5qs01rplsxkey	SALE	150.00	72.20	10830.00	2026-03-27 06:15:00	Sale - Invoice INV-034	INV-034	cmne5oboh005tlk01ucqxgfsw	cmnlebeo300d1qs014k27o7k1	2026-04-05 06:44:00.389	2026-04-05 06:44:00.389	kg
cmnlebrn600dhqs01swa5i1qt	SALE	50.00	72.20	3610.00	2026-03-27 06:15:00	Sale - Invoice INV-035	INV-035	cmnle13gy0093qs01yac3y7qz	cmnlebrn200ddqs01t502k0ao	2026-04-05 06:44:17.202	2026-04-05 06:44:17.202	kg
cmnlecy9a00dtqs01vq2njj53	SALE	50.00	74.20	3710.00	2026-03-29 06:15:00	Sale - Invoice INV-036	INV-036	cmne5yfxw0091lk01uzf382ss	cmnlecy9700dpqs01u6jay1ky	2026-04-05 06:45:12.43	2026-04-05 06:45:12.43	kg
cmnledb8v00e5qs01e6ztiu4x	SALE	50.00	74.20	3710.00	2026-03-29 06:15:00	Sale - Invoice INV-037	INV-037	cmne5yfxw0091lk01uzf382ss	cmnledb8t00e1qs01t3gkcepv	2026-04-05 06:45:29.263	2026-04-05 06:45:29.263	kg
cmnlednce00ehqs01y7h8n4pd	SALE	100.00	74.20	7420.00	2026-03-29 06:15:00	Sale - Invoice INV-038	INV-038	cmne5yfxw0091lk01uzf382ss	cmnledncc00edqs01q7yxbmwc	2026-04-05 06:45:44.942	2026-04-05 06:45:44.942	kg
cmnledzbe00etqs01ts8l4bzd	SALE	50.00	75.70	3785.00	2026-03-29 06:15:00	Sale - Invoice INV-039	INV-039	cmne5yfxo008xlk01h6sloe3u	cmnledzbc00epqs01w8hhndp9	2026-04-05 06:46:00.458	2026-04-05 06:46:00.458	kg
cmnlf2h8v00h9qs01vzlgxvyn	PURCHASE	50.00	74.45	3722.50	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnlf2h8s00h7qs01690wwf38	\N	2026-04-05 07:05:03.44	2026-04-05 07:05:03.44	kg
cmnlf2h9200hbqs013u244x7w	PURCHASE	100.00	72.70	7270.00	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxo008xlk01h6sloe3u	\N	2026-04-05 07:05:03.446	2026-04-05 07:05:03.446	kg
cmnlf2h9600hdqs01qyehb9yl	PURCHASE	650.00	71.70	46605.00	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxw0091lk01uzf382ss	\N	2026-04-05 07:05:03.451	2026-04-05 07:05:03.451	kg
cmnlf3uzm00hrqs01sb2czx54	PURCHASE	50.00	72.70	3635.00	2026-04-05 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxo008xlk01h6sloe3u	\N	2026-04-05 07:06:07.907	2026-04-05 07:06:07.907	kg
cmnlf3uzr00htqs01re20dhki	PURCHASE	300.00	71.70	21510.00	2026-04-05 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmne5yfxw0091lk01uzf382ss	\N	2026-04-05 07:06:07.912	2026-04-05 07:06:07.912	kg
cmnlf52sf00icqs01bspjark3	SALE	150.00	74.20	11130.00	2026-03-31 06:15:00	Sale - Invoice INV-040	INV-040	cmne5yfxw0091lk01uzf382ss	cmnlf52sb00i8qs01862fdgzs	2026-04-05 07:07:04.671	2026-04-05 07:07:04.671	kg
cmnlf5iqs00iqqs013pq6m66z	SALE	100.00	75.70	7570.00	2026-03-31 06:15:00	Sale - Invoice INV-041	INV-041	cmne5yfxo008xlk01h6sloe3u	cmnlf5iqq00ikqs01h5ojglr0	2026-04-05 07:07:25.348	2026-04-05 07:07:25.348	kg
cmnlf5iqs00isqs01qpzb55tt	SALE	50.00	74.20	3710.00	2026-03-31 06:15:00	Sale - Invoice INV-041	INV-041	cmne5yfxw0091lk01uzf382ss	cmnlf5iqq00ikqs01h5ojglr0	2026-04-05 07:07:25.348	2026-04-05 07:07:25.348	kg
cmnlf5z0o00j6qs01vxkzsets	SALE	50.00	77.20	3860.00	2026-03-31 06:15:00	Sale - Invoice INV-042	INV-042	cmnlf2h8s00h7qs01690wwf38	cmnlf5z0l00j0qs01ovvcup3q	2026-04-05 07:07:46.44	2026-04-05 07:07:46.44	kg
cmnlf5z0o00j8qs01ojdcgqo0	SALE	200.00	74.20	14840.00	2026-03-31 06:15:00	Sale - Invoice INV-042	INV-042	cmne5yfxw0091lk01uzf382ss	cmnlf5z0l00j0qs01ovvcup3q	2026-04-05 07:07:46.44	2026-04-05 07:07:46.44	kg
cmnlf69r400jkqs01x0rnovd2	SALE	200.00	74.20	14840.00	2026-03-31 06:15:00	Sale - Invoice INV-043	INV-043	cmne5yfxw0091lk01uzf382ss	cmnlf69r100jgqs01i1061k1z	2026-04-05 07:08:00.352	2026-04-05 07:08:00.352	kg
cmnlf6q0t00jwqs01u28h3eh6	SALE	50.00	74.20	3710.00	2026-04-03 06:15:00	Sale - Invoice INV-044	INV-044	cmne5yfxw0091lk01uzf382ss	cmnlf6q0r00jsqs01y0v9umfy	2026-04-05 07:08:21.437	2026-04-05 07:08:21.437	kg
cmnlf73gt00k8qs01f7ee0m98	SALE	100.00	74.20	7420.00	2026-04-03 06:15:00	Sale - Invoice INV-045	INV-045	cmne5yfxw0091lk01uzf382ss	cmnlf73gr00k4qs01guys76wu	2026-04-05 07:08:38.861	2026-04-05 07:08:38.861	kg
cmnlf7i2o00kmqs01ilnb34zv	SALE	50.00	75.70	3785.00	2026-04-03 06:15:00	Sale - Invoice INV-046	INV-046	cmne5yfxo008xlk01h6sloe3u	cmnlf7i2l00kgqs01ma4ow4zu	2026-04-05 07:08:57.791	2026-04-05 07:08:57.791	kg
cmnlf7i2o00koqs01n4vp4l49	SALE	50.00	74.20	3710.00	2026-04-03 06:15:00	Sale - Invoice INV-046	INV-046	cmne5yfxw0091lk01uzf382ss	cmnlf7i2l00kgqs01ma4ow4zu	2026-04-05 07:08:57.791	2026-04-05 07:08:57.791	kg
cmnlf7vq000l0qs01gv3sydnp	SALE	100.00	74.20	7420.00	2026-04-03 06:15:00	Sale - Invoice INV-047	INV-047	cmne5yfxw0091lk01uzf382ss	cmnlf7vpy00kwqs01vem1jpwb	2026-04-05 07:09:15.48	2026-04-05 07:09:15.48	kg
cmnlf8abq00lcqs01o5b0d4v1	SALE	50.00	74.20	3710.00	2026-04-03 06:15:00	Sale - Invoice INV-048	INV-048	cmne5yfxw0091lk01uzf382ss	cmnlf8abo00l8qs01hair4c1u	2026-04-05 07:09:34.407	2026-04-05 07:09:34.407	kg
cmnsgyzw3000unq01v96d0h93	PURCHASE	50.00	74.45	3722.50	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgyzw1000snq01m3w57cm5	\N	2026-04-10 05:32:43.444	2026-04-10 05:32:43.444	kg
cmnsgzrbe0012nq01z7mon14w	PURCHASE	100.00	72.70	7270.00	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgzrbc0010nq018rztgi5x	\N	2026-04-10 05:33:18.987	2026-04-10 05:33:18.987	kg
cmnshjnsb001anq015prp0e09	PURCHASE	650.00	71.70	46605.00	2026-03-31 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnshjns80018nq01qbvp4zj0	\N	2026-04-10 05:48:47.531	2026-04-10 05:48:47.531	kg
cmnshm3pz001unq01nyde6b7w	PURCHASE	50.00	72.70	3635.00	2026-04-01 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgzrbc0010nq018rztgi5x	\N	2026-04-10 05:50:41.496	2026-04-10 05:50:41.496	kg
cmnshw1xx002cnq011156h193	PURCHASE	50.00	74.45	3722.50	2026-04-05 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgyzw1000snq01m3w57cm5	\N	2026-04-10 05:58:25.749	2026-04-10 05:58:25.749	kg
cmnshw1y2002enq01hz8b0wsj	PURCHASE	200.00	72.70	14540.00	2026-04-05 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgzrbc0010nq018rztgi5x	\N	2026-04-10 05:58:25.754	2026-04-10 05:58:25.754	kg
cmnshw1y6002gnq01gntcjqfn	PURCHASE	750.00	71.70	53775.00	2026-04-05 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnshjns80018nq01qbvp4zj0	\N	2026-04-10 05:58:25.758	2026-04-10 05:58:25.758	kg
cmnshxgp4002onq01w6avedfe	PURCHASE	50.00	72.70	3635.00	2026-04-09 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnsgzrbc0010nq018rztgi5x	\N	2026-04-10 05:59:31.529	2026-04-10 05:59:31.529	kg
cmnshxgpa002qnq0180t9qkha	PURCHASE	250.00	71.70	17925.00	2026-04-09 06:15:00	Purchase from Rapti Feed PVT.Ltd	\N	cmnshjns80018nq01qbvp4zj0	\N	2026-04-10 05:59:31.534	2026-04-10 05:59:31.534	kg
cms1acwba0005lr01mvi8s2me	PURCHASE	2.00	3685.00	7370.00	2026-07-26 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwb70003lr01876jz2y3	\N	2026-07-26 04:16:19.606	2026-07-26 04:16:19.606	kg
cms1acwbf0009lr01jjldotlw	PURCHASE	3.00	3685.00	11055.00	2026-07-26 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwbd0007lr01vp2qsech	\N	2026-07-26 04:16:19.611	2026-07-26 04:16:19.611	kg
cms1acwbi000dlr01hckxbjy4	PURCHASE	17.00	3735.00	63495.00	2026-07-26 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwbh000blr0129eup693	\N	2026-07-26 04:16:19.615	2026-07-26 04:16:19.615	kg
cms1acwbm000hlr01yqhp36zu	PURCHASE	13.00	3685.00	47905.00	2026-07-26 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwbk000flr01787vdozz	\N	2026-07-26 04:16:19.618	2026-07-26 04:16:19.618	kg
cms1ai28x000slr01jmi9216j	PURCHASE	2.00	3885.00	7770.00	2026-07-20 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1ai28v000qlr01dmfxjajq	\N	2026-07-26 04:20:20.578	2026-07-26 04:20:20.578	kg
cms1ai292000wlr01ofv6g2d0	PURCHASE	2.00	3835.00	7670.00	2026-07-20 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1ai291000ulr01px0f7l6e	\N	2026-07-26 04:20:20.582	2026-07-26 04:20:20.582	kg
cms1ajrvk0015lr01he0d0jxq	PURCHASE	6.00	3822.50	22935.00	2026-07-24 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1ajrvi0013lr01cdmd3w8u	\N	2026-07-26 04:21:40.448	2026-07-26 04:21:40.448	kg
cms1ajrvo0017lr01f8f93dtp	PURCHASE	10.00	3735.00	37350.00	2026-07-24 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwbh000blr0129eup693	\N	2026-07-26 04:21:40.452	2026-07-26 04:21:40.452	kg
cms1ajrvr0019lr01ecrdd4qk	PURCHASE	13.00	3685.00	47905.00	2026-07-24 06:15:00	Purchase from rapti feed industries pvt ltd	\N	cms1acwbk000flr01787vdozz	\N	2026-07-26 04:21:40.455	2026-07-26 04:21:40.455	kg
cms1fph8c001hlr014tk6h4ra	RETURN	2.00	3885.00	7770.00	2026-07-26 06:46:04.667	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1ai294000ylr01zmkco1hu	cms1ai28v000qlr01dmfxjajq	\N	2026-07-26 06:46:04.668	2026-07-26 06:46:04.668	kg
cms1fph8g001jlr01v3x63u1x	RETURN	2.00	3835.00	7670.00	2026-07-26 06:46:04.672	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1ai294000ylr01zmkco1hu	cms1ai291000ulr01px0f7l6e	\N	2026-07-26 06:46:04.673	2026-07-26 06:46:04.673	kg
cms1fr3d0001llr01a1ej7jd9	RETURN	6.00	3822.50	22935.00	2026-07-26 06:47:20.003	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1ajrvs001blr01wc1fwolo	cms1ajrvi0013lr01cdmd3w8u	\N	2026-07-26 06:47:20.004	2026-07-26 06:47:20.004	kg
cms1fr3d4001nlr01o7mnivq8	RETURN	10.00	3735.00	37350.00	2026-07-26 06:47:20.007	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1ajrvs001blr01wc1fwolo	cms1acwbh000blr0129eup693	\N	2026-07-26 06:47:20.008	2026-07-26 06:47:20.008	kg
cms1fr3d7001plr01fjutead4	RETURN	13.00	3685.00	47905.00	2026-07-26 06:47:20.011	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1ajrvs001blr01wc1fwolo	cms1acwbk000flr01787vdozz	\N	2026-07-26 06:47:20.012	2026-07-26 06:47:20.012	kg
cms1fw9bf001vlr01rpkgfhos	PURCHASE	17.00	3735.00	63495.00	2026-07-19 06:15:00	Purchase from Rapti feed industries	\N	cms1fw9bd001tlr01qp9w7uac	\N	2026-07-26 06:51:21.004	2026-07-26 06:51:21.004	bags
cms1fw9bl001zlr01bxsa5nl9	PURCHASE	13.00	3685.00	47905.00	2026-07-19 06:15:00	Purchase from Rapti feed industries	\N	cms1fw9bj001xlr0158c130jn	\N	2026-07-26 06:51:21.009	2026-07-26 06:51:21.009	bags
cms1fxzsk0028lr01h85posn4	PURCHASE	2.00	3685.00	7370.00	2026-07-19 06:15:00	Purchase from Rapti feed industries	\N	cms1fxzsj0026lr01adswc4p9	\N	2026-07-26 06:52:41.973	2026-07-26 06:52:41.973	bags
cms1fxzsp002clr01mu1o80xd	PURCHASE	3.00	3685.00	11055.00	2026-07-19 06:15:00	Purchase from Rapti feed industries	\N	cms1fxzsn002alr013o5ca0pe	\N	2026-07-26 06:52:41.977	2026-07-26 06:52:41.977	bags
cms1fzw4p002llr01976nuqng	PURCHASE	2.00	3885.00	7770.00	2026-07-20 06:15:00	Purchase from Rapti feed industries	\N	cms1fzw4m002jlr01g8is0zyv	\N	2026-07-26 06:54:10.537	2026-07-26 06:54:10.537	bags
cms1fzw4u002plr01rqmnmq3e	PURCHASE	2.00	3835.00	7670.00	2026-07-20 06:15:00	Purchase from Rapti feed industries	\N	cms1fzw4t002nlr0174269kvm	\N	2026-07-26 06:54:10.543	2026-07-26 06:54:10.543	bags
cms1g1v9i002ylr01fey97zq9	PURCHASE	6.00	3822.50	22935.00	2026-07-24 06:15:00	Purchase from Rapti feed industries	\N	cms1g1v9h002wlr01epjoqbao	\N	2026-07-26 06:55:42.726	2026-07-26 06:55:42.726	bags
cms1g1v9m0030lr01x7qadrr9	PURCHASE	10.00	3735.00	37350.00	2026-07-24 06:15:00	Purchase from Rapti feed industries	\N	cms1fw9bd001tlr01qp9w7uac	\N	2026-07-26 06:55:42.73	2026-07-26 06:55:42.73	bags
cms1g1v9q0032lr01wmsf6xjz	PURCHASE	13.00	3685.00	47905.00	2026-07-24 06:15:00	Purchase from Rapti feed industries	\N	cms1fxzsj0026lr01adswc4p9	\N	2026-07-26 06:55:42.734	2026-07-26 06:55:42.734	bags
cms1hsc71005elr01d24zba9m	PURCHASE	300.00	45.00	13500.00	2026-07-26 06:15:00	Purchase from Hatchery	\N	cms1hsc6y005clr01dctbr7jn	\N	2026-07-26 07:44:17.341	2026-07-26 07:44:17.341	pcs
cms1n41oc005qlr01cv6894z9	PURCHASE	1.00	0.00	0.00	2026-07-26 06:15:00	Purchase from Surya vet	\N	cms1n41o9005olr017j1mc3jv	\N	2026-07-26 10:13:21.66	2026-07-26 10:13:21.66	pcs
cms1ngwlr006glr01hsq6l608	PURCHASE	1.00	0.00	0.00	2026-07-26 06:15:00	Purchase from Surya vet	\N	cms1n41o9005olr017j1mc3jv	\N	2026-07-26 10:23:21.615	2026-07-26 10:23:21.615	kg
cms2swrvk00dqlr01uezcihvp	PURCHASE	5.00	3685.00	18425.00	2026-07-19 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2swrvh00dolr019vh5pdcr	\N	2026-07-27 05:43:26.241	2026-07-27 05:43:26.241	bags
cms2sz2hp00dylr01yg65bwf2	PURCHASE	17.00	3735.00	63495.00	2026-07-19 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2sz2ho00dwlr013e6enfgu	\N	2026-07-27 05:45:13.309	2026-07-27 05:45:13.309	bags
cms2sz2ht00e0lr01njs5x4be	PURCHASE	13.00	3685.00	47905.00	2026-07-19 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2swrvh00dolr019vh5pdcr	\N	2026-07-27 05:45:13.313	2026-07-27 05:45:13.313	bags
cms2t0uzz00e9lr01l0xemqi3	PURCHASE	2.00	3885.00	7770.00	2026-07-20 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2t0uzx00e7lr01qpbvw6jt	\N	2026-07-27 05:46:36.911	2026-07-27 05:46:36.911	bags
cms2t0v0400edlr01yl3va8u9	PURCHASE	2.00	3835.00	7670.00	2026-07-20 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2t0v0300eblr01gz6sje37	\N	2026-07-27 05:46:36.917	2026-07-27 05:46:36.917	bags
cms2t3e2o00emlr01536duomn	PURCHASE	6.00	3822.50	22935.00	2026-07-24 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2t3e2n00eklr01jxc4d9si	\N	2026-07-27 05:48:34.945	2026-07-27 05:48:34.945	bags
cms2t3e2t00eolr01rvx34050	PURCHASE	10.00	3735.00	37350.00	2026-07-24 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2sz2ho00dwlr013e6enfgu	\N	2026-07-27 05:48:34.949	2026-07-27 05:48:34.949	bags
cms2t3e2x00eqlr01msuhgufz	PURCHASE	13.00	3685.00	47905.00	2026-07-24 06:15:00	Purchase from Rapti feed industries PvtLtd	\N	cms2swrvh00dolr019vh5pdcr	\N	2026-07-27 05:48:34.953	2026-07-27 05:48:34.953	bags
cms3cs6x7001mmy011yf6r7sa	PURCHASE	100.00	0.00	0.00	2026-07-27 06:15:00	Purchase from Nimnus	\N	cms3cs6x5001kmy01p1u5ty6r	\N	2026-07-27 14:59:44.78	2026-07-27 14:59:44.78	kg
cms3cswj8001ymy01dsv3d32i	RETURN	100.00	0.00	0.00	2026-07-27 15:00:17.972	Void manual purchase from Nimnus	VOID_PURCHASE:cms3cs6xa001omy011n8m08be	cms3cs6x5001kmy01p1u5ty6r	\N	2026-07-27 15:00:17.973	2026-07-27 15:00:17.973	kg
cms3ctu4d002amy01z413vrn2	PURCHASE	100.00	1.00	100.00	2026-07-27 06:15:00	Purchase from Nimnus	\N	cms3ctu450028my01dxz94bu8	\N	2026-07-27 15:01:01.501	2026-07-27 15:01:01.501	kg
cms3eeluf000fqm01fv8npyxw	SALE	1.00	2.00	2.00	2026-07-27 06:15:00	Sale - Invoice INV-001	INV-001	cms3ctu450028my01dxz94bu8	cms3eelua000bqm01l5qm90r5	2026-07-27 15:45:10.166	2026-07-27 15:45:10.166	kg
cms3egnfg000zqm01vncrxmtx	SALE	1.00	3.00	3.00	2026-07-27 06:15:00	Sale - Invoice INV-002	INV-002	cms3ctu450028my01dxz94bu8	cms3egnfd000vqm0163uyhzdd	2026-07-27 15:46:45.532	2026-07-27 15:46:45.532	kg
cms3esred0023qm010kzw4igz	SALE	1.00	2.00	2.00	2026-07-27 06:15:00	Sale - Invoice BILL-3	BILL-3	cms3ctu450028my01dxz94bu8	cms3esrea001zqm01g1cgx13u	2026-07-27 15:56:10.549	2026-07-27 15:56:10.549	kg
cms3eunb9000fo701qe9qpvz2	SALE	7.00	2.00	14.00	2026-07-27 06:15:00	Sale - Invoice INV-003	INV-003	cms3ctu450028my01dxz94bu8	cms3eunb5000bo701bs3m8pzy	2026-07-27 15:57:38.565	2026-07-27 15:57:38.565	kg
cms3zpyjb003ro7017hv8wixm	SALE	10.00	2.00	20.00	2026-07-28 06:15:00	Sale - Invoice INV-004	INV-004	cms3ctu450028my01dxz94bu8	cms3zpyj8003no701vdh8e6oj	2026-07-28 01:41:51.767	2026-07-28 01:41:51.767	kg
cms402rei004xo701rqp86idm	PURCHASE	2.00	10.00	20.00	2026-07-28 06:15:00	Purchase from Nimnus	\N	cms402ref004vo701d01oekj7	\N	2026-07-28 01:51:49.051	2026-07-28 01:51:49.051	kg
cms403f3f005do701ude82n9d	SALE	1.00	15.00	15.00	2026-07-28 06:15:00	Sale - Invoice INV-005	INV-005	cms402ref004vo701d01oekj7	cms403f3c0059o701lvjfe9xx	2026-07-28 01:52:19.755	2026-07-28 01:52:19.755	kg
cms4cp6s1000xth01hgtlvd97	PURCHASE	400.00	75.00	30000.00	2026-07-28 06:15:00	Purchase from Hatchery	\N	cms4cp6ry000vth01u43pigco	\N	2026-07-28 07:45:10.801	2026-07-28 07:45:10.801	pcs
cms4cxxrj0015th01d87o7p4p	RETURN	6.00	3822.50	22935.00	2026-07-28 07:51:59.023	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1g1v9s0034lr019sz0da61	cms1g1v9h002wlr01epjoqbao	\N	2026-07-28 07:51:59.023	2026-07-28 07:51:59.023	bags
cms4cxxrp0017th018nxlnsqn	RETURN	10.00	3735.00	37350.00	2026-07-28 07:51:59.029	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1g1v9s0034lr019sz0da61	cms1fw9bd001tlr01qp9w7uac	\N	2026-07-28 07:51:59.029	2026-07-28 07:51:59.029	bags
cms4cxxrs0019th013vvbkppl	RETURN	13.00	3685.00	47905.00	2026-07-28 07:51:59.032	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1g1v9s0034lr019sz0da61	cms1fxzsj0026lr01adswc4p9	\N	2026-07-28 07:51:59.032	2026-07-28 07:51:59.032	bags
cms4cy932001bth013rzbu6j8	RETURN	2.00	3685.00	7370.00	2026-07-28 07:52:13.694	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fxzsq002elr01eqopn3ci	cms1fxzsj0026lr01adswc4p9	\N	2026-07-28 07:52:13.695	2026-07-28 07:52:13.695	bags
cms4cy935001dth01n7tmxigr	RETURN	3.00	3685.00	11055.00	2026-07-28 07:52:13.697	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fxzsq002elr01eqopn3ci	cms1fxzsn002alr013o5ca0pe	\N	2026-07-28 07:52:13.697	2026-07-28 07:52:13.697	bags
cms4cyhjy001fth01ab2v8yos	RETURN	17.00	3735.00	63495.00	2026-07-28 07:52:24.669	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fw9bm0021lr019jobojf2	cms1fw9bd001tlr01qp9w7uac	\N	2026-07-28 07:52:24.67	2026-07-28 07:52:24.67	bags
cms4cyhk0001hth011aso6yoi	RETURN	13.00	3685.00	47905.00	2026-07-28 07:52:24.672	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fw9bm0021lr019jobojf2	cms1fw9bj001xlr0158c130jn	\N	2026-07-28 07:52:24.673	2026-07-28 07:52:24.673	bags
cms4czijw001jth0122vpkoy0	RETURN	2.00	3885.00	7770.00	2026-07-28 07:53:12.62	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fzw4w002rlr01qoqw9543	cms1fzw4m002jlr01g8is0zyv	\N	2026-07-28 07:53:12.62	2026-07-28 07:53:12.62	bags
cms4edv3s006zth01rxaqaj0z	SALE	4.00	3985.00	15940.00	2026-07-24 06:15:00	Sale - Invoice 663	663	cms4dkscr002hth01d3gx0m81	cms4edv3q006vth01f94djhk4	2026-07-28 08:32:21.688	2026-07-28 08:32:21.688	bags
cms4ef5fx0077th013fp5ubdg	SALE	3.00	3985.00	11955.00	2026-07-27 06:15:00	Sale - Invoice 664	664	cms4dkscr002hth01d3gx0m81	cms4ef5fu0073th01kk9appsw	2026-07-28 08:33:21.741	2026-07-28 08:33:21.741	bags
cms4exwue007bth018lia5ffb	PURCHASE	1.00	3822.50	3822.50	2026-07-16 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpqzw002wth0133z1ix2x	\N	2026-07-28 08:47:57.062	2026-07-28 08:47:57.062	bags
cms4czijy001lth01hmq208hb	RETURN	2.00	3835.00	7670.00	2026-07-28 07:53:12.622	Void manual purchase from Rapti feed industries	VOID_PURCHASE:cms1fzw4w002rlr01qoqw9543	cms1fzw4t002nlr0174269kvm	\N	2026-07-28 07:53:12.623	2026-07-28 07:53:12.623	bags
cms4da7cc001nth017xjtg76q	RETURN	2.00	3685.00	7370.00	2026-07-28 08:01:31.307	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1acwbn000jlr01jq01fks7	cms1acwb70003lr01876jz2y3	\N	2026-07-28 08:01:31.308	2026-07-28 08:01:31.308	kg
cms4da7cg001pth01cs471e7v	RETURN	3.00	3685.00	11055.00	2026-07-28 08:01:31.312	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1acwbn000jlr01jq01fks7	cms1acwbd0007lr01vp2qsech	\N	2026-07-28 08:01:31.312	2026-07-28 08:01:31.312	kg
cms4da7cj001rth012j45oqpg	RETURN	17.00	3735.00	63495.00	2026-07-28 08:01:31.315	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1acwbn000jlr01jq01fks7	cms1acwbh000blr0129eup693	\N	2026-07-28 08:01:31.315	2026-07-28 08:01:31.315	kg
cms4da7cm001tth018ueccdve	RETURN	13.00	3685.00	47905.00	2026-07-28 08:01:31.317	Void manual purchase from rapti feed industries pvt ltd	VOID_PURCHASE:cms1acwbn000jlr01jq01fks7	cms1acwbk000flr01787vdozz	\N	2026-07-28 08:01:31.318	2026-07-28 08:01:31.318	kg
cms4dcz9m001vth01wd6sx1ry	RETURN	6.00	3822.50	22935.00	2026-07-28 08:03:40.81	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2t3e2y00eslr019qje244m	cms2t3e2n00eklr01jxc4d9si	\N	2026-07-28 08:03:40.81	2026-07-28 08:03:40.81	bags
cms4dcz9q001xth01usigepij	RETURN	10.00	3735.00	37350.00	2026-07-28 08:03:40.813	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2t3e2y00eslr019qje244m	cms2sz2ho00dwlr013e6enfgu	\N	2026-07-28 08:03:40.814	2026-07-28 08:03:40.814	bags
cms4dcz9s001zth01u769etk7	RETURN	13.00	3685.00	47905.00	2026-07-28 08:03:40.816	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2t3e2y00eslr019qje244m	cms2swrvh00dolr019vh5pdcr	\N	2026-07-28 08:03:40.816	2026-07-28 08:03:40.816	bags
cms4deaee0021th018ee4fvj7	RETURN	2.00	3885.00	7770.00	2026-07-28 08:04:41.893	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2t0v0600eflr01px7e6pz4	cms2t0uzx00e7lr01qpbvw6jt	\N	2026-07-28 08:04:41.894	2026-07-28 08:04:41.894	bags
cms4deaeh0023th01bp0p7g6h	RETURN	2.00	3835.00	7670.00	2026-07-28 08:04:41.896	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2t0v0600eflr01px7e6pz4	cms2t0v0300eblr01gz6sje37	\N	2026-07-28 08:04:41.897	2026-07-28 08:04:41.897	bags
cms4deo1y0025th01u0lfye9s	RETURN	5.00	3685.00	18425.00	2026-07-28 08:04:59.59	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2swrvn00dslr014uthrm88	cms2swrvh00dolr019vh5pdcr	\N	2026-07-28 08:04:59.591	2026-07-28 08:04:59.591	bags
cms4deymd0027th01aqihw8o9	RETURN	17.00	3735.00	63495.00	2026-07-28 08:05:13.284	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2sz2hu00e2lr01wv0tsvku	cms2sz2ho00dwlr013e6enfgu	\N	2026-07-28 08:05:13.285	2026-07-28 08:05:13.285	bags
cms4deymf0029th01ovz1y6bx	RETURN	13.00	3685.00	47905.00	2026-07-28 08:05:13.287	Void manual purchase from Rapti feed industries PvtLtd	VOID_PURCHASE:cms2sz2hu00e2lr01wv0tsvku	cms2swrvh00dolr019vh5pdcr	\N	2026-07-28 08:05:13.288	2026-07-28 08:05:13.288	bags
cms4dkscm002fth0156s3h02c	PURCHASE	17.00	3735.00	63495.00	2026-07-19 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dkscj002dth01ampkjqvj	\N	2026-07-28 08:09:45.095	2026-07-28 08:09:45.095	bags
cms4dkscu002jth01flfg8vkj	PURCHASE	13.00	3685.00	47905.00	2026-07-19 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dkscr002hth01d3gx0m81	\N	2026-07-28 08:09:45.102	2026-07-28 08:09:45.102	bags
cms4dmkpn002qth01zqoiyfhf	PURCHASE	5.00	3685.00	18425.00	2026-07-28 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dkscr002hth01d3gx0m81	\N	2026-07-28 08:11:08.508	2026-07-28 08:11:08.508	kg
cms4dpqzz002yth01xrj8ipun	PURCHASE	6.00	3822.50	22935.00	2026-07-24 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpqzw002wth0133z1ix2x	\N	2026-07-28 08:13:36.624	2026-07-28 08:13:36.624	bags
cms4dpr050030th01hgd8hf9l	PURCHASE	10.00	3735.00	37350.00	2026-07-24 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dkscj002dth01ampkjqvj	\N	2026-07-28 08:13:36.63	2026-07-28 08:13:36.63	bags
cms4dpr0a0034th013hxf4b9d	PURCHASE	13.00	3685.00	47905.00	2026-07-24 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpr080032th0149yb5sz8	\N	2026-07-28 08:13:36.634	2026-07-28 08:13:36.634	bags
cms4drgv7003cth01uj6b6otx	RETURN	5.00	3685.00	18425.00	2026-07-28 08:14:56.802	Void manual purchase from Rapti feed industries Pvt Ltd	VOID_PURCHASE:cms4dmkpq002sth01oj2a4cm8	cms4dkscr002hth01d3gx0m81	\N	2026-07-28 08:14:56.803	2026-07-28 08:14:56.803	kg
cms4du1md003eth01jdckqclq	PURCHASE	5.00	3685.00	18425.00	2026-07-19 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpr080032th0149yb5sz8	\N	2026-07-28 08:16:57.013	2026-07-28 08:16:57.013	bags
cms4dw1g1003mth01aq3lztjh	PURCHASE	2.00	3885.00	7770.00	2026-07-20 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dw1fx003kth018304ju3l	\N	2026-07-28 08:18:30.097	2026-07-28 08:18:30.097	bags
cms4dw1g8003qth010gsooqov	PURCHASE	2.00	3835.00	7670.00	2026-07-20 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dw1g6003oth01u4qq3vcq	\N	2026-07-28 08:18:30.104	2026-07-28 08:18:30.104	bags
cms4dybvg0041th01xy2ciysz	SALE	7.00	4035.00	28245.00	2026-07-19 06:15:00	Sale - Invoice 651	651	cms4dkscj002dth01ampkjqvj	cms4dybva003xth018tnkkvhc	2026-07-28 08:20:16.924	2026-07-28 08:20:16.924	bags
cms4dza2v0049th01jvrhrpj9	SALE	8.00	4035.00	32280.00	2026-07-19 06:15:00	Sale - Invoice 652	652	cms4dkscj002dth01ampkjqvj	cms4dza2s0045th01hsun30l4	2026-07-28 08:21:01.254	2026-07-28 08:21:01.254	bags
cms4e059d004hth0157ec8c21	SALE	5.00	3985.00	19925.00	2026-07-19 06:15:00	Sale - Invoice 653	653	cms4dpr080032th0149yb5sz8	cms4e059b004dth014hw1tx0s	2026-07-28 08:21:41.665	2026-07-28 08:21:41.665	bags
cms4e13io004pth01jsqq92bs	SALE	5.00	3985.00	19925.00	2026-07-19 06:15:00	Sale - Invoice 654	654	cms4dpr080032th0149yb5sz8	cms4e13il004lth01v4epmkah	2026-07-28 08:22:26.064	2026-07-28 08:22:26.064	bags
cms4e413i004zth01yozmqqwg	SALE	1.00	3800.00	3800.00	2026-07-20 06:15:00	Sale - Invoice 655	655	cms4dw1g6003oth01u4qq3vcq	cms4e413f004vth011some1i7	2026-07-28 08:24:42.894	2026-07-28 08:24:42.894	bags
cms4e5r5t005bth01tj6y5ey8	SALE	3.00	4125.00	12375.00	2026-07-21 06:15:00	Sale - Invoice 656	656	cms4dpqzw002wth0133z1ix2x	cms4e5r5q0053th01rqlg44vf	2026-07-28 08:26:03.329	2026-07-28 08:26:03.329	bags
cms4e5r5t005dth011mahqgwx	SALE	1.00	1000.00	1000.00	2026-07-21 06:15:00	Sale - Invoice 656	656	cms1n41o9005olr017j1mc3jv	cms4e5r5q0053th01rqlg44vf	2026-07-28 08:26:03.329	2026-07-28 08:26:03.329	pcs
cms4e5r5t005fth016kr26gxv	SALE	300.00	60.00	18000.00	2026-07-21 06:15:00	Sale - Invoice 656	656	cms1hsc6y005clr01dctbr7jn	cms4e5r5q0053th01rqlg44vf	2026-07-28 08:26:03.329	2026-07-28 08:26:03.329	pcs
cms4e79xj005pth01pfsjx8cr	SALE	4.00	3985.00	15940.00	2026-07-21 06:15:00	Sale - Invoice 657	657	cms4dpr080032th0149yb5sz8	cms4e79xg005jth01j4nwzebs	2026-07-28 08:27:14.311	2026-07-28 08:27:14.311	bags
cms4e79xj005rth01xzv9k5it	SALE	1.00	1600.00	1600.00	2026-07-21 06:15:00	Sale - Invoice 657	657	cms1n41o9005olr017j1mc3jv	cms4e79xg005jth01j4nwzebs	2026-07-28 08:27:14.311	2026-07-28 08:27:14.311	pcs
cms4e8ek6005zth01vzw0l83e	SALE	4.00	3985.00	15940.00	2026-07-24 06:15:00	Sale - Invoice 659	659	cms4dpr080032th0149yb5sz8	cms4e8ek2005vth01gl52vvsl	2026-07-28 08:28:06.966	2026-07-28 08:28:06.966	bags
cms4e9bio0067th01mtgct7ij	SALE	8.00	4035.00	32280.00	2026-07-24 06:15:00	Sale - Invoice 660	660	cms4dkscj002dth01ampkjqvj	cms4e9bik0063th019xo8k1j1	2026-07-28 08:28:49.68	2026-07-28 08:28:49.68	bags
cms4ebran006hth01u32i7twj	SALE	2.00	4035.00	8070.00	2026-07-24 06:15:00	Sale - Invoice 661	661	cms4dw1fx003kth018304ju3l	cms4ebrai006bth01sh9eol9z	2026-07-28 08:30:43.438	2026-07-28 08:30:43.438	bags
cms4ebran006jth019tbkrzml	SALE	5.00	3985.00	19925.00	2026-07-24 06:15:00	Sale - Invoice 661	661	cms4dkscr002hth01d3gx0m81	cms4ebrai006bth01sh9eol9z	2026-07-28 08:30:43.438	2026-07-28 08:30:43.438	bags
cms4ecriz006rth01e91786m7	SALE	1.00	3850.00	3850.00	2026-07-24 06:15:00	Sale - Invoice 662	662	cms4dkscj002dth01ampkjqvj	cms4ecriw006nth01unysu45e	2026-07-28 08:31:30.394	2026-07-28 08:31:30.394	bags
cms4f74f2007jth011qbnt8af	RETURN	1.00	3822.50	3822.50	2026-07-28 08:55:06.781	Void manual purchase from Rapti feed industries Pvt Ltd	VOID_PURCHASE:cms4exwug007dth01o6e4ut38	cms4dpqzw002wth0133z1ix2x	\N	2026-07-28 08:55:06.782	2026-07-28 08:55:06.782	bags
cms4fdyvt007nth01em4z3541	PURCHASE	3.00	3822.50	11467.50	2026-07-16 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4fdyvq007lth01jiqt5vqj	\N	2026-07-28 09:00:26.202	2026-07-28 09:00:26.202	bags
cms4fis1d0087th01hmzs33o7	RETURN	3.00	3822.50	11467.50	2026-07-28 09:04:10.609	Void manual purchase from Rapti feed industries Pvt Ltd	VOID_PURCHASE:cms4fdyvw007pth01j394a81y	cms4fdyvq007lth01jiqt5vqj	\N	2026-07-28 09:04:10.61	2026-07-28 09:04:10.61	bags
cms4fomp9008hth019m0uqn2w	PURCHASE	4.00	3822.50	15290.00	2026-07-16 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpqzw002wth0133z1ix2x	\N	2026-07-28 09:08:43.63	2026-07-28 09:08:43.63	bags
cms4fr89j008zth01bp0xhki5	SALE	4.00	4125.00	16500.00	2026-07-28 06:15:00	Sale - Invoice 665	665	cms4dpqzw002wth0133z1ix2x	cms4fr89g008tth01bx2j2lkx	2026-07-28 09:10:44.886	2026-07-28 09:10:44.886	bags
cms4fr89j0091th01wli5g60p	SALE	400.00	85.00	34000.00	2026-07-28 06:15:00	Sale - Invoice 665	665	cms4cp6ry000vth01u43pigco	cms4fr89g008tth01bx2j2lkx	2026-07-28 09:10:44.886	2026-07-28 09:10:44.886	pcs
cms5usp2j0025qm015ydjojm0	PURCHASE	25.00	3685.00	92125.00	2026-07-28 06:15:00	Purchase from Rapti feed industries Pvt Ltd	\N	cms4dpr080032th0149yb5sz8	\N	2026-07-29 08:59:33.74	2026-07-29 08:59:33.74	bags
\.


--
-- Data for Name: DealerProductUnitConversion; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerProductUnitConversion" (id, "unitName", "conversionFactor", "dealerProductId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DealerSale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerSale" (id, "invoiceNumber", date, "subtotalAmount", "totalAmount", "paidAmount", "dueAmount", "isCredit", notes, "customerId", "farmerId", "dealerId", "accountId", "createdAt", "updatedAt") FROM stdin;
cmnldl8rd000pqs0155k3mli5	INV-001	2026-03-15 06:15:00	\N	7370.00	0.00	7370.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:23:39.673	2026-04-05 06:23:39.673
cmnldlstz0011qs0110cxto1q	INV-002	2026-04-05 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmne6dutr00aslk0126ljhd9o	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:24:05.687	2026-04-05 06:24:05.687
cmnldmeg3001dqs01ei7fvhr5	INV-003	2026-03-15 06:15:00	\N	7370.00	0.00	7370.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:24:33.7	2026-04-05 06:24:33.7
cmnldn5i7001pqs01ie298gak	INV-004	2026-03-15 06:15:00	\N	21885.00	0.00	21885.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:25:08.768	2026-04-05 06:25:08.768
cmnldnsdw0025qs01o6nq6mwq	INV-005	2026-03-15 06:15:00	\N	7445.00	0.00	7445.00	t	\N	cmn5wujgz001uo401wl84xaz6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:25:38.421	2026-04-05 06:25:38.421
cmnldpbw9002lqs01d9hf7hsm	INV-006	2026-03-16 06:15:00	\N	3610.00	0.00	3610.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:26:50.361	2026-04-05 06:26:50.361
cmnldpx7x002xqs01r6lw8f2m	INV-007	2026-03-16 06:15:00	\N	3685.00	0.00	3685.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:27:17.998	2026-04-05 06:27:17.998
cmnldqckp0039qs01vp0y84u0	INV-008	2026-03-17 06:15:00	\N	14440.00	0.00	14440.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:27:37.898	2026-04-05 06:27:37.898
cmnldqrim003lqs012so3hzdz	INV-009	2026-03-17 06:15:00	\N	3685.00	0.00	3685.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:27:57.263	2026-04-05 06:27:57.263
cmnldr5cb003xqs0171a8g4np	INV-010	2026-03-17 06:15:00	\N	3685.00	0.00	3685.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:28:15.18	2026-04-05 06:28:15.18
cmnldrknw0049qs01wi1cc6it	INV-011	2026-03-17 06:15:00	\N	14740.00	0.00	14740.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:28:35.037	2026-04-05 06:28:35.037
cmnlds3iq004lqs01tkfpmryr	INV-012	2026-03-17 06:15:00	\N	14440.00	0.00	14440.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:28:59.475	2026-04-05 06:28:59.475
cmnldstwb004xqs01ilhdo7kc	INV-013	2026-03-17 06:15:00	\N	32640.00	0.00	32640.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:29:33.659	2026-04-05 06:29:33.659
cmnldtiby005dqs01qicmp8tl	INV-014	2026-03-19 06:15:00	\N	3685.00	0.00	3685.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:30:05.326	2026-04-05 06:30:05.326
cmnldtyu3005pqs01qjovl6jz	INV-015	2026-03-19 06:15:00	\N	3610.00	0.00	3610.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:30:26.716	2026-04-05 06:30:26.716
cmnlduesk0061qs01nzswcg6m	INV-016	2026-03-20 06:15:00	\N	10830.00	0.00	10830.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:30:47.396	2026-04-05 06:30:47.396
cmnlduthu006dqs01iir7ivnz	INV-017	2026-03-20 06:15:00	\N	14440.00	0.00	14440.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:31:06.45	2026-04-05 06:31:06.45
cmnldvdyc006pqs01r6bcbl8k	INV-018	2026-03-20 06:15:00	\N	7370.00	0.00	7370.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:31:32.964	2026-04-05 06:31:32.964
cmnldvqa00075qs01kqn5uva9	INV-019	2026-03-21 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:31:48.937	2026-04-05 06:31:48.937
cmnldw2ty007hqs011kkt69wg	INV-020	2026-03-21 06:15:00	\N	3685.00	0.00	3685.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:32:05.207	2026-04-05 06:32:05.207
cmnldwmr8007tqs01bt7ktl5p	INV-021	2026-03-22 06:15:00	\N	14665.00	0.00	14665.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:32:31.029	2026-04-05 06:32:31.029
cmnldxob2008bqs01kylzrkrj	INV-022	2026-03-23 06:15:00	\N	3760.00	0.00	3760.00	t	\N	cmnldx9rh0089qs01ol2n4x89	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:33:19.694	2026-04-05 06:33:19.694
cmnldy3ua008nqs01tb0psllt	INV-023	2026-03-23 06:15:00	\N	32490.00	0.00	32490.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:33:39.826	2026-04-05 06:33:39.826
cmnle3bhp009fqs01zel1x6u7	INV-024	2026-03-24 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:37:43.021	2026-04-05 06:37:43.021
cmnle4ct6009tqs011kd0h3qc	INV-025	2026-03-24 06:15:00	\N	7520.00	0.00	7520.00	t	\N	cmnle3wuq009rqs017tytg5th	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:38:31.387	2026-04-05 06:38:31.387
cmnle4ygn00a5qs010fzvx5p8	INV-026	2026-03-24 06:15:00	\N	10830.00	0.00	10830.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:38:59.447	2026-04-05 06:38:59.447
cmnle5l3s00ahqs01ojlhfsiu	INV-027	2026-03-24 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:39:28.793	2026-04-05 06:39:28.793
cmnle73q600atqs01rmwvuhbo	INV-028	2026-03-26 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmne6dutr00aslk0126ljhd9o	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:40:39.583	2026-04-05 06:40:39.583
cmnle7hi700b5qs01o9h5fby6	INV-029	2026-03-26 06:15:00	\N	3610.00	0.00	3610.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:40:57.439	2026-04-05 06:40:57.439
cmnle82cq00bhqs01vg3nyd61	INV-030	2026-03-27 06:15:00	\N	21660.00	0.00	21660.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:41:24.458	2026-04-05 06:41:24.458
cmnle8oqm00btqs01e02z5fu9	INV-031	2026-03-27 06:15:00	\N	7220.00	0.00	7220.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:41:53.47	2026-04-05 06:41:53.47
cmnle9c5r00c5qs01epkxy86u	INV-032	2026-03-27 06:15:00	\N	3610.00	0.00	3610.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:42:23.823	2026-04-05 06:42:23.823
cmnle9wir00chqs015a028h1g	INV-033	2026-03-27 06:15:00	\N	25570.00	0.00	25570.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:42:50.212	2026-04-05 06:42:50.212
cmnlebeo300d1qs014k27o7k1	INV-034	2026-03-27 06:15:00	\N	10830.00	0.00	10830.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:44:00.387	2026-04-05 06:44:00.387
cmnlebrn200ddqs01t502k0ao	INV-035	2026-03-27 06:15:00	\N	3610.00	0.00	3610.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:44:17.199	2026-04-05 06:44:17.199
cmnlecy9700dpqs01u6jay1ky	INV-036	2026-03-29 06:15:00	\N	3710.00	0.00	3710.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:45:12.428	2026-04-05 06:45:12.428
cmnledb8t00e1qs01t3gkcepv	INV-037	2026-03-29 06:15:00	\N	3710.00	0.00	3710.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:45:29.262	2026-04-05 06:45:29.262
cmnledncc00edqs01q7yxbmwc	INV-038	2026-03-29 06:15:00	\N	7420.00	0.00	7420.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:45:44.94	2026-04-05 06:45:44.94
cmnledzbc00epqs01w8hhndp9	INV-039	2026-03-29 06:15:00	\N	3785.00	0.00	3785.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 06:46:00.456	2026-04-05 06:46:00.456
cmnlf52sb00i8qs01862fdgzs	INV-040	2026-03-31 06:15:00	\N	11130.00	0.00	11130.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:07:04.668	2026-04-05 07:07:04.668
cmnlf5iqq00ikqs01h5ojglr0	INV-041	2026-03-31 06:15:00	\N	11280.00	0.00	11280.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:07:25.346	2026-04-05 07:07:25.346
cmnlf5z0l00j0qs01ovvcup3q	INV-042	2026-03-31 06:15:00	\N	18700.00	0.00	18700.00	t	\N	cmn5wbs1z0006o4013qrxxplv	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:07:46.438	2026-04-05 07:07:46.438
cmnlf69r100jgqs01i1061k1z	INV-043	2026-03-31 06:15:00	\N	14840.00	0.00	14840.00	t	\N	cmn5wv1s8001yo401nypzbgn2	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:08:00.349	2026-04-05 07:08:00.349
cmnlf6q0r00jsqs01y0v9umfy	INV-044	2026-04-03 06:15:00	\N	3710.00	0.00	3710.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:08:21.435	2026-04-05 07:08:21.435
cmnlf73gr00k4qs01guys76wu	INV-045	2026-04-03 06:15:00	\N	7420.00	0.00	7420.00	t	\N	cmn5wmvdt000qo401adf1txqq	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:08:38.859	2026-04-05 07:08:38.859
cmnlf7i2l00kgqs01ma4ow4zu	INV-046	2026-04-03 06:15:00	\N	7495.00	0.00	7495.00	t	\N	cmn5wi7j0000ao401qblto83l	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:08:57.789	2026-04-05 07:08:57.789
cmnlf7vpy00kwqs01vem1jpwb	INV-047	2026-04-03 06:15:00	\N	7420.00	0.00	7420.00	t	\N	cmn5wnpn4000uo401wwvmc59e	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:09:15.478	2026-04-05 07:09:15.478
cmnlf8abo00l8qs01hair4c1u	INV-048	2026-04-03 06:15:00	\N	3710.00	0.00	3710.00	t	\N	cmn5wj1i7000eo401xb20bno6	\N	cmn5w47520002o4011ahlygxj	\N	2026-04-05 07:09:34.405	2026-04-05 07:09:34.405
cms3eelua000bqm01l5qm90r5	INV-001	2026-07-27 06:15:00	\N	2.00	0.00	2.00	t	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 15:45:10.162	2026-07-27 15:45:10.162
cms3egnfd000vqm0163uyhzdd	INV-002	2026-07-27 06:15:00	\N	3.00	0.00	3.00	t	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 15:46:45.529	2026-07-27 15:46:45.529
cms3esrea001zqm01g1cgx13u	BILL-3	2026-07-27 06:15:00	\N	2.00	2.00	\N	f	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 15:56:10.546	2026-07-27 15:56:10.546
cms3eunb5000bo701bs3m8pzy	INV-003	2026-07-27 06:15:00	\N	14.00	14.00	\N	f	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-27 15:57:38.561	2026-07-27 15:57:38.561
cms3zpyj8003no701vdh8e6oj	INV-004	2026-07-28 06:15:00	\N	20.00	0.00	20.00	t	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-28 01:41:51.764	2026-07-28 01:41:51.764
cms403f3c0059o701lvjfe9xx	INV-005	2026-07-28 06:15:00	\N	15.00	0.00	15.00	t	\N	cms3cr1fl001emy01zhsnma9g	\N	cms3cp2fc000ymy01h6wp1mxp	\N	2026-07-28 01:52:19.752	2026-07-28 01:52:19.752
cms4dybva003xth018tnkkvhc	651	2026-07-19 06:15:00	\N	28245.00	0.00	28245.00	t	\N	cmryloywg000soe01iqyiiboi	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:20:16.919	2026-07-28 08:20:16.919
cms4dza2s0045th01hsun30l4	652	2026-07-19 06:15:00	\N	32280.00	0.00	32280.00	t	\N	cms1hb25i0042lr0172meho0y	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:21:01.252	2026-07-28 08:21:01.252
cms4e059b004dth014hw1tx0s	653	2026-07-19 06:15:00	\N	19925.00	0.00	19925.00	t	\N	cmrylu66h0012oe01s8q32yli	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:21:41.663	2026-07-28 08:21:41.663
cms4e13il004lth01v4epmkah	654	2026-07-19 06:15:00	\N	19925.00	0.00	19925.00	t	\N	cmrym1ybw001eoe01jqvt5wio	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:22:26.061	2026-07-28 08:22:26.061
cms4e413f004vth011some1i7	655	2026-07-20 06:15:00	\N	3800.00	0.00	3800.00	t	\N	cms4e3aom004tth01ukh8y1co	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:24:42.891	2026-07-28 08:24:42.891
cms4e5r5q0053th01rqlg44vf	656	2026-07-21 06:15:00	\N	31375.00	0.00	31375.00	t	\N	cmrylt07x000yoe01u5fanx1t	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:26:03.326	2026-07-28 08:26:03.326
cms4e79xg005jth01j4nwzebs	657	2026-07-21 06:15:00	\N	17540.00	0.00	17540.00	t	\N	cms1nbwqf006clr01e7ocsvpz	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:27:14.308	2026-07-28 08:27:14.308
cms4e8ek2005vth01gl52vvsl	659	2026-07-24 06:15:00	\N	15940.00	0.00	15940.00	t	\N	cmrym1ybw001eoe01jqvt5wio	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:28:06.962	2026-07-28 08:28:06.962
cms4e9bik0063th019xo8k1j1	660	2026-07-24 06:15:00	\N	32280.00	0.00	32280.00	t	\N	cms1hb25i0042lr0172meho0y	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:28:49.676	2026-07-28 08:28:49.676
cms4ebrai006bth01sh9eol9z	661	2026-07-24 06:15:00	\N	27995.00	0.00	27995.00	t	\N	cmryloywg000soe01iqyiiboi	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:30:43.434	2026-07-28 08:30:43.434
cms4ecriw006nth01unysu45e	662	2026-07-24 06:15:00	\N	3850.00	0.00	3850.00	t	\N	cms4e3aom004tth01ukh8y1co	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:31:30.393	2026-07-28 08:31:30.393
cms4edv3q006vth01f94djhk4	663	2026-07-24 06:15:00	\N	15940.00	0.00	15940.00	t	\N	cms1nbwqf006clr01e7ocsvpz	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:32:21.687	2026-07-28 08:32:21.687
cms4ef5fu0073th01kk9appsw	664	2026-07-27 06:15:00	\N	11955.00	0.00	11955.00	t	\N	cms1nbwqf006clr01e7ocsvpz	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 08:33:21.738	2026-07-28 08:33:21.738
cms4fr89g008tth01bx2j2lkx	665	2026-07-28 06:15:00	\N	50500.00	0.00	50500.00	t	\N	cmrym36se001ioe01lqoi4vqg	\N	cmrylfcq0000moe019s79ka4f	\N	2026-07-28 09:10:44.884	2026-07-28 09:10:44.884
\.


--
-- Data for Name: DealerSaleItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerSaleItem" (id, quantity, "unitPrice", "totalAmount", "saleId", "productId", "createdAt", "baseQuantity", unit) FROM stdin;
cmnldl8rg000rqs013vvwrxwk	100.00	73.70	7370.00	cmnldl8rd000pqs0155k3mli5	cmne5oboc005plk01nf29b7sx	2026-04-05 06:23:39.677	\N	kg
cmnldlsu20013qs01uo8tmy1i	100.00	72.20	7220.00	cmnldlstz0011qs0110cxto1q	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:24:05.69	\N	kg
cmnldmeg6001fqs01orr8maqi	100.00	73.70	7370.00	cmnldmeg3001dqs01ei7fvhr5	cmne5oboc005plk01nf29b7sx	2026-04-05 06:24:33.702	\N	kg
cmnldn5i9001rqs01zya5w9xd	150.00	73.70	11055.00	cmnldn5i7001pqs01ie298gak	cmne5oboc005plk01nf29b7sx	2026-04-05 06:25:08.77	\N	kg
cmnldn5i9001tqs01ptxh6pxe	150.00	72.20	10830.00	cmnldn5i7001pqs01ie298gak	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:25:08.77	\N	kg
cmnldnsdz0027qs018levoej4	50.00	75.20	3760.00	cmnldnsdw0025qs01o6nq6mwq	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:25:38.423	\N	kg
cmnldnsdz0029qs01dpg0ppfa	50.00	73.70	3685.00	cmnldnsdw0025qs01o6nq6mwq	cmne5oboc005plk01nf29b7sx	2026-04-05 06:25:38.423	\N	kg
cmnldpbwb002nqs0173loiq6g	50.00	72.20	3610.00	cmnldpbw9002lqs01d9hf7hsm	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:26:50.363	\N	kg
cmnldpx80002zqs017i0czsgb	50.00	73.70	3685.00	cmnldpx7x002xqs01r6lw8f2m	cmne5oboc005plk01nf29b7sx	2026-04-05 06:27:18.001	\N	kg
cmnldqckr003bqs01t9svlviz	200.00	72.20	14440.00	cmnldqckp0039qs01vp0y84u0	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:27:37.9	\N	kg
cmnldqrip003nqs018vtdec2v	50.00	73.70	3685.00	cmnldqrim003lqs012so3hzdz	cmne5oboc005plk01nf29b7sx	2026-04-05 06:27:57.266	\N	kg
cmnldr5cd003zqs01xhrfh9ag	50.00	73.70	3685.00	cmnldr5cb003xqs0171a8g4np	cmne5oboc005plk01nf29b7sx	2026-04-05 06:28:15.181	\N	kg
cmnldrkny004bqs01mz3iep6t	200.00	73.70	14740.00	cmnldrknw0049qs01wi1cc6it	cmne5oboc005plk01nf29b7sx	2026-04-05 06:28:35.038	\N	kg
cmnlds3is004nqs019pyfx6cm	200.00	72.20	14440.00	cmnlds3iq004lqs01tkfpmryr	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:28:59.476	\N	kg
cmnldstwd004zqs013i7lnu5b	50.00	75.20	3760.00	cmnldstwb004xqs01ilhdo7kc	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:29:33.661	\N	kg
cmnldstwd0051qs01iifq6d19	400.00	72.20	28880.00	cmnldstwb004xqs01ilhdo7kc	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:29:33.661	\N	kg
cmnldtibz005fqs01d6kw1pno	50.00	73.70	3685.00	cmnldtiby005dqs01qicmp8tl	cmne5oboc005plk01nf29b7sx	2026-04-05 06:30:05.328	\N	kg
cmnldtyu5005rqs014ri7jywk	50.00	72.20	3610.00	cmnldtyu3005pqs01qjovl6jz	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:30:26.717	\N	kg
cmnlduesm0063qs01htm93wnw	150.00	72.20	10830.00	cmnlduesk0061qs01nzswcg6m	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:30:47.399	\N	kg
cmnlduthv006fqs019g43j7jp	200.00	72.20	14440.00	cmnlduthu006dqs01iir7ivnz	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:31:06.452	\N	kg
cmnldvdye006rqs01y1y0zcsl	50.00	75.20	3760.00	cmnldvdyc006pqs01r6bcbl8k	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:31:32.966	\N	kg
cmnldvdye006tqs01qrheqt14	50.00	72.20	3610.00	cmnldvdyc006pqs01r6bcbl8k	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:31:32.966	\N	kg
cmnldvqa20077qs01lhv314ni	100.00	72.20	7220.00	cmnldvqa00075qs01kqn5uva9	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:31:48.938	\N	kg
cmnldw2u1007jqs016r22jjm1	50.00	73.70	3685.00	cmnldw2ty007hqs011kkt69wg	cmne5oboc005plk01nf29b7sx	2026-04-05 06:32:05.209	\N	kg
cmnldwmra007vqs01equ01zy4	150.00	73.70	11055.00	cmnldwmr8007tqs01bt7ktl5p	cmne5oboc005plk01nf29b7sx	2026-04-05 06:32:31.031	\N	kg
cmnldwmra007xqs01ajihped9	50.00	72.20	3610.00	cmnldwmr8007tqs01bt7ktl5p	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:32:31.031	\N	kg
cmnldxob4008dqs018yjj52r1	50.00	75.20	3760.00	cmnldxob2008bqs01kylzrkrj	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:33:19.697	\N	kg
cmnldy3uc008pqs01t15o5xm2	450.00	72.20	32490.00	cmnldy3ua008nqs01tb0psllt	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:33:39.828	\N	kg
cmnle3bhr009hqs01c69z5w1j	100.00	72.20	7220.00	cmnle3bhp009fqs01zel1x6u7	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:37:43.023	\N	kg
cmnle4ct9009vqs01nyl3jxq7	100.00	75.20	7520.00	cmnle4ct6009tqs011kd0h3qc	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:38:31.389	\N	kg
cmnle4ygp00a7qs01lsy012to	150.00	72.20	10830.00	cmnle4ygn00a5qs010fzvx5p8	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:38:59.449	\N	kg
cmnle5l3u00ajqs01563cf8ug	100.00	72.20	7220.00	cmnle5l3s00ahqs01ojlhfsiu	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:39:28.794	\N	kg
cmnle73q800avqs01e2ru8z68	100.00	72.20	7220.00	cmnle73q600atqs01rmwvuhbo	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:40:39.585	\N	kg
cmnle7hi900b7qs01m9qh7drp	50.00	72.20	3610.00	cmnle7hi700b5qs01o9h5fby6	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:40:57.441	\N	kg
cmnle82cr00bjqs01afl0v42w	300.00	72.20	21660.00	cmnle82cq00bhqs01vg3nyd61	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:41:24.46	\N	kg
cmnle8oqp00bvqs015o03h3vw	100.00	72.20	7220.00	cmnle8oqm00btqs01e02z5fu9	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:41:53.473	\N	kg
cmnle9c5u00c7qs0193rl0vpi	50.00	72.20	3610.00	cmnle9c5r00c5qs01epkxy86u	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:42:23.826	\N	kg
cmnle9wit00cjqs01nxorm218	100.00	75.20	7520.00	cmnle9wir00chqs015a028h1g	cmne5jqb9004zlk01znbq4p47	2026-04-05 06:42:50.214	\N	kg
cmnle9wit00clqs01qi5puz05	250.00	72.20	18050.00	cmnle9wir00chqs015a028h1g	cmnle13gy0093qs01yac3y7qz	2026-04-05 06:42:50.214	\N	kg
cmnlebeo500d3qs01soug7el9	150.00	72.20	10830.00	cmnlebeo300d1qs014k27o7k1	cmne5oboh005tlk01ucqxgfsw	2026-04-05 06:44:00.389	\N	kg
cmnlebrn500dfqs01nc0tx7hn	50.00	72.20	3610.00	cmnlebrn200ddqs01t502k0ao	cmnle13gy0093qs01yac3y7qz	2026-04-05 06:44:17.202	\N	kg
cmnlecy9900drqs01s0eix6og	50.00	74.20	3710.00	cmnlecy9700dpqs01u6jay1ky	cmne5yfxw0091lk01uzf382ss	2026-04-05 06:45:12.43	\N	kg
cmnledb8v00e3qs015r8ikpzp	50.00	74.20	3710.00	cmnledb8t00e1qs01t3gkcepv	cmne5yfxw0091lk01uzf382ss	2026-04-05 06:45:29.263	\N	kg
cmnledncd00efqs0124m8vi4b	100.00	74.20	7420.00	cmnledncc00edqs01q7yxbmwc	cmne5yfxw0091lk01uzf382ss	2026-04-05 06:45:44.942	\N	kg
cmnledzbe00erqs011tsmxtji	50.00	75.70	3785.00	cmnledzbc00epqs01w8hhndp9	cmne5yfxo008xlk01h6sloe3u	2026-04-05 06:46:00.458	\N	kg
cmnlf52se00iaqs01g823mhm1	150.00	74.20	11130.00	cmnlf52sb00i8qs01862fdgzs	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:07:04.671	\N	kg
cmnlf5iqs00imqs01tno8rj2f	100.00	75.70	7570.00	cmnlf5iqq00ikqs01h5ojglr0	cmne5yfxo008xlk01h6sloe3u	2026-04-05 07:07:25.348	\N	kg
cmnlf5iqs00ioqs016ij8dkit	50.00	74.20	3710.00	cmnlf5iqq00ikqs01h5ojglr0	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:07:25.348	\N	kg
cmnlf5z0n00j2qs01uuxkecqo	50.00	77.20	3860.00	cmnlf5z0l00j0qs01ovvcup3q	cmnlf2h8s00h7qs01690wwf38	2026-04-05 07:07:46.44	\N	kg
cmnlf5z0n00j4qs01rz88hlq4	200.00	74.20	14840.00	cmnlf5z0l00j0qs01ovvcup3q	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:07:46.44	\N	kg
cmnlf69r300jiqs01zufn7c56	200.00	74.20	14840.00	cmnlf69r100jgqs01i1061k1z	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:08:00.352	\N	kg
cmnlf6q0t00juqs01vpluq39u	50.00	74.20	3710.00	cmnlf6q0r00jsqs01y0v9umfy	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:08:21.437	\N	kg
cmnlf73gs00k6qs01sm3le90x	100.00	74.20	7420.00	cmnlf73gr00k4qs01guys76wu	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:08:38.861	\N	kg
cmnlf7i2n00kiqs01rzqbf7c1	50.00	75.70	3785.00	cmnlf7i2l00kgqs01ma4ow4zu	cmne5yfxo008xlk01h6sloe3u	2026-04-05 07:08:57.791	\N	kg
cmnlf7i2n00kkqs011grjpfju	50.00	74.20	3710.00	cmnlf7i2l00kgqs01ma4ow4zu	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:08:57.791	\N	kg
cmnlf8abq00laqs0176let5su	50.00	74.20	3710.00	cmnlf8abo00l8qs01hair4c1u	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:09:34.407	\N	kg
cmnlf7vq000kyqs01yls4lt3f	100.00	74.20	7420.00	cmnlf7vpy00kwqs01vem1jpwb	cmne5yfxw0091lk01uzf382ss	2026-04-05 07:09:15.48	\N	kg
cms3eelue000dqm01bdv43eow	1.00	2.00	2.00	cms3eelua000bqm01l5qm90r5	cms3ctu450028my01dxz94bu8	2026-07-27 15:45:10.166	\N	kg
cms3egnff000xqm012ppzj0c1	1.00	3.00	3.00	cms3egnfd000vqm0163uyhzdd	cms3ctu450028my01dxz94bu8	2026-07-27 15:46:45.532	\N	kg
cms3esred0021qm014vdi138h	1.00	2.00	2.00	cms3esrea001zqm01g1cgx13u	cms3ctu450028my01dxz94bu8	2026-07-27 15:56:10.549	\N	kg
cms3eunb8000do701xrj7899z	7.00	2.00	14.00	cms3eunb5000bo701bs3m8pzy	cms3ctu450028my01dxz94bu8	2026-07-27 15:57:38.565	\N	kg
cms3zpyjb003po701jq4588uu	10.00	2.00	20.00	cms3zpyj8003no701vdh8e6oj	cms3ctu450028my01dxz94bu8	2026-07-28 01:41:51.767	\N	kg
cms403f3f005bo701wkrqdiax	1.00	15.00	15.00	cms403f3c0059o701lvjfe9xx	cms402ref004vo701d01oekj7	2026-07-28 01:52:19.755	\N	kg
cms4dybvf003zth01hzur6kha	7.00	4035.00	28245.00	cms4dybva003xth018tnkkvhc	cms4dkscj002dth01ampkjqvj	2026-07-28 08:20:16.924	\N	bags
cms4dza2u0047th019u7bkj0h	8.00	4035.00	32280.00	cms4dza2s0045th01hsun30l4	cms4dkscj002dth01ampkjqvj	2026-07-28 08:21:01.254	\N	bags
cms4e059c004fth01iwpjrsnx	5.00	3985.00	19925.00	cms4e059b004dth014hw1tx0s	cms4dpr080032th0149yb5sz8	2026-07-28 08:21:41.665	\N	bags
cms4e13io004nth01lkgl1r7g	5.00	3985.00	19925.00	cms4e13il004lth01v4epmkah	cms4dpr080032th0149yb5sz8	2026-07-28 08:22:26.064	\N	bags
cms4e413h004xth019ld1ceq6	1.00	3800.00	3800.00	cms4e413f004vth011some1i7	cms4dw1g6003oth01u4qq3vcq	2026-07-28 08:24:42.894	\N	bags
cms4e5r5s0055th01tdnled3m	3.00	4125.00	12375.00	cms4e5r5q0053th01rqlg44vf	cms4dpqzw002wth0133z1ix2x	2026-07-28 08:26:03.329	\N	bags
cms4e5r5s0057th01njf14idj	1.00	1000.00	1000.00	cms4e5r5q0053th01rqlg44vf	cms1n41o9005olr017j1mc3jv	2026-07-28 08:26:03.329	\N	pcs
cms4e5r5s0059th01a7ndl3lu	300.00	60.00	18000.00	cms4e5r5q0053th01rqlg44vf	cms1hsc6y005clr01dctbr7jn	2026-07-28 08:26:03.329	\N	pcs
cms4e79xj005lth01tcdtrqh3	4.00	3985.00	15940.00	cms4e79xg005jth01j4nwzebs	cms4dpr080032th0149yb5sz8	2026-07-28 08:27:14.311	\N	bags
cms4e79xj005nth01dl8ijxt3	1.00	1600.00	1600.00	cms4e79xg005jth01j4nwzebs	cms1n41o9005olr017j1mc3jv	2026-07-28 08:27:14.311	\N	pcs
cms4e8ek5005xth010jvxmn6e	4.00	3985.00	15940.00	cms4e8ek2005vth01gl52vvsl	cms4dpr080032th0149yb5sz8	2026-07-28 08:28:06.966	\N	bags
cms4e9bin0065th0105lv546t	8.00	4035.00	32280.00	cms4e9bik0063th019xo8k1j1	cms4dkscj002dth01ampkjqvj	2026-07-28 08:28:49.68	\N	bags
cms4ebram006dth01f7h946nl	2.00	4035.00	8070.00	cms4ebrai006bth01sh9eol9z	cms4dw1fx003kth018304ju3l	2026-07-28 08:30:43.438	\N	bags
cms4ebram006fth01ju41rgy2	5.00	3985.00	19925.00	cms4ebrai006bth01sh9eol9z	cms4dkscr002hth01d3gx0m81	2026-07-28 08:30:43.438	\N	bags
cms4ecriy006pth01es1t0tzt	1.00	3850.00	3850.00	cms4ecriw006nth01unysu45e	cms4dkscj002dth01ampkjqvj	2026-07-28 08:31:30.394	\N	bags
cms4edv3s006xth01wnol5li7	4.00	3985.00	15940.00	cms4edv3q006vth01f94djhk4	cms4dkscr002hth01d3gx0m81	2026-07-28 08:32:21.688	\N	bags
cms4ef5fx0075th0193tg9vdj	3.00	3985.00	11955.00	cms4ef5fu0073th01kk9appsw	cms4dkscr002hth01d3gx0m81	2026-07-28 08:33:21.741	\N	bags
cms4fr89i008vth019zyiy0qp	4.00	4125.00	16500.00	cms4fr89g008tth01bx2j2lkx	cms4dpqzw002wth0133z1ix2x	2026-07-28 09:10:44.886	\N	bags
cms4fr89i008xth01kr7tp7x6	400.00	85.00	34000.00	cms4fr89g008tth01bx2j2lkx	cms4cp6ry000vth01u43pigco	2026-07-28 09:10:44.886	\N	pcs
\.


--
-- Data for Name: DealerSalePayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DealerSalePayment" (id, amount, date, description, "paymentMethod", "saleId", "createdAt", "linkedLedgerEntryId") FROM stdin;
cms3esrei0025qm01h5scij6n	2.00	2026-07-27 06:15:00	Initial payment	CASH	cms3esrea001zqm01g1cgx13u	2026-07-27 15:56:10.554	\N
cms3eunbe000ho701lku19nak	14.00	2026-07-27 06:15:00	Initial payment	CASH	cms3eunb5000bo701bs3m8pzy	2026-07-27 15:57:38.57	\N
\.


--
-- Data for Name: DemoEnquiry; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."DemoEnquiry" (id, "companyName", "phoneNumber", message, "createdAt", "updatedAt", "businessTypes") FROM stdin;
cmno7l9uu000mnq01b5qrafk1	oli agro industries	+9779810901501	\N	2026-04-07 05:59:01.926	2026-04-07 05:59:01.926	{}
cmpjf1l9r00irnq0107fsogwd	rapti feed suppliers	+9779860935630	\N	2026-05-24 06:48:14.319	2026-05-24 06:48:14.319	{}
cmptsvtc000l4nq01l5u6k4sp	test	+97745678909876	test	2026-05-31 13:13:21.217	2026-05-31 13:13:21.217	{}
cmqi8ape8005unr01k6nfe2w4	Neha infotech	+9779857834143	\N	2026-06-17 15:31:18.416	2026-06-17 15:31:18.416	{}
cmruvf7410000oe01vot5prr8	test	+97798765690	\N	2026-07-21 16:31:35.617	2026-07-21 16:31:35.617	{"Layer Farm",Hatchery,"Feed Dealer"}
cms2siypn00d6lr01s18dfrs8	Nanda poultry farm	+9779858424103	\N	2026-07-27 05:32:41.916	2026-07-27 05:32:41.916	{"Layer Farm","Broiler Farm",Hatchery,"Feed Dealer"}
\.


--
-- Data for Name: EggProduction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."EggProduction" (id, "batchId", date, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: EggProductionEntry; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."EggProductionEntry" (id, "eggProductionId", "eggTypeId", count) FROM stdin;
\.


--
-- Data for Name: EggType; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."EggType" (id, "userId", name, code, "displayOrder", "createdAt", "updatedAt") FROM stdin;
cmnbmj0pe002tlk0100dplzgd	cmnbm2tdx001hlk01lewrwu1c	Eggs XL	EGGS_XL	0	2026-03-29 10:36:10.706	2026-03-29 10:36:10.706
cmnbmk43d0031lk01jhmwnux7	cmnbm2tdx001hlk01lewrwu1c	Eggs L	EGGS_L	1	2026-03-29 10:37:01.753	2026-03-29 10:37:01.753
cmnbmkl8j0033lk01imhwczd0	cmnbm2tdx001hlk01lewrwu1c	Eggs M	EGGS_M	2	2026-03-29 10:37:23.972	2026-03-29 10:37:23.972
cmnbmky3y0035lk01elv2m8cv	cmnbm2tdx001hlk01lewrwu1c	Eggs S	EGGS_S	3	2026-03-29 10:37:40.654	2026-03-29 10:37:40.654
cmqxz182i00denr01k4w536c2	cmopafd8z00b1nq01zcppx8r5	Large	L	0	2026-06-28 15:56:18.331	2026-06-28 15:56:18.331
cmqxz1mcd00dgnr01nz0m8e76	cmopafd8z00b1nq01zcppx8r5	Extra Large	XL	1	2026-06-28 15:56:36.83	2026-06-28 15:56:36.83
cmqxz1vdd00dinr014tvfenvj	cmopafd8z00b1nq01zcppx8r5	Medium	M	2	2026-06-28 15:56:48.53	2026-06-28 15:56:48.53
cmqxz21ni00dknr01qgh4ai7z	cmopafd8z00b1nq01zcppx8r5	Small	S	3	2026-06-28 15:56:56.67	2026-06-28 15:56:56.67
cmqxz28yv00dmnr01nvg6m51t	cmopafd8z00b1nq01zcppx8r5	Goli	G	4	2026-06-28 15:57:06.152	2026-06-28 15:57:06.152
cmqxz2h0700donr010ywx1vet	cmopafd8z00b1nq01zcppx8r5	Double Goli	GG	5	2026-06-28 15:57:16.567	2026-06-28 15:57:16.567
cmqxz2q3i00dqnr01t3m70126	cmopafd8z00b1nq01zcppx8r5	Jumbo	J	6	2026-06-28 15:57:28.351	2026-06-28 15:57:28.351
cmqxz38mm00dsnr01ff2esi9n	cmopafd8z00b1nq01zcppx8r5	Crack	C	7	2026-06-28 15:57:52.366	2026-06-28 15:57:52.366
cmqxz3ox900dunr01ujbf1s0e	cmopafd8z00b1nq01zcppx8r5	Jhol Anda	JHOL	8	2026-06-28 15:58:13.486	2026-06-28 15:58:13.486
cmqxz4du500dwnr016lr6m16w	cmopafd8z00b1nq01zcppx8r5	Kalo/Seto Fohor wala mal lako	MAL_LAAKO	9	2026-06-28 15:58:45.774	2026-06-28 15:58:45.774
\.


--
-- Data for Name: EntityTransaction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."EntityTransaction" (id, type, amount, quantity, "freeQuantity", "itemName", date, description, reference, "imageUrl", "dealerId", "hatcheryId", "medicineSupplierId", "customerId", "inventoryItemId", "expenseId", "paymentToPurchaseId", "entityType", "entityId", "createdAt", "updatedAt", "purchaseCategory", unit, "unitPrice", "sourceDealerLedgerEntryId", "expiryDate") FROM stdin;
cmna3rhn3001bp101qii6a7h6	PURCHASE	11280.00	150	0	b0	2026-03-28 00:00:00	Purchase of b0	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	cmna3rhmu0015p101rrna87ty	cmna3rhmw0017p101006amkkj	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:03:07.023	2026-03-28 09:03:07.023	FEED	KG	75.20	\N	\N
cmna3s7wp001lp101epw0uiir	PURCHASE	31322.50	425	0	b1	2026-03-28 00:00:00	Purchase of b1	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	cmna3s7wf001fp1019rvc91nv	cmna3s7wi001hp1011qo4g9h1	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:03:41.065	2026-03-28 09:03:41.065	FEED	KG	73.70	\N	\N
cmna3u1n6001vp101t1dentbn	PURCHASE	65846.40	912	0	b2	2026-03-28 00:00:00	Purchase of b2	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	cmna3u1mu001pp1017cx1fun8	cmna3u1mz001rp101p6khtm6l	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:05:06.258	2026-03-28 09:05:06.258	FEED	KG	72.20	\N	\N
cmna3uz9b0027p101xf8go8mb	PURCHASE	42000.00	400	8	chicks 	2026-03-28 00:00:00	Purchase of chicks 	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	cmna3uz93001zp101kjp59kik	cmna3uz950021p101skaicbxx	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:05:49.822	2026-03-28 09:05:49.822	CHICKS	Birds	105.00	\N	\N
cmna43zit003tp101hch2fb06	PURCHASE	10830.00	150	0	b2	2026-03-28 00:00:00	\N	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	cmna3u1mu001pp1017cx1fun8	cmna43zim003pp1015ofq6cra	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:12:50.069	2026-03-28 09:12:50.069	FEED	KG	72.20	\N	\N
cmna4tpgw005fp101zf14zy8a	PAYMENT	161278.90	\N	\N	\N	2026-03-28 00:00:00	Payment	\N	\N	cmna3qpcz0011p1015pzp0jb3	\N	\N	\N	\N	\N	\N	DEALER	cmna3qpcz0011p1015pzp0jb3	2026-03-28 09:32:50.097	2026-03-28 09:32:50.097	\N	\N	\N	\N	\N
cmnbmswrj0047lk01xonf802q	PAYMENT	4200000.00	\N	\N	\N	2026-03-29 00:00:00	Payment	\N	\N	cmnbmf4qg0027lk01co9ykzj3	\N	\N	\N	\N	\N	\N	DEALER	cmnbmf4qg0027lk01co9ykzj3	2026-03-29 10:43:52.159	2026-03-29 10:43:52.159	\N	\N	\N	\N	\N
cmokzmyi9007qnq01n6w3x35n	PURCHASE	1412730.00	15697	313	Day old layers chicks	2025-05-07 00:00:00	Purchase of Day old layers chicks	\N	\N	cmokzipv2007enq013wf9vhwj	\N	\N	\N	cmokzmyhv007inq01hg480tlz	cmokzmyhz007knq01w7clowqo	\N	DEALER	cmokzipv2007enq013wf9vhwj	2026-04-30 04:32:47.409	2026-04-30 04:32:47.409	CHICKS	PCS	90.00	\N	\N
cmol12cc6008cnq01ik3cex6w	PURCHASE	113175.00	1500	0	B0	2025-05-08 00:00:00	Purchase of B0	\N	\N	cmokzthkr0080nq01yuv2nlrx	\N	\N	\N	cmol12cbx0086nq01zybdmwu1	cmol12cc00088nq01imyipmrn	\N	DEALER	cmokzthkr0080nq01yuv2nlrx	2026-04-30 05:12:44.79	2026-04-30 05:12:44.79	FEED	KG	75.45	\N	\N
cmol182u4008wnq01txfuee1t	PURCHASE	28275.00	15	0	CHB vaccine	2024-10-29 00:00:00	Purchase of CHB vaccine	\N	\N	cmol15vly008mnq010dq5crcw	\N	\N	\N	cmol182ty008qnq01mm0hnlur	cmol182u1008snq01e28ri0b1	\N	DEALER	cmol15vly008mnq010dq5crcw	2026-04-30 05:17:12.413	2026-04-30 05:17:12.413	MEDICINE	Vial	1885.00	\N	\N
cmol1bgdc0098nq014qx4uu62	PURCHASE	18400.00	20	0	Artieveda	2025-05-08 00:00:00	Purchase of Artieveda	\N	\N	cmol1aaay008ynq01zw76e3os	\N	\N	\N	cmol1bgd50092nq0155a9tq35	cmol1bgd70094nq01wk1qy2vk	\N	DEALER	cmol1aaay008ynq01zw76e3os	2026-04-30 05:19:49.92	2026-04-30 05:19:49.92	MEDICINE	PCS	920.00	\N	\N
cmqxyic0x00aanr01ucydoht7	PURCHASE	3488.00	16	0	F1 Vaccine	2026-06-22 00:00:00	Purchase of F1 Vaccine	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmqxyic0o00a4nr01t07sx00o	cmqxyic0r00a6nr0156sjxo76	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:41:36.993	2026-06-28 15:41:36.993	MEDICINE	Vial	218.00	\N	\N
cmqxyxc9800cinr012hsb28e8	PURCHASE	4800.00	24	0	N-dox	2026-06-18 00:00:00	Purchase of N-dox	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmqxyxc9300ccnr01rjnhsj8c	cmqxyxc9400cenr01alxkwhfs	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:53:17.132	2026-06-28 15:53:17.132	MEDICINE	PCS	200.00	\N	\N
cmq8xv79w0019nr01ew1yxs2t	PURCHASE	1391850.00	9279	185	1 day old chick	2026-06-10 00:00:00	Chicks released next day 2/28	\N	\N	cmoqlldm900dnnq01giqfcv83	\N	\N	\N	cmq8xv79m0011nr01xvq72k11	cmq8xv79p0013nr012fvrxx41	\N	DEALER	cmoqlldm900dnnq01giqfcv83	2026-06-11 03:29:23.348	2026-06-11 03:29:23.348	CHICKS	PCS	150.00	\N	\N
cmq8xzvc0001vnr010qmxa2ei	PURCHASE	348.00	1	0	Electrol C	2026-06-11 00:00:00	Purchase of Electrol C	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8xzvbt001pnr01zzrgxm4i	cmq8xzvbv001rnr01dhuh1br4	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-11 03:33:01.152	2026-06-11 03:33:01.152	MEDICINE	PCS	348.00	\N	\N
cmq8y1dfm002fnr019caffzwe	PURCHASE	2000.00	1	0	Lavitone H	2026-06-11 00:00:00	Purchase of Lavitone H	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8y1dfc0029nr018pcdbygs	cmq8y1dff002bnr01jqi1784g	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-11 03:34:11.266	2026-06-11 03:34:11.266	MEDICINE	Bottle	2000.00	\N	\N
cmq8yt0r6002znr01w8y9zmbj	PURCHASE	18850.00	10	0	CHB Vaccine	2026-06-10 00:00:00	Purchase of CHB Vaccine	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8yt0qw002tnr0100hx7tel	cmq8yt0r0002vnr01hfm9zbjg	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-11 03:55:41.202	2026-06-11 03:55:41.202	MEDICINE	Vial	1885.00	\N	\N
cmqxykgio00aknr011ahhv3e1	PURCHASE	30160.00	16	0	CHB Vaccine	2026-06-18 00:00:00	Purchase of CHB Vaccine	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8yt0qw002tnr0100hx7tel	cmqxykgih00agnr014pjsttre	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:43:16.129	2026-06-28 15:43:16.129	MEDICINE	Vial	1885.00	\N	\N
cmq8z04n5003hnr01rde97a3v	PURCHASE	800.00	8	0	Sugar	2026-06-11 00:00:00	Purchase of Sugar	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8z04mx003bnr01omml3heh	cmq8z04n0003dnr01webpwtf2	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-11 04:01:12.834	2026-06-11 04:01:12.834	OTHER	KG	100.00	\N	\N
cmqoqlmm70068nr01bla28geq	PURCHASE	2521200.00	16808	336	Day Old Chicks layers	2026-06-17 00:00:00	Purchase of Day Old Chicks layers	\N	\N	cmoqlldm900dnnq01giqfcv83	\N	\N	\N	cmqoqlmlx0060nr01pblv4bv6	cmqoqlmm10062nr01evvwpcxo	\N	DEALER	cmoqlldm900dnnq01giqfcv83	2026-06-22 04:50:18.176	2026-06-22 04:50:18.176	CHICKS	Birds	150.00	\N	\N
cmqxymgzh00aunr01goe72o9y	PURCHASE	22100.00	17	0	Bursa B2k	2026-06-27 00:00:00	Purchase of Bursa B2k	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmqxymgz400aonr01lid9czra	cmqxymgz900aqnr01wkngq7j5	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:44:50.045	2026-06-28 15:44:50.045	MEDICINE	Vial	1300.00	\N	\N
cmqxyy0am00csnr01gwnfyyax	PURCHASE	5000.00	2	0	Vitamin C	2026-06-18 00:00:00	Purchase of Vitamin C	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmqxyy0ah00cmnr018hhd3s2y	cmqxyy0ai00conr018ahh5wrk	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:53:48.286	2026-06-28 15:53:48.286	MEDICINE	PCS	2500.00	\N	\N
cmqxyyogu00d2nr01kqorc7bm	PURCHASE	4000.00	2	0	Lavitone H	2026-06-28 00:00:00	Purchase of Lavitone H	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmq8y1dfc0029nr018pcdbygs	cmqxyyogq00cynr01slpust60	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:54:19.614	2026-06-28 15:54:19.614	MEDICINE	Bottle	2000.00	\N	\N
cmqxyz8qf00dcnr01d0tgcbr3	PURCHASE	1750.00	5	0	Electrolyte	2026-06-28 00:00:00	Purchase of Electrolyte	\N	\N	cmq8xyq1p001lnr01oeoe3y88	\N	\N	\N	cmqxyz8qa00d6nr01p15e1w97	cmqxyz8qb00d8nr01f98qcutn	\N	DEALER	cmq8xyq1p001lnr01oeoe3y88	2026-06-28 15:54:45.879	2026-06-28 15:54:45.879	MEDICINE	PCS	350.00	\N	\N
cmrd67oay007hpp01f47be2cc	PURCHASE	110775.00	1500	0	B0 Shreegaun Sajjan ko Farm	2026-06-25 00:00:00	Shreegaun Sajjan ko Farm ma	\N	\N	cmopalj4700bjnq010dbqep07	\N	\N	\N	cmrd67oar007bpp01zsq7peau	cmrd67oau007dpp01utmsttn7	\N	DEALER	cmopalj4700bjnq010dbqep07	2026-07-09 07:13:49.259	2026-07-09 07:13:49.259	FEED	KG	73.85	\N	\N
cmrd6bvo60081pp01nukwjezm	PURCHASE	110775.00	1500	0	B0 Ghara ko Farm	2026-06-10 00:00:00	Ghara 10 no ko challa ko lagi	\N	\N	cmopalj4700bjnq010dbqep07	\N	\N	\N	cmrd6asak007lpp01yih6uwji	cmrd6bvnz007xpp01tor2arhz	\N	DEALER	cmopalj4700bjnq010dbqep07	2026-07-09 07:17:05.431	2026-07-09 07:17:05.431	FEED	KG	73.85	\N	\N
cmrd6dttl008bpp01oev1v58f	PURCHASE	147700.00	2000	0	B0 Shreegaun Sajjan ko Farm	2026-06-18 00:00:00	Shreegaun Sajjan ko Farm ma	\N	\N	cmopalj4700bjnq010dbqep07	\N	\N	\N	cmrd67oar007bpp01zsq7peau	cmrd6dttg0087pp01rt24pl2k	\N	DEALER	cmopalj4700bjnq010dbqep07	2026-07-09 07:18:36.345	2026-07-09 07:18:36.345	FEED	KG	73.85	\N	\N
\.


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Expense" (id, date, amount, description, quantity, weight, "unitPrice", "farmId", "batchId", "categoryId", "createdAt", "updatedAt") FROM stdin;
cmna3rhmw0017p101006amkkj	2026-03-28 00:00:00	11280.00	Purchase of b0	150.00	\N	75.20	\N	\N	cmna3rhmp0013p1012h883l1n	2026-03-28 09:03:07.017	2026-03-28 09:03:07.017
cmna3s7wi001hp1011qo4g9h1	2026-03-28 00:00:00	31322.50	Purchase of b1	425.00	\N	73.70	\N	\N	cmna3rhmp0013p1012h883l1n	2026-03-28 09:03:41.059	2026-03-28 09:03:41.059
cmna3u1mz001rp101p6khtm6l	2026-03-28 00:00:00	65846.40	Purchase of b2	912.00	\N	72.20	\N	\N	cmna3rhmp0013p1012h883l1n	2026-03-28 09:05:06.251	2026-03-28 09:05:06.251
cmna3uz950021p101skaicbxx	2026-03-28 00:00:00	42000.00	Purchase of chicks 	400.00	\N	105.00	\N	\N	cmna3uz91001xp101vscc0vvs	2026-03-28 09:05:49.817	2026-03-28 09:05:49.817
cmna3w4pw002fp101uh8k4ixh	2026-03-28 09:06:43.555	42000.00	Purchase of chicks  for batch creation Chaitra-14-Khor 2-14-51-33	408.00	\N	102.94	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmna3uz91001xp101vscc0vvs	2026-03-28 09:06:43.556	2026-03-28 09:06:43.556
cmna3wq7w002tp101ojfktg36	2026-03-28 00:00:00	11280.00	\N	150.00	\N	75.20	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmn6a06bx000fqr01rt2e97do	2026-03-28 09:07:11.42	2026-03-28 09:07:11.42
cmna3xrmz0031p101ejfi25io	2026-03-28 00:00:00	9490.00	\N	1.00	\N	9490.00	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmn6a06bx000jqr01gpdkz2rs	2026-03-28 09:07:59.915	2026-03-28 09:07:59.915
cmna3y4g30033p101g1xnhhfr	2026-03-28 00:00:00	31322.50	\N	425.00	\N	73.70	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmn6a06bx000fqr01rt2e97do	2026-03-28 09:08:16.516	2026-03-28 09:08:16.516
cmna3ye4l003bp101efq5o0oa	2026-03-28 00:00:00	65846.40	\N	912.00	\N	72.20	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmn6a06bx000fqr01rt2e97do	2026-03-28 09:08:29.061	2026-03-28 09:08:29.061
cmna43zim003pp1015ofq6cra	2026-03-28 00:00:00	10830.00	Purchase of b2	150.00	\N	72.20	\N	\N	cmna3rhmp0013p1012h883l1n	2026-03-28 09:12:50.062	2026-03-28 09:12:50.062
cmna44a0v003zp1010f3o6kz7	2026-03-28 00:00:00	10830.00	\N	150.00	\N	72.20	cmna3pmm8000hp101rcyp5gug	cmna3w4pp002bp101wgv90tfx	cmn6a06bx000fqr01rt2e97do	2026-03-28 09:13:03.679	2026-03-28 09:13:03.679
cmokzmyhz007knq01w7clowqo	2025-05-07 00:00:00	1412730.00	Purchase of Day old layers chicks	15697.00	\N	90.00	\N	\N	cmokzmyhq007gnq01ormn7ilt	2026-04-30 04:32:47.399	2026-04-30 04:32:47.399
cmokzo8bd007wnq01cylne3ou	2026-04-30 04:33:46.777	1412730.00	Purchase of Day old layers chicks for batch creation Baisakh-25-Ghara 8,9,13,14,15,16	16010.00	\N	88.24	cmoiscw9h004xnq01otk5h1pv	cmokzo8b9007snq01s81y159n	cmokzmyhq007gnq01ormn7ilt	2026-04-30 04:33:46.778	2026-04-30 04:33:46.778
cmol12cc00088nq01imyipmrn	2025-05-08 00:00:00	113175.00	Purchase of B0	1500.00	\N	75.45	\N	\N	cmol12cbt0084nq01uwr8pase	2026-04-30 05:12:44.784	2026-04-30 05:12:44.784
cmol14oqq008enq014fjti3da	2025-05-08 00:00:00	3018.00	B0 - 	40.00	\N	75.45	cmoiscw9h004xnq01otk5h1pv	cmokzo8b9007snq01s81y159n	cmoisamzz004lnq01tkp78orj	2026-04-30 05:14:34.178	2026-04-30 05:14:34.178
cmol182u1008snq01e28ri0b1	2024-10-29 00:00:00	28275.00	Purchase of CHB vaccine	15.00	\N	1885.00	\N	\N	cmol182tw008onq01qyk3p5tw	2026-04-30 05:17:12.409	2026-04-30 05:17:12.409
cmol1bgd70094nq01wk1qy2vk	2025-05-08 00:00:00	18400.00	Purchase of Artieveda	20.00	\N	920.00	\N	\N	cmol182tw008onq01qyk3p5tw	2026-04-30 05:19:49.916	2026-04-30 05:19:49.916
cmq8xv79p0013nr012fvrxx41	2026-06-10 00:00:00	1391850.00	Chicks released next day 2/28	9279.00	\N	150.00	\N	\N	cmopatqmt00c7nq018eq7dtxs	2026-06-11 03:29:23.342	2026-06-11 03:29:23.342
cmq8xzvbv001rnr01dhuh1br4	2026-06-11 00:00:00	348.00	Purchase of Electrol C	1.00	\N	348.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:33:01.147	2026-06-11 03:33:01.147
cmq8y1dff002bnr01jqi1784g	2026-06-11 00:00:00	2000.00	Purchase of Lavitone H	1.00	\N	2000.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:34:11.26	2026-06-11 03:34:11.26
cmq8yt0r0002vnr01hfm9zbjg	2026-06-10 00:00:00	18850.00	Purchase of CHB Vaccine	10.00	\N	1885.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:55:41.196	2026-06-11 03:55:41.196
cmq8ywcof0035nr0182fxz4dj	2026-06-11 03:58:16.623	1391850.00	Purchase of 1 day old chick for batch creation Jestha-28-Sundabari 10 No.	9464.00	\N	147.07	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopatqmt00c7nq018eq7dtxs	2026-06-11 03:58:16.623	2026-06-11 03:58:16.623
cmq8z04n0003dnr01webpwtf2	2026-06-11 00:00:00	800.00	Purchase of Sugar	8.00	\N	100.00	\N	\N	cmq8y1utb002hnr01cv4gwd7p	2026-06-11 04:01:12.828	2026-06-11 04:01:12.828
cmq8z0pc5003jnr01zdfznr8p	2026-06-11 00:00:00	800.00	\N	8.00	\N	100.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-11 04:01:39.653	2026-06-11 04:01:39.653
cmq8z1jw6003pnr01j1kln9tl	2026-06-11 00:00:00	69.60	\N	0.20	\N	348.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b3nq01gknzwzc5	2026-06-11 04:02:19.254	2026-06-11 04:02:19.254
cmq8z22ov003vnr01gy5p72gv	2026-06-11 00:00:00	400.00	\N	0.20	\N	2000.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b3nq01gknzwzc5	2026-06-11 04:02:43.615	2026-06-11 04:02:43.615
cmq9liur90041nr01zvdrj25s	2026-06-11 00:00:00	16965.00	\N	9.00	\N	1885.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b3nq01gknzwzc5	2026-06-11 14:31:38.038	2026-06-11 14:31:38.038
cmq9lkthb0047nr01wix3d29v	2026-06-11 00:00:00	2700.00	\N	9.00	\N	300.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-11 14:33:09.695	2026-06-11 14:33:09.695
cmqbtzocm005jnr01j9c1s45g	2026-06-10 00:00:00	6000.00	\N	10.00	\N	600.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-13 04:04:12.166	2026-06-13 04:04:12.166
cmqbu0vq4005lnr01fpq90god	2026-06-10 00:00:00	6000.00	\N	1.00	\N	6000.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-13 04:05:08.38	2026-06-13 04:05:08.38
cmqbu1ifn005nnr01z57e2n58	2026-06-10 00:00:00	7000.00	\N	70.00	\N	100.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-13 04:05:37.812	2026-06-13 04:05:37.812
cmqbu2i7c005pnr01i3qib3qq	2026-06-10 00:00:00	3840.00	\N	8.00	\N	480.00	cmq8xtm4v000xnr01buxfymht	cmq8ywcoa0031nr01lqp2d0n8	cmopafm5l00b6nq01lc47zmvk	2026-06-13 04:06:24.169	2026-06-13 04:06:24.169
cmqoqlmm10062nr01evvwpcxo	2026-06-17 00:00:00	2521200.00	Purchase of Day Old Chicks layers	16808.00	\N	150.00	\N	\N	cmopatqmt00c7nq018eq7dtxs	2026-06-22 04:50:18.169	2026-06-22 04:50:18.169
cmqoqovvc006onr01w6bpym4w	2026-06-22 04:52:50.135	2521200.00	Purchase of Day Old Chicks layers for batch creation Ashadh-4-Shreegaun 1 No.-10-37-37	17144.00	\N	147.06	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopatqmt00c7nq018eq7dtxs	2026-06-22 04:52:50.136	2026-06-22 04:52:50.136
cmqxyic0r00a6nr0156sjxo76	2026-06-22 00:00:00	3488.00	Purchase of F1 Vaccine	16.00	\N	218.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:41:36.987	2026-06-28 15:41:36.987
cmqxykgih00agnr014pjsttre	2026-06-18 00:00:00	30160.00	Purchase of CHB Vaccine	16.00	\N	1885.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:43:16.121	2026-06-28 15:43:16.121
cmqxymgz900aqnr01wkngq7j5	2026-06-27 00:00:00	22100.00	Purchase of Bursa B2k	17.00	\N	1300.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:44:50.037	2026-06-28 15:44:50.037
cmqxyndk400awnr01bi84zzun	2026-06-18 00:00:00	32045.00	\N	17.00	\N	1885.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b3nq01gknzwzc5	2026-06-28 15:45:32.261	2026-06-28 15:45:32.261
cmqxyobth00b8nr01b1w49oar	2026-06-28 00:00:00	22100.00	\N	17.00	\N	1300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b3nq01gknzwzc5	2026-06-28 15:46:16.662	2026-06-28 15:46:16.662
cmqxyxc9400cenr01alxkwhfs	2026-06-18 00:00:00	4800.00	Purchase of N-dox	24.00	\N	200.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:53:17.129	2026-06-28 15:53:17.129
cmqxyy0ai00conr018ahh5wrk	2026-06-18 00:00:00	5000.00	Purchase of Vitamin C	2.00	\N	2500.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:53:48.283	2026-06-28 15:53:48.283
cmqxyyogq00cynr01slpust60	2026-06-28 00:00:00	4000.00	Purchase of Lavitone H	2.00	\N	2000.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:54:19.61	2026-06-28 15:54:19.61
cmqxyz8qb00d8nr01f98qcutn	2026-06-28 00:00:00	1750.00	Purchase of Electrolyte	5.00	\N	350.00	\N	\N	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:54:45.876	2026-06-28 15:54:45.876
cmqxzhmcn00dynr01i843lt7i	2026-06-18 00:00:00	4800.00	\N	24.00	\N	200.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b3nq01gknzwzc5	2026-06-28 16:09:03.336	2026-06-28 16:09:03.336
cmrd4ufpj005hpp0171fylx8w	2026-06-17 00:00:00	7000.00	Kora Kapada	1.00	\N	7000.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:35:31.975	2026-07-09 06:35:31.975
cmrd4uzhv005jpp01e15luini	2026-06-17 00:00:00	12000.00	Bhus	120.00	\N	100.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:35:57.619	2026-07-09 06:35:57.619
cmrd4wf7a005lpp01swp2w290	2026-06-17 00:00:00	3600.00	Bar Banauna ghar bata 2 staff 3 din	6.00	\N	600.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:37:04.63	2026-07-09 06:37:04.63
cmrd4x4fl005npp013895bt4p	2026-06-17 00:00:00	4800.00	Chuna	10.00	\N	480.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:37:37.329	2026-07-09 06:37:37.329
cmrd4xmz5005ppp01b36z23i4	2026-06-17 00:00:00	3600.00	Cement	6.00	\N	600.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:38:01.362	2026-07-09 06:38:01.362
cmrd4y93a005rpp017fl02sql	2026-06-17 00:00:00	7500.00	Spray medicine	1.00	\N	7500.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:38:30.022	2026-07-09 06:38:30.022
cmrd519ca005tpp01lwgd1bh4	2026-06-18 00:00:00	1200.00	2 jana staff kaam garna gaeko	2.00	\N	600.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:40:50.314	2026-07-09 06:40:50.314
cmrd5248j005vpp01ojn731ul	2026-06-18 00:00:00	3000.00	10 jana half kaam vaccine lagauna ra challa kholna	10.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:41:30.355	2026-07-09 06:41:30.355
cmrd57077005xpp01zjn7p3gk	2026-06-18 00:00:00	6326.00	Introvit C	2.00	\N	3163.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:45:18.403	2026-07-09 06:45:18.403
cmrd5a8yu005zpp0123a3ylc2	2026-06-18 00:00:00	3900.00	Lavitone H	2.00	\N	1950.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:47:49.735	2026-07-09 06:47:49.735
cmrd5au960061pp01vycqno5p	2026-06-18 00:00:00	2015.00	Electrol C	5.00	\N	403.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:48:17.322	2026-07-09 06:48:17.322
cmrd5buat0063pp013bvlqggj	2026-06-18 00:00:00	1200.00	Chini	12.00	\N	100.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:49:04.038	2026-07-09 06:49:04.038
cmrd5jmoo006bpp01mc08gs61	2026-06-18 00:00:00	15000.00	Paani ko dibba	150.00	\N	100.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:55:07.417	2026-07-09 06:55:07.417
cmrd5lwuc006fpp01pb8hldag	2026-06-18 00:00:00	16500.00	Paani ko dibba	150.00	\N	110.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:56:53.892	2026-07-09 06:56:53.892
cmrd5op20006hpp01xhhj7pbp	2026-06-19 00:00:00	300.00	Staff kaam ko lagi gaeko half	1.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:59:03.768	2026-07-09 06:59:03.768
cmrd5p82u006jpp01cftky6s4	2026-06-20 00:00:00	300.00	Kaam ko lagi gaeko half	1.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:59:28.422	2026-07-09 06:59:28.422
cmrd5pnii006lpp017x36d7v1	2026-06-21 00:00:00	300.00	Kaam ko lagi gaeko half	1.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 06:59:48.427	2026-07-09 06:59:48.427
cmrd5q3ck006npp0146mjui0h	2026-06-22 00:00:00	300.00	Kaam ko lagi gaeko half	1.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:00:08.948	2026-07-09 07:00:08.948
cmrd5qsyo006ppp01a09un4ql	2026-06-22 00:00:00	10075.00	Electrol C	25.00	\N	403.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:00:42.144	2026-07-09 07:00:42.144
cmrd5x5us006rpp01952bh9qt	2026-06-22 00:00:00	10075.00	Electrol C	25.00	\N	403.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:05:38.789	2026-07-09 07:05:38.789
cmrd5y9nc006tpp01v0qxh1c0	2026-06-22 00:00:00	1950.00	Lavitone H	1.00	\N	1950.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:06:30.36	2026-07-09 07:06:30.36
cmrd5yo06006vpp014imise55	2026-06-22 00:00:00	2500.00	Hitone	1.00	\N	2500.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:06:48.966	2026-07-09 07:06:48.966
cmrd5zh34006xpp01dnep29py	2026-06-22 00:00:00	11000.00	Virdis	2.00	\N	5500.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:07:26.656	2026-07-09 07:07:26.656
cmrd5zwv4006zpp013kdwouxj	2026-06-22 00:00:00	3000.00	Virkon S	1.00	\N	3000.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:07:47.105	2026-07-09 07:07:47.105
cmrd60n9c0071pp01mdhhoegp	2026-06-22 00:00:00	250.00	Stress Care 5 liq 500ml	1.00	\N	250.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:08:21.313	2026-07-09 07:08:21.313
cmrd61qd20073pp01xr4pkh9x	2026-06-22 00:00:00	3033.00	Promez 200gm	9.00	\N	337.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:09:11.99	2026-07-09 07:09:11.99
cmrd640a60075pp01r1gtn72o	2026-06-23 00:00:00	3706.00	F1 vaccine	17.00	\N	218.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:10:58.158	2026-07-09 07:10:58.158
cmrd652c20077pp01hxdsog8y	2026-06-23 00:00:00	2700.00	Staff vaccine lagauna half kaam	9.00	\N	300.00	cmqoqe8xw005wnr01tk7xiryj	cmqoqovv6006knr01xd118ek9	cmopafm5l00b6nq01lc47zmvk	2026-07-09 07:11:47.475	2026-07-09 07:11:47.475
cmrd67oau007dpp01utmsttn7	2026-06-25 00:00:00	110775.00	Shreegaun Sajjan ko Farm ma	1500.00	\N	73.85	\N	\N	cmopam7hr00blnq01zt0nk607	2026-07-09 07:13:49.254	2026-07-09 07:13:49.254
cmrd6bvnz007xpp01tor2arhz	2026-06-10 00:00:00	110775.00	Ghara 10 no ko challa ko lagi	1500.00	\N	73.85	\N	\N	cmopam7hr00blnq01zt0nk607	2026-07-09 07:17:05.423	2026-07-09 07:17:05.423
cmrd6dttg0087pp01rt24pl2k	2026-06-18 00:00:00	147700.00	Shreegaun Sajjan ko Farm ma	2000.00	\N	73.85	\N	\N	cmopam7hr00blnq01zt0nk607	2026-07-09 07:18:36.341	2026-07-09 07:18:36.341
\.


--
-- Data for Name: Farm; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Farm" (id, name, capacity, description, "ownerId", "createdAt", "updatedAt") FROM stdin;
cmn6a2pg2000lqr016d2dfizf	Khor 3	500	\N	cmn69vvcj000cqr01gg2khvs3	2026-03-25 16:48:43.346	2026-03-25 16:48:43.346
cmna3pmm8000hp101rcyp5gug	Khor 2	5000	\N	cmn69vvcj000cqr01gg2khvs3	2026-03-28 09:01:40.161	2026-03-28 09:01:40.161
cmoisbfke004rnq015j5tj7jn	Shreegaun Sajjan	12000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:32:19.982	2026-04-28 15:32:19.982
cmoisbwjg004tnq01h5tmpvht	Shreegaun Kamal	12000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:32:41.98	2026-04-28 15:32:41.98
cmoisc59i004vnq01vav2f6a2	Kolahi	12000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:32:53.287	2026-04-28 15:32:53.287
cmoiscw9h004xnq01otk5h1pv	Ghara 8,9,13,14,15,16	16000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:33:28.277	2026-04-28 15:33:28.277
cmoisdi8p004znq01tci9l8uz	Ghara 6,7,10,11,12	12000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:33:56.761	2026-04-28 15:33:56.761
cmoise4t80051nq0160fkw371	Ghara 2,3,4	4000	\N	cmois9yvt004knq01b2fe36fo	2026-04-28 15:34:26.012	2026-04-28 15:34:26.012
cmq8xtm4v000xnr01buxfymht	Sundabari 10 No.	12500	\N	cmopafd8z00b1nq01zcppx8r5	2026-06-11 03:28:09.295	2026-06-11 03:28:09.295
cmqoqe8xw005wnr01tk7xiryj	Shreegaun 1 No.	4000	Brooding done in shed 1	cmopafd8z00b1nq01zcppx8r5	2026-06-22 04:44:33.86	2026-06-22 04:44:33.86
cmrd4mm82005bpp01cu05myv6	Sundabari 6 No.	1500	\N	cmopafd8z00b1nq01zcppx8r5	2026-07-09 06:29:27.17	2026-07-09 06:29:27.17
cmrd4myqe005dpp01ti0e3agh	Sundabari 7 No	1500	\N	cmopafd8z00b1nq01zcppx8r5	2026-07-09 06:29:43.382	2026-07-09 06:29:43.382
cmrd4obzt005fpp01ehepncrc	Shreegaun Sajjan 2 No.	4000	\N	cmopafd8z00b1nq01zcppx8r5	2026-07-09 06:30:47.225	2026-07-09 06:30:47.225
\.


--
-- Data for Name: FarmerCashDayClose; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."FarmerCashDayClose" (id, "userId", "bsDate", "openingSnapshot", "closingSnapshot", source, "closedAt") FROM stdin;
\.


--
-- Data for Name: FarmerCashMovement; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."FarmerCashMovement" (id, "userId", "bsDate", direction, amount, "partyName", notes, "recordedById", "createdAt") FROM stdin;
\.


--
-- Data for Name: FarmerCashSettings; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."FarmerCashSettings" (id, "userId", "initialOpening", "startBsDate", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeedConsumption; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."FeedConsumption" (id, date, quantity, "feedType", "batchId", "createdAt", "updatedAt") FROM stdin;
cmna3wq7z002xp101rjq4j11v	2026-03-28 00:00:00	150.00	b0	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:07:11.424	2026-03-28 09:07:11.424
cmna3y4g70037p1017m3z5ek1	2026-03-28 00:00:00	425.00	b1	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:08:16.519	2026-03-28 09:08:16.519
cmna3ye4q003fp101bvx4ki9q	2026-03-28 00:00:00	912.00	b2	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:08:29.066	2026-03-28 09:08:29.066
cmna44a100043p1011w7ha6uf	2026-03-28 00:00:00	150.00	b2	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:13:03.684	2026-03-28 09:13:03.684
cmol14oqw008inq01ve7dl704	2025-05-08 00:00:00	40.00	B0	cmokzo8b9007snq01s81y159n	2026-04-30 05:14:34.185	2026-04-30 05:14:34.185
\.


--
-- Data for Name: Hatchery; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Hatchery" (id, name, contact, address, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HatcheryBatch; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryBatch" (id, "hatcheryOwnerId", type, status, code, name, "startDate", "endDate", notes, "initialParents", "currentParents", "placedAt", "createdAt", "updatedAt") FROM stdin;
cms5mko310037s501hyj11mzr	cms4h6da00006nm01l5ckssf3	PARENT_FLOCK	ACTIVE	PF-001	\N	2026-07-29 00:00:00	\N	farm 1	1000	1000	2026-07-29 00:00:00	2026-07-29 05:09:22.285	2026-07-29 09:02:48.099
\.


--
-- Data for Name: HatcheryBatchExpense; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryBatchExpense" (id, "batchId", date, type, category, "itemName", quantity, unit, "unitPrice", amount, note, "inventoryItemId", "inventoryTxnId", "createdAt") FROM stdin;
cms5mko3a003ds501jdtxycv6	cms5mko310037s501hyj11mzr	2026-07-29 00:00:00	INVENTORY	CHICKS	parents	1000.0000	birds	72.7273	72727.30	Initial flock placement	cms5medg8001gs501173kdr1d	cms5mko36003bs501j30v7klk	2026-07-29 05:09:22.294
\.


--
-- Data for Name: HatcheryBatchMortality; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryBatchMortality" (id, "batchId", date, count, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: HatcheryBatchPlacement; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryBatchPlacement" (id, "batchId", "inventoryItemId", quantity, "createdAt") FROM stdin;
cms5mko350039s501tjr1nkfv	cms5mko310037s501hyj11mzr	cms5medg8001gs501173kdr1d	1000	2026-07-29 05:09:22.289
\.


--
-- Data for Name: HatcheryBusiness; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryBusiness" (id, name, contact, address, "ownerId", "createdAt", "updatedAt") FROM stdin;
cms4h6da50008nm01wrjcotqj	final-test-hatchery	+9772222222222	\N	cms4h6da00006nm01l5ckssf3	2026-07-28 09:50:30.846	2026-07-28 09:50:30.846
\.


--
-- Data for Name: HatcheryChickSale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryChickSale" (id, "incubationBatchId", grade, date, count, "unitPrice", amount, note, "inventoryItemId", "createdAt", "partyId") FROM stdin;
cms5nygcd0093s501mpg5j52u	cms5niyv8006ps5011d4aj0xt	A	2026-07-29 00:00:00	50	100.0000	5000.00	\N	\N	2026-07-29 05:48:05.054	\N
cms5nyytn009ns501zihl6mcx	cms5niyv8006ps5011d4aj0xt	B	2026-07-29 00:00:00	40	100.0000	4000.00	\N	\N	2026-07-29 05:48:29.003	\N
\.


--
-- Data for Name: HatcheryChickStock; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryChickStock" (id, "incubationBatchId", grade, "currentStock", "updatedAt") FROM stdin;
cms5nktf50071s5018l8p7sfk	cms5niyv8006ps5011d4aj0xt	A	0	2026-07-29 05:48:05.056
cms5nktfa0075s501fg78w4jr	cms5niyv8006ps5011d4aj0xt	B	0	2026-07-29 05:48:29.005
\.


--
-- Data for Name: HatcheryChickTxn; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryChickTxn" (id, "incubationBatchId", grade, type, count, date, "sourceId", note, "createdAt") FROM stdin;
cms5nktf80073s501yzd5c36w	cms5niyv8006ps5011d4aj0xt	A	PRODUCTION	50	2026-07-29 00:00:00	cms5nktf4006zs5012fkuhxbv	\N	2026-07-29 05:37:28.82
cms5nktfb0077s501b4sxagc9	cms5niyv8006ps5011d4aj0xt	B	PRODUCTION	40	2026-07-29 00:00:00	cms5nktf4006zs5012fkuhxbv	\N	2026-07-29 05:37:28.824
cms5nygch0095s501wnxgjfhy	cms5niyv8006ps5011d4aj0xt	A	SALE	-50	2026-07-29 00:00:00	cms5nygcd0093s501mpg5j52u	\N	2026-07-29 05:48:05.058
cms5nyytq009ps501dxk0kxo8	cms5niyv8006ps5011d4aj0xt	B	SALE	-40	2026-07-29 00:00:00	cms5nyytn009ns501zihl6mcx	\N	2026-07-29 05:48:29.007
\.


--
-- Data for Name: HatcheryEggMove; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggMove" (id, "incubationBatchId", "parentBatchId", "eggTypeId", count, date, "createdAt") FROM stdin;
cms5niyxf006rs501j8bsxu8u	cms5niyv8006ps5011d4aj0xt	cms5mko310037s501hyj11mzr	cms5nijeh0069s501hymbgufe	100	2026-07-29 00:00:00	2026-07-29 05:36:02.644
\.


--
-- Data for Name: HatcheryEggProduction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggProduction" (id, "batchId", date, note, "createdAt") FROM stdin;
cms5niq4a006fs501bbnzza3v	cms5mko310037s501hyj11mzr	2026-07-29 00:00:00	\N	2026-07-29 05:35:51.226
\.


--
-- Data for Name: HatcheryEggProductionLine; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggProductionLine" (id, "productionId", "eggTypeId", count) FROM stdin;
cms5niq4a006hs5016ekm6ld7	cms5niq4a006fs501bbnzza3v	cms5nijeh0069s501hymbgufe	100
\.


--
-- Data for Name: HatcheryEggSale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggSale" (id, "batchId", "eggTypeId", date, count, "unitPrice", amount, note, "createdAt", "partyId") FROM stdin;
\.


--
-- Data for Name: HatcheryEggStock; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggStock" (id, "batchId", "eggTypeId", "currentStock", "updatedAt") FROM stdin;
cms5niq4d006js501ya5um0u2	cms5mko310037s501hyj11mzr	cms5nijeh0069s501hymbgufe	0	2026-07-29 05:36:02.649
\.


--
-- Data for Name: HatcheryEggTxn; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggTxn" (id, "batchId", "eggTypeId", type, count, date, "sourceId", note, "createdAt") FROM stdin;
cms5niq4g006ls5010fman27c	cms5mko310037s501hyj11mzr	cms5nijeh0069s501hymbgufe	PRODUCTION	100	2026-07-29 00:00:00	cms5niq4a006fs501bbnzza3v	\N	2026-07-29 05:35:51.232
\.


--
-- Data for Name: HatcheryEggType; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryEggType" (id, "hatcheryOwnerId", name, "isHatchable", "createdAt", "updatedAt") FROM stdin;
cms5nijeh0069s501hymbgufe	cms4h6da00006nm01l5ckssf3	hatch	t	2026-07-29 05:35:42.522	2026-07-29 05:35:42.522
\.


--
-- Data for Name: HatcheryHatchResult; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryHatchResult" (id, "incubationBatchId", date, "hatchedA", "hatchedB", cull, "lateDead", unhatched, note, "createdAt") FROM stdin;
cms5nktf4006zs5012fkuhxbv	cms5niyv8006ps5011d4aj0xt	2026-07-29 00:00:00	50	40	0	0	8	\N	2026-07-29 05:37:28.816
\.


--
-- Data for Name: HatcheryIncubationBatch; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryIncubationBatch" (id, "hatcheryOwnerId", "parentBatchId", "hatchableEggTypeId", stage, code, name, "startDate", "eggsSetCount", "setterAt", "candledAt", "transferredAt", "hatchedAt", notes, "createdAt", "updatedAt") FROM stdin;
cms5niyv8006ps5011d4aj0xt	cms4h6da00006nm01l5ckssf3	cms5mko310037s501hyj11mzr	cms5nijeh0069s501hymbgufe	COMPLETED	IN-001	test	2026-07-29 00:00:00	100	2026-07-29 00:00:00	2026-07-29 00:00:00	2026-07-29 00:00:00	2026-07-29 00:00:00	\N	2026-07-29 05:36:02.563	2026-07-29 05:37:28.825
\.


--
-- Data for Name: HatcheryIncubationLoss; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryIncubationLoss" (id, "incubationBatchId", type, date, count, note, "createdAt") FROM stdin;
cms5nkgds006vs501oj5r9s8g	cms5niyv8006ps5011d4aj0xt	INFERTILE	2026-07-29 00:00:00	1	\N	2026-07-29 05:37:11.92
cms5nkgdt006xs501c8auz7yy	cms5niyv8006ps5011d4aj0xt	EARLY_DEAD	2026-07-29 00:00:00	1	\N	2026-07-29 05:37:11.922
\.


--
-- Data for Name: HatcheryInventoryItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryInventoryItem" (id, "hatcheryOwnerId", "itemType", name, unit, "unitPrice", "supplierKey", "currentStock", "minStock", "deletedAt", "createdAt", "updatedAt", "effectiveUnitCost") FROM stdin;
cms5mcvmv0015s501i73cjn2r	cms4h6da00006nm01l5ckssf3	FEED	b0	kg	100.0000	HATCHERY_SUPPLIER:cms5mas1y000ts501txun9fl6	100.0000	\N	\N	2026-07-29 05:03:18.823	2026-07-29 05:17:33.497	100.0000
cms5mcvmm0011s501opr2ihz6	cms4h6da00006nm01l5ckssf3	FEED	b1	kg	100.0000	HATCHERY_SUPPLIER:cms5mas1y000ts501txun9fl6	100.0000	\N	\N	2026-07-29 05:03:18.814	2026-07-29 05:03:18.82	100.0000
cms5medg8001gs501173kdr1d	cms4h6da00006nm01l5ckssf3	CHICKS	parents	birds	80.0000	HATCHERY_SUPPLIER:cms5mdt4t001bs5012otzx5yu	100.0000	\N	\N	2026-07-29 05:04:28.568	2026-07-29 05:09:22.293	72.7273
\.


--
-- Data for Name: HatcheryInventoryTxn; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryInventoryTxn" (id, "itemId", type, quantity, "unitPrice", amount, date, note, "sourceSupplierTxnId", "createdAt") FROM stdin;
cms5mcvmp0013s501mr3vv5np	cms5mcvmm0011s501opr2ihz6	PURCHASE	100.0000	100.0000	10000.00	2026-07-29 00:00:00	\N	cms5mcvma000xs501ck17wn9c	2026-07-29 05:03:18.817
cms5mcvmx0017s5017x9zsk18	cms5mcvmv0015s501i73cjn2r	PURCHASE	100.0000	100.0000	10000.00	2026-07-29 00:00:00	\N	cms5mcvma000xs501ck17wn9c	2026-07-29 05:03:18.826
cms5medg9001is501i9qd44z9	cms5medg8001gs501173kdr1d	PURCHASE	1000.0000	80.0000	80000.00	2026-07-29 00:00:00	\N	cms5medg3001ds501c9m0tcxe	2026-07-29 05:04:28.57
cms5medgb001ks501o4w6l9z7	cms5medg8001gs501173kdr1d	PURCHASE	100.0000	0.0000	0.00	2026-07-29 00:00:00	Free units received with purchase	cms5medg3001ds501c9m0tcxe	2026-07-29 05:04:28.571
cms5mfd4c001ts501xpbxj7h2	cms5mcvmv0015s501i73cjn2r	PURCHASE	1.0000	100.0000	100.00	2026-07-29 00:00:00	\N	cms5mfd44001os5013649qt0f	2026-07-29 05:05:14.797
cms5mko36003bs501j30v7klk	cms5medg8001gs501173kdr1d	USAGE	1000.0000	72.7273	72727.30	2026-07-29 00:00:00	Initial placement into batch PF-001	\N	2026-07-29 05:09:22.291
cms5mv0se003zs50120nrld7y	cms5mcvmv0015s501i73cjn2r	USAGE	1.0000	\N	\N	2026-07-29 00:00:00	\N	\N	2026-07-29 05:17:25.31
\.


--
-- Data for Name: HatcheryParentSale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryParentSale" (id, "batchId", date, count, amount, note, "createdAt", "partyId", "totalWeightKg", "avgWeightKg", "ratePerKg") FROM stdin;
\.


--
-- Data for Name: HatcheryParty; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryParty" (id, "hatcheryOwnerId", name, phone, address, "openingBalance", balance, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: HatcheryPartyPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryPartyPayment" (id, "partyId", date, amount, method, note, "createdAt") FROM stdin;
\.


--
-- Data for Name: HatcheryPartyTxn; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcheryPartyTxn" (id, "partyId", type, date, amount, "balanceAfter", "sourceType", "sourceId", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: HatcherySupplier; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcherySupplier" (id, "hatcheryOwnerId", name, contact, address, "openingBalance", balance, "createdAt", "updatedAt") FROM stdin;
cms5mdt4t001bs5012otzx5yu	cms4h6da00006nm01l5ckssf3	parent supplier	\N	\N	0.00	80000.00	2026-07-29 05:04:02.238	2026-07-29 05:04:28.566
cms5mas1y000ts501txun9fl6	cms4h6da00006nm01l5ckssf3	manakamana feed supplier	\N	\N	100.00	20100.00	2026-07-29 05:01:40.87	2026-07-29 05:05:14.792
\.


--
-- Data for Name: HatcherySupplierPurchaseItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcherySupplierPurchaseItem" (id, "txnId", "itemName", quantity, "freeQuantity", unit, "unitPrice", "totalAmount") FROM stdin;
cms5mcvmb000ys501pwceh0qa	cms5mcvma000xs501ck17wn9c	b1	100.0000	0.0000	kg	100.0000	10000.00
cms5mcvmb000zs501elp9whiv	cms5mcvma000xs501ck17wn9c	b0	100.0000	0.0000	kg	100.0000	10000.00
cms5medg3001es501l5hqf18p	cms5medg3001ds501c9m0tcxe	parents	1000.0000	100.0000	birds	80.0000	80000.00
cms5mfd44001ps501mz52onpz	cms5mfd44001os5013649qt0f	b0	1.0000	0.0000	kg	100.0000	100.00
\.


--
-- Data for Name: HatcherySupplierTxn; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."HatcherySupplierTxn" (id, "supplierId", type, amount, "balanceAfter", date, note, "purchaseCategory", "receiptImageUrl", reference, "createdAt", "updatedAt") FROM stdin;
cms5mba9c000vs5013soq61o4	cms5mas1y000ts501txun9fl6	OPENING_BALANCE	100.00	100.00	2026-07-29 00:00:00	Opening balance	\N	\N	\N	2026-07-29 05:02:04.464	2026-07-29 05:02:04.464
cms5mcvma000xs501ck17wn9c	cms5mas1y000ts501txun9fl6	PURCHASE	20000.00	20100.00	2026-07-29 00:00:00	\N	FEED	\N	\N	2026-07-29 05:03:18.803	2026-07-29 05:03:18.803
cms5mdfeh0019s501b8elrpru	cms5mas1y000ts501txun9fl6	PAYMENT	100.00	20000.00	2026-07-29 00:00:00	\N	\N	\N	\N	2026-07-29 05:03:44.441	2026-07-29 05:03:44.441
cms5medg3001ds501c9m0tcxe	cms5mdt4t001bs5012otzx5yu	PURCHASE	80000.00	80000.00	2026-07-29 00:00:00	\N	CHICKS	\N	\N	2026-07-29 05:04:28.563	2026-07-29 05:04:28.563
cms5mfd44001os5013649qt0f	cms5mas1y000ts501txun9fl6	PURCHASE	100.00	20100.00	2026-07-29 00:00:00	Reorder for b0	FEED	\N	\N	2026-07-29 05:05:14.788	2026-07-29 05:05:14.788
\.


--
-- Data for Name: InventoryItem; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."InventoryItem" (id, name, description, "currentStock", unit, "minStock", "itemType", "userId", "categoryId", "createdAt", "updatedAt", "unitPrice", "supplierKey", "deletedAt", "expiryDate", "expiryDateKey") FROM stdin;
cmol1bgd50092nq0155a9tq35	Artieveda	Purchase of Artieveda	20.00	PCS	\N	MEDICINE	cmois9yvt004knq01b2fe36fo	cmol182tw008onq01qyk3p5tw	2026-04-30 05:19:49.913	2026-04-30 05:19:49.919	920.00	DEALER:cmol1aaay008ynq01zw76e3os	\N	\N	NO_EXPIRY
cmna3uz93001zp101kjp59kik	chicks 	Purchase of chicks 	0.00	Birds	\N	CHICKS	cmn69vvcj000cqr01gg2khvs3	cmna3uz91001xp101vscc0vvs	2026-03-28 09:05:49.816	2026-03-28 09:06:43.558	105.00	DEALER:cmna3qpcz0011p1015pzp0jb3	\N	\N	NO_EXPIRY
cmna3rhmu0015p101rrna87ty	b0	Purchase of b0	0.00	KG	\N	FEED	cmn69vvcj000cqr01gg2khvs3	cmna3rhmp0013p1012h883l1n	2026-03-28 09:03:07.014	2026-03-28 09:07:11.426	75.20	DEALER:cmna3qpcz0011p1015pzp0jb3	\N	\N	NO_EXPIRY
cmna3s7wf001fp1019rvc91nv	b1	Purchase of b1	0.00	KG	\N	FEED	cmn69vvcj000cqr01gg2khvs3	cmna3rhmp0013p1012h883l1n	2026-03-28 09:03:41.055	2026-03-28 09:08:16.52	73.70	DEALER:cmna3qpcz0011p1015pzp0jb3	\N	\N	NO_EXPIRY
cmrd67oar007bpp01zsq7peau	B0 Shreegaun Sajjan ko Farm	Shreegaun Sajjan ko Farm ma	3500.00	KG	\N	FEED	cmopafd8z00b1nq01zcppx8r5	cmopam7hr00blnq01zt0nk607	2026-07-09 07:13:49.252	2026-07-09 07:18:36.343	73.85	DEALER:cmopalj4700bjnq010dbqep07	\N	\N	NO_EXPIRY
cmna3u1mu001pp1017cx1fun8	b2	Purchase of b2	0.00	KG	\N	FEED	cmn69vvcj000cqr01gg2khvs3	cmna3rhmp0013p1012h883l1n	2026-03-28 09:05:06.246	2026-03-28 09:13:03.686	72.20	DEALER:cmna3qpcz0011p1015pzp0jb3	\N	\N	NO_EXPIRY
cmqoqlmlx0060nr01pblv4bv6	Day Old Chicks layers	Purchase of Day Old Chicks layers	0.00	Birds	\N	CHICKS	cmopafd8z00b1nq01zcppx8r5	cmopatqmt00c7nq018eq7dtxs	2026-06-22 04:50:18.165	2026-06-22 04:52:50.137	150.00	DEALER:cmoqlldm900dnnq01giqfcv83	\N	\N	NO_EXPIRY
cmqxyy0ah00cmnr018hhd3s2y	Vitamin C	Purchase of Vitamin C	2.00	PCS	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:53:48.281	2026-06-28 15:53:48.285	2500.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmokzmyhv007inq01hg480tlz	Day old layers chicks	Purchase of Day old layers chicks	0.00	PCS	\N	CHICKS	cmois9yvt004knq01b2fe36fo	cmokzmyhq007gnq01ormn7ilt	2026-04-30 04:32:47.395	2026-04-30 04:33:46.779	90.00	DEALER:cmokzipv2007enq013wf9vhwj	\N	\N	NO_EXPIRY
cmq8y1dfc0029nr018pcdbygs	Lavitone H	Purchase of Lavitone H	2.80	Bottle	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:34:11.256	2026-06-28 15:54:19.613	2000.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmol12cbx0086nq01zybdmwu1	B0	Purchase of B0	1460.00	KG	\N	FEED	cmois9yvt004knq01b2fe36fo	cmol12cbt0084nq01uwr8pase	2026-04-30 05:12:44.781	2026-04-30 05:14:34.186	75.45	DEALER:cmokzthkr0080nq01yuv2nlrx	\N	\N	NO_EXPIRY
cmol182ty008qnq01mm0hnlur	CHB vaccine	Purchase of CHB vaccine	15.00	Vial	\N	MEDICINE	cmois9yvt004knq01b2fe36fo	cmol182tw008onq01qyk3p5tw	2026-04-30 05:17:12.407	2026-04-30 05:17:12.411	1885.00	DEALER:cmol15vly008mnq010dq5crcw	\N	\N	NO_EXPIRY
cmq8yt0qw002tnr0100hx7tel	CHB Vaccine	Purchase of CHB Vaccine	0.00	Vial	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:55:41.192	2026-06-28 15:45:32.265	1885.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmqxymgz400aonr01lid9czra	Bursa B2k	Purchase of Bursa B2k	0.00	Vial	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:44:50.032	2026-06-28 15:46:16.666	1300.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmq8xv79m0011nr01xvq72k11	1 day old chick	Chicks released next day 2/28	0.00	PCS	\N	CHICKS	cmopafd8z00b1nq01zcppx8r5	cmopatqmt00c7nq018eq7dtxs	2026-06-11 03:29:23.338	2026-06-11 03:58:16.625	150.00	DEALER:cmoqlldm900dnnq01giqfcv83	\N	\N	NO_EXPIRY
cmq8xzvbt001pnr01zzrgxm4i	Electrol C	Purchase of Electrol C	0.80	PCS	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-11 03:33:01.145	2026-06-11 04:02:19.259	348.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmqxyz8qa00d6nr01p15e1w97	Electrolyte	Purchase of Electrolyte	5.00	PCS	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:54:45.874	2026-06-28 15:54:45.878	350.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmqxyxc9300ccnr01rjnhsj8c	N-dox	Purchase of N-dox	0.00	PCS	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:53:17.127	2026-06-28 16:09:03.341	200.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmrd6asak007lpp01yih6uwji	B0 Ghara ko Farm	Ghara 10 no ko challa ko lagi	1500.00	KG	\N	FEED	cmopafd8z00b1nq01zcppx8r5	cmopam7hr00blnq01zt0nk607	2026-07-09 07:16:14.396	2026-07-09 07:17:33.742	73.85	DEALER:cmopalj4700bjnq010dbqep07	\N	\N	NO_EXPIRY
cmqxyvon100bsnr014m4zrii2	Paani ko Dibba set	Purchase of Paani ko Dibba set	0.00	PCS	\N	OTHER	cmopafd8z00b1nq01zcppx8r5	cmq8y1utb002hnr01cv4gwd7p	2026-06-28 15:51:59.869	2026-07-09 06:53:36.366	110.00	DEALER:cmqxyu7wy00benr01ezh57ym6	\N	\N	NO_EXPIRY
cmq8z04mx003bnr01omml3heh	Sugar	Purchase of Sugar	0.00	KG	\N	OTHER	cmopafd8z00b1nq01zcppx8r5	cmq8y1utb002hnr01cv4gwd7p	2026-06-11 04:01:12.826	2026-07-09 06:54:26.706	100.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmqxyic0o00a4nr01t07sx00o	F1 Vaccine	Purchase of F1 Vaccine	16.00	Vial	\N	MEDICINE	cmopafd8z00b1nq01zcppx8r5	cmq8xzvbp001nnr01s1e7jow2	2026-06-28 15:41:36.984	2026-07-09 07:10:33.467	218.00	DEALER:cmq8xyq1p001lnr01oeoe3y88	\N	\N	NO_EXPIRY
cmq8xxldz001dnr01w9npcnit	B0	Purchase of B0	0.00	KG	\N	FEED	cmopafd8z00b1nq01zcppx8r5	cmopam7hr00blnq01zt0nk607	2026-06-11 03:31:14.951	2026-07-09 07:22:12.33	73.85	DEALER:cmopalj4700bjnq010dbqep07	2026-07-09 07:22:12.329	\N	NO_EXPIRY
cmqoqnxnj006cnr01r8xrzbf3	B0	Purchase of B0	0.00	KG	\N	FEED	cmopafd8z00b1nq01zcppx8r5	cmopam7hr00blnq01zt0nk607	2026-06-22 04:52:05.791	2026-07-09 07:22:25.752	76.45	DEALER:cmopalj4700bjnq010dbqep07	2026-07-09 07:22:25.751	\N	NO_EXPIRY
\.


--
-- Data for Name: InventoryTransaction; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."InventoryTransaction" (id, type, quantity, "unitPrice", "totalAmount", date, description, "itemId", "createdAt", "updatedAt", unit, "expiryDate") FROM stdin;
cmna3rhmy0019p101yytafeuc	PURCHASE	150.00	75.20	11280.00	2026-03-28 00:00:00	Purchase from supplier	cmna3rhmu0015p101rrna87ty	2026-03-28 09:03:07.019	2026-03-28 09:03:07.019	\N	\N
cmna3s7wl001jp101jb51fs9u	PURCHASE	425.00	73.70	31322.50	2026-03-28 00:00:00	Purchase from supplier	cmna3s7wf001fp1019rvc91nv	2026-03-28 09:03:41.061	2026-03-28 09:03:41.061	\N	\N
cmna3u1n1001tp101cckyed2p	PURCHASE	912.00	72.20	65846.40	2026-03-28 00:00:00	Purchase from supplier	cmna3u1mu001pp1017cx1fun8	2026-03-28 09:05:06.253	2026-03-28 09:05:06.253	\N	\N
cmna3uz960023p101o0xom4sj	PURCHASE	400.00	105.00	42000.00	2026-03-28 00:00:00	Purchase from supplier	cmna3uz93001zp101kjp59kik	2026-03-28 09:05:49.818	2026-03-28 09:05:49.818	\N	\N
cmna3uz970025p101xauazcum	PURCHASE	8.00	0.00	0.00	2026-03-28 00:00:00	Free units received with purchase	cmna3uz93001zp101kjp59kik	2026-03-28 09:05:49.819	2026-03-28 09:05:49.819	\N	\N
cmna3w4pz002hp101o2pavjnp	USAGE	408.00	102.94	42000.00	2026-03-28 09:06:43.559	Chicks allocated to batch Chaitra-14-Khor 2-14-51-33	cmna3uz93001zp101kjp59kik	2026-03-28 09:06:43.56	2026-03-28 09:06:43.56	\N	\N
cmna3wq82002zp101jyd1x2me	USAGE	150.00	75.20	11280.00	2026-03-28 00:00:00	Usage recorded for cmna3pmm8000hp101rcyp5gug - Batch cmna3w4pp002bp101wgv90tfx	cmna3rhmu0015p101rrna87ty	2026-03-28 09:07:11.427	2026-03-28 09:07:11.427	\N	\N
cmna3y4g90039p1018xlfznxl	USAGE	425.00	73.70	31322.50	2026-03-28 00:00:00	Usage recorded for cmna3pmm8000hp101rcyp5gug - Batch cmna3w4pp002bp101wgv90tfx	cmna3s7wf001fp1019rvc91nv	2026-03-28 09:08:16.521	2026-03-28 09:08:16.521	\N	\N
cmna3ye4t003hp101uod3v24f	USAGE	912.00	72.20	65846.40	2026-03-28 00:00:00	Usage recorded for cmna3pmm8000hp101rcyp5gug - Batch cmna3w4pp002bp101wgv90tfx	cmna3u1mu001pp1017cx1fun8	2026-03-28 09:08:29.07	2026-03-28 09:08:29.07	\N	\N
cmna43zio003rp10153yiy8yo	PURCHASE	150.00	72.20	10830.00	2026-03-28 00:00:00	Purchase from supplier	cmna3u1mu001pp1017cx1fun8	2026-03-28 09:12:50.064	2026-03-28 09:12:50.064	\N	\N
cmna44a130045p101u78iov5x	USAGE	150.00	72.20	10830.00	2026-03-28 00:00:00	Usage recorded for cmna3pmm8000hp101rcyp5gug - Batch cmna3w4pp002bp101wgv90tfx	cmna3u1mu001pp1017cx1fun8	2026-03-28 09:13:03.688	2026-03-28 09:13:03.688	\N	\N
cmokzmyi1007mnq01wvckvmiv	PURCHASE	15697.00	90.00	1412730.00	2025-05-07 00:00:00	Purchase from supplier	cmokzmyhv007inq01hg480tlz	2026-04-30 04:32:47.401	2026-04-30 04:32:47.401	\N	\N
cmokzmyi5007onq01ws1gmfeq	PURCHASE	313.00	0.00	0.00	2025-05-07 00:00:00	Free units received with purchase	cmokzmyhv007inq01hg480tlz	2026-04-30 04:32:47.405	2026-04-30 04:32:47.405	\N	\N
cmokzo8bg007ynq01jbqb3f73	USAGE	16010.00	88.24	1412730.00	2026-04-30 04:33:46.78	Chicks allocated to batch Baisakh-25-Ghara 8,9,13,14,15,16	cmokzmyhv007inq01hg480tlz	2026-04-30 04:33:46.781	2026-04-30 04:33:46.781	\N	\N
cmol12cc2008anq0107zu6o99	PURCHASE	1500.00	75.45	113175.00	2025-05-08 00:00:00	Purchase from supplier	cmol12cbx0086nq01zybdmwu1	2026-04-30 05:12:44.786	2026-04-30 05:12:44.786	\N	\N
cmol14or0008knq01pqgh4tgd	USAGE	40.00	75.45	3018.00	2025-05-08 00:00:00	Usage recorded for cmoiscw9h004xnq01otk5h1pv - Batch cmokzo8b9007snq01s81y159n	cmol12cbx0086nq01zybdmwu1	2026-04-30 05:14:34.188	2026-04-30 05:14:34.188	\N	\N
cmol182u2008unq01m4owwofz	PURCHASE	15.00	1885.00	28275.00	2024-10-29 00:00:00	Purchase from supplier	cmol182ty008qnq01mm0hnlur	2026-04-30 05:17:12.41	2026-04-30 05:17:12.41	\N	\N
cmol1bgd90096nq01g0u32xhc	PURCHASE	20.00	920.00	18400.00	2025-05-08 00:00:00	Purchase from supplier	cmol1bgd50092nq0155a9tq35	2026-04-30 05:19:49.917	2026-04-30 05:19:49.917	\N	\N
cmq8xv79r0015nr01cqfxc1qk	PURCHASE	9279.00	150.00	1391850.00	2026-06-10 00:00:00	Purchase from supplier	cmq8xv79m0011nr01xvq72k11	2026-06-11 03:29:23.344	2026-06-11 03:29:23.344	\N	\N
cmq8xv79t0017nr01ej8803p5	PURCHASE	185.00	0.00	0.00	2026-06-10 00:00:00	Free units received with purchase	cmq8xv79m0011nr01xvq72k11	2026-06-11 03:29:23.345	2026-06-11 03:29:23.345	\N	\N
cmq8xzvbx001tnr01i6n4b2jg	PURCHASE	1.00	348.00	348.00	2026-06-11 00:00:00	Purchase from supplier	cmq8xzvbt001pnr01zzrgxm4i	2026-06-11 03:33:01.149	2026-06-11 03:33:01.149	\N	\N
cmq8y1dfi002dnr01bb0etk9z	PURCHASE	1.00	2000.00	2000.00	2026-06-11 00:00:00	Purchase from supplier	cmq8y1dfc0029nr018pcdbygs	2026-06-11 03:34:11.262	2026-06-11 03:34:11.262	\N	\N
cmq8yt0r2002xnr01h7olka0a	PURCHASE	10.00	1885.00	18850.00	2026-06-10 00:00:00	Purchase from supplier	cmq8yt0qw002tnr0100hx7tel	2026-06-11 03:55:41.198	2026-06-11 03:55:41.198	\N	\N
cmq8ywcoh0037nr017xwz2u66	USAGE	9464.00	147.07	1391850.00	2026-06-11 03:58:16.625	Chicks allocated to batch Jestha-28-Sundabari 10 No.	cmq8xv79m0011nr01xvq72k11	2026-06-11 03:58:16.626	2026-06-11 03:58:16.626	\N	\N
cmq8z04n2003fnr0156c7xlto	PURCHASE	8.00	100.00	800.00	2026-06-11 00:00:00	Purchase from supplier	cmq8z04mx003bnr01omml3heh	2026-06-11 04:01:12.83	2026-06-11 04:01:12.83	\N	\N
cmq8z0pca003nnr01486n5tcc	USAGE	8.00	100.00	800.00	2026-06-11 00:00:00	Usage recorded for cmq8xtm4v000xnr01buxfymht - Batch cmq8ywcoa0031nr01lqp2d0n8	cmq8z04mx003bnr01omml3heh	2026-06-11 04:01:39.658	2026-06-11 04:01:39.658	\N	\N
cmq8z1jwd003tnr01j0v8fxud	USAGE	0.20	348.00	69.60	2026-06-11 00:00:00	Usage recorded for cmq8xtm4v000xnr01buxfymht - Batch cmq8ywcoa0031nr01lqp2d0n8	cmq8xzvbt001pnr01zzrgxm4i	2026-06-11 04:02:19.261	2026-06-11 04:02:19.261	\N	\N
cmq8z22p0003znr012zfms4kf	USAGE	0.20	2000.00	400.00	2026-06-11 00:00:00	Usage recorded for cmq8xtm4v000xnr01buxfymht - Batch cmq8ywcoa0031nr01lqp2d0n8	cmq8y1dfc0029nr018pcdbygs	2026-06-11 04:02:43.62	2026-06-11 04:02:43.62	\N	\N
cmq9liurh0045nr0138ugmm1z	USAGE	9.00	1885.00	16965.00	2026-06-11 00:00:00	Usage recorded for cmq8xtm4v000xnr01buxfymht - Batch cmq8ywcoa0031nr01lqp2d0n8	cmq8yt0qw002tnr0100hx7tel	2026-06-11 14:31:38.045	2026-06-11 14:31:38.045	\N	\N
cmqoqlmm30064nr01moycsxaw	PURCHASE	16808.00	150.00	2521200.00	2026-06-17 00:00:00	Purchase from supplier	cmqoqlmlx0060nr01pblv4bv6	2026-06-22 04:50:18.171	2026-06-22 04:50:18.171	\N	\N
cmqoqlmm40066nr01un0ngwv9	PURCHASE	336.00	0.00	0.00	2026-06-17 00:00:00	Free units received with purchase	cmqoqlmlx0060nr01pblv4bv6	2026-06-22 04:50:18.173	2026-06-22 04:50:18.173	\N	\N
cmqoqovvf006qnr01bksompcs	USAGE	17144.00	147.06	2521200.00	2026-06-22 04:52:50.138	Chicks allocated to batch Ashadh-4-Shreegaun 1 No.-10-37-37	cmqoqlmlx0060nr01pblv4bv6	2026-06-22 04:52:50.139	2026-06-22 04:52:50.139	\N	\N
cmqxy8uae007qnr01m2ifetsr	USAGE	50.00	76.45	3822.50	2026-06-18 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:34:14.103	2026-06-28 15:34:14.103	\N	\N
cmqxy9a01007ynr015xv08tmy	USAGE	100.00	76.45	7645.00	2026-06-19 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:34:34.465	2026-06-28 15:34:34.465	\N	\N
cmqxy9j9l0086nr01lbv97y6k	USAGE	108.00	76.45	8256.60	2026-06-20 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:34:46.473	2026-06-28 15:34:46.473	\N	\N
cmqxy9w4g008enr01hpcde6n5	USAGE	120.00	76.45	9174.00	2026-06-21 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:35:03.136	2026-06-28 15:35:03.136	\N	\N
cmqxya8mm008mnr01xjcn26xm	USAGE	120.00	76.45	9174.00	2026-06-22 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:35:19.342	2026-06-28 15:35:19.342	\N	\N
cmqxyajhr008unr01s9r5sh5u	USAGE	150.00	76.45	11467.50	2026-06-23 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:35:33.423	2026-06-28 15:35:33.423	\N	\N
cmqxyay4s0092nr01z9hsznyz	USAGE	149.00	76.45	11391.05	2026-06-24 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:35:52.397	2026-06-28 15:35:52.397	\N	\N
cmqxybd9y009anr011wwbb9ov	USAGE	150.00	76.45	11467.50	2026-06-25 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:36:12.023	2026-06-28 15:36:12.023	\N	\N
cmqxybokm009inr01dsze6p29	USAGE	190.00	76.45	14525.50	2026-06-26 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:36:26.662	2026-06-28 15:36:26.662	\N	\N
cmqxyc2af009qnr0192pzt7jn	USAGE	200.00	76.45	15290.00	2026-06-27 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqoqnxnj006cnr01r8xrzbf3	2026-06-28 15:36:44.439	2026-06-28 15:36:44.439	\N	\N
cmqxyic0s00a8nr01re8k2i7f	PURCHASE	16.00	218.00	3488.00	2026-06-22 00:00:00	Purchase from supplier	cmqxyic0o00a4nr01t07sx00o	2026-06-28 15:41:36.989	2026-06-28 15:41:36.989	\N	\N
cmqxykgij00ainr01ednhbueh	PURCHASE	16.00	1885.00	30160.00	2026-06-18 00:00:00	Purchase from supplier	cmq8yt0qw002tnr0100hx7tel	2026-06-28 15:43:16.123	2026-06-28 15:43:16.123	\N	\N
cmqxymgzb00asnr018yfnwgr8	PURCHASE	17.00	1300.00	22100.00	2026-06-27 00:00:00	Purchase from supplier	cmqxymgz400aonr01lid9czra	2026-06-28 15:44:50.04	2026-06-28 15:44:50.04	\N	\N
cmqxyndka00b0nr01g28qe90b	USAGE	17.00	1885.00	32045.00	2026-06-18 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmq8yt0qw002tnr0100hx7tel	2026-06-28 15:45:32.266	2026-06-28 15:45:32.266	\N	\N
cmqxynzyw00b6nr01hnm8ai9s	USAGE	16.00	218.00	3488.00	2026-06-22 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqxyic0o00a4nr01t07sx00o	2026-06-28 15:46:01.304	2026-06-28 15:46:01.304	\N	\N
cmqxyobtn00bcnr01vtxs4a9o	USAGE	17.00	1300.00	22100.00	2026-06-28 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqxymgz400aonr01lid9czra	2026-06-28 15:46:16.668	2026-06-28 15:46:16.668	\N	\N
cmqxyxc9500cgnr01ur5o3f9v	PURCHASE	24.00	200.00	4800.00	2026-06-18 00:00:00	Purchase from supplier	cmqxyxc9300ccnr01rjnhsj8c	2026-06-28 15:53:17.13	2026-06-28 15:53:17.13	\N	\N
cmqxyy0aj00cqnr01frxy8fmc	PURCHASE	2.00	2500.00	5000.00	2026-06-18 00:00:00	Purchase from supplier	cmqxyy0ah00cmnr018hhd3s2y	2026-06-28 15:53:48.284	2026-06-28 15:53:48.284	\N	\N
cmqxyyogr00d0nr01nuun2ggu	PURCHASE	2.00	2000.00	4000.00	2026-06-28 00:00:00	Purchase from supplier	cmq8y1dfc0029nr018pcdbygs	2026-06-28 15:54:19.611	2026-06-28 15:54:19.611	\N	\N
cmqxyz8qd00danr01w5nn2cm6	PURCHASE	5.00	350.00	1750.00	2026-06-28 00:00:00	Purchase from supplier	cmqxyz8qa00d6nr01p15e1w97	2026-06-28 15:54:45.877	2026-06-28 15:54:45.877	\N	\N
cmqxzhmcv00e2nr015vbqf1bi	USAGE	24.00	200.00	4800.00	2026-06-18 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqxyxc9300ccnr01rjnhsj8c	2026-06-28 16:09:03.344	2026-06-28 16:09:03.344	\N	\N
cmr7y9s9n0072sc013jv66f7e	USAGE	50.00	73.85	3692.50	2026-07-05 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmq8xxldz001dnr01w9npcnit	2026-07-05 15:32:39.9	2026-07-05 15:32:39.9	\N	\N
cmrd5em7h0069pp01xrn00fx5	USAGE	150.00	110.00	16500.00	2026-06-18 00:00:00	Usage recorded for cmqoqe8xw005wnr01tk7xiryj - Batch cmqoqovv6006knr01xd118ek9	cmqxyvon100bsnr014m4zrii2	2026-07-09 06:51:13.518	2026-07-09 06:51:13.518	\N	\N
cmrd67oav007fpp01hnqn44cr	PURCHASE	1500.00	73.85	110775.00	2026-06-25 00:00:00	Purchase from supplier	cmrd67oar007bpp01zsq7peau	2026-07-09 07:13:49.256	2026-07-09 07:13:49.256	\N	\N
cmrd6bvo1007zpp01261ta3zi	PURCHASE	1500.00	73.85	110775.00	2026-06-10 00:00:00	Purchase from supplier	cmrd6asak007lpp01yih6uwji	2026-07-09 07:17:05.426	2026-07-09 07:17:05.426	\N	\N
cmrd6dtti0089pp011e4x3kgl	PURCHASE	2000.00	73.85	147700.00	2026-06-18 00:00:00	Purchase from supplier	cmrd67oar007bpp01zsq7peau	2026-07-09 07:18:36.342	2026-07-09 07:18:36.342	\N	\N
\.


--
-- Data for Name: InventoryUsage; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."InventoryUsage" (id, date, quantity, "unitPrice", "totalAmount", notes, "itemId", "expenseId", "batchId", "farmId", "createdAt", "updatedAt") FROM stdin;
cmna3w4pt002dp101a0h0pvn4	2026-03-28 09:06:43.552	408.00	102.94	42000.00	Allocated to batch Chaitra-14-Khor 2-14-51-33	cmna3uz93001zp101kjp59kik	\N	cmna3w4pp002bp101wgv90tfx	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:06:43.553	2026-03-28 09:06:43.553
cmna3wq7y002vp1011w25rakn	2026-03-28 00:00:00	150.00	75.20	11280.00	Expense - Feed: b0	cmna3rhmu0015p101rrna87ty	cmna3wq7w002tp101ojfktg36	cmna3w4pp002bp101wgv90tfx	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:07:11.422	2026-03-28 09:07:11.422
cmna3y4g50035p1014gwz9vlx	2026-03-28 00:00:00	425.00	73.70	31322.50	Expense - Feed: b1	cmna3s7wf001fp1019rvc91nv	cmna3y4g30033p101g1xnhhfr	cmna3w4pp002bp101wgv90tfx	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:08:16.517	2026-03-28 09:08:16.517
cmna3ye4n003dp101nwt44ech	2026-03-28 00:00:00	912.00	72.20	65846.40	Expense - Feed: b2	cmna3u1mu001pp1017cx1fun8	cmna3ye4l003bp101efq5o0oa	cmna3w4pp002bp101wgv90tfx	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:08:29.064	2026-03-28 09:08:29.064
cmna44a0x0041p101wfzidtff	2026-03-28 00:00:00	150.00	72.20	10830.00	Expense - Feed: b2	cmna3u1mu001pp1017cx1fun8	cmna44a0v003zp1010f3o6kz7	cmna3w4pp002bp101wgv90tfx	cmna3pmm8000hp101rcyp5gug	2026-03-28 09:13:03.682	2026-03-28 09:13:03.682
cmokzo8bc007unq01ruqaoiq2	2026-04-30 04:33:46.775	16010.00	88.24	1412730.00	Allocated to batch Baisakh-25-Ghara 8,9,13,14,15,16	cmokzmyhv007inq01hg480tlz	\N	cmokzo8b9007snq01s81y159n	cmoiscw9h004xnq01otk5h1pv	2026-04-30 04:33:46.776	2026-04-30 04:33:46.776
cmol14oqt008gnq01j7osjm5r	2025-05-08 00:00:00	40.00	75.45	3018.00	B0 -  - Feed: B0	cmol12cbx0086nq01zybdmwu1	cmol14oqq008enq014fjti3da	cmokzo8b9007snq01s81y159n	cmoiscw9h004xnq01otk5h1pv	2026-04-30 05:14:34.181	2026-04-30 05:14:34.181
cmq8ywcod0033nr01jc0fww0e	2026-06-11 03:58:16.621	9464.00	147.07	1391850.00	Allocated to batch Jestha-28-Sundabari 10 No.	cmq8xv79m0011nr01xvq72k11	\N	cmq8ywcoa0031nr01lqp2d0n8	cmq8xtm4v000xnr01buxfymht	2026-06-11 03:58:16.622	2026-06-11 03:58:16.622
cmq8z0pc7003lnr01z9pdwwma	2026-06-11 00:00:00	8.00	100.00	800.00	Expense - Other: Sugar	cmq8z04mx003bnr01omml3heh	cmq8z0pc5003jnr01zdfznr8p	cmq8ywcoa0031nr01lqp2d0n8	cmq8xtm4v000xnr01buxfymht	2026-06-11 04:01:39.655	2026-06-11 04:01:39.655
cmq8z1jw9003rnr01tydactot	2026-06-11 00:00:00	0.20	348.00	69.60	Expense - Medicine: Electrol C	cmq8xzvbt001pnr01zzrgxm4i	cmq8z1jw6003pnr01j1kln9tl	cmq8ywcoa0031nr01lqp2d0n8	cmq8xtm4v000xnr01buxfymht	2026-06-11 04:02:19.257	2026-06-11 04:02:19.257
cmq8z22ox003xnr019jgitlqd	2026-06-11 00:00:00	0.20	2000.00	400.00	Expense - Medicine: Lavitone H	cmq8y1dfc0029nr018pcdbygs	cmq8z22ov003vnr01gy5p72gv	cmq8ywcoa0031nr01lqp2d0n8	cmq8xtm4v000xnr01buxfymht	2026-06-11 04:02:43.617	2026-06-11 04:02:43.617
cmq9liurc0043nr01qbz1xn4g	2026-06-11 00:00:00	9.00	1885.00	16965.00	Expense - Medicine: CHB Vaccine	cmq8yt0qw002tnr0100hx7tel	cmq9liur90041nr01zvdrj25s	cmq8ywcoa0031nr01lqp2d0n8	cmq8xtm4v000xnr01buxfymht	2026-06-11 14:31:38.041	2026-06-11 14:31:38.041
cmqoqovv9006mnr010xfwiu1y	2026-06-22 04:52:50.133	17144.00	147.06	2521200.00	Allocated to batch Ashadh-4-Shreegaun 1 No.-10-37-37	cmqoqlmlx0060nr01pblv4bv6	\N	cmqoqovv6006knr01xd118ek9	cmqoqe8xw005wnr01tk7xiryj	2026-06-22 04:52:50.133	2026-06-22 04:52:50.133
cmqxyndk600aynr019ftdsaep	2026-06-18 00:00:00	17.00	1885.00	32045.00	Expense - Medicine: CHB Vaccine	cmq8yt0qw002tnr0100hx7tel	cmqxyndk400awnr01bi84zzun	cmqoqovv6006knr01xd118ek9	cmqoqe8xw005wnr01tk7xiryj	2026-06-28 15:45:32.263	2026-06-28 15:45:32.263
cmqxyobtk00banr01k0z4orft	2026-06-28 00:00:00	17.00	1300.00	22100.00	Expense - Medicine: Bursa B2k	cmqxymgz400aonr01lid9czra	cmqxyobth00b8nr01b1w49oar	cmqoqovv6006knr01xd118ek9	cmqoqe8xw005wnr01tk7xiryj	2026-06-28 15:46:16.664	2026-06-28 15:46:16.664
cmqxzhmcq00e0nr01uuzx8k8x	2026-06-18 00:00:00	24.00	200.00	4800.00	Expense - Medicine: N-dox	cmqxyxc9300ccnr01rjnhsj8c	cmqxzhmcn00dynr01i843lt7i	cmqoqovv6006knr01xd118ek9	cmqoqe8xw005wnr01tk7xiryj	2026-06-28 16:09:03.338	2026-06-28 16:09:03.338
\.


--
-- Data for Name: LandingContact; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."LandingContact" (id, "firstName", "lastName", email, phone, "farmType", message, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LandingReview; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."LandingReview" (id, name, business, address, "phoneNumber", stars, review, "createdAt", "updatedAt") FROM stdin;
cmqameprc005dnr019brp7vzs	Mankamana Feed Supplier	Feed Dealer	Lamahi, Dang Deukhuri lamahi	9857831027	5	The FCR evaluation and inventory management modules gave us better visibility into feed consumption and stock levels. This software has become an essential part of our farm operations.	2026-06-12 07:44:10.728	2026-06-12 07:44:10.728
cmqamfnfq005enr015kinfxgq	Ram Poultry Farm	Poultry	Chitwan	9809781909	5	हामीले यो सफ्टवेयर प्रयोग गर्न थालेपछि फार्म व्यवस्थापन धेरै व्यवस्थित भएको छ	2026-06-12 07:44:54.375	2026-06-12 07:44:54.375
cmqamgx17005fnr016lqzhdhc	Sharad Poudel	New Lumbini Hatchery	Dang	9	5	Chick grading and sales management are now much more organized. We have significantly reduced manual errors	2026-06-12 07:45:53.467	2026-06-12 07:45:53.467
cmqamih7b005gnr011fxcpfux	Bharat Sharma	लक्ष्मी लेयर फार्म,	लक्ष्मी लेयर फार्म, दाङ	08545866043	5	पहिले अण्डा उत्पादनको रेकर्ड कापीमा राख्थ्यौं, धेरै समय लाग्थ्यो। अहिले Poultry360 ले सबै हिसाब एकै ठाउँमा राखिदिन्छ। Egg production tracking र expense management फिचर निकै उपयोगी छ।	2026-06-12 07:47:06.263	2026-06-12 07:47:06.263
cmqamk7hz005hnr01g0v2yjrz	Pawan Neupane	Everest Poultry	Tulsipur	08545866043	5	Since using Poultry360, tracking daily egg production has become effortless. The batch management and mortality tracking features have helped us identify issues early and improve profitability. Highly recommended for layer farms.	2026-06-12 07:48:27	2026-06-12 07:48:27
\.


--
-- Data for Name: ListForSale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."ListForSale" (id, "userId", "companyName", category, phone, rate, quantity, unit, "availabilityFrom", "availabilityTo", "avgWeightKg", "eggVariants", "typeVariants", status, "createdAt", "updatedAt", address, province, latitude, longitude) FROM stdin;
cmru9064u0001mm01c21vqlba	cmn69vvcj000cqr01gg2khvs3	Home Poultry Farm	CHICKEN	9809781908	\N	100.00	kg	2026-07-21 00:00:00	2026-07-28 00:00:00	2.00	null	null	ARCHIVED	2026-07-21 06:04:02.958	2026-07-21 07:28:30.397	Nirwachan Chowk, Lokanthali, Madhyapur Thimi-01, Madhyapur Thimi, Madhyapur Thimi Municipality, Bhaktapur, Bagamati Province, 44810, Nepal	Bagamati Province	27.6727971	85.3564089
cmrue3pnk0007nu01837vfjvy	cmn69vvcj000cqr01gg2khvs3	Home Poultry Farm	CHICKEN	123456789	\N	11.00	kg	2026-07-21 00:00:00	2026-07-28 00:00:00	2.00	null	null	ACTIVE	2026-07-21 08:26:46.304	2026-07-21 08:26:46.304	Family Dental Wellbeing, Gandnayak Marg, Jadibuti, Koteshwar, Kathmandu-32, Kathmandu Metropolitan City, Kathmandu, Bagamati Province, 44810, Nepal	Bagmati Province	27.6730125	85.3548762
\.


--
-- Data for Name: MedicineSupplier; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."MedicineSupplier" (id, name, contact, address, "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Message; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Message" (id, "conversationId", "senderId", text, "messageType", "createdAt", read, edited, "isDeleted", "attachmentUrl", "attachmentKey", "fileName", "contentType", "fileSize", "durationMs", width, height, "thumbnailUrl", "batchShareId") FROM stdin;
\.


--
-- Data for Name: Mortality; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Mortality" (id, date, count, reason, "saleId", "batchId", "createdAt", "updatedAt") FROM stdin;
cmna4cblv004fp101la2ymllo	2026-03-28 00:00:00	62	Natural Death	\N	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:19:18.979	2026-03-28 09:19:18.979
cmna4oyax0051p101xjgnqgpk	2026-03-28 00:00:00	9	Natural Death	\N	cmna3w4pp002bp101wgv90tfx	2026-03-28 09:29:08.266	2026-03-28 09:29:08.266
cmqc3m3yg005rnr01j1qitr94	2026-06-11 00:00:00	3	Natural Death	\N	cmq8ywcoa0031nr01lqp2d0n8	2026-06-13 08:33:35.368	2026-06-13 08:33:35.368
cmqc3mb90005tnr01hax84ejp	2026-06-12 00:00:00	3	Natural Death	\N	cmq8ywcoa0031nr01lqp2d0n8	2026-06-13 08:33:44.821	2026-06-13 08:33:44.821
cmqxy2qnv0070nr01jcwaoo2q	2026-06-18 00:00:00	1050	Heat stress	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:29:29.467	2026-06-28 15:29:29.467
cmqxy3r9k0072nr01b4xblz57	2026-06-19 00:00:00	165	Culled ones from yesterday stressed ones	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:30:16.905	2026-06-28 15:30:16.905
cmqxy4bvp0074nr01a5zesyp8	2026-06-20 00:00:00	21	culled ones	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:30:43.621	2026-06-28 15:30:43.621
cmqxy4ttt0076nr01ds55vxxa	2026-06-21 00:00:00	14	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:31:06.881	2026-06-28 15:31:06.881
cmqxy57940078nr0155u9ig1l	2026-06-22 00:00:00	21	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:31:24.281	2026-06-28 15:31:24.281
cmqxy5jjg007anr01vjbumhaz	2026-06-23 00:00:00	15	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:31:40.204	2026-06-28 15:31:40.204
cmqxy657n007cnr010buj97dn	2026-06-24 00:00:00	10	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:32:08.291	2026-06-28 15:32:08.291
cmqxy6vb9007enr01hjwusm6v	2026-06-25 00:00:00	12	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:32:42.118	2026-06-28 15:32:42.118
cmqxy741h007gnr01s3eh3ka5	2026-06-26 00:00:00	2	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:32:53.429	2026-06-28 15:32:53.429
cmqxy7g4d007inr01t0hj9h3z	2026-06-27 00:00:00	8	Natural Death	\N	cmqoqovv6006knr01xd118ek9	2026-06-28 15:33:09.085	2026-06-28 15:33:09.085
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Notification" (id, "userId", type, title, body, data, status, "createdAt", "readAt") FROM stdin;
\.


--
-- Data for Name: PasswordResetOtp; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."PasswordResetOtp" (id, phone, otp, used, "expiresAt", "createdAt") FROM stdin;
cmr7b4tjh000so1014jxxsbx2	+9779840404600	718913	t	2026-07-05 05:14:57.101	2026-07-05 04:44:57.102
cmr7bb59k0017o101an8e5g8q	+9779860072989	395989	t	2026-07-05 05:19:52.232	2026-07-05 04:49:52.232
cmr7vp1bx0064sc01i25biaex	+9779840404600	689555	t	2026-07-05 14:50:32.636	2026-07-05 14:20:32.637
cmr7vxb6l0065sc01ldddajnp	+9779840404600	982074	t	2026-07-05 14:56:58.653	2026-07-05 14:26:58.654
cmr7y2bj4006gsc01qflxi5t7	+9779840404600	572320	t	2026-07-05 15:56:51.616	2026-07-05 15:26:51.616
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Product" (id, name, description, type, unit, "unitSellingPrice", "unitCostPrice", quantity, "currentStock", "totalPrice", "imageUrl", "supplierId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductUnitConversion; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."ProductUnitConversion" (id, "unitName", "conversionFactor", "productId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductionInput; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."ProductionInput" (id, quantity, "productionId", "rawMaterialId", "createdAt", "unitPrice", "supplierId") FROM stdin;
\.


--
-- Data for Name: ProductionOutput; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."ProductionOutput" (id, "productName", quantity, unit, "productionId", "productId", "createdAt") FROM stdin;
\.


--
-- Data for Name: ProductionRun; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."ProductionRun" (id, date, "referenceNumber", notes, "companyId", "createdById", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PushSubscription; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."PushSubscription" (id, "userId", endpoint, p256dh, auth, "userAgent", "createdAt", "revokedAt") FROM stdin;
cmnu9132v0031nq0167340tt7	cmn5vqd690000o423r4uqfvzn	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-04-11 11:25:56.311	\N
cmna3n7sr0007p101ztkszz8l	cmn69vvcj000cqr01gg2khvs3	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-03-28 08:59:47.644	\N
cmna0pia60001p101ygbc6lsx	cmn5w474v0000o401qj8mx3bp	https://fcm.googleapis.com/fcm/send/cNb6P6gLB8k:APA91bEgeIazV-WiwtWqIwKnohTpRMQJmv7xRdF2nyoWWtnuNc0-tkvFI8i5E7kTZUeuI7-JCev_SPWf-OojHX-vpht1hpGDIHQ26mn81enMxNbN7E3hD7OSByQbdr__YotH06umF-QH	BFr-irloaV4STNfVzBtIm9709IXTFJvjC0Cs_y5FImQAg33Lyq13UaXWDvZrsiWl3tcvHtyMioim2kjgtGt2HYA	oN3lTdDf-f2FGgkFUc0Gjw	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36	2026-03-28 07:37:35.694	\N
cmne80pqn00fqlk015m5zl0wn	cmn5w474v0000o401qj8mx3bp	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-03-31 06:13:20.592	\N
cmr7hi1vl0007sc01ccas96rm	cmopafd8z00b1nq01zcppx8r5	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-07-05 07:43:12.13	\N
cms3cp2ut0010my01uh3gy948	cms3cp2f5000wmy01vfs59bcr	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-07-27 14:57:19.542	\N
cms655fxk0002mu016n080h52	cms655fb60000mu01s0hrv1tx	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-07-29 13:49:24.584	\N
cms5yh81d004sqm01irph1kpy	cms5yh7jt004qqm01vuu1rojb	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-07-29 10:42:36.913	\N
cms4h6dt0000anm013sudvmup	cms4h6da00006nm01l5ckssf3	https://fcm.googleapis.com/fcm/send/dtzGpCQ7_RQ:APA91bGlGhT0nLlSWCT2l08PUT5E9doyViAp0xdh4_AiWzNWUqR58oK0WnhR4WCPlcoPy42clofFuEyJiBpOJa2V3E0zfYibsRCbnahKYs77qCV74zexFnafqVKls8YgfXUtHV8kTOQr	BGhd8yTsEXI_BDjt7bD-uyWB464m5VLofDt3HWM1ptEgHSBWpwEqKoJ83aD0dFBDyQl6cQBH4Hj7Rj0qOcZ6Nic	CTMXS5UVSKE2d01cg8s0HA	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	2026-07-28 09:50:31.524	\N
\.


--
-- Data for Name: RawMaterial; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."RawMaterial" (id, name, unit, "currentStock", "companyId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Reminder; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Reminder" (id, "userId", title, "reminderDate", "isNoticed", "farmId", "batchId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Sale" (id, date, amount, quantity, weight, "unitPrice", description, "itemType", "isCredit", "paidAmount", "dueAmount", "farmId", "batchId", "categoryId", "customerId", "mortalityId", "createdAt", "updatedAt", "eggTypeId", "invoiceNumber") FROM stdin;
\.


--
-- Data for Name: SaleDiscount; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."SaleDiscount" (id, type, value, scope, "dealerSaleId", "companySaleId", "createdAt") FROM stdin;
\.


--
-- Data for Name: SaleEggLine; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."SaleEggLine" (id, "saleId", "eggTypeId", quantity, "unitPrice") FROM stdin;
\.


--
-- Data for Name: SalePayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."SalePayment" (id, amount, date, description, "receiptUrl", "saleId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Staff" (id, "ownerId", name, "startDate", "endDate", status, "createdAt", "updatedAt") FROM stdin;
cmnbmoxu20041lk01317ra3a3	cmnbm2tdx001hlk01lewrwu1c	Dinesh chaudhary	2020-07-16 00:00:00	2026-03-29 10:48:14.787	STOPPED	2026-03-29 10:40:46.922	2026-03-29 10:48:14.788
cmopagrm100bdnq01p9we1cii	cmopafd8z00b1nq01zcppx8r5	Chudamani Adhikari	2026-04-14 00:00:00	2026-06-11 03:38:31.933	STOPPED	2026-05-03 04:46:59.017	2026-06-11 03:38:31.934
cmqxxt0ye006wnr01pehq6rwp	cmopafd8z00b1nq01zcppx8r5	Bam Bahadur Kumal	2026-06-15 00:00:00	2026-07-05 15:52:14.572	STOPPED	2026-06-28 15:21:56.247	2026-07-05 15:52:14.573
cms4g39j40097th0128d4gflf	cms3cp2f5000wmy01vfs59bcr	with balance stopped one	2026-07-17 00:00:00	2026-07-28 09:20:13.965	STOPPED	2026-07-28 09:20:06.4	2026-07-28 09:20:13.966
cms4fiw4f0089th01iavwtix4	cms3cp2f5000wmy01vfs59bcr	ram	2026-07-17 00:00:00	2026-07-28 09:04:26.659	ARCHIVED	2026-07-28 09:04:15.904	2026-07-28 09:48:52.548
cms4fp63n008pth015k6yazvg	cms3cp2f5000wmy01vfs59bcr	ram1	2026-07-17 00:00:00	2026-07-28 09:49:00.939	ARCHIVED	2026-07-28 09:09:08.771	2026-07-28 09:49:04.018
\.


--
-- Data for Name: StaffPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."StaffPayment" (id, "staffId", amount, "paidAt", note, "receiptImageUrl", "createdAt") FROM stdin;
cmnbmtn4y0049lk0161dvh7uo	cmnbmoxu20041lk01317ra3a3	1863000.00	2026-03-29 12:00:00	Bank deposit	\N	2026-03-29 10:44:26.338
cmopajckt00bhnq01dp8hbsdi	cmopagrm100bdnq01p9we1cii	21000.00	2026-05-03 12:00:00	paid by cheque	\N	2026-05-03 04:48:59.501
cms4fja94008dth01z7o1s5sp	cms4fiw4f0089th01iavwtix4	1000.00	2026-07-28 12:00:00	\N	\N	2026-07-28 09:04:34.216
cms4fjgl8008fth018huc7lgn	cms4fiw4f0089th01iavwtix4	9000.00	2026-07-28 12:00:00	\N	\N	2026-07-28 09:04:42.429
cms4g2s530095th01qht3v6tp	cms4fp63n008pth015k6yazvg	1.00	2026-07-28 12:00:00	\N	\N	2026-07-28 09:19:43.864
cms4h4nd90005nm01wbaca9kg	cms4g39j40097th0128d4gflf	2.00	2026-07-28 12:00:00	\N	\N	2026-07-28 09:49:10.606
\.


--
-- Data for Name: StaffSalary; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."StaffSalary" (id, "staffId", "monthlyAmount", "effectiveFrom", "createdAt") FROM stdin;
cmnbmoxu50043lk01d47xojr7	cmnbmoxu20041lk01317ra3a3	27000.00	2020-07-16 00:00:00	2026-03-29 10:40:46.925
cmopagrm500bfnq01kt5j2hv1	cmopagrm100bdnq01p9we1cii	21000.00	2026-04-14 00:00:00	2026-05-03 04:46:59.021
cmqxxt0yi006ynr01r4jop6qv	cmqxxt0ye006wnr01pehq6rwp	19000.00	2026-06-15 00:00:00	2026-06-28 15:21:56.251
cmr7yxdgd0096sc01upa0jagj	cmqxxt0ye006wnr01pehq6rwp	18000.00	2026-07-05 00:00:00	2026-07-05 15:51:00.445
cmr7yxqsp0098sc01620v3pzf	cmqxxt0ye006wnr01pehq6rwp	18000.00	2026-07-05 00:00:00	2026-07-05 15:51:17.738
cms4fiw4j008bth01kpzlqcpu	cms4fiw4f0089th01iavwtix4	10000.00	2026-07-17 00:00:00	2026-07-28 09:04:15.908
cms4fp63r008rth01z3qoxags	cms4fp63n008pth015k6yazvg	1.00	2026-07-17 00:00:00	2026-07-28 09:09:08.775
cms4g39j80099th01lhh0ss31	cms4g39j40097th0128d4gflf	1.00	2026-07-17 00:00:00	2026-07-28 09:20:06.404
\.


--
-- Data for Name: StandardVaccinationSchedule; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."StandardVaccinationSchedule" (id, "vaccineName", "dayFrom", "dayTo", "isOptional", description, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Supplier" (id, name, contact, address, "companyId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."User" (id, phone, name, "companyName", "CompanyFarmLocation", password, role, status, "isOnline", "lastSeen", language, "calendarType", "createdAt", "updatedAt") FROM stdin;
cmqa9phgh004gnr01kcsln6g2	+9779809795222	Khajana	\N	\N	$2b$10$kNjfFoUbngmojb9jcDQ3WufTvnzld..JF62FObL/JOA1nQeLp65Bu	COMPANY	ACTIVE	f	2026-07-05 14:40:51.094	ENGLISH	AD	2026-06-12 01:48:38.178	2026-07-05 14:40:51.096
cmn69vvcj000cqr01gg2khvs3	+9779857840565	Mamata Neupane	Home Poultry Farm	Bagmati, Tikuligadh	$2b$10$7IBUU9lBv0aBNrSEp7HjXuKNI/cgmXb5D70GqAKsoVd8qmYzxTTre	OWNER	ACTIVE	f	2026-07-25 01:41:31.29	ENGLISH	AD	2026-03-25 16:43:24.403	2026-07-25 01:41:31.292
cmnbm2tdx001hlk01lewrwu1c	+9779810901501	lal bahadur oli	oli agro industries	Lumbini, Lamahi	$2b$10$bKQGns4JNewbnjpTXlDPJu9bQ3mdhYo/h9n04NYEK0H3CmkAvH1f2	OWNER	ACTIVE	f	2026-04-07 06:02:42.498	ENGLISH	AD	2026-03-29 10:23:34.725	2026-06-08 12:57:17.38
cms5yh7jt004qqm01vuu1rojb	+9773333333333	test-final-farmer	test-final-farmer	Bagmati, test-final-farmer	$2b$10$Wg7pwF9z9cEgnR23pVskv.ZU/bK7J92n.hYztCoRDlPjEWk3C2idG	OWNER	ACTIVE	f	2026-07-29 16:27:32.074	ENGLISH	AD	2026-07-29 10:42:36.282	2026-07-29 16:27:32.075
cmois9yvt004knq01b2fe36fo	+9779860072989	Sanjay Shrestha	Khajana Agro	Lumbini, Lamahi 1 	$2b$10$PS77DtAtNJb/XsIiPBYD0uqr2F3c2k2n37MupVCfqI/kzsorqtoZS	OWNER	ACTIVE	f	2026-07-05 04:51:25.924	ENGLISH	AD	2026-04-28 15:31:11.705	2026-07-05 04:51:25.925
cmopafd8z00b1nq01zcppx8r5	+9779840404600	Khajana Agro Farm Pvt.Ltd.	Khajana Agro	Lumbini, Lamahi	$2b$10$9JotJ50RhAPurccUdwjEhuAjz8ab94JxOmwAjMHgRrnjN157gsuU2	OWNER	ACTIVE	f	2026-07-09 08:16:08.628	ENGLISH	AD	2026-05-03 04:45:53.748	2026-07-09 08:16:08.629
cms3cp2f5000wmy01vfs59bcr	+9771111111111	final-test-dealer	\N	\N	$2b$10$.OC3FwikbYdwpjEXG2Iu5.69gipZeExdpxv3EYgiDn0T1.Fhp9.Ba	DEALER	ACTIVE	f	2026-07-28 09:49:43.806	ENGLISH	AD	2026-07-27 14:57:18.977	2026-07-28 09:49:43.807
cmn5w474v0000o401qj8mx3bp	+9779857831027	Ajaya Neupane	\N	\N	$2b$10$ZTXR9vyAqIlAOIl7fiWw6.8804/vpX2xCM8Celk4d.p0B6AIwwxke	DEALER	ACTIVE	f	2026-07-25 08:27:54.159	ENGLISH	AD	2026-03-25 10:17:58.303	2026-07-25 08:27:54.16
cms655fb60000mu01s0hrv1tx	+9774444444444	test-final-doctor	\N	\N	$2b$10$BShsndtgkjxBmuOuQRXaz.eGVUvTge.5ozEOR97DwIae.ezL/TSuG	DOCTOR	ACTIVE	f	2026-07-29 14:59:15.94	ENGLISH	AD	2026-07-29 13:49:23.778	2026-07-29 14:59:15.941
cmn5vqd690000o423r4uqfvzn	+9779810000001	System Administrator	\N	\N	$2b$10$AlLV.khyzW5tX3GkQlih2uVJ.H/d0SssXesxBPWtkuBOevtnLVmHK	SUPER_ADMIN	ACTIVE	f	2026-07-29 15:00:22.234	ENGLISH	AD	2026-03-25 10:07:12.945	2026-07-29 15:00:22.235
cmrylfcpv000koe016l646xxp	+9779857840134	Pramod Basnet 	\N	\N	$2b$10$5GLoh0zpwOD.cGOLN9T3VeWWYtn.cbG/uQtPtjOuR1PNto3N/BcDi	DEALER	ACTIVE	f	2026-07-29 09:03:27.448	ENGLISH	AD	2026-07-24 07:02:51.427	2026-07-29 09:03:27.449
cms4h6da00006nm01l5ckssf3	+9772222222222	final-test-hatchery	\N	\N	$2b$10$jYffmntRh4qVaaCWS4oB4OzaJ4SbUiVIqovA/zFmKu0pk9wFrnqQu	HATCHERY	ACTIVE	f	2026-07-29 10:42:07.786	ENGLISH	AD	2026-07-28 09:50:30.84	2026-07-29 10:42:07.787
\.


--
-- Data for Name: UserOnboardingPayment; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."UserOnboardingPayment" ("userId", state, "lockedUntilApproved", "approvedAt", "approvedBy", "rejectedAt", "rejectedBy", "rejectionReason", "createdAt", "updatedAt") FROM stdin;
cmn5w474v0000o401qj8mx3bp	PAYMENT_APPROVED	f	2026-03-25 10:20:39.284	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-03-25 10:17:58.305	2026-03-25 10:20:39.288
cmn69vvcj000cqr01gg2khvs3	PAYMENT_APPROVED	f	2026-03-25 16:46:28.107	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-03-25 16:43:24.408	2026-03-25 16:46:28.11
cmopafd8z00b1nq01zcppx8r5	PAYMENT_APPROVED	f	2026-06-08 12:57:10.451	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-05-03 04:45:53.752	2026-06-08 12:57:10.452
cmois9yvt004knq01b2fe36fo	PAYMENT_APPROVED	f	2026-06-08 12:57:13.087	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-04-28 15:31:11.71	2026-06-08 12:57:13.088
cmnbm2tdx001hlk01lewrwu1c	PAYMENT_APPROVED	f	2026-06-08 12:57:17.377	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-03-29 10:23:34.73	2026-06-08 12:57:17.378
cmqa9phgh004gnr01kcsln6g2	PAYMENT_APPROVED	f	2026-06-12 04:22:21.588	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-06-12 01:48:38.18	2026-06-12 04:22:21.589
cmrylfcpv000koe016l646xxp	PAYMENT_APPROVED	f	2026-07-24 07:03:06.225	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-07-24 07:02:51.429	2026-07-24 07:03:06.227
cms3cp2f5000wmy01vfs59bcr	PAYMENT_APPROVED	f	2026-07-27 14:57:42.009	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-07-27 14:57:18.979	2026-07-27 14:57:42.011
cms4h6da00006nm01l5ckssf3	PAYMENT_APPROVED	f	2026-07-28 09:50:46.872	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-07-28 09:50:30.842	2026-07-28 09:50:46.874
cms5yh7jt004qqm01vuu1rojb	PAYMENT_APPROVED	f	2026-07-29 10:43:05.991	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-07-29 10:42:36.287	2026-07-29 10:43:05.993
cms655fb60000mu01s0hrv1tx	PAYMENT_APPROVED	f	2026-07-29 13:52:44.745	cmn5vqd690000o423r4uqfvzn	\N	\N	\N	2026-07-29 13:49:23.781	2026-07-29 13:52:44.746
\.


--
-- Data for Name: Vaccination; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."Vaccination" (id, "vaccineName", "scheduledDate", "completedDate", status, notes, "doseNumber", "totalDoses", "daysBetweenDoses", "standardScheduleId", "batchAge", "retryCount", "batchId", "farmId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _CompanyManagedBy; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."_CompanyManagedBy" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _DealerManagers; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."_DealerManagers" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _FarmManagers; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public."_FarmManagers" ("A", "B") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: poultry360
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
51160cc0-dffb-4857-9158-00127955707b	412ea6a8757fda0444e1db7d6b6211f921986239fd812ba1b25bd1051271106d	2026-03-25 10:07:12.587344+00	20260323120000_payment_onboarding_gate	\N	\N	2026-03-25 10:07:12.548419+00	1
3403001a-6a98-4508-9667-a5834e039ff8	dee732ec86761e6cd61ddeafa69b8286b8a0ffd1aff824668865bca514c3c99e	2026-03-25 10:07:11.568338+00	20260223113819_init	\N	\N	2026-03-25 10:07:10.097538+00	1
f0e1a3f6-5b26-401d-9776-c4ecb7b03672	57a3428f1fcda9438f1bb43727bb86bd1afc3af9a32e71f6614d86040880faba	2026-03-25 10:07:12.184936+00	20260310092454_add_notifications	\N	\N	2026-03-25 10:07:12.14161+00	1
a66f2d0f-4915-4722-aa8f-8a166eff70bf	6a7a3d019872e82fa8505399406da8fa56e9da58b83ea36c716acb03fe8cc755	2026-03-25 10:07:11.824245+00	20260301094347_add_dealer_classification	\N	\N	2026-03-25 10:07:11.570371+00	1
7abb5570-df96-4316-8a10-090d40566b30	cfdd43088c6cc761c8cdc0095663f5ac0b3726284b606e87392725cec2170bb3	2026-03-25 10:07:11.879333+00	20260302092359_egg_dynamics	\N	\N	2026-03-25 10:07:11.825739+00	1
7d1e8b8f-0d55-432d-a6e3-581c247ae5df	832282795f6cffa3c3898b13515af490cfd0906016edb0905a0f726e0d6109a3	2026-03-25 10:07:12.423459+00	20260317180000_add_manual_company_adjustments	\N	\N	2026-03-25 10:07:12.4007+00	1
82399c62-1937-4daf-bdda-cb545c35f380	510efca3e36a3e9a5cf870121391027d6df393161e705625bd6d4f5819c5d428	2026-03-25 10:07:11.905641+00	20260302094828_egg	\N	\N	2026-03-25 10:07:11.880891+00	1
5070b8a4-e5df-4590-89a1-6864107237bd	c3a04fadab4c659f6961ccde0e8dcb1a3320d5b9149e0a3c80c0f4489610b64e	2026-03-25 10:07:12.191746+00	20260312090758_add_list_for_sale_address	\N	\N	2026-03-25 10:07:12.186552+00	1
0a72b6dd-ad03-4d0c-aef1-3bf8d1b50dda	6ff869aa97ef9ec7ffbb5cdd6520938cfe60ec7c420c05b8d343e421485f0bc6	2026-03-25 10:07:11.93639+00	20260302100000_add_batch_egg_inventory	\N	\N	2026-03-25 10:07:11.907164+00	1
4a6d5edf-e27d-457a-a78e-5a53bac57280	f3d43952f663858da7dfd66b7b36dff737f062256dd68eb85f8b3208b9ac3d7c	2026-03-25 10:07:11.948182+00	20260302110000_drop_egg_inventory	\N	\N	2026-03-25 10:07:11.937786+00	1
d4e81341-8d19-4350-9b8b-aa8a291e4290	467f3792b341575d7aebc59aba57bf2f4cb6db39b243df0e548107b43203d980	2026-03-25 10:07:11.955038+00	20260303120000_allow_multiple_egg_production_per_date	\N	\N	2026-03-25 10:07:11.949767+00	1
e1b0ffd7-68a8-4e07-ab2c-6f18a5dc0e3f	f9f282cba5ac25140b34451ef9f572c6122865bc93bf81d8cc856ab958f07b1e	2026-03-25 10:07:12.215709+00	20260314170628_add_password_reset_otp	\N	\N	2026-03-25 10:07:12.193131+00	1
1098b15f-aa9a-447d-96c5-11e2e951a5f5	2426b5ebff96846bde5fdc2e360297a4ac1ef08cf17dd2d6fc25bfb384bd48fa	2026-03-25 10:07:11.98348+00	20260303225514_add_reminder_model	\N	\N	2026-03-25 10:07:11.956478+00	1
aa69c051-a17a-4696-a02b-551dc3a439c1	fc5987741ac908469ff46ca9af339c5ca091e260afe0b40ca8ee97fcd2adb0f5	2026-03-25 10:07:12.000005+00	20260305000000_inventory_item_identity_by_rate_and_supplier	\N	\N	2026-03-25 10:07:11.984998+00	1
d658a3dc-d384-468c-aca6-2dc0cba729b3	1a2d17246389712c1d6c4f2d669b4df3840966e89534eb5250160adf672b89bb	2026-03-25 10:07:12.51955+00	20260318160000_dealer_customer_archive_fields	\N	\N	2026-03-25 10:07:12.506933+00	1
5d003e92-9d66-4e16-9502-ed9e20a554bb	ba338d8ff223d2ede77f53abcaad53c7f93a764f955222acb638003fdbda2928	2026-03-25 10:07:12.034145+00	20260306183916_add_landing_contact	\N	\N	2026-03-25 10:07:12.001598+00	1
dc232699-4e4a-46e4-b4ca-724a6e00b007	93941f3e05652066f3cb9466fad67a71c8e88ed5704cd137a0bcfda20d852ae8	2026-03-25 10:07:12.296098+00	20260315000000_add_company_suppliers_purchases	\N	\N	2026-03-25 10:07:12.217345+00	1
0e3efb72-1129-44a8-bb5d-7a649a201d7e	0e3293f13794aaffb97ae6bbdb6498914b3eb569a20e858c382325c0bf88524f	2026-03-25 10:07:12.041104+00	20260308000000_inventory_item_soft_delete	\N	\N	2026-03-25 10:07:12.035891+00	1
8f0341fe-0a67-49fe-a333-75b072b70cd1	aedb7342458758c2a2c8ce158ee1b5e6195e1963a15e3e42fbcc5f3cd7ad94de	2026-03-25 10:07:12.077523+00	20260309152351_add_list_for_sale	\N	\N	2026-03-25 10:07:12.042644+00	1
e0caa195-a53d-413e-8553-0add8b7ffbee	47b33140f3089d0128efd294041cee4c17aca354df6f8aef2914e52bd7711507	2026-03-25 10:07:12.448535+00	20260318131500_add_dealer_farmer_account_adjustments	\N	\N	2026-03-25 10:07:12.425046+00	1
7bf9093a-9972-44d3-a0cd-f3a595f697a4	2b84ad6a0bc5eae2ba7bb1fba2547712679aebdca1cea2811457b7985ef6bdf3	2026-03-25 10:07:12.140083+00	20260309170641_add_staff_management	\N	\N	2026-03-25 10:07:12.079031+00	1
f9a887e4-c04d-4729-be71-d778f860577d	6b163ca4e1fff10ee00b574d178b9b034bdb8accddc4f8bff815aa408d03a565	2026-03-25 10:07:12.325943+00	20260315120000_add_raw_materials	\N	\N	2026-03-25 10:07:12.297587+00	1
55eac9fb-8dd9-4a7e-b9ce-8e3435cea0b5	e3e8b719be353776b2d5769f8a7719717c42f56d2a28aadc7a03a38025d6a72a	2026-03-25 10:07:12.331083+00	20260315155401_add_production_output_product_id	\N	\N	2026-03-25 10:07:12.327525+00	1
92fc6fc4-8733-423d-ad6d-094ff6659219	05da609704eebd1260f71f375d6aa4b3ef695ad5e02040b12a73d30c16c9a93e	2026-03-25 10:07:12.386518+00	20260316000000_add_production_run	\N	\N	2026-03-25 10:07:12.332597+00	1
c56d4814-0d53-4ae0-8c69-de9506906046	c06eb07dfa10e5eec590a7ea1dc02b185d1bfb18cc1d8d862053da2fd5638736	2026-03-25 10:07:12.474607+00	20260318133500_add_company_dealer_opening_balance_adjustments	\N	\N	2026-03-25 10:07:12.450171+00	1
d4b36a30-5a07-408c-ad36-0219860cc31a	1b2ca8222fa5951f1a7072d266431a427ea652751e19e19cc15cf6595326bb19	2026-03-25 10:07:12.399203+00	20260316100000_add_production_input_bucket	\N	\N	2026-03-25 10:07:12.388029+00	1
3bd75b9f-57cc-405f-b8e4-46d715efe055	9a494cc8fb3cf60ad0e5e66187db13685b8c2f05fd12e3ab6bebe989fac4fc49	2026-03-25 10:07:12.481621+00	20260318142000_manual_company_archive_and_void	\N	\N	2026-03-25 10:07:12.47613+00	1
0985fdfd-89cd-4aa5-bb46-bc48e67a419b	f3caa5ba53f8ddb1c843bd2f82d48a956b583cc8a8e850ceb70790e3b13940f2	2026-03-25 10:07:12.538485+00	20260319120000_dealer_payment_linked_ledger	\N	\N	2026-03-25 10:07:12.521409+00	1
7ea647ec-4fbc-4455-a233-d94ed0c250c7	6fb84b3ae673f8f79c33745c77aaf28fbde25efb0d7a44cd8ba4c8fbaf9086e4	2026-03-25 10:07:12.5053+00	20260318145500_dealer_product_supplier_company	\N	\N	2026-03-25 10:07:12.483095+00	1
763eda8c-b4d0-44f1-a40c-f62f26fa9388	ae660842b425bf6f3d944166f1b633e8e0cde1a3bf3feb3395b6eab86034fe30	2026-03-25 10:07:12.633552+00	20260324140000_add_sale_invoice_number	\N	\N	2026-03-25 10:07:12.620438+00	1
978626de-4a4b-4381-ad0a-d2742ba5eb57	a06e2189fdd030b3efe287777801d944751346e9ace5fab8aa402cd044d281b0	2026-03-25 10:07:12.546175+00	20260321120000_customer_transaction_deleted_at	\N	\N	2026-03-25 10:07:12.540273+00	1
634e0074-8e20-4576-8bf7-d7bb110f5156	3e1f8b0d340afe6d2e51312283bee9d0f9dbc4d5ea5ac9a68de100736a85356c	2026-03-25 10:07:12.618974+00	20260324120000_add_customer_account_totals	\N	\N	2026-03-25 10:07:12.612469+00	1
83de85f7-cd8a-4e19-aa83-df80476ad4af	6949aeb9c1afa6a9e8978afde4bf9e9b0f438f26edabe77b2804b515d976c095	2026-03-25 10:07:12.603787+00	20260323150000_onboarding_payment_settings	\N	\N	2026-03-25 10:07:12.58896+00	1
ffc3cc7c-0b9d-4e93-9c5d-07bc4cbb1a52	273055d255ea3773099bbbaced290fae39a841b630b8115a0a14d615ba44ebfd	2026-03-25 10:07:12.611039+00	20260323170000_exempt_doctor_admin_onboarding_payment	\N	\N	2026-03-25 10:07:12.60576+00	1
86e2861d-8974-48ca-8a49-75d135e4a660	64df29a36e4542ac9e462134e476d44cb9a5471d342437c9871d7da031b26c9f	2026-03-25 10:07:12.652484+00	20260325090000_demo_enquiry	\N	\N	2026-03-25 10:07:12.635112+00	1
afd01df5-092e-4cd1-9c68-4cbf4730dadb	2fa2806cc8ffccdc7642db4ea30435f3a14f7e4e9b444c23932acda8957e9086	2026-03-25 10:07:12.659041+00	20260325120000_onboarding_payment_trial	\N	\N	2026-03-25 10:07:12.654022+00	1
a649a649-b56c-43e4-904a-176f0b2e8b94	ee1cc39813dbc098c0eb782c5c0e116765eba62f88a25f08de5708d3b72d06f0	2026-03-26 09:27:22.47456+00	20260326000000_add_hatchery_role_and_business	\N	\N	2026-03-26 09:27:22.436763+00	1
48350a44-9bed-473f-b8a0-2c2c89347b2d	bc3d1ebd52f75b50553432d60a809899d7a765e5d3dac283ca3a9fd803e6f639	2026-03-26 11:16:01.200879+00	20260326010000_add_hatchery_supplier_ledger_and_inventory	\N	\N	2026-03-26 11:16:01.116458+00	1
3be5f6e0-722d-44f0-98a5-34f482f4f678	ad420412becfede243a81f763e01b7393c5eef88afbf180001cef5344a4fe0a8	2026-03-26 12:41:49.711282+00	20260326020000_add_hatchery_batches_and_egg_production	\N	\N	2026-03-26 12:41:49.459664+00	1
a2f07479-ef51-454d-a40b-065b38a8821d	adfdaa793734777a7c7a2043091ad41968907371a5bf95221040b66f161ebb9e	2026-03-26 14:40:35.104885+00	20260326030000_add_hatchery_incubation_and_chicks	\N	\N	2026-03-26 14:40:35.001455+00	1
333fb70f-4b7a-4b66-8e92-7638c4584265	23d6d6497a506f1a128793a51d9ac38a9007a269481c828a04db4c0620c23cec	2026-03-26 14:40:35.158568+00	20260326040000_add_hatchery_parties_and_parent_sale_weight	\N	\N	2026-03-26 14:40:35.105761+00	1
e20e4d86-970b-4e31-ac4a-627a1035e397	011c1d8d13cdd9d4ba3b0ceb98066a5176a4e94e198472c72af6a9a1b6d4a122	2026-07-21 05:27:28.365489+00	20260721000000_add_list_for_sale_location	\N	\N	2026-07-21 05:27:28.357675+00	1
55a6c4eb-35ac-4a5a-9759-b0d5a16a1ef4	8dc3e24bd195b8b5f77d85a5b5c7a1aa6d1447b9b519cf49b73b66bc01103a3e	2026-03-26 17:52:09.10153+00	20260326050000_add_effective_unit_cost	\N	\N	2026-03-26 17:52:09.094473+00	1
a346828b-f88c-42ed-bd51-a3ee7f319523	21190e41f23a4ed9fea036b57eda03023d009fdac38ee13d86ee727c60e3b477	2026-03-31 07:01:56.856791+00	20260331120000_add_dealerproduct_hiddenAt	\N	\N	2026-03-31 07:01:56.851317+00	1
9033ba04-41be-409a-b9d0-380040af2448	d352bfc24b0bbc81d2b2c9905c23bedb14f15d942dad5b724fc9f586346cf8ba	2026-03-31 07:37:41.067851+00	20260331121500_add_manual_purchase_trade_discount	\N	\N	2026-03-31 07:37:41.060345+00	1
9a05f867-3e89-4f96-be28-847a8354b62f	69fbedec49a15a6b3115602364f903155f2abb5d6da84357984d698fab2c4fc3	2026-07-21 15:54:54.101554+00	20260721162000_add_demo_enquiry_business_types	\N	\N	2026-07-21 15:54:54.093065+00	1
035d55a0-b138-41d1-87a9-deb2b3b48f00	1e7cf80330be4455fc1e1f8e0f94454cc18febeac425e8dd75f4f249094e1a00	2026-04-05 06:09:46.724639+00	20260405120000_add_dealer_cash_in_hand	\N	\N	2026-04-05 06:09:46.653606+00	1
37294c57-6418-4dca-a9ed-a1c31f265a10	159da961d209e0603739b43f96dbbc7ad9d4d43be8568a36acdac87e5323f115	2026-04-05 09:10:18.967188+00	20260405140000_add_farmer_cash_in_hand	\N	\N	2026-04-05 09:10:18.899459+00	1
c0e47867-c493-45fe-b2fd-392abaad9af8	ccb3ed07c3eb9ef8897aae52b84d6e9ddceb714cccba0408612acd9f0ab1dd02	2026-06-04 06:40:56.273945+00	20260604120000_remove_onboarding_payment_flow	\N	\N	2026-06-04 06:40:56.241376+00	1
234e8f63-c096-45e6-8acb-2f54f593e73d	387d368082e84aa2c6ceeb9c3a611f862afae32bb51694a044e7ef0ca72f30b0	2026-07-27 06:54:42.019968+00	20260727000000_make_customer_phone_optional	\N	\N	2026-07-27 06:54:42.011381+00	1
859afd19-e5e8-4217-b2c2-5728f5e2a3f7	c625f8618c19fba8d62b6fe5bb9dccffc66f95dc97891e0fefe540dc8dddf3f9	2026-07-05 06:00:37.545229+00	20260705000000_add_medicine_expiry_to_supplier_inventory	\N	\N	2026-07-05 06:00:37.51571+00	1
dde8ef3d-f3bc-4dbc-bf3b-542c0f706567	193f7996c48fe6c3d61b532ca9ca6a51b55ecec0111aa7ee806ec3a76b276bf3	2026-07-05 17:14:05.993914+00	20260705001000_add_batch_notes	\N	\N	2026-07-05 17:14:05.952667+00	1
8b346198-620f-486f-b091-e80c35da0ab7	f4282c69601a9eba1ca60f53accb8f631ebe43812834bd919a6bb6d31beeddc1	2026-07-16 14:03:30.920586+00	20260715160806_fix_removed_connection_schema	\N	\N	2026-07-16 14:03:30.786657+00	1
97a70be7-a1ab-4edf-8de0-1864f4220a74	80aee9ccb1af65bcd628d0b426bad76e365107a37a07f3039c7c2656eb02c196	2026-07-27 15:33:27.264397+00	20260727090000_fix_dealer_sale_invoice_scope	\N	\N	2026-07-27 15:33:27.235361+00	1
1f5fe072-897a-4a35-8e3c-b054dc9c2f5f	c5f4571b058bc518939508060f45239967a03adea27ccc6c9f48f086023a04a9	2026-07-16 14:03:30.969328+00	20260715163224_fix_schema	\N	\N	2026-07-16 14:03:30.921554+00	1
cf8693e6-1223-49e1-b2ad-53eaaebc87ab	ab27a196a72406bc319f76eb2bee8a97a598cff4cb73727485af9daf38aa5198	2026-07-28 09:48:05.995983+00	20260728000000_add_staff_archived_status	\N	\N	2026-07-28 09:48:05.986575+00	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: BatchEggInventory BatchEggInventory_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchEggInventory"
    ADD CONSTRAINT "BatchEggInventory_pkey" PRIMARY KEY (id);


--
-- Name: BatchNote BatchNote_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchNote"
    ADD CONSTRAINT "BatchNote_pkey" PRIMARY KEY (id);


--
-- Name: BatchShareView BatchShareView_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShareView"
    ADD CONSTRAINT "BatchShareView_pkey" PRIMARY KEY (id);


--
-- Name: BatchShare BatchShare_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShare"
    ADD CONSTRAINT "BatchShare_pkey" PRIMARY KEY (id);


--
-- Name: Batch Batch_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_pkey" PRIMARY KEY (id);


--
-- Name: BirdWeight BirdWeight_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BirdWeight"
    ADD CONSTRAINT "BirdWeight_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: CompanyDealerAccountAdjustment CompanyDealerAccountAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccountAdjustment"
    ADD CONSTRAINT "CompanyDealerAccountAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: CompanyDealerAccount CompanyDealerAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccount"
    ADD CONSTRAINT "CompanyDealerAccount_pkey" PRIMARY KEY (id);


--
-- Name: CompanyDealerPayment CompanyDealerPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerPayment"
    ADD CONSTRAINT "CompanyDealerPayment_pkey" PRIMARY KEY (id);


--
-- Name: CompanyLedgerEntry CompanyLedgerEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyLedgerEntry"
    ADD CONSTRAINT "CompanyLedgerEntry_pkey" PRIMARY KEY (id);


--
-- Name: CompanyPurchaseItem CompanyPurchaseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchaseItem"
    ADD CONSTRAINT "CompanyPurchaseItem_pkey" PRIMARY KEY (id);


--
-- Name: CompanyPurchase CompanyPurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchase"
    ADD CONSTRAINT "CompanyPurchase_pkey" PRIMARY KEY (id);


--
-- Name: CompanySaleItem CompanySaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySaleItem"
    ADD CONSTRAINT "CompanySaleItem_pkey" PRIMARY KEY (id);


--
-- Name: CompanySale CompanySale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySale"
    ADD CONSTRAINT "CompanySale_pkey" PRIMARY KEY (id);


--
-- Name: CompanySupplierPayment CompanySupplierPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySupplierPayment"
    ADD CONSTRAINT "CompanySupplierPayment_pkey" PRIMARY KEY (id);


--
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- Name: Conversation Conversation_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_pkey" PRIMARY KEY (id);


--
-- Name: CustomerTransaction CustomerTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CustomerTransaction"
    ADD CONSTRAINT "CustomerTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: DealerCartItem DealerCartItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCartItem"
    ADD CONSTRAINT "DealerCartItem_pkey" PRIMARY KEY (id);


--
-- Name: DealerCart DealerCart_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCart"
    ADD CONSTRAINT "DealerCart_pkey" PRIMARY KEY (id);


--
-- Name: DealerCashDayClose DealerCashDayClose_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashDayClose"
    ADD CONSTRAINT "DealerCashDayClose_pkey" PRIMARY KEY (id);


--
-- Name: DealerCashMovement DealerCashMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashMovement"
    ADD CONSTRAINT "DealerCashMovement_pkey" PRIMARY KEY (id);


--
-- Name: DealerCashSettings DealerCashSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashSettings"
    ADD CONSTRAINT "DealerCashSettings_pkey" PRIMARY KEY (id);


--
-- Name: DealerFarmerAccountAdjustment DealerFarmerAccountAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccountAdjustment"
    ADD CONSTRAINT "DealerFarmerAccountAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: DealerFarmerAccount DealerFarmerAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccount"
    ADD CONSTRAINT "DealerFarmerAccount_pkey" PRIMARY KEY (id);


--
-- Name: DealerFarmerPayment DealerFarmerPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerPayment"
    ADD CONSTRAINT "DealerFarmerPayment_pkey" PRIMARY KEY (id);


--
-- Name: DealerLedgerEntry DealerLedgerEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerLedgerEntry"
    ADD CONSTRAINT "DealerLedgerEntry_pkey" PRIMARY KEY (id);


--
-- Name: DealerManualCompanyAdjustment DealerManualCompanyAdjustment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompanyAdjustment"
    ADD CONSTRAINT "DealerManualCompanyAdjustment_pkey" PRIMARY KEY (id);


--
-- Name: DealerManualCompanyPayment DealerManualCompanyPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompanyPayment"
    ADD CONSTRAINT "DealerManualCompanyPayment_pkey" PRIMARY KEY (id);


--
-- Name: DealerManualCompany DealerManualCompany_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompany"
    ADD CONSTRAINT "DealerManualCompany_pkey" PRIMARY KEY (id);


--
-- Name: DealerManualPurchaseItem DealerManualPurchaseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualPurchaseItem"
    ADD CONSTRAINT "DealerManualPurchaseItem_pkey" PRIMARY KEY (id);


--
-- Name: DealerManualPurchase DealerManualPurchase_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualPurchase"
    ADD CONSTRAINT "DealerManualPurchase_pkey" PRIMARY KEY (id);


--
-- Name: DealerProductTransaction DealerProductTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProductTransaction"
    ADD CONSTRAINT "DealerProductTransaction_pkey" PRIMARY KEY (id);


--
-- Name: DealerProductUnitConversion DealerProductUnitConversion_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProductUnitConversion"
    ADD CONSTRAINT "DealerProductUnitConversion_pkey" PRIMARY KEY (id);


--
-- Name: DealerProduct DealerProduct_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProduct"
    ADD CONSTRAINT "DealerProduct_pkey" PRIMARY KEY (id);


--
-- Name: DealerSaleItem DealerSaleItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSaleItem"
    ADD CONSTRAINT "DealerSaleItem_pkey" PRIMARY KEY (id);


--
-- Name: DealerSalePayment DealerSalePayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSalePayment"
    ADD CONSTRAINT "DealerSalePayment_pkey" PRIMARY KEY (id);


--
-- Name: DealerSale DealerSale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSale"
    ADD CONSTRAINT "DealerSale_pkey" PRIMARY KEY (id);


--
-- Name: Dealer Dealer_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_pkey" PRIMARY KEY (id);


--
-- Name: DemoEnquiry DemoEnquiry_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DemoEnquiry"
    ADD CONSTRAINT "DemoEnquiry_pkey" PRIMARY KEY (id);


--
-- Name: EggProductionEntry EggProductionEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggProductionEntry"
    ADD CONSTRAINT "EggProductionEntry_pkey" PRIMARY KEY (id);


--
-- Name: EggProduction EggProduction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggProduction"
    ADD CONSTRAINT "EggProduction_pkey" PRIMARY KEY (id);


--
-- Name: EggType EggType_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggType"
    ADD CONSTRAINT "EggType_pkey" PRIMARY KEY (id);


--
-- Name: EntityTransaction EntityTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: Farm Farm_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Farm"
    ADD CONSTRAINT "Farm_pkey" PRIMARY KEY (id);


--
-- Name: FarmerCashDayClose FarmerCashDayClose_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashDayClose"
    ADD CONSTRAINT "FarmerCashDayClose_pkey" PRIMARY KEY (id);


--
-- Name: FarmerCashMovement FarmerCashMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashMovement"
    ADD CONSTRAINT "FarmerCashMovement_pkey" PRIMARY KEY (id);


--
-- Name: FarmerCashSettings FarmerCashSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashSettings"
    ADD CONSTRAINT "FarmerCashSettings_pkey" PRIMARY KEY (id);


--
-- Name: FeedConsumption FeedConsumption_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FeedConsumption"
    ADD CONSTRAINT "FeedConsumption_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryBatchExpense HatcheryBatchExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchExpense"
    ADD CONSTRAINT "HatcheryBatchExpense_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryBatchMortality HatcheryBatchMortality_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchMortality"
    ADD CONSTRAINT "HatcheryBatchMortality_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryBatchPlacement HatcheryBatchPlacement_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchPlacement"
    ADD CONSTRAINT "HatcheryBatchPlacement_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryBatch HatcheryBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatch"
    ADD CONSTRAINT "HatcheryBatch_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryBusiness HatcheryBusiness_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBusiness"
    ADD CONSTRAINT "HatcheryBusiness_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryChickSale HatcheryChickSale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickSale"
    ADD CONSTRAINT "HatcheryChickSale_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryChickStock HatcheryChickStock_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickStock"
    ADD CONSTRAINT "HatcheryChickStock_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryChickTxn HatcheryChickTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickTxn"
    ADD CONSTRAINT "HatcheryChickTxn_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggMove HatcheryEggMove_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggMove"
    ADD CONSTRAINT "HatcheryEggMove_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggProductionLine HatcheryEggProductionLine_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggProductionLine"
    ADD CONSTRAINT "HatcheryEggProductionLine_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggProduction HatcheryEggProduction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggProduction"
    ADD CONSTRAINT "HatcheryEggProduction_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggSale HatcheryEggSale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggSale"
    ADD CONSTRAINT "HatcheryEggSale_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggStock HatcheryEggStock_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggStock"
    ADD CONSTRAINT "HatcheryEggStock_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggTxn HatcheryEggTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggTxn"
    ADD CONSTRAINT "HatcheryEggTxn_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryEggType HatcheryEggType_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggType"
    ADD CONSTRAINT "HatcheryEggType_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryHatchResult HatcheryHatchResult_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryHatchResult"
    ADD CONSTRAINT "HatcheryHatchResult_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryIncubationBatch HatcheryIncubationBatch_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationBatch"
    ADD CONSTRAINT "HatcheryIncubationBatch_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryIncubationLoss HatcheryIncubationLoss_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationLoss"
    ADD CONSTRAINT "HatcheryIncubationLoss_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryInventoryItem HatcheryInventoryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryInventoryItem"
    ADD CONSTRAINT "HatcheryInventoryItem_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryInventoryTxn HatcheryInventoryTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryInventoryTxn"
    ADD CONSTRAINT "HatcheryInventoryTxn_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryParentSale HatcheryParentSale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryParentSale"
    ADD CONSTRAINT "HatcheryParentSale_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryPartyPayment HatcheryPartyPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryPartyPayment"
    ADD CONSTRAINT "HatcheryPartyPayment_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryPartyTxn HatcheryPartyTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryPartyTxn"
    ADD CONSTRAINT "HatcheryPartyTxn_pkey" PRIMARY KEY (id);


--
-- Name: HatcheryParty HatcheryParty_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryParty"
    ADD CONSTRAINT "HatcheryParty_pkey" PRIMARY KEY (id);


--
-- Name: HatcherySupplierPurchaseItem HatcherySupplierPurchaseItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplierPurchaseItem"
    ADD CONSTRAINT "HatcherySupplierPurchaseItem_pkey" PRIMARY KEY (id);


--
-- Name: HatcherySupplierTxn HatcherySupplierTxn_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplierTxn"
    ADD CONSTRAINT "HatcherySupplierTxn_pkey" PRIMARY KEY (id);


--
-- Name: HatcherySupplier HatcherySupplier_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplier"
    ADD CONSTRAINT "HatcherySupplier_pkey" PRIMARY KEY (id);


--
-- Name: Hatchery Hatchery_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Hatchery"
    ADD CONSTRAINT "Hatchery_pkey" PRIMARY KEY (id);


--
-- Name: InventoryItem InventoryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_pkey" PRIMARY KEY (id);


--
-- Name: InventoryTransaction InventoryTransaction_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryTransaction"
    ADD CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY (id);


--
-- Name: InventoryUsage InventoryUsage_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryUsage"
    ADD CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY (id);


--
-- Name: LandingContact LandingContact_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."LandingContact"
    ADD CONSTRAINT "LandingContact_pkey" PRIMARY KEY (id);


--
-- Name: LandingReview LandingReview_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."LandingReview"
    ADD CONSTRAINT "LandingReview_pkey" PRIMARY KEY (id);


--
-- Name: ListForSale ListForSale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ListForSale"
    ADD CONSTRAINT "ListForSale_pkey" PRIMARY KEY (id);


--
-- Name: MedicineSupplier MedicineSupplier_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."MedicineSupplier"
    ADD CONSTRAINT "MedicineSupplier_pkey" PRIMARY KEY (id);


--
-- Name: Message Message_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_pkey" PRIMARY KEY (id);


--
-- Name: Mortality Mortality_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Mortality"
    ADD CONSTRAINT "Mortality_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PasswordResetOtp PasswordResetOtp_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."PasswordResetOtp"
    ADD CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY (id);


--
-- Name: ProductUnitConversion ProductUnitConversion_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductUnitConversion"
    ADD CONSTRAINT "ProductUnitConversion_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: ProductionInput ProductionInput_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionInput"
    ADD CONSTRAINT "ProductionInput_pkey" PRIMARY KEY (id);


--
-- Name: ProductionOutput ProductionOutput_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionOutput"
    ADD CONSTRAINT "ProductionOutput_pkey" PRIMARY KEY (id);


--
-- Name: ProductionRun ProductionRun_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionRun"
    ADD CONSTRAINT "ProductionRun_pkey" PRIMARY KEY (id);


--
-- Name: PushSubscription PushSubscription_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_pkey" PRIMARY KEY (id);


--
-- Name: RawMaterial RawMaterial_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."RawMaterial"
    ADD CONSTRAINT "RawMaterial_pkey" PRIMARY KEY (id);


--
-- Name: Reminder Reminder_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_pkey" PRIMARY KEY (id);


--
-- Name: SaleDiscount SaleDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleDiscount"
    ADD CONSTRAINT "SaleDiscount_pkey" PRIMARY KEY (id);


--
-- Name: SaleEggLine SaleEggLine_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleEggLine"
    ADD CONSTRAINT "SaleEggLine_pkey" PRIMARY KEY (id);


--
-- Name: SalePayment SalePayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SalePayment"
    ADD CONSTRAINT "SalePayment_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: StaffPayment StaffPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_pkey" PRIMARY KEY (id);


--
-- Name: StaffSalary StaffSalary_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."StaffSalary"
    ADD CONSTRAINT "StaffSalary_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: StandardVaccinationSchedule StandardVaccinationSchedule_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."StandardVaccinationSchedule"
    ADD CONSTRAINT "StandardVaccinationSchedule_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Vaccination Vaccination_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_pkey" PRIMARY KEY (id);


--
-- Name: _CompanyManagedBy _CompanyManagedBy_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_CompanyManagedBy"
    ADD CONSTRAINT "_CompanyManagedBy_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _DealerManagers _DealerManagers_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_DealerManagers"
    ADD CONSTRAINT "_DealerManagers_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _FarmManagers _FarmManagers_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_FarmManagers"
    ADD CONSTRAINT "_FarmManagers_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: BatchEggInventory_batchId_eggTypeId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "BatchEggInventory_batchId_eggTypeId_key" ON public."BatchEggInventory" USING btree ("batchId", "eggTypeId");


--
-- Name: BatchEggInventory_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchEggInventory_batchId_idx" ON public."BatchEggInventory" USING btree ("batchId");


--
-- Name: BatchEggInventory_eggTypeId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchEggInventory_eggTypeId_idx" ON public."BatchEggInventory" USING btree ("eggTypeId");


--
-- Name: BatchNote_batchId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchNote_batchId_date_idx" ON public."BatchNote" USING btree ("batchId", date);


--
-- Name: BatchShareView_shareId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchShareView_shareId_idx" ON public."BatchShareView" USING btree ("shareId");


--
-- Name: BatchShare_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchShare_batchId_idx" ON public."BatchShare" USING btree ("batchId");


--
-- Name: BatchShare_conversationId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchShare_conversationId_idx" ON public."BatchShare" USING btree ("conversationId");


--
-- Name: BatchShare_shareToken_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BatchShare_shareToken_idx" ON public."BatchShare" USING btree ("shareToken");


--
-- Name: BatchShare_shareToken_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "BatchShare_shareToken_key" ON public."BatchShare" USING btree ("shareToken");


--
-- Name: Batch_farmId_batchNumber_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Batch_farmId_batchNumber_key" ON public."Batch" USING btree ("farmId", "batchNumber");


--
-- Name: Batch_farmId_startDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Batch_farmId_startDate_idx" ON public."Batch" USING btree ("farmId", "startDate");


--
-- Name: BirdWeight_batchId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "BirdWeight_batchId_date_idx" ON public."BirdWeight" USING btree ("batchId", date);


--
-- Name: Category_userId_type_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Category_userId_type_idx" ON public."Category" USING btree ("userId", type);


--
-- Name: Category_userId_type_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Category_userId_type_name_key" ON public."Category" USING btree ("userId", type, name);


--
-- Name: CompanyDealerAccountAdjustment_accountId_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyDealerAccountAdjustment_accountId_createdAt_idx" ON public."CompanyDealerAccountAdjustment" USING btree ("accountId", "createdAt");


--
-- Name: CompanyDealerAccountAdjustment_accountId_status_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyDealerAccountAdjustment_accountId_status_idx" ON public."CompanyDealerAccountAdjustment" USING btree ("accountId", status);


--
-- Name: CompanyDealerAccount_companyId_dealerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "CompanyDealerAccount_companyId_dealerId_key" ON public."CompanyDealerAccount" USING btree ("companyId", "dealerId");


--
-- Name: CompanyDealerAccount_companyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyDealerAccount_companyId_idx" ON public."CompanyDealerAccount" USING btree ("companyId");


--
-- Name: CompanyDealerAccount_dealerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyDealerAccount_dealerId_idx" ON public."CompanyDealerAccount" USING btree ("dealerId");


--
-- Name: CompanyDealerPayment_accountId_paymentDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyDealerPayment_accountId_paymentDate_idx" ON public."CompanyDealerPayment" USING btree ("accountId", "paymentDate");


--
-- Name: CompanyLedgerEntry_companyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyLedgerEntry_companyId_date_idx" ON public."CompanyLedgerEntry" USING btree ("companyId", date);


--
-- Name: CompanyLedgerEntry_companySaleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyLedgerEntry_companySaleId_idx" ON public."CompanyLedgerEntry" USING btree ("companySaleId");


--
-- Name: CompanyLedgerEntry_partyId_partyType_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyLedgerEntry_partyId_partyType_idx" ON public."CompanyLedgerEntry" USING btree ("partyId", "partyType");


--
-- Name: CompanyLedgerEntry_transactionId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyLedgerEntry_transactionId_idx" ON public."CompanyLedgerEntry" USING btree ("transactionId");


--
-- Name: CompanyPurchaseItem_purchaseId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyPurchaseItem_purchaseId_idx" ON public."CompanyPurchaseItem" USING btree ("purchaseId");


--
-- Name: CompanyPurchaseItem_rawMaterialId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyPurchaseItem_rawMaterialId_idx" ON public."CompanyPurchaseItem" USING btree ("rawMaterialId");


--
-- Name: CompanyPurchase_companyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyPurchase_companyId_date_idx" ON public."CompanyPurchase" USING btree ("companyId", date);


--
-- Name: CompanyPurchase_supplierId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanyPurchase_supplierId_date_idx" ON public."CompanyPurchase" USING btree ("supplierId", date);


--
-- Name: CompanySaleItem_productId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySaleItem_productId_idx" ON public."CompanySaleItem" USING btree ("productId");


--
-- Name: CompanySaleItem_saleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySaleItem_saleId_idx" ON public."CompanySaleItem" USING btree ("saleId");


--
-- Name: CompanySale_accountId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySale_accountId_idx" ON public."CompanySale" USING btree ("accountId");


--
-- Name: CompanySale_companyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySale_companyId_date_idx" ON public."CompanySale" USING btree ("companyId", date);


--
-- Name: CompanySale_dealerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySale_dealerId_date_idx" ON public."CompanySale" USING btree ("dealerId", date);


--
-- Name: CompanySale_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySale_invoiceNumber_idx" ON public."CompanySale" USING btree ("invoiceNumber");


--
-- Name: CompanySale_invoiceNumber_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "CompanySale_invoiceNumber_key" ON public."CompanySale" USING btree ("invoiceNumber");


--
-- Name: CompanySale_soldById_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySale_soldById_idx" ON public."CompanySale" USING btree ("soldById");


--
-- Name: CompanySupplierPayment_companyId_paymentDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySupplierPayment_companyId_paymentDate_idx" ON public."CompanySupplierPayment" USING btree ("companyId", "paymentDate");


--
-- Name: CompanySupplierPayment_supplierId_paymentDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CompanySupplierPayment_supplierId_paymentDate_idx" ON public."CompanySupplierPayment" USING btree ("supplierId", "paymentDate");


--
-- Name: Company_ownerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Company_ownerId_idx" ON public."Company" USING btree ("ownerId");


--
-- Name: Company_ownerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Company_ownerId_key" ON public."Company" USING btree ("ownerId");


--
-- Name: Conversation_farmerId_doctorId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Conversation_farmerId_doctorId_key" ON public."Conversation" USING btree ("farmerId", "doctorId");


--
-- Name: CustomerTransaction_customerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "CustomerTransaction_customerId_date_idx" ON public."CustomerTransaction" USING btree ("customerId", date);


--
-- Name: Customer_userId_farmerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Customer_userId_farmerId_key" ON public."Customer" USING btree ("userId", "farmerId");


--
-- Name: Customer_userId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Customer_userId_name_key" ON public."Customer" USING btree ("userId", name);


--
-- Name: DealerCartItem_cartId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCartItem_cartId_idx" ON public."DealerCartItem" USING btree ("cartId");


--
-- Name: DealerCartItem_cartId_productId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerCartItem_cartId_productId_key" ON public."DealerCartItem" USING btree ("cartId", "productId");


--
-- Name: DealerCartItem_productId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCartItem_productId_idx" ON public."DealerCartItem" USING btree ("productId");


--
-- Name: DealerCart_companyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCart_companyId_idx" ON public."DealerCart" USING btree ("companyId");


--
-- Name: DealerCart_dealerId_companyId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerCart_dealerId_companyId_key" ON public."DealerCart" USING btree ("dealerId", "companyId");


--
-- Name: DealerCart_dealerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCart_dealerId_idx" ON public."DealerCart" USING btree ("dealerId");


--
-- Name: DealerCashDayClose_dealerId_bsDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCashDayClose_dealerId_bsDate_idx" ON public."DealerCashDayClose" USING btree ("dealerId", "bsDate");


--
-- Name: DealerCashDayClose_dealerId_bsDate_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerCashDayClose_dealerId_bsDate_key" ON public."DealerCashDayClose" USING btree ("dealerId", "bsDate");


--
-- Name: DealerCashMovement_dealerId_bsDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerCashMovement_dealerId_bsDate_idx" ON public."DealerCashMovement" USING btree ("dealerId", "bsDate");


--
-- Name: DealerCashSettings_dealerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerCashSettings_dealerId_key" ON public."DealerCashSettings" USING btree ("dealerId");


--
-- Name: DealerFarmerAccountAdjustment_accountId_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerFarmerAccountAdjustment_accountId_createdAt_idx" ON public."DealerFarmerAccountAdjustment" USING btree ("accountId", "createdAt");


--
-- Name: DealerFarmerAccountAdjustment_accountId_status_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerFarmerAccountAdjustment_accountId_status_idx" ON public."DealerFarmerAccountAdjustment" USING btree ("accountId", status);


--
-- Name: DealerFarmerAccount_dealerId_farmerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerFarmerAccount_dealerId_farmerId_key" ON public."DealerFarmerAccount" USING btree ("dealerId", "farmerId");


--
-- Name: DealerFarmerAccount_dealerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerFarmerAccount_dealerId_idx" ON public."DealerFarmerAccount" USING btree ("dealerId");


--
-- Name: DealerFarmerAccount_farmerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerFarmerAccount_farmerId_idx" ON public."DealerFarmerAccount" USING btree ("farmerId");


--
-- Name: DealerFarmerPayment_accountId_paymentDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerFarmerPayment_accountId_paymentDate_idx" ON public."DealerFarmerPayment" USING btree ("accountId", "paymentDate");


--
-- Name: DealerLedgerEntry_dealerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerLedgerEntry_dealerId_date_idx" ON public."DealerLedgerEntry" USING btree ("dealerId", date);


--
-- Name: DealerLedgerEntry_partyId_partyType_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerLedgerEntry_partyId_partyType_idx" ON public."DealerLedgerEntry" USING btree ("partyId", "partyType");


--
-- Name: DealerLedgerEntry_saleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerLedgerEntry_saleId_idx" ON public."DealerLedgerEntry" USING btree ("saleId");


--
-- Name: DealerManualCompanyAdjustment_manualCompanyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualCompanyAdjustment_manualCompanyId_date_idx" ON public."DealerManualCompanyAdjustment" USING btree ("manualCompanyId", date);


--
-- Name: DealerManualCompanyAdjustment_manualCompanyId_type_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualCompanyAdjustment_manualCompanyId_type_idx" ON public."DealerManualCompanyAdjustment" USING btree ("manualCompanyId", type);


--
-- Name: DealerManualCompanyPayment_manualCompanyId_paymentDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualCompanyPayment_manualCompanyId_paymentDate_idx" ON public."DealerManualCompanyPayment" USING btree ("manualCompanyId", "paymentDate");


--
-- Name: DealerManualCompany_dealerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualCompany_dealerId_idx" ON public."DealerManualCompany" USING btree ("dealerId");


--
-- Name: DealerManualCompany_dealerId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerManualCompany_dealerId_name_key" ON public."DealerManualCompany" USING btree ("dealerId", name);


--
-- Name: DealerManualPurchaseItem_dealerProductId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualPurchaseItem_dealerProductId_idx" ON public."DealerManualPurchaseItem" USING btree ("dealerProductId");


--
-- Name: DealerManualPurchaseItem_purchaseId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualPurchaseItem_purchaseId_idx" ON public."DealerManualPurchaseItem" USING btree ("purchaseId");


--
-- Name: DealerManualPurchase_manualCompanyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerManualPurchase_manualCompanyId_date_idx" ON public."DealerManualPurchase" USING btree ("manualCompanyId", date);


--
-- Name: DealerProductTransaction_dealerSaleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProductTransaction_dealerSaleId_idx" ON public."DealerProductTransaction" USING btree ("dealerSaleId");


--
-- Name: DealerProductTransaction_productId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProductTransaction_productId_date_idx" ON public."DealerProductTransaction" USING btree ("productId", date);


--
-- Name: DealerProductUnitConversion_dealerProductId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProductUnitConversion_dealerProductId_idx" ON public."DealerProductUnitConversion" USING btree ("dealerProductId");


--
-- Name: DealerProductUnitConversion_dealerProductId_unitName_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerProductUnitConversion_dealerProductId_unitName_key" ON public."DealerProductUnitConversion" USING btree ("dealerProductId", "unitName");


--
-- Name: DealerProduct_companyProductId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProduct_companyProductId_idx" ON public."DealerProduct" USING btree ("companyProductId");


--
-- Name: DealerProduct_dealerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProduct_dealerId_idx" ON public."DealerProduct" USING btree ("dealerId");


--
-- Name: DealerProduct_dealerId_name_costPrice_sellingPrice_manualCo_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerProduct_dealerId_name_costPrice_sellingPrice_manualCo_key" ON public."DealerProduct" USING btree ("dealerId", name, "costPrice", "sellingPrice", "manualCompanyId", "supplierCompanyId");


--
-- Name: DealerProduct_manualCompanyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProduct_manualCompanyId_idx" ON public."DealerProduct" USING btree ("manualCompanyId");


--
-- Name: DealerProduct_supplierCompanyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerProduct_supplierCompanyId_idx" ON public."DealerProduct" USING btree ("supplierCompanyId");


--
-- Name: DealerSaleItem_productId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSaleItem_productId_idx" ON public."DealerSaleItem" USING btree ("productId");


--
-- Name: DealerSaleItem_saleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSaleItem_saleId_idx" ON public."DealerSaleItem" USING btree ("saleId");


--
-- Name: DealerSalePayment_linkedLedgerEntryId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSalePayment_linkedLedgerEntryId_idx" ON public."DealerSalePayment" USING btree ("linkedLedgerEntryId");


--
-- Name: DealerSalePayment_saleId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSalePayment_saleId_date_idx" ON public."DealerSalePayment" USING btree ("saleId", date);


--
-- Name: DealerSale_accountId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSale_accountId_idx" ON public."DealerSale" USING btree ("accountId");


--
-- Name: DealerSale_customerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSale_customerId_idx" ON public."DealerSale" USING btree ("customerId");


--
-- Name: DealerSale_dealerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSale_dealerId_date_idx" ON public."DealerSale" USING btree ("dealerId", date);


--
-- Name: DealerSale_dealerId_invoiceNumber_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "DealerSale_dealerId_invoiceNumber_key" ON public."DealerSale" USING btree ("dealerId", "invoiceNumber");


--
-- Name: DealerSale_farmerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSale_farmerId_idx" ON public."DealerSale" USING btree ("farmerId");


--
-- Name: DealerSale_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DealerSale_invoiceNumber_idx" ON public."DealerSale" USING btree ("invoiceNumber");


--
-- Name: Dealer_ownerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Dealer_ownerId_idx" ON public."Dealer" USING btree ("ownerId");


--
-- Name: Dealer_ownerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Dealer_ownerId_key" ON public."Dealer" USING btree ("ownerId");


--
-- Name: Dealer_userId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Dealer_userId_name_key" ON public."Dealer" USING btree ("userId", name);


--
-- Name: DemoEnquiry_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "DemoEnquiry_createdAt_idx" ON public."DemoEnquiry" USING btree ("createdAt");


--
-- Name: EggProductionEntry_eggProductionId_eggTypeId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "EggProductionEntry_eggProductionId_eggTypeId_key" ON public."EggProductionEntry" USING btree ("eggProductionId", "eggTypeId");


--
-- Name: EggProductionEntry_eggProductionId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EggProductionEntry_eggProductionId_idx" ON public."EggProductionEntry" USING btree ("eggProductionId");


--
-- Name: EggProduction_batchId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EggProduction_batchId_date_idx" ON public."EggProduction" USING btree ("batchId", date);


--
-- Name: EggType_userId_code_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "EggType_userId_code_key" ON public."EggType" USING btree ("userId", code);


--
-- Name: EggType_userId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EggType_userId_idx" ON public."EggType" USING btree ("userId");


--
-- Name: EntityTransaction_customerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_customerId_date_idx" ON public."EntityTransaction" USING btree ("customerId", date);


--
-- Name: EntityTransaction_dealerId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_dealerId_date_idx" ON public."EntityTransaction" USING btree ("dealerId", date);


--
-- Name: EntityTransaction_entityType_entityId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_entityType_entityId_date_idx" ON public."EntityTransaction" USING btree ("entityType", "entityId", date);


--
-- Name: EntityTransaction_hatcheryId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_hatcheryId_date_idx" ON public."EntityTransaction" USING btree ("hatcheryId", date);


--
-- Name: EntityTransaction_inventoryItemId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_inventoryItemId_date_idx" ON public."EntityTransaction" USING btree ("inventoryItemId", date);


--
-- Name: EntityTransaction_medicineSupplierId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_medicineSupplierId_date_idx" ON public."EntityTransaction" USING btree ("medicineSupplierId", date);


--
-- Name: EntityTransaction_paymentToPurchaseId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_paymentToPurchaseId_date_idx" ON public."EntityTransaction" USING btree ("paymentToPurchaseId", date);


--
-- Name: EntityTransaction_sourceDealerLedgerEntryId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "EntityTransaction_sourceDealerLedgerEntryId_idx" ON public."EntityTransaction" USING btree ("sourceDealerLedgerEntryId");


--
-- Name: Expense_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Expense_batchId_idx" ON public."Expense" USING btree ("batchId");


--
-- Name: Expense_farmId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Expense_farmId_date_idx" ON public."Expense" USING btree ("farmId", date);


--
-- Name: FarmerCashDayClose_userId_bsDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "FarmerCashDayClose_userId_bsDate_idx" ON public."FarmerCashDayClose" USING btree ("userId", "bsDate");


--
-- Name: FarmerCashDayClose_userId_bsDate_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "FarmerCashDayClose_userId_bsDate_key" ON public."FarmerCashDayClose" USING btree ("userId", "bsDate");


--
-- Name: FarmerCashMovement_userId_bsDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "FarmerCashMovement_userId_bsDate_idx" ON public."FarmerCashMovement" USING btree ("userId", "bsDate");


--
-- Name: FarmerCashSettings_userId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "FarmerCashSettings_userId_key" ON public."FarmerCashSettings" USING btree ("userId");


--
-- Name: FeedConsumption_batchId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "FeedConsumption_batchId_date_idx" ON public."FeedConsumption" USING btree ("batchId", date);


--
-- Name: HatcheryBatchExpense_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatchExpense_batchId_idx" ON public."HatcheryBatchExpense" USING btree ("batchId");


--
-- Name: HatcheryBatchExpense_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatchExpense_date_idx" ON public."HatcheryBatchExpense" USING btree (date);


--
-- Name: HatcheryBatchMortality_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatchMortality_batchId_idx" ON public."HatcheryBatchMortality" USING btree ("batchId");


--
-- Name: HatcheryBatchMortality_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatchMortality_date_idx" ON public."HatcheryBatchMortality" USING btree (date);


--
-- Name: HatcheryBatchPlacement_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatchPlacement_batchId_idx" ON public."HatcheryBatchPlacement" USING btree ("batchId");


--
-- Name: HatcheryBatch_hatcheryOwnerId_code_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryBatch_hatcheryOwnerId_code_key" ON public."HatcheryBatch" USING btree ("hatcheryOwnerId", code);


--
-- Name: HatcheryBatch_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatch_hatcheryOwnerId_idx" ON public."HatcheryBatch" USING btree ("hatcheryOwnerId");


--
-- Name: HatcheryBatch_status_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatch_status_idx" ON public."HatcheryBatch" USING btree (status);


--
-- Name: HatcheryBatch_type_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryBatch_type_idx" ON public."HatcheryBatch" USING btree (type);


--
-- Name: HatcheryBusiness_ownerId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryBusiness_ownerId_key" ON public."HatcheryBusiness" USING btree ("ownerId");


--
-- Name: HatcheryChickSale_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickSale_date_idx" ON public."HatcheryChickSale" USING btree (date);


--
-- Name: HatcheryChickSale_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickSale_incubationBatchId_idx" ON public."HatcheryChickSale" USING btree ("incubationBatchId");


--
-- Name: HatcheryChickSale_partyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickSale_partyId_idx" ON public."HatcheryChickSale" USING btree ("partyId");


--
-- Name: HatcheryChickStock_incubationBatchId_grade_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryChickStock_incubationBatchId_grade_key" ON public."HatcheryChickStock" USING btree ("incubationBatchId", grade);


--
-- Name: HatcheryChickStock_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickStock_incubationBatchId_idx" ON public."HatcheryChickStock" USING btree ("incubationBatchId");


--
-- Name: HatcheryChickTxn_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickTxn_incubationBatchId_idx" ON public."HatcheryChickTxn" USING btree ("incubationBatchId");


--
-- Name: HatcheryChickTxn_sourceId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryChickTxn_sourceId_idx" ON public."HatcheryChickTxn" USING btree ("sourceId");


--
-- Name: HatcheryEggMove_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggMove_incubationBatchId_idx" ON public."HatcheryEggMove" USING btree ("incubationBatchId");


--
-- Name: HatcheryEggMove_parentBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggMove_parentBatchId_idx" ON public."HatcheryEggMove" USING btree ("parentBatchId");


--
-- Name: HatcheryEggProductionLine_eggTypeId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggProductionLine_eggTypeId_idx" ON public."HatcheryEggProductionLine" USING btree ("eggTypeId");


--
-- Name: HatcheryEggProductionLine_productionId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggProductionLine_productionId_idx" ON public."HatcheryEggProductionLine" USING btree ("productionId");


--
-- Name: HatcheryEggProduction_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggProduction_batchId_idx" ON public."HatcheryEggProduction" USING btree ("batchId");


--
-- Name: HatcheryEggProduction_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggProduction_date_idx" ON public."HatcheryEggProduction" USING btree (date);


--
-- Name: HatcheryEggSale_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggSale_batchId_idx" ON public."HatcheryEggSale" USING btree ("batchId");


--
-- Name: HatcheryEggSale_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggSale_date_idx" ON public."HatcheryEggSale" USING btree (date);


--
-- Name: HatcheryEggSale_partyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggSale_partyId_idx" ON public."HatcheryEggSale" USING btree ("partyId");


--
-- Name: HatcheryEggStock_batchId_eggTypeId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryEggStock_batchId_eggTypeId_key" ON public."HatcheryEggStock" USING btree ("batchId", "eggTypeId");


--
-- Name: HatcheryEggStock_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggStock_batchId_idx" ON public."HatcheryEggStock" USING btree ("batchId");


--
-- Name: HatcheryEggTxn_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggTxn_batchId_idx" ON public."HatcheryEggTxn" USING btree ("batchId");


--
-- Name: HatcheryEggTxn_eggTypeId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggTxn_eggTypeId_idx" ON public."HatcheryEggTxn" USING btree ("eggTypeId");


--
-- Name: HatcheryEggTxn_sourceId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggTxn_sourceId_idx" ON public."HatcheryEggTxn" USING btree ("sourceId");


--
-- Name: HatcheryEggType_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryEggType_hatcheryOwnerId_idx" ON public."HatcheryEggType" USING btree ("hatcheryOwnerId");


--
-- Name: HatcheryEggType_hatcheryOwnerId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryEggType_hatcheryOwnerId_name_key" ON public."HatcheryEggType" USING btree ("hatcheryOwnerId", name);


--
-- Name: HatcheryHatchResult_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryHatchResult_incubationBatchId_idx" ON public."HatcheryHatchResult" USING btree ("incubationBatchId");


--
-- Name: HatcheryIncubationBatch_hatcheryOwnerId_code_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryIncubationBatch_hatcheryOwnerId_code_key" ON public."HatcheryIncubationBatch" USING btree ("hatcheryOwnerId", code);


--
-- Name: HatcheryIncubationBatch_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryIncubationBatch_hatcheryOwnerId_idx" ON public."HatcheryIncubationBatch" USING btree ("hatcheryOwnerId");


--
-- Name: HatcheryIncubationBatch_parentBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryIncubationBatch_parentBatchId_idx" ON public."HatcheryIncubationBatch" USING btree ("parentBatchId");


--
-- Name: HatcheryIncubationBatch_stage_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryIncubationBatch_stage_idx" ON public."HatcheryIncubationBatch" USING btree (stage);


--
-- Name: HatcheryIncubationLoss_incubationBatchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryIncubationLoss_incubationBatchId_idx" ON public."HatcheryIncubationLoss" USING btree ("incubationBatchId");


--
-- Name: HatcheryInventoryItem_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryInventoryItem_hatcheryOwnerId_idx" ON public."HatcheryInventoryItem" USING btree ("hatcheryOwnerId");


--
-- Name: HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPri_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryInventoryItem_hatcheryOwnerId_itemType_name_unitPri_key" ON public."HatcheryInventoryItem" USING btree ("hatcheryOwnerId", "itemType", name, "unitPrice", "supplierKey");


--
-- Name: HatcheryInventoryItem_itemType_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryInventoryItem_itemType_idx" ON public."HatcheryInventoryItem" USING btree ("itemType");


--
-- Name: HatcheryInventoryTxn_itemId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryInventoryTxn_itemId_idx" ON public."HatcheryInventoryTxn" USING btree ("itemId");


--
-- Name: HatcheryInventoryTxn_sourceSupplierTxnId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryInventoryTxn_sourceSupplierTxnId_idx" ON public."HatcheryInventoryTxn" USING btree ("sourceSupplierTxnId");


--
-- Name: HatcheryParentSale_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryParentSale_batchId_idx" ON public."HatcheryParentSale" USING btree ("batchId");


--
-- Name: HatcheryParentSale_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryParentSale_date_idx" ON public."HatcheryParentSale" USING btree (date);


--
-- Name: HatcheryParentSale_partyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryParentSale_partyId_idx" ON public."HatcheryParentSale" USING btree ("partyId");


--
-- Name: HatcheryPartyPayment_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryPartyPayment_date_idx" ON public."HatcheryPartyPayment" USING btree (date);


--
-- Name: HatcheryPartyPayment_partyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryPartyPayment_partyId_idx" ON public."HatcheryPartyPayment" USING btree ("partyId");


--
-- Name: HatcheryPartyTxn_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryPartyTxn_date_idx" ON public."HatcheryPartyTxn" USING btree (date);


--
-- Name: HatcheryPartyTxn_partyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryPartyTxn_partyId_idx" ON public."HatcheryPartyTxn" USING btree ("partyId");


--
-- Name: HatcheryPartyTxn_sourceId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryPartyTxn_sourceId_idx" ON public."HatcheryPartyTxn" USING btree ("sourceId");


--
-- Name: HatcheryParty_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcheryParty_hatcheryOwnerId_idx" ON public."HatcheryParty" USING btree ("hatcheryOwnerId");


--
-- Name: HatcheryParty_hatcheryOwnerId_phone_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcheryParty_hatcheryOwnerId_phone_key" ON public."HatcheryParty" USING btree ("hatcheryOwnerId", phone);


--
-- Name: HatcherySupplierPurchaseItem_txnId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcherySupplierPurchaseItem_txnId_idx" ON public."HatcherySupplierPurchaseItem" USING btree ("txnId");


--
-- Name: HatcherySupplierTxn_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcherySupplierTxn_date_idx" ON public."HatcherySupplierTxn" USING btree (date);


--
-- Name: HatcherySupplierTxn_supplierId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcherySupplierTxn_supplierId_idx" ON public."HatcherySupplierTxn" USING btree ("supplierId");


--
-- Name: HatcherySupplier_hatcheryOwnerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "HatcherySupplier_hatcheryOwnerId_idx" ON public."HatcherySupplier" USING btree ("hatcheryOwnerId");


--
-- Name: HatcherySupplier_hatcheryOwnerId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "HatcherySupplier_hatcheryOwnerId_name_key" ON public."HatcherySupplier" USING btree ("hatcheryOwnerId", name);


--
-- Name: Hatchery_userId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Hatchery_userId_name_key" ON public."Hatchery" USING btree ("userId", name);


--
-- Name: InventoryItem_identity_with_expiry_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "InventoryItem_identity_with_expiry_key" ON public."InventoryItem" USING btree ("userId", "categoryId", name, "unitPrice", "supplierKey", "expiryDateKey");


--
-- Name: InventoryTransaction_itemId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "InventoryTransaction_itemId_date_idx" ON public."InventoryTransaction" USING btree ("itemId", date);


--
-- Name: InventoryUsage_batchId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "InventoryUsage_batchId_idx" ON public."InventoryUsage" USING btree ("batchId");


--
-- Name: InventoryUsage_farmId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "InventoryUsage_farmId_date_idx" ON public."InventoryUsage" USING btree ("farmId", date);


--
-- Name: InventoryUsage_itemId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "InventoryUsage_itemId_idx" ON public."InventoryUsage" USING btree ("itemId");


--
-- Name: LandingContact_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "LandingContact_createdAt_idx" ON public."LandingContact" USING btree ("createdAt");


--
-- Name: LandingReview_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "LandingReview_createdAt_idx" ON public."LandingReview" USING btree ("createdAt");


--
-- Name: ListForSale_category_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ListForSale_category_idx" ON public."ListForSale" USING btree (category);


--
-- Name: ListForSale_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ListForSale_createdAt_idx" ON public."ListForSale" USING btree ("createdAt");


--
-- Name: ListForSale_status_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ListForSale_status_idx" ON public."ListForSale" USING btree (status);


--
-- Name: ListForSale_userId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ListForSale_userId_idx" ON public."ListForSale" USING btree ("userId");


--
-- Name: MedicineSupplier_userId_name_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "MedicineSupplier_userId_name_key" ON public."MedicineSupplier" USING btree ("userId", name);


--
-- Name: Message_conversationId_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Message_conversationId_createdAt_idx" ON public."Message" USING btree ("conversationId", "createdAt");


--
-- Name: Mortality_batchId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Mortality_batchId_date_idx" ON public."Mortality" USING btree ("batchId", date);


--
-- Name: Mortality_saleId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Mortality_saleId_date_idx" ON public."Mortality" USING btree ("saleId", date);


--
-- Name: Notification_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Notification_userId_createdAt_idx" ON public."Notification" USING btree ("userId", "createdAt");


--
-- Name: Notification_userId_status_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Notification_userId_status_createdAt_idx" ON public."Notification" USING btree ("userId", status, "createdAt");


--
-- Name: PasswordResetOtp_createdAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "PasswordResetOtp_createdAt_idx" ON public."PasswordResetOtp" USING btree ("createdAt");


--
-- Name: PasswordResetOtp_phone_otp_used_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "PasswordResetOtp_phone_otp_used_idx" ON public."PasswordResetOtp" USING btree (phone, otp, used);


--
-- Name: ProductUnitConversion_productId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductUnitConversion_productId_idx" ON public."ProductUnitConversion" USING btree ("productId");


--
-- Name: ProductUnitConversion_productId_unitName_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "ProductUnitConversion_productId_unitName_key" ON public."ProductUnitConversion" USING btree ("productId", "unitName");


--
-- Name: ProductionInput_productionId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionInput_productionId_idx" ON public."ProductionInput" USING btree ("productionId");


--
-- Name: ProductionInput_rawMaterialId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionInput_rawMaterialId_idx" ON public."ProductionInput" USING btree ("rawMaterialId");


--
-- Name: ProductionInput_supplierId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionInput_supplierId_idx" ON public."ProductionInput" USING btree ("supplierId");


--
-- Name: ProductionOutput_productId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionOutput_productId_idx" ON public."ProductionOutput" USING btree ("productId");


--
-- Name: ProductionOutput_productionId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionOutput_productionId_idx" ON public."ProductionOutput" USING btree ("productionId");


--
-- Name: ProductionRun_companyId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "ProductionRun_companyId_date_idx" ON public."ProductionRun" USING btree ("companyId", date);


--
-- Name: PushSubscription_userId_endpoint_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON public."PushSubscription" USING btree ("userId", endpoint);


--
-- Name: PushSubscription_userId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "PushSubscription_userId_idx" ON public."PushSubscription" USING btree ("userId");


--
-- Name: RawMaterial_companyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "RawMaterial_companyId_idx" ON public."RawMaterial" USING btree ("companyId");


--
-- Name: RawMaterial_companyId_name_unit_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "RawMaterial_companyId_name_unit_key" ON public."RawMaterial" USING btree ("companyId", name, unit);


--
-- Name: Reminder_userId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Reminder_userId_idx" ON public."Reminder" USING btree ("userId");


--
-- Name: Reminder_userId_reminderDate_isNoticed_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Reminder_userId_reminderDate_isNoticed_idx" ON public."Reminder" USING btree ("userId", "reminderDate", "isNoticed");


--
-- Name: SaleDiscount_companySaleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "SaleDiscount_companySaleId_idx" ON public."SaleDiscount" USING btree ("companySaleId");


--
-- Name: SaleDiscount_companySaleId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "SaleDiscount_companySaleId_key" ON public."SaleDiscount" USING btree ("companySaleId");


--
-- Name: SaleDiscount_dealerSaleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "SaleDiscount_dealerSaleId_idx" ON public."SaleDiscount" USING btree ("dealerSaleId");


--
-- Name: SaleDiscount_dealerSaleId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "SaleDiscount_dealerSaleId_key" ON public."SaleDiscount" USING btree ("dealerSaleId");


--
-- Name: SaleEggLine_eggTypeId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "SaleEggLine_eggTypeId_idx" ON public."SaleEggLine" USING btree ("eggTypeId");


--
-- Name: SaleEggLine_saleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "SaleEggLine_saleId_idx" ON public."SaleEggLine" USING btree ("saleId");


--
-- Name: SalePayment_saleId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "SalePayment_saleId_date_idx" ON public."SalePayment" USING btree ("saleId", date);


--
-- Name: Sale_customerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Sale_customerId_idx" ON public."Sale" USING btree ("customerId");


--
-- Name: Sale_farmId_date_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Sale_farmId_date_idx" ON public."Sale" USING btree ("farmId", date);


--
-- Name: Sale_invoiceNumber_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Sale_invoiceNumber_idx" ON public."Sale" USING btree ("invoiceNumber");


--
-- Name: Sale_invoiceNumber_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON public."Sale" USING btree ("invoiceNumber");


--
-- Name: Sale_mortalityId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Sale_mortalityId_idx" ON public."Sale" USING btree ("mortalityId");


--
-- Name: Sale_mortalityId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "Sale_mortalityId_key" ON public."Sale" USING btree ("mortalityId");


--
-- Name: StaffPayment_paidAt_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StaffPayment_paidAt_idx" ON public."StaffPayment" USING btree ("paidAt");


--
-- Name: StaffPayment_staffId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StaffPayment_staffId_idx" ON public."StaffPayment" USING btree ("staffId");


--
-- Name: StaffSalary_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StaffSalary_effectiveFrom_idx" ON public."StaffSalary" USING btree ("effectiveFrom");


--
-- Name: StaffSalary_staffId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StaffSalary_staffId_idx" ON public."StaffSalary" USING btree ("staffId");


--
-- Name: Staff_ownerId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Staff_ownerId_idx" ON public."Staff" USING btree ("ownerId");


--
-- Name: Staff_status_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Staff_status_idx" ON public."Staff" USING btree (status);


--
-- Name: StandardVaccinationSchedule_dayFrom_dayTo_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StandardVaccinationSchedule_dayFrom_dayTo_idx" ON public."StandardVaccinationSchedule" USING btree ("dayFrom", "dayTo");


--
-- Name: StandardVaccinationSchedule_isActive_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "StandardVaccinationSchedule_isActive_idx" ON public."StandardVaccinationSchedule" USING btree ("isActive");


--
-- Name: Supplier_companyId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Supplier_companyId_idx" ON public."Supplier" USING btree ("companyId");


--
-- Name: UserOnboardingPayment_state_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "UserOnboardingPayment_state_idx" ON public."UserOnboardingPayment" USING btree (state);


--
-- Name: UserOnboardingPayment_userId_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "UserOnboardingPayment_userId_key" ON public."UserOnboardingPayment" USING btree ("userId");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: Vaccination_batchId_batchAge_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_batchId_batchAge_idx" ON public."Vaccination" USING btree ("batchId", "batchAge");


--
-- Name: Vaccination_batchId_scheduledDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_batchId_scheduledDate_idx" ON public."Vaccination" USING btree ("batchId", "scheduledDate");


--
-- Name: Vaccination_farmId_scheduledDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_farmId_scheduledDate_idx" ON public."Vaccination" USING btree ("farmId", "scheduledDate");


--
-- Name: Vaccination_standardScheduleId_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_standardScheduleId_idx" ON public."Vaccination" USING btree ("standardScheduleId");


--
-- Name: Vaccination_status_scheduledDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_status_scheduledDate_idx" ON public."Vaccination" USING btree (status, "scheduledDate");


--
-- Name: Vaccination_userId_scheduledDate_idx; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "Vaccination_userId_scheduledDate_idx" ON public."Vaccination" USING btree ("userId", "scheduledDate");


--
-- Name: _CompanyManagedBy_B_index; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "_CompanyManagedBy_B_index" ON public."_CompanyManagedBy" USING btree ("B");


--
-- Name: _DealerManagers_B_index; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "_DealerManagers_B_index" ON public."_DealerManagers" USING btree ("B");


--
-- Name: _FarmManagers_B_index; Type: INDEX; Schema: public; Owner: poultry360
--

CREATE INDEX "_FarmManagers_B_index" ON public."_FarmManagers" USING btree ("B");


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BatchEggInventory BatchEggInventory_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchEggInventory"
    ADD CONSTRAINT "BatchEggInventory_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BatchEggInventory BatchEggInventory_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchEggInventory"
    ADD CONSTRAINT "BatchEggInventory_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."EggType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BatchNote BatchNote_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchNote"
    ADD CONSTRAINT "BatchNote_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BatchShareView BatchShareView_shareId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShareView"
    ADD CONSTRAINT "BatchShareView_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES public."BatchShare"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BatchShareView BatchShareView_viewerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShareView"
    ADD CONSTRAINT "BatchShareView_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BatchShare BatchShare_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShare"
    ADD CONSTRAINT "BatchShare_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BatchShare BatchShare_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShare"
    ADD CONSTRAINT "BatchShare_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: BatchShare BatchShare_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShare"
    ADD CONSTRAINT "BatchShare_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: BatchShare BatchShare_sharedWithId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BatchShare"
    ADD CONSTRAINT "BatchShare_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Batch Batch_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Batch"
    ADD CONSTRAINT "Batch_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: BirdWeight BirdWeight_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."BirdWeight"
    ADD CONSTRAINT "BirdWeight_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Category Category_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyDealerAccountAdjustment CompanyDealerAccountAdjustment_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccountAdjustment"
    ADD CONSTRAINT "CompanyDealerAccountAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CompanyDealerAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyDealerAccount CompanyDealerAccount_balanceLimitSetBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccount"
    ADD CONSTRAINT "CompanyDealerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompanyDealerAccount CompanyDealerAccount_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccount"
    ADD CONSTRAINT "CompanyDealerAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyDealerAccount CompanyDealerAccount_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerAccount"
    ADD CONSTRAINT "CompanyDealerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyDealerPayment CompanyDealerPayment_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerPayment"
    ADD CONSTRAINT "CompanyDealerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CompanyDealerAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyDealerPayment CompanyDealerPayment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyDealerPayment"
    ADD CONSTRAINT "CompanyDealerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyLedgerEntry CompanyLedgerEntry_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyLedgerEntry"
    ADD CONSTRAINT "CompanyLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyLedgerEntry CompanyLedgerEntry_companySaleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyLedgerEntry"
    ADD CONSTRAINT "CompanyLedgerEntry_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES public."CompanySale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompanyPurchaseItem CompanyPurchaseItem_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchaseItem"
    ADD CONSTRAINT "CompanyPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."CompanyPurchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyPurchaseItem CompanyPurchaseItem_rawMaterialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchaseItem"
    ADD CONSTRAINT "CompanyPurchaseItem_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES public."RawMaterial"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanyPurchase CompanyPurchase_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchase"
    ADD CONSTRAINT "CompanyPurchase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanyPurchase CompanyPurchase_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchase"
    ADD CONSTRAINT "CompanyPurchase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompanyPurchase CompanyPurchase_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanyPurchase"
    ADD CONSTRAINT "CompanyPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CompanySaleItem CompanySaleItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySaleItem"
    ADD CONSTRAINT "CompanySaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySaleItem CompanySaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySaleItem"
    ADD CONSTRAINT "CompanySaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."CompanySale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySale CompanySale_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySale"
    ADD CONSTRAINT "CompanySale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."CompanyDealerAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompanySale CompanySale_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySale"
    ADD CONSTRAINT "CompanySale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySale CompanySale_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySale"
    ADD CONSTRAINT "CompanySale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySale CompanySale_soldById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySale"
    ADD CONSTRAINT "CompanySale_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySupplierPayment CompanySupplierPayment_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySupplierPayment"
    ADD CONSTRAINT "CompanySupplierPayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CompanySupplierPayment CompanySupplierPayment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySupplierPayment"
    ADD CONSTRAINT "CompanySupplierPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CompanySupplierPayment CompanySupplierPayment_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CompanySupplierPayment"
    ADD CONSTRAINT "CompanySupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Company Company_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Conversation Conversation_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Conversation Conversation_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Conversation"
    ADD CONSTRAINT "Conversation_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: CustomerTransaction CustomerTransaction_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."CustomerTransaction"
    ADD CONSTRAINT "CustomerTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Customer Customer_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Customer Customer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCartItem DealerCartItem_cartId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCartItem"
    ADD CONSTRAINT "DealerCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES public."DealerCart"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCartItem DealerCartItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCartItem"
    ADD CONSTRAINT "DealerCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCart DealerCart_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCart"
    ADD CONSTRAINT "DealerCart_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCart DealerCart_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCart"
    ADD CONSTRAINT "DealerCart_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCashDayClose DealerCashDayClose_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashDayClose"
    ADD CONSTRAINT "DealerCashDayClose_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCashMovement DealerCashMovement_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashMovement"
    ADD CONSTRAINT "DealerCashMovement_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerCashMovement DealerCashMovement_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashMovement"
    ADD CONSTRAINT "DealerCashMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerCashSettings DealerCashSettings_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerCashSettings"
    ADD CONSTRAINT "DealerCashSettings_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerFarmerAccountAdjustment DealerFarmerAccountAdjustment_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccountAdjustment"
    ADD CONSTRAINT "DealerFarmerAccountAdjustment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."DealerFarmerAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerFarmerAccount DealerFarmerAccount_balanceLimitSetBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccount"
    ADD CONSTRAINT "DealerFarmerAccount_balanceLimitSetBy_fkey" FOREIGN KEY ("balanceLimitSetBy") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerFarmerAccount DealerFarmerAccount_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccount"
    ADD CONSTRAINT "DealerFarmerAccount_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerFarmerAccount DealerFarmerAccount_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerAccount"
    ADD CONSTRAINT "DealerFarmerAccount_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerFarmerPayment DealerFarmerPayment_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerPayment"
    ADD CONSTRAINT "DealerFarmerPayment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."DealerFarmerAccount"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerFarmerPayment DealerFarmerPayment_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerFarmerPayment"
    ADD CONSTRAINT "DealerFarmerPayment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DealerLedgerEntry DealerLedgerEntry_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerLedgerEntry"
    ADD CONSTRAINT "DealerLedgerEntry_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerLedgerEntry DealerLedgerEntry_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerLedgerEntry"
    ADD CONSTRAINT "DealerLedgerEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."DealerSale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerManualCompanyAdjustment DealerManualCompanyAdjustment_manualCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompanyAdjustment"
    ADD CONSTRAINT "DealerManualCompanyAdjustment_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES public."DealerManualCompany"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerManualCompanyPayment DealerManualCompanyPayment_manualCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompanyPayment"
    ADD CONSTRAINT "DealerManualCompanyPayment_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES public."DealerManualCompany"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerManualCompany DealerManualCompany_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualCompany"
    ADD CONSTRAINT "DealerManualCompany_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerManualPurchaseItem DealerManualPurchaseItem_dealerProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualPurchaseItem"
    ADD CONSTRAINT "DealerManualPurchaseItem_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES public."DealerProduct"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerManualPurchaseItem DealerManualPurchaseItem_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualPurchaseItem"
    ADD CONSTRAINT "DealerManualPurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."DealerManualPurchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerManualPurchase DealerManualPurchase_manualCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerManualPurchase"
    ADD CONSTRAINT "DealerManualPurchase_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES public."DealerManualCompany"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerProductTransaction DealerProductTransaction_dealerSaleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProductTransaction"
    ADD CONSTRAINT "DealerProductTransaction_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES public."DealerSale"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerProductTransaction DealerProductTransaction_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProductTransaction"
    ADD CONSTRAINT "DealerProductTransaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."DealerProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DealerProductUnitConversion DealerProductUnitConversion_dealerProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProductUnitConversion"
    ADD CONSTRAINT "DealerProductUnitConversion_dealerProductId_fkey" FOREIGN KEY ("dealerProductId") REFERENCES public."DealerProduct"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerProduct DealerProduct_companyProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProduct"
    ADD CONSTRAINT "DealerProduct_companyProductId_fkey" FOREIGN KEY ("companyProductId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerProduct DealerProduct_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProduct"
    ADD CONSTRAINT "DealerProduct_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerProduct DealerProduct_manualCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProduct"
    ADD CONSTRAINT "DealerProduct_manualCompanyId_fkey" FOREIGN KEY ("manualCompanyId") REFERENCES public."DealerManualCompany"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerProduct DealerProduct_supplierCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerProduct"
    ADD CONSTRAINT "DealerProduct_supplierCompanyId_fkey" FOREIGN KEY ("supplierCompanyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerSaleItem DealerSaleItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSaleItem"
    ADD CONSTRAINT "DealerSaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."DealerProduct"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DealerSaleItem DealerSaleItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSaleItem"
    ADD CONSTRAINT "DealerSaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."DealerSale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerSalePayment DealerSalePayment_linkedLedgerEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSalePayment"
    ADD CONSTRAINT "DealerSalePayment_linkedLedgerEntryId_fkey" FOREIGN KEY ("linkedLedgerEntryId") REFERENCES public."DealerLedgerEntry"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerSalePayment DealerSalePayment_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSalePayment"
    ADD CONSTRAINT "DealerSalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."DealerSale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerSale DealerSale_accountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSale"
    ADD CONSTRAINT "DealerSale_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES public."DealerFarmerAccount"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerSale DealerSale_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSale"
    ADD CONSTRAINT "DealerSale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealerSale DealerSale_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSale"
    ADD CONSTRAINT "DealerSale_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DealerSale DealerSale_farmerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."DealerSale"
    ADD CONSTRAINT "DealerSale_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Dealer Dealer_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Dealer Dealer_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Dealer"
    ADD CONSTRAINT "Dealer_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EggProductionEntry EggProductionEntry_eggProductionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggProductionEntry"
    ADD CONSTRAINT "EggProductionEntry_eggProductionId_fkey" FOREIGN KEY ("eggProductionId") REFERENCES public."EggProduction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EggProductionEntry EggProductionEntry_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggProductionEntry"
    ADD CONSTRAINT "EggProductionEntry_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."EggType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EggProduction EggProduction_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggProduction"
    ADD CONSTRAINT "EggProduction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EggType EggType_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EggType"
    ADD CONSTRAINT "EggType_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EntityTransaction EntityTransaction_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EntityTransaction EntityTransaction_dealerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EntityTransaction EntityTransaction_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public."Expense"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EntityTransaction EntityTransaction_hatcheryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_hatcheryId_fkey" FOREIGN KEY ("hatcheryId") REFERENCES public."Hatchery"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EntityTransaction EntityTransaction_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EntityTransaction EntityTransaction_medicineSupplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_medicineSupplierId_fkey" FOREIGN KEY ("medicineSupplierId") REFERENCES public."MedicineSupplier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: EntityTransaction EntityTransaction_paymentToPurchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_paymentToPurchaseId_fkey" FOREIGN KEY ("paymentToPurchaseId") REFERENCES public."EntityTransaction"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EntityTransaction EntityTransaction_sourceDealerLedgerEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."EntityTransaction"
    ADD CONSTRAINT "EntityTransaction_sourceDealerLedgerEntryId_fkey" FOREIGN KEY ("sourceDealerLedgerEntryId") REFERENCES public."DealerLedgerEntry"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Expense Expense_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Expense Expense_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Farm Farm_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Farm"
    ADD CONSTRAINT "Farm_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FarmerCashDayClose FarmerCashDayClose_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashDayClose"
    ADD CONSTRAINT "FarmerCashDayClose_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FarmerCashMovement FarmerCashMovement_recordedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashMovement"
    ADD CONSTRAINT "FarmerCashMovement_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FarmerCashMovement FarmerCashMovement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashMovement"
    ADD CONSTRAINT "FarmerCashMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FarmerCashSettings FarmerCashSettings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FarmerCashSettings"
    ADD CONSTRAINT "FarmerCashSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FeedConsumption FeedConsumption_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."FeedConsumption"
    ADD CONSTRAINT "FeedConsumption_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryBatchExpense HatcheryBatchExpense_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchExpense"
    ADD CONSTRAINT "HatcheryBatchExpense_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryBatchExpense HatcheryBatchExpense_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchExpense"
    ADD CONSTRAINT "HatcheryBatchExpense_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."HatcheryInventoryItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryBatchMortality HatcheryBatchMortality_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchMortality"
    ADD CONSTRAINT "HatcheryBatchMortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryBatchPlacement HatcheryBatchPlacement_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchPlacement"
    ADD CONSTRAINT "HatcheryBatchPlacement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryBatchPlacement HatcheryBatchPlacement_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatchPlacement"
    ADD CONSTRAINT "HatcheryBatchPlacement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."HatcheryInventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryBatch HatcheryBatch_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBatch"
    ADD CONSTRAINT "HatcheryBatch_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryBusiness HatcheryBusiness_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryBusiness"
    ADD CONSTRAINT "HatcheryBusiness_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryChickSale HatcheryChickSale_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickSale"
    ADD CONSTRAINT "HatcheryChickSale_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryChickSale HatcheryChickSale_inventoryItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickSale"
    ADD CONSTRAINT "HatcheryChickSale_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES public."HatcheryInventoryItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryChickSale HatcheryChickSale_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickSale"
    ADD CONSTRAINT "HatcheryChickSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."HatcheryParty"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryChickStock HatcheryChickStock_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickStock"
    ADD CONSTRAINT "HatcheryChickStock_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryChickTxn HatcheryChickTxn_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryChickTxn"
    ADD CONSTRAINT "HatcheryChickTxn_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggMove HatcheryEggMove_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggMove"
    ADD CONSTRAINT "HatcheryEggMove_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryEggMove HatcheryEggMove_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggMove"
    ADD CONSTRAINT "HatcheryEggMove_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggProductionLine HatcheryEggProductionLine_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggProductionLine"
    ADD CONSTRAINT "HatcheryEggProductionLine_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryEggProductionLine HatcheryEggProductionLine_productionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggProductionLine"
    ADD CONSTRAINT "HatcheryEggProductionLine_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES public."HatcheryEggProduction"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggProduction HatcheryEggProduction_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggProduction"
    ADD CONSTRAINT "HatcheryEggProduction_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggSale HatcheryEggSale_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggSale"
    ADD CONSTRAINT "HatcheryEggSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggSale HatcheryEggSale_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggSale"
    ADD CONSTRAINT "HatcheryEggSale_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryEggSale HatcheryEggSale_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggSale"
    ADD CONSTRAINT "HatcheryEggSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."HatcheryParty"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryEggStock HatcheryEggStock_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggStock"
    ADD CONSTRAINT "HatcheryEggStock_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggStock HatcheryEggStock_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggStock"
    ADD CONSTRAINT "HatcheryEggStock_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryEggTxn HatcheryEggTxn_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggTxn"
    ADD CONSTRAINT "HatcheryEggTxn_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryEggTxn HatcheryEggTxn_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggTxn"
    ADD CONSTRAINT "HatcheryEggTxn_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryEggType HatcheryEggType_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryEggType"
    ADD CONSTRAINT "HatcheryEggType_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryHatchResult HatcheryHatchResult_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryHatchResult"
    ADD CONSTRAINT "HatcheryHatchResult_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryIncubationBatch HatcheryIncubationBatch_hatchableEggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationBatch"
    ADD CONSTRAINT "HatcheryIncubationBatch_hatchableEggTypeId_fkey" FOREIGN KEY ("hatchableEggTypeId") REFERENCES public."HatcheryEggType"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryIncubationBatch HatcheryIncubationBatch_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationBatch"
    ADD CONSTRAINT "HatcheryIncubationBatch_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryIncubationBatch HatcheryIncubationBatch_parentBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationBatch"
    ADD CONSTRAINT "HatcheryIncubationBatch_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: HatcheryIncubationLoss HatcheryIncubationLoss_incubationBatchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryIncubationLoss"
    ADD CONSTRAINT "HatcheryIncubationLoss_incubationBatchId_fkey" FOREIGN KEY ("incubationBatchId") REFERENCES public."HatcheryIncubationBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryInventoryItem HatcheryInventoryItem_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryInventoryItem"
    ADD CONSTRAINT "HatcheryInventoryItem_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryInventoryTxn HatcheryInventoryTxn_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryInventoryTxn"
    ADD CONSTRAINT "HatcheryInventoryTxn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."HatcheryInventoryItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryInventoryTxn HatcheryInventoryTxn_sourceSupplierTxnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryInventoryTxn"
    ADD CONSTRAINT "HatcheryInventoryTxn_sourceSupplierTxnId_fkey" FOREIGN KEY ("sourceSupplierTxnId") REFERENCES public."HatcherySupplierTxn"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryParentSale HatcheryParentSale_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryParentSale"
    ADD CONSTRAINT "HatcheryParentSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."HatcheryBatch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryParentSale HatcheryParentSale_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryParentSale"
    ADD CONSTRAINT "HatcheryParentSale_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."HatcheryParty"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: HatcheryPartyPayment HatcheryPartyPayment_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryPartyPayment"
    ADD CONSTRAINT "HatcheryPartyPayment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."HatcheryParty"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryPartyTxn HatcheryPartyTxn_partyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryPartyTxn"
    ADD CONSTRAINT "HatcheryPartyTxn_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES public."HatcheryParty"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcheryParty HatcheryParty_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcheryParty"
    ADD CONSTRAINT "HatcheryParty_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcherySupplierPurchaseItem HatcherySupplierPurchaseItem_txnId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplierPurchaseItem"
    ADD CONSTRAINT "HatcherySupplierPurchaseItem_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES public."HatcherySupplierTxn"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcherySupplierTxn HatcherySupplierTxn_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplierTxn"
    ADD CONSTRAINT "HatcherySupplierTxn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."HatcherySupplier"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: HatcherySupplier HatcherySupplier_hatcheryOwnerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."HatcherySupplier"
    ADD CONSTRAINT "HatcherySupplier_hatcheryOwnerId_fkey" FOREIGN KEY ("hatcheryOwnerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Hatchery Hatchery_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Hatchery"
    ADD CONSTRAINT "Hatchery_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryItem InventoryItem_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryItem InventoryItem_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryTransaction InventoryTransaction_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryTransaction"
    ADD CONSTRAINT "InventoryTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: InventoryUsage InventoryUsage_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryUsage"
    ADD CONSTRAINT "InventoryUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryUsage InventoryUsage_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryUsage"
    ADD CONSTRAINT "InventoryUsage_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public."Expense"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: InventoryUsage InventoryUsage_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryUsage"
    ADD CONSTRAINT "InventoryUsage_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryUsage InventoryUsage_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."InventoryUsage"
    ADD CONSTRAINT "InventoryUsage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ListForSale ListForSale_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ListForSale"
    ADD CONSTRAINT "ListForSale_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MedicineSupplier MedicineSupplier_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."MedicineSupplier"
    ADD CONSTRAINT "MedicineSupplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_batchShareId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_batchShareId_fkey" FOREIGN KEY ("batchShareId") REFERENCES public."BatchShare"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Message Message_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public."Conversation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Message Message_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Message"
    ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Mortality Mortality_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Mortality"
    ADD CONSTRAINT "Mortality_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductUnitConversion ProductUnitConversion_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductUnitConversion"
    ADD CONSTRAINT "ProductUnitConversion_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Product Product_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionInput ProductionInput_productionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionInput"
    ADD CONSTRAINT "ProductionInput_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES public."ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionInput ProductionInput_rawMaterialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionInput"
    ADD CONSTRAINT "ProductionInput_rawMaterialId_fkey" FOREIGN KEY ("rawMaterialId") REFERENCES public."RawMaterial"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductionInput ProductionInput_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionInput"
    ADD CONSTRAINT "ProductionInput_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ProductionOutput ProductionOutput_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionOutput"
    ADD CONSTRAINT "ProductionOutput_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ProductionOutput ProductionOutput_productionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionOutput"
    ADD CONSTRAINT "ProductionOutput_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES public."ProductionRun"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionRun ProductionRun_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionRun"
    ADD CONSTRAINT "ProductionRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ProductionRun ProductionRun_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."ProductionRun"
    ADD CONSTRAINT "ProductionRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PushSubscription PushSubscription_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."PushSubscription"
    ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RawMaterial RawMaterial_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."RawMaterial"
    ADD CONSTRAINT "RawMaterial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Reminder Reminder_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Reminder Reminder_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Reminder"
    ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleDiscount SaleDiscount_companySaleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleDiscount"
    ADD CONSTRAINT "SaleDiscount_companySaleId_fkey" FOREIGN KEY ("companySaleId") REFERENCES public."CompanySale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleDiscount SaleDiscount_dealerSaleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleDiscount"
    ADD CONSTRAINT "SaleDiscount_dealerSaleId_fkey" FOREIGN KEY ("dealerSaleId") REFERENCES public."DealerSale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleEggLine SaleEggLine_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleEggLine"
    ADD CONSTRAINT "SaleEggLine_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."EggType"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SaleEggLine SaleEggLine_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SaleEggLine"
    ADD CONSTRAINT "SaleEggLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SalePayment SalePayment_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."SalePayment"
    ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_eggTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_eggTypeId_fkey" FOREIGN KEY ("eggTypeId") REFERENCES public."EggType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_mortalityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_mortalityId_fkey" FOREIGN KEY ("mortalityId") REFERENCES public."Mortality"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffPayment StaffPayment_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffSalary StaffSalary_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."StaffSalary"
    ADD CONSTRAINT "StaffSalary_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Staff Staff_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Supplier Supplier_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserOnboardingPayment UserOnboardingPayment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."UserOnboardingPayment"
    ADD CONSTRAINT "UserOnboardingPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vaccination Vaccination_batchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES public."Batch"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vaccination Vaccination_farmId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Vaccination Vaccination_standardScheduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_standardScheduleId_fkey" FOREIGN KEY ("standardScheduleId") REFERENCES public."StandardVaccinationSchedule"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Vaccination Vaccination_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."Vaccination"
    ADD CONSTRAINT "Vaccination_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CompanyManagedBy _CompanyManagedBy_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_CompanyManagedBy"
    ADD CONSTRAINT "_CompanyManagedBy_A_fkey" FOREIGN KEY ("A") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _CompanyManagedBy _CompanyManagedBy_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_CompanyManagedBy"
    ADD CONSTRAINT "_CompanyManagedBy_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _DealerManagers _DealerManagers_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_DealerManagers"
    ADD CONSTRAINT "_DealerManagers_A_fkey" FOREIGN KEY ("A") REFERENCES public."Dealer"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _DealerManagers _DealerManagers_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_DealerManagers"
    ADD CONSTRAINT "_DealerManagers_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FarmManagers _FarmManagers_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_FarmManagers"
    ADD CONSTRAINT "_FarmManagers_A_fkey" FOREIGN KEY ("A") REFERENCES public."Farm"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _FarmManagers _FarmManagers_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: poultry360
--

ALTER TABLE ONLY public."_FarmManagers"
    ADD CONSTRAINT "_FarmManagers_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
