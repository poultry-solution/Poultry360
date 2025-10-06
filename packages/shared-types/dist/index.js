"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInventoryUsageSchema = exports.InventoryUsageSchema = exports.CreateInventoryTransactionSchema = exports.InventoryTransactionSchema = exports.UpdateInventoryItemSchema = exports.CreateInventoryItemSchema = exports.InventoryItemSchema = exports.InventoryItemTypeSchema = exports.CreateSalePaymentSchema = exports.SalePaymentSchema = exports.UpdateSaleSchema = exports.CreateSaleSchema = exports.SaleSchema = exports.SalesItemTypeSchema = exports.UpdateExpenseSchema = exports.CreateExpenseSchema = exports.ExpenseSchema = exports.UpdateCategorySchema = exports.CreateCategorySchema = exports.CategorySchema = exports.BatchSummarySchema = exports.CloseBatchSchema = exports.UpdateBatchSchema = exports.CreateBatchSchema = exports.BatchResponseSchema = exports.BatchCountSchema = exports.BatchFarmSchema = exports.BatchSchema = exports.UpdateFarmSchema = exports.CreateFarmSchema = exports.FarmResponseSchema = exports.FarmCountSchema = exports.FarmManagerSchema = exports.FarmOwnerSchema = exports.FarmSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.UserSchema = exports.BaseSchema = exports.RecurrencePatternSchema = exports.ReminderStatusSchema = exports.ReminderTypeSchema = exports.CategoryTypeSchema = exports.AuditActionSchema = exports.VaccinationStatusSchema = exports.NotificationStatusSchema = exports.NotificationTypeSchema = exports.TransactionTypeSchema = exports.BatchStatusSchema = exports.UserRoleSchema = void 0;
exports.FarmDetailResponseSchema = exports.FarmListResponseSchema = exports.AuthResponseSchema = exports.UserResponseSchema = exports.FarmAnalyticsSchema = exports.BatchAnalyticsSchema = exports.SignupSchema = exports.CalendarTypeSchema = exports.LanguageSchema = exports.LoginSchema = exports.CreateAuditLogSchema = exports.AuditLogSchema = exports.UpdateReminderSchema = exports.CreateReminderSchema = exports.ReminderSchema = exports.UpdateNotificationSchema = exports.CreateNotificationSchema = exports.NotificationSchema = exports.UpdateBirdWeightSchema = exports.CreateBirdWeightSchema = exports.BirdWeightSchema = exports.UpdateFeedConsumptionSchema = exports.CreateFeedConsumptionSchema = exports.FeedConsumptionSchema = exports.UpdateVaccinationSchema = exports.CreateVaccinationSchema = exports.VaccinationSchema = exports.UpdateMortalitySchema = exports.CreateMortalitySchema = exports.MortalitySchema = exports.CreateCustomerTransactionSchema = exports.CustomerTransactionSchema = exports.UpdateCustomerSchema = exports.CreateCustomerSchema = exports.CustomerSchema = exports.UpdateMedicineSupplierSchema = exports.CreateMedicineSupplierSchema = exports.MedicineSupplierSchema = exports.UpdateHatcherySchema = exports.CreateHatcherySchema = exports.HatcherySchema = exports.DealerDetailResponseSchema = exports.DealerStatisticsSchema = exports.DealerResponseSchema = exports.DealerTransactionSchema = exports.UpdateDealerSchema = exports.CreateDealerSchema = exports.DealerSchema = exports.CreateEntityTransactionSchema = exports.EntityTransactionSchema = void 0;
exports.PaginatedResponseSchema = exports.ApiResponseSchema = exports.schemas = exports.BatchDetailResponseSchema = exports.BatchListResponseSchema = void 0;
// packages/shared-types/index.ts
const zod_1 = require("zod");
// ==================== ENUMS ====================
exports.UserRoleSchema = zod_1.z.enum(["OWNER", "MANAGER"]);
exports.BatchStatusSchema = zod_1.z.enum(["ACTIVE", "COMPLETED"]);
exports.TransactionTypeSchema = zod_1.z.enum([
    "PURCHASE",
    "SALE",
    "PAYMENT",
    "RECEIPT",
    "ADJUSTMENT",
    "OPENING_BALANCE",
    "USAGE",
]);
exports.NotificationTypeSchema = zod_1.z.enum([
    "LOW_INVENTORY",
    "VACCINATION_DUE",
    "BATCH_COMPLETION",
    "PAYMENT_DUE",
    "MORTALITY_ALERT",
]);
exports.NotificationStatusSchema = zod_1.z.enum([
    "PENDING",
    "READ",
    "DISMISSED",
]);
exports.VaccinationStatusSchema = zod_1.z.enum([
    "PENDING",
    "COMPLETED",
    "MISSED",
    "OVERDUE",
]);
exports.AuditActionSchema = zod_1.z.enum([
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
]);
exports.CategoryTypeSchema = zod_1.z.enum(["EXPENSE", "SALES", "INVENTORY"]);
// ==================== REMINDER SCHEMAS ====================
exports.ReminderTypeSchema = zod_1.z.enum([
    "VACCINATION",
    "FEEDING",
    "MEDICATION",
    "CLEANING",
    "WEIGHING",
    "SUPPLIER_PAYMENT",
    "CUSTOMER_PAYMENT",
    "GENERAL",
]);
exports.ReminderStatusSchema = zod_1.z.enum([
    "PENDING",
    "COMPLETED",
    "CANCELLED",
    "OVERDUE",
]);
exports.RecurrencePatternSchema = zod_1.z.enum([
    "NONE",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "CUSTOM",
]);
// ==================== BASE SCHEMAS ====================
exports.BaseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// ==================== USER SCHEMAS ====================
exports.UserSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string(),
    role: exports.UserRoleSchema,
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
    ownerId: zod_1.z.string().nullable(),
    companyName: zod_1.z.string().nullable(),
    CompanyFarmLocation: zod_1.z.string().nullable(),
});
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.email().optional(),
    name: zod_1.z.string(),
    phone: zod_1.z.string().optional(),
    password: zod_1.z.string(),
    role: exports.UserRoleSchema.optional().default("OWNER"),
    gender: zod_1.z.enum(["MALE", "FEMALE", "OTHER"]).optional().default("OTHER"),
    ownerId: zod_1.z.string().optional(),
    companyName: zod_1.z.string().optional(),
    CompanyFarmLocation: zod_1.z.string().optional(),
    CompanyFarmNumber: zod_1.z.string().optional(),
    CompanyFarmCapacity: zod_1.z.number().int().optional(),
});
exports.UpdateUserSchema = zod_1.z.object({
    email: zod_1.z.email().optional(),
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    role: exports.UserRoleSchema.optional(),
    gender: zod_1.z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]).optional(),
    ownerId: zod_1.z.string().nullable().optional(),
    companyName: zod_1.z.string().nullable().optional(),
    CompanyFarmLocation: zod_1.z.string().nullable().optional(),
    CompanyFarmNumber: zod_1.z.string().nullable().optional(),
    CompanyFarmCapacity: zod_1.z.number().int().nullable().optional(),
});
// ==================== FARM SCHEMAS ====================
exports.FarmSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    capacity: zod_1.z.number().int().positive(),
    description: zod_1.z.string().nullable(),
    ownerId: zod_1.z.string(), // Farm owner
    managers: zod_1.z.array(zod_1.z.string()).optional(), // Farm managers (array of user IDs)
});
// ==================== FARM RESPONSE SCHEMAS ====================
exports.FarmOwnerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().nullable(),
    role: exports.UserRoleSchema,
});
exports.FarmManagerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().nullable(),
    role: exports.UserRoleSchema,
});
exports.FarmCountSchema = zod_1.z.object({
    batches: zod_1.z.number().int().nonnegative(),
    activeBatches: zod_1.z.number().int().nonnegative().optional(),
    closedBatches: zod_1.z.number().int().nonnegative().optional(),
    expenses: zod_1.z.number().int().nonnegative(),
    sales: zod_1.z.number().int().nonnegative(),
});
exports.FarmResponseSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    capacity: zod_1.z.number().int().positive(),
    description: zod_1.z.string().nullable(),
    ownerId: zod_1.z.string(),
    owner: exports.FarmOwnerSchema,
    managers: zod_1.z.array(exports.FarmManagerSchema),
    _count: exports.FarmCountSchema,
});
exports.CreateFarmSchema = zod_1.z.object({
    name: zod_1.z.string(),
    capacity: zod_1.z.number().int().positive(),
    description: zod_1.z.string().optional(),
    ownerId: zod_1.z.string().optional(), // Will be set by backend from auth
    managers: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.UpdateFarmSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    capacity: zod_1.z.number().int().positive().optional(),
    description: zod_1.z.string().optional(),
    ownerId: zod_1.z.string().optional(),
    managers: zod_1.z.array(zod_1.z.string()).optional(),
});
// ==================== BATCH SCHEMAS ====================
exports.BatchSchema = exports.BaseSchema.extend({
    batchNumber: zod_1.z.string(),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date().nullable(),
    status: exports.BatchStatusSchema,
    initialChicks: zod_1.z.number().int().positive(),
    initialChickWeight: zod_1.z.number().positive(),
    farmId: zod_1.z.string(),
    notes: zod_1.z.string().nullable(),
});
// ==================== BATCH RESPONSE SCHEMAS ====================
exports.BatchFarmSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    capacity: zod_1.z.number().int().positive(),
    owner: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        email: zod_1.z.string().nullable(),
    }),
});
exports.BatchCountSchema = zod_1.z.object({
    expenses: zod_1.z.number().int().nonnegative(),
    sales: zod_1.z.number().int().nonnegative(),
    mortalities: zod_1.z.number().int().nonnegative(),
    vaccinations: zod_1.z.number().int().nonnegative(),
    feedConsumptions: zod_1.z.number().int().nonnegative(),
    birdWeights: zod_1.z.number().int().nonnegative(),
    notes: zod_1.z.string().nullable(),
});
exports.BatchResponseSchema = exports.BaseSchema.extend({
    batchNumber: zod_1.z.string(),
    startDate: zod_1.z.date(),
    endDate: zod_1.z.date().nullable(),
    status: exports.BatchStatusSchema,
    initialChicks: zod_1.z.number().int().positive(),
    initialChickWeight: zod_1.z.number().positive(),
    farmId: zod_1.z.string(),
    currentChicks: zod_1.z.number().int().nonnegative(), // Computed field
    farm: exports.BatchFarmSchema,
    expenses: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        date: zod_1.z.date(),
        amount: zod_1.z.number(),
        description: zod_1.z.string().nullable(),
        quantity: zod_1.z.number().nullable(),
        unitPrice: zod_1.z.number().nullable(),
        category: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            type: zod_1.z.string(),
        }),
    }))
        .optional(),
    sales: zod_1.z
        .array(zod_1.z.object({
        id: zod_1.z.string(),
        date: zod_1.z.date(),
        amount: zod_1.z.number(),
        quantity: zod_1.z.number(),
        weight: zod_1.z.number(),
        unitPrice: zod_1.z.number(),
        description: zod_1.z.string().nullable(),
        isCredit: zod_1.z.boolean(),
        paidAmount: zod_1.z.number(),
        dueAmount: zod_1.z.number().nullable(),
        category: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            type: zod_1.z.string(),
        }),
    }))
        .optional(),
    _count: exports.BatchCountSchema,
});
exports.CreateBatchSchema = zod_1.z.object({
    batchNumber: zod_1.z.string(),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().optional(),
    status: exports.BatchStatusSchema.optional().default("ACTIVE"),
    // initialChicks will be derived from chicksInventory.quantity
    initialChicks: zod_1.z.number().int().positive().optional(),
    initialChickWeight: zod_1.z.number().positive().optional().default(0.045),
    farmId: zod_1.z.string(),
    // Required: allocate chicks from one or more inventory items when creating a batch
    chicksInventory: zod_1.z.array(zod_1.z.object({
        itemId: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
        notes: zod_1.z.string().optional(),
    })).min(1),
});
exports.UpdateBatchSchema = zod_1.z.object({
    batchNumber: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().nullable().optional(),
    status: exports.BatchStatusSchema.optional(),
    initialChicks: zod_1.z.number().int().positive().optional(),
    initialChickWeight: zod_1.z.number().positive().optional(),
    farmId: zod_1.z.string().optional(),
});
exports.CloseBatchSchema = zod_1.z.object({
    endDate: zod_1.z.string().datetime().optional(),
    finalNotes: zod_1.z.string().optional(),
});
exports.BatchSummarySchema = zod_1.z.object({
    initialChicks: zod_1.z.number(),
    finalChicks: zod_1.z.number(),
    soldChicks: zod_1.z.number(),
    naturalMortality: zod_1.z.number(),
    remainingAtClosure: zod_1.z.number(),
    totalMortality: zod_1.z.number(),
    totalSales: zod_1.z.number(),
    totalExpenses: zod_1.z.number(),
    profit: zod_1.z.number(),
    totalSalesQuantity: zod_1.z.number(),
    totalSalesWeight: zod_1.z.number(),
    daysActive: zod_1.z.number(),
});
// ==================== CATEGORY SCHEMAS ====================
exports.CategorySchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    type: exports.CategoryTypeSchema,
    description: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateCategorySchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: exports.CategoryTypeSchema,
    description: zod_1.z.string().optional(),
});
exports.UpdateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    type: exports.CategoryTypeSchema.optional(),
    description: zod_1.z.string().nullable().optional(),
});
// ==================== EXPENSE SCHEMAS ====================
exports.ExpenseSchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().nullable(),
    quantity: zod_1.z.number().positive().nullable(),
    unitPrice: zod_1.z.number().positive().nullable(),
    farmId: zod_1.z.string(),
    batchId: zod_1.z.string().nullable(),
    categoryId: zod_1.z.string(),
});
exports.CreateExpenseSchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    amount: zod_1.z.number().positive(),
    description: zod_1.z.string().optional(),
    quantity: zod_1.z.number().positive().optional(),
    unitPrice: zod_1.z.number().positive().optional(),
    farmId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().optional(),
    categoryId: zod_1.z.string(),
    inventoryItems: zod_1.z.array(zod_1.z.object({
        itemId: zod_1.z.string(),
        quantity: zod_1.z.number().positive(),
        notes: zod_1.z.string().optional(),
    })).optional(),
});
exports.UpdateExpenseSchema = zod_1.z.object({
    date: zod_1.z.string().datetime().optional(),
    amount: zod_1.z.number().positive().optional(),
    description: zod_1.z.string().nullable().optional(),
    quantity: zod_1.z.number().positive().nullable().optional(),
    unitPrice: zod_1.z.number().positive().nullable().optional(),
    farmId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().nullable().optional(),
    categoryId: zod_1.z.string().optional(),
});
// ==================== SALE SCHEMAS ====================
exports.SalesItemTypeSchema = zod_1.z.enum([
    "Chicken_Meat",
    "CHICKS",
    "FEED",
    "MEDICINE",
    "OTHER",
    "EGGS",
    "EQUIPMENT",
]);
exports.SaleSchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    amount: zod_1.z.number().positive(),
    quantity: zod_1.z.number().positive(),
    weight: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive(),
    description: zod_1.z.string().nullable(),
    isCredit: zod_1.z.boolean(),
    paidAmount: zod_1.z.number().nonnegative(),
    dueAmount: zod_1.z.number().nonnegative().nullable(),
    farmId: zod_1.z.string(),
    batchId: zod_1.z.string().nullable(),
    customerId: zod_1.z.string().nullable(),
    itemType: exports.SalesItemTypeSchema,
    categoryId: zod_1.z.string().nullable(),
});
exports.CreateSaleSchema = zod_1.z.object({
    date: zod_1.z.string().datetime(),
    amount: zod_1.z.number().positive(),
    quantity: zod_1.z.number().positive(),
    weight: zod_1.z.number().positive().optional().nullable(),
    unitPrice: zod_1.z.number().positive(),
    description: zod_1.z.string().optional(),
    isCredit: zod_1.z.boolean().optional().default(false),
    paidAmount: zod_1.z.number().nonnegative().optional().default(0),
    farmId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().optional(),
    customerId: zod_1.z.string().optional(),
    itemType: exports.SalesItemTypeSchema.optional(),
    categoryId: zod_1.z.string().optional(),
    customerData: zod_1.z.object({
        name: zod_1.z.string(),
        phone: zod_1.z.string(),
        category: zod_1.z.string().optional(),
        address: zod_1.z.string().optional(),
    }).optional(),
});
exports.UpdateSaleSchema = zod_1.z.object({
    date: zod_1.z.string().datetime().optional(),
    amount: zod_1.z.number().positive().optional(),
    quantity: zod_1.z.number().positive().optional(),
    weight: zod_1.z.number().positive().optional(),
    unitPrice: zod_1.z.number().positive().optional(),
    description: zod_1.z.string().nullable().optional(),
    isCredit: zod_1.z.boolean().optional(),
    paidAmount: zod_1.z.number().nonnegative().optional(),
    farmId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().nullable().optional(),
    customerId: zod_1.z.string().nullable().optional(),
    itemType: exports.SalesItemTypeSchema.optional().default("Chicken_Meat"),
    categoryId: zod_1.z.string().optional(),
});
// ==================== SALE PAYMENT SCHEMAS ====================
exports.SalePaymentSchema = exports.BaseSchema.extend({
    amount: zod_1.z.number().positive(),
    date: zod_1.z.date(),
    description: zod_1.z.string().nullable(),
    saleId: zod_1.z.string(),
});
exports.CreateSalePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    date: zod_1.z
        .date()
        .optional()
        .default(() => new Date()),
    description: zod_1.z.string().optional(),
    saleId: zod_1.z.string(),
});
// ==================== INVENTORY SCHEMAS ====================
exports.InventoryItemTypeSchema = zod_1.z.enum([
    "FEED",
    "CHICKS",
    "MEDICINE",
    "EQUIPMENT",
    "OTHER",
]);
exports.InventoryItemSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    currentStock: zod_1.z.number().nonnegative(),
    unit: zod_1.z.string(),
    minStock: zod_1.z.number().nonnegative().nullable(),
    userId: zod_1.z.string(),
    categoryId: zod_1.z.string(),
    itemType: exports.InventoryItemTypeSchema.optional(),
});
exports.CreateInventoryItemSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    currentStock: zod_1.z.number().nonnegative().optional().default(0),
    unit: zod_1.z.string(),
    minStock: zod_1.z.number().nonnegative().optional(),
    categoryId: zod_1.z.string().optional(), // Made optional - backend will create category automatically
    itemType: exports.InventoryItemTypeSchema.optional(),
    rate: zod_1.z.number().nonnegative().optional(), // For manual additions with price
});
exports.UpdateInventoryItemSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    description: zod_1.z.string().nullable().optional(),
    currentStock: zod_1.z.number().nonnegative().optional(),
    unit: zod_1.z.string().optional(),
    minStock: zod_1.z.number().nonnegative().nullable().optional(),
    categoryId: zod_1.z.string().optional(),
    itemType: exports.InventoryItemTypeSchema.optional(),
});
exports.InventoryTransactionSchema = exports.BaseSchema.extend({
    type: exports.TransactionTypeSchema,
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive(),
    totalAmount: zod_1.z.number().positive(),
    date: zod_1.z.date(),
    description: zod_1.z.string().nullable(),
    itemId: zod_1.z.string(),
});
exports.CreateInventoryTransactionSchema = zod_1.z.object({
    type: exports.TransactionTypeSchema,
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive(),
    totalAmount: zod_1.z.number().positive(),
    date: zod_1.z.date(),
    description: zod_1.z.string().optional(),
    itemId: zod_1.z.string(),
});
exports.InventoryUsageSchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive().nullable(),
    totalAmount: zod_1.z.number().positive().nullable(),
    notes: zod_1.z.string().nullable(),
    itemId: zod_1.z.string(),
    expenseId: zod_1.z.string().nullable(),
    batchId: zod_1.z.string().nullable(),
    farmId: zod_1.z.string(),
});
exports.CreateInventoryUsageSchema = zod_1.z.object({
    date: zod_1.z.date(),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().positive().optional(),
    totalAmount: zod_1.z.number().positive().optional(),
    notes: zod_1.z.string().optional(),
    itemId: zod_1.z.string(),
    expenseId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().optional(),
    farmId: zod_1.z.string(),
});
// ==================== ENTITY TRANSACTION SCHEMAS ====================
exports.EntityTransactionSchema = exports.BaseSchema.extend({
    type: exports.TransactionTypeSchema,
    amount: zod_1.z.number(),
    quantity: zod_1.z.number().int().nullable(),
    itemName: zod_1.z.string().nullable(),
    date: zod_1.z.date(),
    description: zod_1.z.string().nullable(),
    reference: zod_1.z.string().nullable(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
});
exports.CreateEntityTransactionSchema = zod_1.z.object({
    type: exports.TransactionTypeSchema,
    amount: zod_1.z.number(),
    quantity: zod_1.z.number().int().optional(),
    itemName: zod_1.z.string().optional(),
    date: zod_1.z.date(),
    description: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
});
// ==================== SUPPLIER SCHEMAS ====================
exports.DealerSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateDealerSchema = zod_1.z.object({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().optional(),
});
exports.UpdateDealerSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    contact: zod_1.z.string().optional(),
    address: zod_1.z.string().nullable().optional(),
});
// ==================== DEALER RESPONSE SCHEMAS ====================
exports.DealerTransactionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: exports.TransactionTypeSchema,
    amount: zod_1.z.number(),
    quantity: zod_1.z.number().int().nullable(),
    itemName: zod_1.z.string().nullable(),
    date: zod_1.z.date(),
    description: zod_1.z.string().nullable(),
    reference: zod_1.z.string().nullable(),
    entityType: zod_1.z.string(),
    entityId: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.DealerResponseSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
    balance: zod_1.z.number().nonnegative(), // Computed field
    thisMonthAmount: zod_1.z.number().nonnegative(), // Computed field
    totalTransactions: zod_1.z.number().int().nonnegative(), // Computed field
    recentTransactions: zod_1.z.array(exports.DealerTransactionSchema), // Computed field
});
exports.DealerStatisticsSchema = zod_1.z.object({
    totalDealers: zod_1.z.number().int().nonnegative(),
    activeDealers: zod_1.z.number().int().nonnegative(),
    outstandingAmount: zod_1.z.number().nonnegative(),
    thisMonthAmount: zod_1.z.number().nonnegative(),
});
exports.DealerDetailResponseSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
    balance: zod_1.z.number().nonnegative(),
    thisMonthAmount: zod_1.z.number().nonnegative(),
    totalTransactions: zod_1.z.number().int().nonnegative(),
    transactionTable: zod_1.z.array(zod_1.z.object({
        itemName: zod_1.z.string(),
        rate: zod_1.z.number(),
        quantity: zod_1.z.number(),
        totalAmount: zod_1.z.number(),
        amountPaid: zod_1.z.number(),
        amountDue: zod_1.z.number(),
        date: zod_1.z.date(),
        dueDate: zod_1.z.date(),
        payments: zod_1.z.array(zod_1.z.object({
            amount: zod_1.z.number(),
            date: zod_1.z.date(),
            reference: zod_1.z.string().nullable(),
        })),
    })),
    summary: zod_1.z.object({
        totalPurchases: zod_1.z.number().int().nonnegative(),
        totalPayments: zod_1.z.number().int().nonnegative(),
        outstandingAmount: zod_1.z.number().nonnegative(),
        thisMonthPurchases: zod_1.z.number().int().nonnegative(),
    }),
});
exports.HatcherySchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateHatcherySchema = zod_1.z.object({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().optional(),
});
exports.UpdateHatcherySchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    contact: zod_1.z.string().optional(),
    address: zod_1.z.string().nullable().optional(),
});
exports.MedicineSupplierSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateMedicineSupplierSchema = zod_1.z.object({
    name: zod_1.z.string(),
    contact: zod_1.z.string(),
    address: zod_1.z.string().optional(),
});
exports.UpdateMedicineSupplierSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    contact: zod_1.z.string().optional(),
    address: zod_1.z.string().nullable().optional(),
});
// ==================== CUSTOMER SCHEMAS ====================
exports.CustomerSchema = exports.BaseSchema.extend({
    name: zod_1.z.string(),
    phone: zod_1.z.string(),
    category: zod_1.z.string().nullable(),
    address: zod_1.z.string().nullable(),
    balance: zod_1.z.number(),
    userId: zod_1.z.string(),
});
exports.CreateCustomerSchema = zod_1.z.object({
    name: zod_1.z.string(),
    phone: zod_1.z.string(),
    category: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    balance: zod_1.z.number().optional().default(0),
});
exports.UpdateCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    category: zod_1.z.string().nullable().optional(),
    address: zod_1.z.string().nullable().optional(),
    balance: zod_1.z.number().optional(),
});
exports.CustomerTransactionSchema = exports.BaseSchema.extend({
    type: exports.TransactionTypeSchema,
    amount: zod_1.z.number(),
    date: zod_1.z.date(),
    description: zod_1.z.string().nullable(),
    reference: zod_1.z.string().nullable(),
    customerId: zod_1.z.string(),
});
exports.CreateCustomerTransactionSchema = zod_1.z.object({
    type: exports.TransactionTypeSchema,
    amount: zod_1.z.number(),
    date: zod_1.z.date(),
    description: zod_1.z.string().optional(),
    reference: zod_1.z.string().optional(),
    customerId: zod_1.z.string(),
});
// ==================== BATCH TRACKING SCHEMAS ====================
exports.MortalitySchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    count: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().nullable(),
    batchId: zod_1.z.string(),
});
exports.CreateMortalitySchema = zod_1.z.object({
    date: zod_1.z.date(),
    count: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().optional(),
    batchId: zod_1.z.string(),
});
exports.UpdateMortalitySchema = zod_1.z.object({
    date: zod_1.z.date().optional(),
    count: zod_1.z.number().int().positive().optional(),
    reason: zod_1.z.string().optional().nullable(),
});
exports.VaccinationSchema = exports.BaseSchema.extend({
    vaccineName: zod_1.z.string(),
    scheduledDate: zod_1.z.date(),
    completedDate: zod_1.z.date().nullable(),
    status: exports.VaccinationStatusSchema,
    notes: zod_1.z.string().nullable(),
    batchId: zod_1.z.string(),
});
exports.CreateVaccinationSchema = zod_1.z.object({
    vaccineName: zod_1.z.string(),
    scheduledDate: zod_1.z.date(),
    completedDate: zod_1.z.date().optional(),
    status: exports.VaccinationStatusSchema.optional().default("PENDING"),
    notes: zod_1.z.string().optional(),
    batchId: zod_1.z.string(),
});
exports.UpdateVaccinationSchema = zod_1.z.object({
    vaccineName: zod_1.z.string().optional(),
    scheduledDate: zod_1.z.date().optional(),
    completedDate: zod_1.z.date().nullable().optional(),
    status: exports.VaccinationStatusSchema.optional(),
    notes: zod_1.z.string().nullable().optional(),
});
exports.FeedConsumptionSchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    quantity: zod_1.z.number().positive(),
    feedType: zod_1.z.string(),
    batchId: zod_1.z.string(),
});
exports.CreateFeedConsumptionSchema = zod_1.z.object({
    date: zod_1.z.date(),
    quantity: zod_1.z.number().positive(),
    feedType: zod_1.z.string(),
    batchId: zod_1.z.string(),
});
exports.UpdateFeedConsumptionSchema = zod_1.z.object({
    date: zod_1.z.date().optional(),
    quantity: zod_1.z.number().positive().optional(),
    feedType: zod_1.z.string().optional(),
});
exports.BirdWeightSchema = exports.BaseSchema.extend({
    date: zod_1.z.date(),
    avgWeight: zod_1.z.number().positive(),
    sampleCount: zod_1.z.number().int().positive(),
    batchId: zod_1.z.string(),
});
exports.CreateBirdWeightSchema = zod_1.z.object({
    date: zod_1.z.date(),
    avgWeight: zod_1.z.number().positive(),
    sampleCount: zod_1.z.number().int().positive(),
    batchId: zod_1.z.string(),
});
exports.UpdateBirdWeightSchema = zod_1.z.object({
    date: zod_1.z.date().optional(),
    avgWeight: zod_1.z.number().positive().optional(),
    sampleCount: zod_1.z.number().int().positive().optional(),
});
// ==================== NOTIFICATION SCHEMAS ====================
exports.NotificationSchema = exports.BaseSchema.extend({
    type: exports.NotificationTypeSchema,
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    status: exports.NotificationStatusSchema,
    data: zod_1.z.any().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateNotificationSchema = zod_1.z.object({
    type: exports.NotificationTypeSchema,
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    status: exports.NotificationStatusSchema.optional().default("PENDING"),
    data: zod_1.z.any().optional(),
    userId: zod_1.z.string(),
});
exports.UpdateNotificationSchema = zod_1.z.object({
    type: exports.NotificationTypeSchema.optional(),
    title: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
    status: exports.NotificationStatusSchema.optional(),
    data: zod_1.z.any().nullable().optional(),
});
// ==================== REMINDER SCHEMAS ====================
exports.ReminderSchema = exports.BaseSchema.extend({
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    type: exports.ReminderTypeSchema,
    status: exports.ReminderStatusSchema,
    dueDate: zod_1.z.date(),
    isRecurring: zod_1.z.boolean(),
    recurrencePattern: exports.RecurrencePatternSchema,
    recurrenceInterval: zod_1.z.number().int().nullable(),
    lastTriggered: zod_1.z.date().nullable(),
    farmId: zod_1.z.string().nullable(),
    farm: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
    }).nullable().optional(),
    batchId: zod_1.z.string().nullable(),
    batch: zod_1.z.object({
        id: zod_1.z.string(),
        batchNumber: zod_1.z.string(),
    }).nullable().optional(),
    data: zod_1.z.any().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateReminderSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    description: zod_1.z.string().optional(),
    type: exports.ReminderTypeSchema,
    dueDate: zod_1.z.string().datetime(),
    isRecurring: zod_1.z.boolean().optional().default(false),
    recurrencePattern: exports.RecurrencePatternSchema.optional().default("NONE"),
    recurrenceInterval: zod_1.z.number().int().positive().optional(),
    farmId: zod_1.z.string().optional(),
    batchId: zod_1.z.string().optional(),
    data: zod_1.z.any().optional(),
});
exports.UpdateReminderSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    type: exports.ReminderTypeSchema.optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    isRecurring: zod_1.z.boolean().optional(),
    recurrencePattern: exports.RecurrencePatternSchema.optional(),
    recurrenceInterval: zod_1.z.number().int().positive().optional(),
    status: exports.ReminderStatusSchema.optional(),
    farmId: zod_1.z.string().nullable().optional(),
    batchId: zod_1.z.string().nullable().optional(),
    data: zod_1.z.any().optional(),
});
// ==================== AUDIT LOG SCHEMAS ====================
exports.AuditLogSchema = exports.BaseSchema.extend({
    action: exports.AuditActionSchema,
    tableName: zod_1.z.string(),
    recordId: zod_1.z.string(),
    oldValues: zod_1.z.any().nullable(),
    newValues: zod_1.z.any().nullable(),
    ipAddress: zod_1.z.string().nullable(),
    userAgent: zod_1.z.string().nullable(),
    userId: zod_1.z.string(),
});
exports.CreateAuditLogSchema = zod_1.z.object({
    action: exports.AuditActionSchema,
    tableName: zod_1.z.string(),
    recordId: zod_1.z.string(),
    oldValues: zod_1.z.any().optional(),
    newValues: zod_1.z.any().optional(),
    ipAddress: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    userId: zod_1.z.string(),
});
// ==================== AUTHENTICATION SCHEMAS ====================
exports.LoginSchema = zod_1.z.object({
    emailOrPhone: zod_1.z.string(), // Can be phone
    password: zod_1.z.string(),
});
exports.LanguageSchema = zod_1.z.enum(["ENGLISH", "NEPALI"]);
exports.CalendarTypeSchema = zod_1.z.enum(["AD", "BS"]);
exports.SignupSchema = zod_1.z.object({
    name: zod_1.z.string(),
    phone: zod_1.z.string(),
    password: zod_1.z.string(),
    role: exports.UserRoleSchema.optional().default("OWNER"),
    companyName: zod_1.z.string().optional(),
    companyFarmLocation: zod_1.z.string().optional(),
    language: exports.LanguageSchema.optional().default("ENGLISH"),
    calendarType: exports.CalendarTypeSchema.optional().default("AD"),
});
// ==================== COMPUTED TYPES ====================
exports.BatchAnalyticsSchema = zod_1.z.object({
    batchId: zod_1.z.string(),
    currentChicks: zod_1.z.number().int().nonnegative(),
    totalMortality: zod_1.z.number().int().nonnegative(),
    totalExpenses: zod_1.z.number().nonnegative(),
    totalSales: zod_1.z.number().nonnegative(),
    fcr: zod_1.z.number().positive().nullable(),
    avgWeight: zod_1.z.number().positive().nullable(),
    daysActive: zod_1.z.number().int().nonnegative(),
});
exports.FarmAnalyticsSchema = zod_1.z.object({
    farmId: zod_1.z.string(),
    totalBatches: zod_1.z.number().int().nonnegative(),
    activeBatches: zod_1.z.number().int().nonnegative(),
    totalExpenses: zod_1.z.number().nonnegative(),
    totalSales: zod_1.z.number().nonnegative(),
    profit: zod_1.z.number(),
    profitMargin: zod_1.z.number(),
});
exports.UserResponseSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    phone: zod_1.z.string(),
    role: exports.UserRoleSchema,
    gender: zod_1.z.enum(["MALE", "FEMALE", "OTHER"]),
    status: zod_1.z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
    managedFarms: zod_1.z.array(zod_1.z.string()).optional(), // For managers
    companyName: zod_1.z.string().optional(),
    companyFarmLocation: zod_1.z.string().optional(),
    companyFarmNumber: zod_1.z.string().optional(),
    companyFarmCapacity: zod_1.z.number().int().optional(),
});
exports.AuthResponseSchema = zod_1.z.object({
    accessToken: zod_1.z.string(),
    user: exports.UserResponseSchema,
});
exports.FarmListResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.FarmResponseSchema),
    message: zod_1.z.string().optional(),
});
exports.FarmDetailResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.FarmResponseSchema,
    message: zod_1.z.string().optional(),
});
// ==================== BATCH API RESPONSE SCHEMAS ====================
exports.BatchListResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(exports.BatchResponseSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        limit: zod_1.z.number().int().positive(),
        total: zod_1.z.number().int().nonnegative(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
    message: zod_1.z.string().optional(),
});
exports.BatchDetailResponseSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: exports.BatchResponseSchema,
    message: zod_1.z.string().optional(),
});
// ==================== EXPORT ALL SCHEMAS ====================
exports.schemas = {
    // Enums
    UserRole: exports.UserRoleSchema,
    BatchStatus: exports.BatchStatusSchema,
    TransactionType: exports.TransactionTypeSchema,
    NotificationType: exports.NotificationTypeSchema,
    NotificationStatus: exports.NotificationStatusSchema,
    VaccinationStatus: exports.VaccinationStatusSchema,
    AuditAction: exports.AuditActionSchema,
    CategoryType: exports.CategoryTypeSchema,
    InventoryItemType: exports.InventoryItemTypeSchema,
    // Reminder Enums
    ReminderType: exports.ReminderTypeSchema,
    ReminderStatus: exports.ReminderStatusSchema,
    RecurrencePattern: exports.RecurrencePatternSchema,
    // Base
    Base: exports.BaseSchema,
    // Core Models
    User: exports.UserSchema,
    CreateUser: exports.CreateUserSchema,
    UpdateUser: exports.UpdateUserSchema,
    Farm: exports.FarmSchema,
    CreateFarm: exports.CreateFarmSchema,
    UpdateFarm: exports.UpdateFarmSchema,
    // Farm Response Types
    FarmResponse: exports.FarmResponseSchema,
    FarmOwner: exports.FarmOwnerSchema,
    FarmManager: exports.FarmManagerSchema,
    FarmCount: exports.FarmCountSchema,
    FarmDetailResponse: exports.FarmDetailResponseSchema,
    FarmListResponse: exports.FarmListResponseSchema,
    Batch: exports.BatchSchema,
    CreateBatch: exports.CreateBatchSchema,
    UpdateBatch: exports.UpdateBatchSchema,
    // Batch Response Types
    BatchResponse: exports.BatchResponseSchema,
    BatchFarm: exports.BatchFarmSchema,
    BatchCount: exports.BatchCountSchema,
    BatchListResponse: exports.BatchListResponseSchema,
    BatchDetailResponse: exports.BatchDetailResponseSchema,
    Category: exports.CategorySchema,
    CreateCategory: exports.CreateCategorySchema,
    UpdateCategory: exports.UpdateCategorySchema,
    // Financial
    Expense: exports.ExpenseSchema,
    CreateExpense: exports.CreateExpenseSchema,
    UpdateExpense: exports.UpdateExpenseSchema,
    Sale: exports.SaleSchema,
    CreateSale: exports.CreateSaleSchema,
    UpdateSale: exports.UpdateSaleSchema,
    SalePayment: exports.SalePaymentSchema,
    CreateSalePayment: exports.CreateSalePaymentSchema,
    // Inventory
    InventoryItem: exports.InventoryItemSchema,
    CreateInventoryItem: exports.CreateInventoryItemSchema,
    UpdateInventoryItem: exports.UpdateInventoryItemSchema,
    InventoryTransaction: exports.InventoryTransactionSchema,
    CreateInventoryTransaction: exports.CreateInventoryTransactionSchema,
    InventoryUsage: exports.InventoryUsageSchema,
    CreateInventoryUsage: exports.CreateInventoryUsageSchema,
    // Transactions
    EntityTransaction: exports.EntityTransactionSchema,
    CreateEntityTransaction: exports.CreateEntityTransactionSchema,
    // Suppliers
    Dealer: exports.DealerSchema,
    CreateDealer: exports.CreateDealerSchema,
    UpdateDealer: exports.UpdateDealerSchema,
    // Dealer Response Types
    DealerResponse: exports.DealerResponseSchema,
    DealerTransaction: exports.DealerTransactionSchema,
    DealerStatistics: exports.DealerStatisticsSchema,
    DealerDetailResponse: exports.DealerDetailResponseSchema,
    Hatchery: exports.HatcherySchema,
    CreateHatchery: exports.CreateHatcherySchema,
    UpdateHatchery: exports.UpdateHatcherySchema,
    MedicineSupplier: exports.MedicineSupplierSchema,
    CreateMedicineSupplier: exports.CreateMedicineSupplierSchema,
    UpdateMedicineSupplier: exports.UpdateMedicineSupplierSchema,
    // Customers
    Customer: exports.CustomerSchema,
    CreateCustomer: exports.CreateCustomerSchema,
    UpdateCustomer: exports.UpdateCustomerSchema,
    CustomerTransaction: exports.CustomerTransactionSchema,
    CreateCustomerTransaction: exports.CreateCustomerTransactionSchema,
    // Batch Tracking
    Mortality: exports.MortalitySchema,
    CreateMortality: exports.CreateMortalitySchema,
    UpdateMortality: exports.UpdateMortalitySchema,
    Vaccination: exports.VaccinationSchema,
    CreateVaccination: exports.CreateVaccinationSchema,
    UpdateVaccination: exports.UpdateVaccinationSchema,
    FeedConsumption: exports.FeedConsumptionSchema,
    CreateFeedConsumption: exports.CreateFeedConsumptionSchema,
    UpdateFeedConsumption: exports.UpdateFeedConsumptionSchema,
    BirdWeight: exports.BirdWeightSchema,
    CreateBirdWeight: exports.CreateBirdWeightSchema,
    UpdateBirdWeight: exports.UpdateBirdWeightSchema,
    // Notifications
    Notification: exports.NotificationSchema,
    CreateNotification: exports.CreateNotificationSchema,
    UpdateNotification: exports.UpdateNotificationSchema,
    // Reminders
    Reminder: exports.ReminderSchema,
    CreateReminder: exports.CreateReminderSchema,
    UpdateReminder: exports.UpdateReminderSchema,
    // Audit
    AuditLog: exports.AuditLogSchema,
    CreateAuditLog: exports.CreateAuditLogSchema,
    // Auth
    Login: exports.LoginSchema,
    Signup: exports.SignupSchema,
    // Analytics
    BatchAnalytics: exports.BatchAnalyticsSchema,
    FarmAnalytics: exports.FarmAnalyticsSchema,
    // User Response
    UserResponse: exports.UserResponseSchema,
    AuthResponse: exports.AuthResponseSchema,
    // ==================== API RESPONSE SCHEMAS ====================
};
// ==================== API RESPONSE SCHEMAS ====================
const ApiResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    message: zod_1.z.string().optional(),
    error: zod_1.z.string().optional(),
});
exports.ApiResponseSchema = ApiResponseSchema;
const PaginatedResponseSchema = (itemSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.array(itemSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive(),
        limit: zod_1.z.number().int().positive(),
        total: zod_1.z.number().int().nonnegative(),
        totalPages: zod_1.z.number().int().nonnegative(),
    }),
    message: zod_1.z.string().optional(),
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
// ==================== FARM API RESPONSE SCHEMAS ====================
// ==================== USER RESPONSE SCHEMAS ====================
