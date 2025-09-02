// packages/shared-types/index.ts
import { z } from "zod";

// ==================== ENUMS ====================

export const UserRoleSchema = z.enum(["OWNER", "MANAGER"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const BatchStatusSchema = z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]);
export type BatchStatus = z.infer<typeof BatchStatusSchema>;

export const TransactionTypeSchema = z.enum([
  "PURCHASE",
  "SALE",
  "PAYMENT",
  "RECEIPT",
  "ADJUSTMENT",
  "OPENING_BALANCE",
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const NotificationTypeSchema = z.enum([
  "LOW_INVENTORY",
  "VACCINATION_DUE",
  "BATCH_COMPLETION",
  "PAYMENT_DUE",
  "MORTALITY_ALERT",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NotificationStatusSchema = z.enum([
  "PENDING",
  "READ",
  "DISMISSED",
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const VaccinationStatusSchema = z.enum([
  "PENDING",
  "COMPLETED",
  "MISSED",
  "OVERDUE",
]);
export type VaccinationStatus = z.infer<typeof VaccinationStatusSchema>;

export const AuditActionSchema = z.enum([
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const CategoryTypeSchema = z.enum(["EXPENSE", "SALES", "INVENTORY"]);
export type CategoryType = z.infer<typeof CategoryTypeSchema>;

// ==================== BASE SCHEMAS ====================

export const BaseSchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ==================== USER SCHEMAS ====================

export const UserSchema = BaseSchema.extend({
  email: z.email(),
  name: z.string(),
  phone: z.string(),
  password: z.string(),
  role: UserRoleSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
  ownerId: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.email(),
  name: z.string(),
  phone: z.string(),
  password: z.string(),
  role: UserRoleSchema.optional().default("OWNER"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().default("OTHER"),
  ownerId: z.string().optional(),
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.email().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  role: UserRoleSchema.optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]).optional(),
  ownerId: z.string().nullable().optional(),
});

export type UpdateUser = z.infer<typeof UpdateUserSchema>;

// ==================== FARM SCHEMAS ====================

export const FarmSchema = BaseSchema.extend({
  name: z.string(),
  location: z.string(),
  capacity: z.number().int().positive(),
  description: z.string().nullable(),
  ownerId: z.string(), // Farm owner
  managers: z.array(z.string()).optional(), // Farm managers (array of user IDs)
});

export type Farm = z.infer<typeof FarmSchema>;

export const CreateFarmSchema = z.object({
  name: z.string(),
  location: z.string(),
  capacity: z.number().int().positive(),
  description: z.string().optional(),
  ownerId: z.string(),
  managers: z.array(z.string()).optional(),
});

export type CreateFarm = z.infer<typeof CreateFarmSchema>;

export const UpdateFarmSchema = z.object({
  name: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  managers: z.array(z.string()).optional(),
});

export type UpdateFarm = z.infer<typeof UpdateFarmSchema>;

// ==================== BATCH SCHEMAS ====================

export const BatchSchema = BaseSchema.extend({
  batchNumber: z.string(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  status: BatchStatusSchema,
  initialChicks: z.number().int().positive(),
  initialChickWeight: z.number().positive(),
  farmId: z.string(),
});

export type Batch = z.infer<typeof BatchSchema>;

export const CreateBatchSchema = z.object({
  batchNumber: z.string(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  status: BatchStatusSchema.optional().default("ACTIVE"),
  initialChicks: z.number().int().positive(),
  initialChickWeight: z.number().positive().optional().default(0.045),
});

export type CreateBatch = z.infer<typeof CreateBatchSchema>;

export const UpdateBatchSchema = z.object({
  batchNumber: z.string().optional(),
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().nullable().optional(),
  status: BatchStatusSchema.optional(),
  initialChicks: z.number().int().positive().optional(),
  initialChickWeight: z.number().positive().optional(),
});

export type UpdateBatch = z.infer<typeof UpdateBatchSchema>;

// ==================== CATEGORY SCHEMAS ====================

export const CategorySchema = BaseSchema.extend({
  name: z.string(),
  type: CategoryTypeSchema,
  description: z.string().nullable(),
  userId: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;

export const CreateCategorySchema = z.object({
  name: z.string(),
  type: CategoryTypeSchema,
  description: z.string().optional(),
});

export type CreateCategory = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  name: z.string().optional(),
  type: CategoryTypeSchema.optional(),
  description: z.string().nullable().optional(),
});

export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

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

export type Expense = z.infer<typeof ExpenseSchema>;

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

export type CreateExpense = z.infer<typeof CreateExpenseSchema>;

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

export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;

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

export type Sale = z.infer<typeof SaleSchema>;

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

export type CreateSale = z.infer<typeof CreateSaleSchema>;

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

export type UpdateSale = z.infer<typeof UpdateSaleSchema>;

// ==================== SALE PAYMENT SCHEMAS ====================

export const SalePaymentSchema = BaseSchema.extend({
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().nullable(),
  saleId: z.string(),
});

export type SalePayment = z.infer<typeof SalePaymentSchema>;

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

export type CreateSalePayment = z.infer<typeof CreateSalePaymentSchema>;

// ==================== INVENTORY SCHEMAS ====================

export const InventoryItemSchema = BaseSchema.extend({
  name: z.string(),
  description: z.string().nullable(),
  currentStock: z.number().nonnegative(),
  unit: z.string(),
  minStock: z.number().nonnegative().nullable(),
  userId: z.string(),
  categoryId: z.string(),
});

export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const CreateInventoryItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  currentStock: z.number().nonnegative().optional().default(0),
  unit: z.string(),
  minStock: z.number().nonnegative().optional(),
  categoryId: z.string(),
});

export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>;

export const UpdateInventoryItemSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  currentStock: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  minStock: z.number().nonnegative().nullable().optional(),
  categoryId: z.string().optional(),
});

export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>;

export const InventoryTransactionSchema = BaseSchema.extend({
  type: TransactionTypeSchema,
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalAmount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().nullable(),
  itemId: z.string(),
});

export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>;

export const CreateInventoryTransactionSchema = z.object({
  type: TransactionTypeSchema,
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  totalAmount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
  itemId: z.string(),
});

export type CreateInventoryTransaction = z.infer<
  typeof CreateInventoryTransactionSchema
>;

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

export type InventoryUsage = z.infer<typeof InventoryUsageSchema>;

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

export type CreateInventoryUsage = z.infer<typeof CreateInventoryUsageSchema>;

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

export type EntityTransaction = z.infer<typeof EntityTransactionSchema>;

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

export type CreateEntityTransaction = z.infer<
  typeof CreateEntityTransactionSchema
>;

// ==================== SUPPLIER SCHEMAS ====================

export const DealerSchema = BaseSchema.extend({
  name: z.string(),
  contact: z.string(),
  address: z.string().nullable(),
  userId: z.string(),
});

export type Dealer = z.infer<typeof DealerSchema>;

export const CreateDealerSchema = z.object({
  name: z.string(),
  contact: z.string(),
  address: z.string().optional(),
});

export type CreateDealer = z.infer<typeof CreateDealerSchema>;

export const UpdateDealerSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().nullable().optional(),
});

export type UpdateDealer = z.infer<typeof UpdateDealerSchema>;

export const HatcherySchema = BaseSchema.extend({
  name: z.string(),
  contact: z.string(),
  address: z.string().nullable(),
  userId: z.string(),
});

export type Hatchery = z.infer<typeof HatcherySchema>;

export const CreateHatcherySchema = z.object({
  name: z.string(),
  contact: z.string(),
  address: z.string().optional(),
});

export type CreateHatchery = z.infer<typeof CreateHatcherySchema>;

export const UpdateHatcherySchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().nullable().optional(),
});

export type UpdateHatchery = z.infer<typeof UpdateHatcherySchema>;

export const MedicineSupplierSchema = BaseSchema.extend({
  name: z.string(),
  contact: z.string(),
  address: z.string().nullable(),
  userId: z.string(),
});

export type MedicineSupplier = z.infer<typeof MedicineSupplierSchema>;

export const CreateMedicineSupplierSchema = z.object({
  name: z.string(),
  contact: z.string(),
  address: z.string().optional(),
});

export type CreateMedicineSupplier = z.infer<
  typeof CreateMedicineSupplierSchema
>;

export const UpdateMedicineSupplierSchema = z.object({
  name: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().nullable().optional(),
});

export type UpdateMedicineSupplier = z.infer<
  typeof UpdateMedicineSupplierSchema
>;

// ==================== CUSTOMER SCHEMAS ====================

export const CustomerSchema = BaseSchema.extend({
  name: z.string(),
  phone: z.string(),
  category: z.string().nullable(),
  address: z.string().nullable(),
  balance: z.number(),
  userId: z.string(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  category: z.string().optional(),
  address: z.string().optional(),
  balance: z.number().optional().default(0),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  category: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  balance: z.number().optional(),
});

export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

export const CustomerTransactionSchema = BaseSchema.extend({
  type: TransactionTypeSchema,
  amount: z.number(),
  date: z.string().datetime(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  customerId: z.string(),
});

export type CustomerTransaction = z.infer<typeof CustomerTransactionSchema>;

export const CreateCustomerTransactionSchema = z.object({
  type: TransactionTypeSchema,
  amount: z.number(),
  date: z.string().datetime(),
  description: z.string().optional(),
  reference: z.string().optional(),
  customerId: z.string(),
});

export type CreateCustomerTransaction = z.infer<
  typeof CreateCustomerTransactionSchema
>;

// ==================== BATCH TRACKING SCHEMAS ====================

export const MortalitySchema = BaseSchema.extend({
  date: z.string().datetime(),
  count: z.number().int().positive(),
  reason: z.string().nullable(),
  batchId: z.string(),
});

export type Mortality = z.infer<typeof MortalitySchema>;

export const CreateMortalitySchema = z.object({
  date: z.string().datetime(),
  count: z.number().int().positive(),
  reason: z.string().optional(),
  batchId: z.string(),
});

export type CreateMortality = z.infer<typeof CreateMortalitySchema>;

export const UpdateMortalitySchema = z.object({
  date: z.string().datetime().optional(),
  count: z.number().int().positive().optional(),
  reason: z.string().nullable().optional(),
});

export type UpdateMortality = z.infer<typeof UpdateMortalitySchema>;

export const VaccinationSchema = BaseSchema.extend({
  vaccineName: z.string(),
  scheduledDate: z.string().datetime(),
  completedDate: z.string().datetime().nullable(),
  status: VaccinationStatusSchema,
  notes: z.string().nullable(),
  batchId: z.string(),
});

export type Vaccination = z.infer<typeof VaccinationSchema>;

export const CreateVaccinationSchema = z.object({
  vaccineName: z.string(),
  scheduledDate: z.string().datetime(),
  completedDate: z.string().datetime().optional(),
  status: VaccinationStatusSchema.optional().default("PENDING"),
  notes: z.string().optional(),
  batchId: z.string(),
});

export type CreateVaccination = z.infer<typeof CreateVaccinationSchema>;

export const UpdateVaccinationSchema = z.object({
  vaccineName: z.string().optional(),
  scheduledDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().nullable().optional(),
  status: VaccinationStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateVaccination = z.infer<typeof UpdateVaccinationSchema>;

export const FeedConsumptionSchema = BaseSchema.extend({
  date: z.string().datetime(),
  quantity: z.number().positive(),
  feedType: z.string(),
  batchId: z.string(),
});

export type FeedConsumption = z.infer<typeof FeedConsumptionSchema>;

export const CreateFeedConsumptionSchema = z.object({
  date: z.string().datetime(),
  quantity: z.number().positive(),
  feedType: z.string(),
  batchId: z.string(),
});

export type CreateFeedConsumption = z.infer<typeof CreateFeedConsumptionSchema>;

export const UpdateFeedConsumptionSchema = z.object({
  date: z.string().datetime().optional(),
  quantity: z.number().positive().optional(),
  feedType: z.string().optional(),
});

export type UpdateFeedConsumption = z.infer<typeof UpdateFeedConsumptionSchema>;

export const BirdWeightSchema = BaseSchema.extend({
  date: z.string().datetime(),
  avgWeight: z.number().positive(),
  sampleCount: z.number().int().positive(),
  batchId: z.string(),
});

export type BirdWeight = z.infer<typeof BirdWeightSchema>;

export const CreateBirdWeightSchema = z.object({
  date: z.string().datetime(),
  avgWeight: z.number().positive(),
  sampleCount: z.number().int().positive(),
  batchId: z.string(),
});

export type CreateBirdWeight = z.infer<typeof CreateBirdWeightSchema>;

export const UpdateBirdWeightSchema = z.object({
  date: z.string().datetime().optional(),
  avgWeight: z.number().positive().optional(),
  sampleCount: z.number().int().positive().optional(),
});

export type UpdateBirdWeight = z.infer<typeof UpdateBirdWeightSchema>;

// ==================== NOTIFICATION SCHEMAS ====================

export const NotificationSchema = BaseSchema.extend({
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  status: NotificationStatusSchema,
  data: z.any().nullable(),
  userId: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const CreateNotificationSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  status: NotificationStatusSchema.optional().default("PENDING"),
  data: z.any().optional(),
  userId: z.string(),
});

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;

export const UpdateNotificationSchema = z.object({
  type: NotificationTypeSchema.optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  status: NotificationStatusSchema.optional(),
  data: z.any().nullable().optional(),
});

export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>;

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

export type AuditLog = z.infer<typeof AuditLogSchema>;

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

export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;

// ==================== AUTHENTICATION SCHEMAS ====================

export const LoginSchema = z.object({
  emailOrPhone: z.string(), // Can be email or phone
  password: z.string(),
});

export type Login = z.infer<typeof LoginSchema>;

export const SignupSchema = z.object({
  name: z.string(),
  email: z.email(),
  phone: z.string(),
  password: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().default("OTHER"),
  role: UserRoleSchema.optional().default("OWNER"),
});

export type Signup = z.infer<typeof SignupSchema>;

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

export type BatchAnalytics = z.infer<typeof BatchAnalyticsSchema>;

export const FarmAnalyticsSchema = z.object({
  farmId: z.string(),
  totalBatches: z.number().int().nonnegative(),
  activeBatches: z.number().int().nonnegative(),
  totalExpenses: z.number().nonnegative(),
  totalSales: z.number().nonnegative(),
  profit: z.number(),
  profitMargin: z.number(),
});

export type FarmAnalytics = z.infer<typeof FarmAnalyticsSchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  role: UserRoleSchema,
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING_VERIFICATION"]),
  managedFarms: z.array(z.string()).optional(), // For managers
});

export type UserResponse = z.infer<typeof UserResponseSchema>;

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: UserResponseSchema,
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;

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

  // Base
  Base: BaseSchema,

  // Core Models
  User: UserSchema,
  CreateUser: CreateUserSchema,
  UpdateUser: UpdateUserSchema,

  Farm: FarmSchema,
  CreateFarm: CreateFarmSchema,
  UpdateFarm: UpdateFarmSchema,

  Batch: BatchSchema,
  CreateBatch: CreateBatchSchema,
  UpdateBatch: UpdateBatchSchema,

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
} as const;

// ==================== API RESPONSE SCHEMAS ====================

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T
) =>
  z.object({
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

// ==================== USER RESPONSE SCHEMAS ====================
