// packages/shared-types/index.ts
import { z } from "zod";
// ==================== ENUMS ====================
export const UserRoleSchema = z.enum(["OWNER", "MANAGER"]);
export const BatchStatusSchema = z.enum(["ACTIVE", "COMPLETED"]);
export const TransactionTypeSchema = z.enum([
    "PURCHASE",
    "SALE",
    "PAYMENT",
    "RECEIPT",
    "ADJUSTMENT",
    "OPENING_BALANCE",
]);
export const NotificationTypeSchema = z.enum([
    "LOW_INVENTORY",
    "VACCINATION_DUE",
    "BATCH_COMPLETION",
    "PAYMENT_DUE",
    "MORTALITY_ALERT",
]);
export const NotificationStatusSchema = z.enum([
    "PENDING",
    "READ",
    "DISMISSED",
]);
export const VaccinationStatusSchema = z.enum([
    "PENDING",
    "COMPLETED",
    "MISSED",
    "OVERDUE",
]);
export const AuditActionSchema = z.enum([
    "CREATE",
    "UPDATE",
    "DELETE",
    "LOGIN",
    "LOGOUT",
]);
export const CategoryTypeSchema = z.enum(["EXPENSE", "SALES", "INVENTORY"]);
// ==================== BASE SCHEMAS ====================
export const BaseSchema = z.object({
    id: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
// ==================== USER SCHEMAS ====================
export const UserSchema = BaseSchema.extend({
    email: z.email().optional(),
    name: z.string(),
    phone: z.string().optional(),
    password: z.string(),
    role: UserRoleSchema,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
    ownerId: z.string().nullable(),
    companyName: z.string().nullable(),
    CompanyFarmLocation: z.string().nullable(),
    CompanyFarmNumber: z.string().nullable(),
    CompanyFarmCapacity: z.number().int().nullable(),
});
export const CreateUserSchema = z.object({
    email: z.email().optional(),
    name: z.string(),
    phone: z.string().optional(),
    password: z.string(),
    role: UserRoleSchema.optional().default("OWNER"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().default("OTHER"),
    ownerId: z.string().optional(),
    companyName: z.string().optional(),
    CompanyFarmLocation: z.string().optional(),
    CompanyFarmNumber: z.string().optional(),
    CompanyFarmCapacity: z.number().int().optional(),
});
export const UpdateUserSchema = z.object({
    email: z.email().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    role: UserRoleSchema.optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]).optional(),
    ownerId: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    CompanyFarmLocation: z.string().nullable().optional(),
    CompanyFarmNumber: z.string().nullable().optional(),
    CompanyFarmCapacity: z.number().int().nullable().optional(),
});
// ==================== FARM SCHEMAS ====================
export const FarmSchema = BaseSchema.extend({
    name: z.string(),
    capacity: z.number().int().positive(),
    description: z.string().nullable(),
    ownerId: z.string(), // Farm owner
    managers: z.array(z.string()).optional(), // Farm managers (array of user IDs)
});
// ==================== FARM RESPONSE SCHEMAS ====================
export const FarmOwnerSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    role: UserRoleSchema,
});
export const FarmManagerSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().nullable(),
    role: UserRoleSchema,
});
export const FarmCountSchema = z.object({
    batches: z.number().int().nonnegative(),
    expenses: z.number().int().nonnegative(),
    sales: z.number().int().nonnegative(),
});
export const FarmResponseSchema = BaseSchema.extend({
    name: z.string(),
    capacity: z.number().int().positive(),
    description: z.string().nullable(),
    ownerId: z.string(),
    owner: FarmOwnerSchema,
    managers: z.array(FarmManagerSchema),
    _count: FarmCountSchema,
});
export const CreateFarmSchema = z.object({
    name: z.string(),
    capacity: z.number().int().positive(),
    description: z.string().optional(),
    ownerId: z.string().optional(), // Will be set by backend from auth
    managers: z.array(z.string()).optional(),
});
export const UpdateFarmSchema = z.object({
    name: z.string().optional(),
    capacity: z.number().int().positive().optional(),
    description: z.string().optional(),
    ownerId: z.string().optional(),
    managers: z.array(z.string()).optional(),
});
// ==================== BATCH SCHEMAS ====================
export const BatchSchema = BaseSchema.extend({
    batchNumber: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable(),
    status: BatchStatusSchema,
    initialChicks: z.number().int().positive(),
    initialChickWeight: z.number().positive(),
    farmId: z.string(),
    notes: z.string().nullable(),
});
// ==================== BATCH RESPONSE SCHEMAS ====================
export const BatchFarmSchema = z.object({
    id: z.string(),
    name: z.string(),
    capacity: z.number().int().positive(),
    owner: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable(),
    }),
});
export const BatchCountSchema = z.object({
    expenses: z.number().int().nonnegative(),
    sales: z.number().int().nonnegative(),
    mortalities: z.number().int().nonnegative(),
    vaccinations: z.number().int().nonnegative(),
    feedConsumptions: z.number().int().nonnegative(),
    birdWeights: z.number().int().nonnegative(),
    notes: z.string().nullable(),
});
export const BatchResponseSchema = BaseSchema.extend({
    batchNumber: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().nullable(),
    status: BatchStatusSchema,
    initialChicks: z.number().int().positive(),
    initialChickWeight: z.number().positive(),
    farmId: z.string(),
    currentChicks: z.number().int().nonnegative(), // Computed field
    farm: BatchFarmSchema,
    _count: BatchCountSchema,
});
export const CreateBatchSchema = z.object({
    batchNumber: z.string(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    status: BatchStatusSchema.optional().default("ACTIVE"),
    initialChicks: z.number().int().positive(),
    initialChickWeight: z.number().positive().optional().default(0.045),
    farmId: z.string(),
});
export const UpdateBatchSchema = z.object({
    batchNumber: z.string().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().nullable().optional(),
    status: BatchStatusSchema.optional(),
    initialChicks: z.number().int().positive().optional(),
    initialChickWeight: z.number().positive().optional(),
    farmId: z.string().optional(),
});
// ==================== CATEGORY SCHEMAS ====================
export const CategorySchema = BaseSchema.extend({
    name: z.string(),
    type: CategoryTypeSchema,
    description: z.string().nullable(),
    userId: z.string(),
});
export const CreateCategorySchema = z.object({
    name: z.string(),
    type: CategoryTypeSchema,
    description: z.string().optional(),
});
export const UpdateCategorySchema = z.object({
    name: z.string().optional(),
    type: CategoryTypeSchema.optional(),
    description: z.string().nullable().optional(),
});
// ==================== EXPENSE SCHEMAS ====================
export const ExpenseSchema = BaseSchema.extend({
    date: z.string().datetime(),
    amount: z.number().positive(),
    description: z.string().nullable(),
    quantity: z.number().positive().nullable(),
    unitPrice: z.number().positive().nullable(),
    farmId: z.string(),
    batchId: z.string().nullable(),
    categoryId: z.string(),
});
export const CreateExpenseSchema = z.object({
    date: z.string().datetime(),
    amount: z.number().positive(),
    description: z.string().optional(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
    farmId: z.string(),
    batchId: z.string().optional(),
    categoryId: z.string(),
});
export const UpdateExpenseSchema = z.object({
    date: z.string().datetime().optional(),
    amount: z.number().positive().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number().positive().nullable().optional(),
    unitPrice: z.number().positive().nullable().optional(),
    farmId: z.string().optional(),
    batchId: z.string().nullable().optional(),
    categoryId: z.string().optional(),
});
// ==================== SALE SCHEMAS ====================
export const SaleSchema = BaseSchema.extend({
    date: z.string().datetime(),
    amount: z.number().positive(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    description: z.string().nullable(),
    isCredit: z.boolean(),
    paidAmount: z.number().nonnegative(),
    dueAmount: z.number().nonnegative().nullable(),
    farmId: z.string(),
    batchId: z.string().nullable(),
    categoryId: z.string(),
    customerId: z.string().nullable(),
});
export const CreateSaleSchema = z.object({
    date: z.string().datetime(),
    amount: z.number().positive(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    description: z.string().optional(),
    isCredit: z.boolean().optional().default(false),
    paidAmount: z.number().nonnegative().optional().default(0),
    dueAmount: z.number().nonnegative().optional().default(0),
    farmId: z.string(),
    batchId: z.string().optional(),
    categoryId: z.string(),
    customerId: z.string().optional(),
});
export const UpdateSaleSchema = z.object({
    date: z.string().datetime().optional(),
    amount: z.number().positive().optional(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().positive().optional(),
    description: z.string().nullable().optional(),
    isCredit: z.boolean().optional(),
    paidAmount: z.number().nonnegative().optional(),
    dueAmount: z.number().nonnegative().nullable().optional(),
    farmId: z.string().optional(),
    batchId: z.string().nullable().optional(),
    categoryId: z.string().optional(),
    customerId: z.string().nullable().optional(),
});
// ==================== SALE PAYMENT SCHEMAS ====================
export const SalePaymentSchema = BaseSchema.extend({
    amount: z.number().positive(),
    date: z.string().datetime(),
    description: z.string().nullable(),
    saleId: z.string(),
});
export const CreateSalePaymentSchema = z.object({
    amount: z.number().positive(),
    date: z
        .string()
        .datetime()
        .optional()
        .default(() => new Date().toISOString()),
    description: z.string().optional(),
    saleId: z.string(),
});
// ==================== INVENTORY SCHEMAS ====================
export const InventoryItemTypeSchema = z.enum(["FEED", "CHICKS", "MEDICINE", "EQUIPMENT", "OTHER"]);
export const InventoryItemSchema = BaseSchema.extend({
    name: z.string(),
    description: z.string().nullable(),
    currentStock: z.number().nonnegative(),
    unit: z.string(),
    minStock: z.number().nonnegative().nullable(),
    userId: z.string(),
    categoryId: z.string(),
    itemType: InventoryItemTypeSchema.optional(),
});
export const CreateInventoryItemSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    currentStock: z.number().nonnegative().optional().default(0),
    unit: z.string(),
    minStock: z.number().nonnegative().optional(),
    categoryId: z.string().optional(), // Made optional - backend will create category automatically
    itemType: InventoryItemTypeSchema.optional(),
    rate: z.number().nonnegative().optional(), // For manual additions with price
});
export const UpdateInventoryItemSchema = z.object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    currentStock: z.number().nonnegative().optional(),
    unit: z.string().optional(),
    minStock: z.number().nonnegative().nullable().optional(),
    categoryId: z.string().optional(),
    itemType: InventoryItemTypeSchema.optional(),
});
export const InventoryTransactionSchema = BaseSchema.extend({
    type: TransactionTypeSchema,
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    totalAmount: z.number().positive(),
    date: z.string().datetime(),
    description: z.string().nullable(),
    itemId: z.string(),
});
export const CreateInventoryTransactionSchema = z.object({
    type: TransactionTypeSchema,
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    totalAmount: z.number().positive(),
    date: z.string().datetime(),
    description: z.string().optional(),
    itemId: z.string(),
});
export const InventoryUsageSchema = BaseSchema.extend({
    date: z.string().datetime(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive().nullable(),
    totalAmount: z.number().positive().nullable(),
    notes: z.string().nullable(),
    itemId: z.string(),
    expenseId: z.string().nullable(),
    batchId: z.string().nullable(),
    farmId: z.string(),
});
export const CreateInventoryUsageSchema = z.object({
    date: z.string().datetime(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive().optional(),
    totalAmount: z.number().positive().optional(),
    notes: z.string().optional(),
    itemId: z.string(),
    expenseId: z.string().optional(),
    batchId: z.string().optional(),
    farmId: z.string(),
});
// ==================== ENTITY TRANSACTION SCHEMAS ====================
export const EntityTransactionSchema = BaseSchema.extend({
    type: TransactionTypeSchema,
    amount: z.number(),
    quantity: z.number().int().nullable(),
    itemName: z.string().nullable(),
    date: z.string().datetime(),
    description: z.string().nullable(),
    reference: z.string().nullable(),
    entityType: z.string(),
    entityId: z.string(),
});
export const CreateEntityTransactionSchema = z.object({
    type: TransactionTypeSchema,
    amount: z.number(),
    quantity: z.number().int().optional(),
    itemName: z.string().optional(),
    date: z.string().datetime(),
    description: z.string().optional(),
    reference: z.string().optional(),
    entityType: z.string(),
    entityId: z.string(),
});
// ==================== SUPPLIER SCHEMAS ====================
export const DealerSchema = BaseSchema.extend({
    name: z.string(),
    contact: z.string(),
    address: z.string().nullable(),
    userId: z.string(),
});
export const CreateDealerSchema = z.object({
    name: z.string(),
    contact: z.string(),
    address: z.string().optional(),
});
export const UpdateDealerSchema = z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    address: z.string().nullable().optional(),
});
// ==================== DEALER RESPONSE SCHEMAS ====================
export const DealerTransactionSchema = z.object({
    id: z.string(),
    type: TransactionTypeSchema,
    amount: z.number(),
    quantity: z.number().int().nullable(),
    itemName: z.string().nullable(),
    date: z.string().datetime(),
    description: z.string().nullable(),
    reference: z.string().nullable(),
    entityType: z.string(),
    entityId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});
export const DealerResponseSchema = BaseSchema.extend({
    name: z.string(),
    contact: z.string(),
    address: z.string().nullable(),
    userId: z.string(),
    balance: z.number().nonnegative(), // Computed field
    thisMonthAmount: z.number().nonnegative(), // Computed field
    totalTransactions: z.number().int().nonnegative(), // Computed field
    recentTransactions: z.array(DealerTransactionSchema), // Computed field
});
export const DealerStatisticsSchema = z.object({
    totalDealers: z.number().int().nonnegative(),
    activeDealers: z.number().int().nonnegative(),
    outstandingAmount: z.number().nonnegative(),
    thisMonthAmount: z.number().nonnegative(),
});
export const DealerDetailResponseSchema = BaseSchema.extend({
    name: z.string(),
    contact: z.string(),
    address: z.string().nullable(),
    userId: z.string(),
    balance: z.number().nonnegative(),
    thisMonthAmount: z.number().nonnegative(),
    totalTransactions: z.number().int().nonnegative(),
    transactionTable: z.array(z.object({
        itemName: z.string(),
        rate: z.number(),
        quantity: z.number(),
        totalAmount: z.number(),
        amountPaid: z.number(),
        amountDue: z.number(),
        date: z.string().datetime(),
        dueDate: z.string().datetime(),
        payments: z.array(z.object({
            amount: z.number(),
            date: z.string().datetime(),
            reference: z.string().nullable(),
        })),
    })),
    summary: z.object({
        totalPurchases: z.number().int().nonnegative(),
        totalPayments: z.number().int().nonnegative(),
        outstandingAmount: z.number().nonnegative(),
        thisMonthPurchases: z.number().int().nonnegative(),
    }),
});
export const HatcherySchema = BaseSchema.extend({
    name: z.string(),
    contact: z.string(),
    address: z.string().nullable(),
    userId: z.string(),
});
export const CreateHatcherySchema = z.object({
    name: z.string(),
    contact: z.string(),
    address: z.string().optional(),
});
export const UpdateHatcherySchema = z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    address: z.string().nullable().optional(),
});
export const MedicineSupplierSchema = BaseSchema.extend({
    name: z.string(),
    contact: z.string(),
    address: z.string().nullable(),
    userId: z.string(),
});
export const CreateMedicineSupplierSchema = z.object({
    name: z.string(),
    contact: z.string(),
    address: z.string().optional(),
});
export const UpdateMedicineSupplierSchema = z.object({
    name: z.string().optional(),
    contact: z.string().optional(),
    address: z.string().nullable().optional(),
});
// ==================== CUSTOMER SCHEMAS ====================
export const CustomerSchema = BaseSchema.extend({
    name: z.string(),
    phone: z.string(),
    category: z.string().nullable(),
    address: z.string().nullable(),
    balance: z.number(),
    userId: z.string(),
});
export const CreateCustomerSchema = z.object({
    name: z.string(),
    phone: z.string(),
    category: z.string().optional(),
    address: z.string().optional(),
    balance: z.number().optional().default(0),
});
export const UpdateCustomerSchema = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    category: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    balance: z.number().optional(),
});
export const CustomerTransactionSchema = BaseSchema.extend({
    type: TransactionTypeSchema,
    amount: z.number(),
    date: z.string().datetime(),
    description: z.string().nullable(),
    reference: z.string().nullable(),
    customerId: z.string(),
});
export const CreateCustomerTransactionSchema = z.object({
    type: TransactionTypeSchema,
    amount: z.number(),
    date: z.string().datetime(),
    description: z.string().optional(),
    reference: z.string().optional(),
    customerId: z.string(),
});
// ==================== BATCH TRACKING SCHEMAS ====================
export const MortalitySchema = BaseSchema.extend({
    date: z.string().datetime(),
    count: z.number().int().positive(),
    reason: z.string().nullable(),
    batchId: z.string(),
});
export const CreateMortalitySchema = z.object({
    date: z.string().datetime(),
    count: z.number().int().positive(),
    reason: z.string().optional(),
    batchId: z.string(),
});
export const UpdateMortalitySchema = z.object({
    date: z.string().datetime().optional(),
    count: z.number().int().positive().optional(),
    reason: z.string().nullable().optional(),
});
export const VaccinationSchema = BaseSchema.extend({
    vaccineName: z.string(),
    scheduledDate: z.string().datetime(),
    completedDate: z.string().datetime().nullable(),
    status: VaccinationStatusSchema,
    notes: z.string().nullable(),
    batchId: z.string(),
});
export const CreateVaccinationSchema = z.object({
    vaccineName: z.string(),
    scheduledDate: z.string().datetime(),
    completedDate: z.string().datetime().optional(),
    status: VaccinationStatusSchema.optional().default("PENDING"),
    notes: z.string().optional(),
    batchId: z.string(),
});
export const UpdateVaccinationSchema = z.object({
    vaccineName: z.string().optional(),
    scheduledDate: z.string().datetime().optional(),
    completedDate: z.string().datetime().nullable().optional(),
    status: VaccinationStatusSchema.optional(),
    notes: z.string().nullable().optional(),
});
export const FeedConsumptionSchema = BaseSchema.extend({
    date: z.string().datetime(),
    quantity: z.number().positive(),
    feedType: z.string(),
    batchId: z.string(),
});
export const CreateFeedConsumptionSchema = z.object({
    date: z.string().datetime(),
    quantity: z.number().positive(),
    feedType: z.string(),
    batchId: z.string(),
});
export const UpdateFeedConsumptionSchema = z.object({
    date: z.string().datetime().optional(),
    quantity: z.number().positive().optional(),
    feedType: z.string().optional(),
});
export const BirdWeightSchema = BaseSchema.extend({
    date: z.string().datetime(),
    avgWeight: z.number().positive(),
    sampleCount: z.number().int().positive(),
    batchId: z.string(),
});
export const CreateBirdWeightSchema = z.object({
    date: z.string().datetime(),
    avgWeight: z.number().positive(),
    sampleCount: z.number().int().positive(),
    batchId: z.string(),
});
export const UpdateBirdWeightSchema = z.object({
    date: z.string().datetime().optional(),
    avgWeight: z.number().positive().optional(),
    sampleCount: z.number().int().positive().optional(),
});
// ==================== NOTIFICATION SCHEMAS ====================
export const NotificationSchema = BaseSchema.extend({
    type: NotificationTypeSchema,
    title: z.string(),
    message: z.string(),
    status: NotificationStatusSchema,
    data: z.any().nullable(),
    userId: z.string(),
});
export const CreateNotificationSchema = z.object({
    type: NotificationTypeSchema,
    title: z.string(),
    message: z.string(),
    status: NotificationStatusSchema.optional().default("PENDING"),
    data: z.any().optional(),
    userId: z.string(),
});
export const UpdateNotificationSchema = z.object({
    type: NotificationTypeSchema.optional(),
    title: z.string().optional(),
    message: z.string().optional(),
    status: NotificationStatusSchema.optional(),
    data: z.any().nullable().optional(),
});
// ==================== AUDIT LOG SCHEMAS ====================
export const AuditLogSchema = BaseSchema.extend({
    action: AuditActionSchema,
    tableName: z.string(),
    recordId: z.string(),
    oldValues: z.any().nullable(),
    newValues: z.any().nullable(),
    ipAddress: z.string().nullable(),
    userAgent: z.string().nullable(),
    userId: z.string(),
});
export const CreateAuditLogSchema = z.object({
    action: AuditActionSchema,
    tableName: z.string(),
    recordId: z.string(),
    oldValues: z.any().optional(),
    newValues: z.any().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    userId: z.string(),
});
// ==================== AUTHENTICATION SCHEMAS ====================
export const LoginSchema = z.object({
    emailOrPhone: z.string(), // Can be email or phone
    password: z.string(),
});
export const SignupSchema = z.object({
    name: z.string(),
    email: z.email().optional(),
    phone: z.string().optional(),
    password: z.string(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().default("OTHER"),
    role: UserRoleSchema.optional().default("OWNER"),
    companyName: z.string().optional(),
    companyFarmLocation: z.string().optional(),
    companyFarmNumber: z.string().optional(),
    companyFarmCapacity: z.number().int().optional(),
});
// ==================== COMPUTED TYPES ====================
export const BatchAnalyticsSchema = z.object({
    batchId: z.string(),
    currentChicks: z.number().int().nonnegative(),
    totalMortality: z.number().int().nonnegative(),
    totalExpenses: z.number().nonnegative(),
    totalSales: z.number().nonnegative(),
    fcr: z.number().positive().nullable(),
    avgWeight: z.number().positive().nullable(),
    daysActive: z.number().int().nonnegative(),
});
export const FarmAnalyticsSchema = z.object({
    farmId: z.string(),
    totalBatches: z.number().int().nonnegative(),
    activeBatches: z.number().int().nonnegative(),
    totalExpenses: z.number().nonnegative(),
    totalSales: z.number().nonnegative(),
    profit: z.number(),
    profitMargin: z.number(),
});
export const UserResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    role: UserRoleSchema,
    gender: z.enum(["MALE", "FEMALE", "OTHER"]),
    status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
    managedFarms: z.array(z.string()).optional(), // For managers
    companyName: z.string().optional(),
    companyFarmLocation: z.string().optional(),
    companyFarmNumber: z.string().optional(),
    companyFarmCapacity: z.number().int().optional(),
});
export const AuthResponseSchema = z.object({
    accessToken: z.string(),
    user: UserResponseSchema,
});
export const FarmListResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(FarmResponseSchema),
    message: z.string().optional(),
});
export const FarmDetailResponseSchema = z.object({
    success: z.boolean(),
    data: FarmResponseSchema,
    message: z.string().optional(),
});
// ==================== BATCH API RESPONSE SCHEMAS ====================
export const BatchListResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(BatchResponseSchema),
    pagination: z.object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
    }),
    message: z.string().optional(),
});
export const BatchDetailResponseSchema = z.object({
    success: z.boolean(),
    data: BatchResponseSchema,
    message: z.string().optional(),
});
// ==================== EXPORT ALL SCHEMAS ====================
export const schemas = {
    // Enums
    UserRole: UserRoleSchema,
    BatchStatus: BatchStatusSchema,
    TransactionType: TransactionTypeSchema,
    NotificationType: NotificationTypeSchema,
    NotificationStatus: NotificationStatusSchema,
    VaccinationStatus: VaccinationStatusSchema,
    AuditAction: AuditActionSchema,
    CategoryType: CategoryTypeSchema,
    InventoryItemType: InventoryItemTypeSchema,
    // Base
    Base: BaseSchema,
    // Core Models
    User: UserSchema,
    CreateUser: CreateUserSchema,
    UpdateUser: UpdateUserSchema,
    Farm: FarmSchema,
    CreateFarm: CreateFarmSchema,
    UpdateFarm: UpdateFarmSchema,
    // Farm Response Types
    FarmResponse: FarmResponseSchema,
    FarmOwner: FarmOwnerSchema,
    FarmManager: FarmManagerSchema,
    FarmCount: FarmCountSchema,
    FarmDetailResponse: FarmDetailResponseSchema,
    FarmListResponse: FarmListResponseSchema,
    Batch: BatchSchema,
    CreateBatch: CreateBatchSchema,
    UpdateBatch: UpdateBatchSchema,
    // Batch Response Types
    BatchResponse: BatchResponseSchema,
    BatchFarm: BatchFarmSchema,
    BatchCount: BatchCountSchema,
    BatchListResponse: BatchListResponseSchema,
    BatchDetailResponse: BatchDetailResponseSchema,
    Category: CategorySchema,
    CreateCategory: CreateCategorySchema,
    UpdateCategory: UpdateCategorySchema,
    // Financial
    Expense: ExpenseSchema,
    CreateExpense: CreateExpenseSchema,
    UpdateExpense: UpdateExpenseSchema,
    Sale: SaleSchema,
    CreateSale: CreateSaleSchema,
    UpdateSale: UpdateSaleSchema,
    SalePayment: SalePaymentSchema,
    CreateSalePayment: CreateSalePaymentSchema,
    // Inventory
    InventoryItem: InventoryItemSchema,
    CreateInventoryItem: CreateInventoryItemSchema,
    UpdateInventoryItem: UpdateInventoryItemSchema,
    InventoryTransaction: InventoryTransactionSchema,
    CreateInventoryTransaction: CreateInventoryTransactionSchema,
    InventoryUsage: InventoryUsageSchema,
    CreateInventoryUsage: CreateInventoryUsageSchema,
    // Transactions
    EntityTransaction: EntityTransactionSchema,
    CreateEntityTransaction: CreateEntityTransactionSchema,
    // Suppliers
    Dealer: DealerSchema,
    CreateDealer: CreateDealerSchema,
    UpdateDealer: UpdateDealerSchema,
    // Dealer Response Types
    DealerResponse: DealerResponseSchema,
    DealerTransaction: DealerTransactionSchema,
    DealerStatistics: DealerStatisticsSchema,
    DealerDetailResponse: DealerDetailResponseSchema,
    Hatchery: HatcherySchema,
    CreateHatchery: CreateHatcherySchema,
    UpdateHatchery: UpdateHatcherySchema,
    MedicineSupplier: MedicineSupplierSchema,
    CreateMedicineSupplier: CreateMedicineSupplierSchema,
    UpdateMedicineSupplier: UpdateMedicineSupplierSchema,
    // Customers
    Customer: CustomerSchema,
    CreateCustomer: CreateCustomerSchema,
    UpdateCustomer: UpdateCustomerSchema,
    CustomerTransaction: CustomerTransactionSchema,
    CreateCustomerTransaction: CreateCustomerTransactionSchema,
    // Batch Tracking
    Mortality: MortalitySchema,
    CreateMortality: CreateMortalitySchema,
    UpdateMortality: UpdateMortalitySchema,
    Vaccination: VaccinationSchema,
    CreateVaccination: CreateVaccinationSchema,
    UpdateVaccination: UpdateVaccinationSchema,
    FeedConsumption: FeedConsumptionSchema,
    CreateFeedConsumption: CreateFeedConsumptionSchema,
    UpdateFeedConsumption: UpdateFeedConsumptionSchema,
    BirdWeight: BirdWeightSchema,
    CreateBirdWeight: CreateBirdWeightSchema,
    UpdateBirdWeight: UpdateBirdWeightSchema,
    // Notifications
    Notification: NotificationSchema,
    CreateNotification: CreateNotificationSchema,
    UpdateNotification: UpdateNotificationSchema,
    // Audit
    AuditLog: AuditLogSchema,
    CreateAuditLog: CreateAuditLogSchema,
    // Auth
    Login: LoginSchema,
    Signup: SignupSchema,
    // Analytics
    BatchAnalytics: BatchAnalyticsSchema,
    FarmAnalytics: FarmAnalyticsSchema,
    // User Response
    UserResponse: UserResponseSchema,
    AuthResponse: AuthResponseSchema,
    // ==================== API RESPONSE SCHEMAS ====================
};
// ==================== API RESPONSE SCHEMAS ====================
export const ApiResponseSchema = (dataSchema) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    error: z.string().optional(),
});
export const PaginatedResponseSchema = (itemSchema) => z.object({
    success: z.boolean(),
    data: z.array(itemSchema),
    pagination: z.object({
        page: z.number().int().positive(),
        limit: z.number().int().positive(),
        total: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
    }),
    message: z.string().optional(),
});
// ==================== FARM API RESPONSE SCHEMAS ====================
// ==================== USER RESPONSE SCHEMAS ====================
