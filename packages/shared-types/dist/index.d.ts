import { z } from "zod";
export declare const UserRoleSchema: z.ZodEnum<{
    OWNER: "OWNER";
    MANAGER: "MANAGER";
    DEALER: "DEALER";
    COMPANY: "COMPANY";
    SUPER_ADMIN: "SUPER_ADMIN";
}>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const BatchStatusSchema: z.ZodEnum<{
    ACTIVE: "ACTIVE";
    COMPLETED: "COMPLETED";
}>;
export type BatchStatus = z.infer<typeof BatchStatusSchema>;
export declare const BatchTypeSchema: z.ZodEnum<{
    BROILER: "BROILER";
    LAYERS: "LAYERS";
}>;
export type BatchType = z.infer<typeof BatchTypeSchema>;
export declare const TransactionTypeSchema: z.ZodEnum<{
    PURCHASE: "PURCHASE";
    SALE: "SALE";
    PAYMENT: "PAYMENT";
    RECEIPT: "RECEIPT";
    ADJUSTMENT: "ADJUSTMENT";
    OPENING_BALANCE: "OPENING_BALANCE";
    USAGE: "USAGE";
}>;
export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export declare const NotificationTypeSchema: z.ZodEnum<{
    LOW_INVENTORY: "LOW_INVENTORY";
    VACCINATION_DUE: "VACCINATION_DUE";
    BATCH_COMPLETION: "BATCH_COMPLETION";
    PAYMENT_DUE: "PAYMENT_DUE";
    MORTALITY_ALERT: "MORTALITY_ALERT";
}>;
export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export declare const NotificationStatusSchema: z.ZodEnum<{
    PENDING: "PENDING";
    READ: "READ";
    DISMISSED: "DISMISSED";
}>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export declare const VaccinationStatusSchema: z.ZodEnum<{
    COMPLETED: "COMPLETED";
    PENDING: "PENDING";
    MISSED: "MISSED";
    OVERDUE: "OVERDUE";
}>;
export type VaccinationStatus = z.infer<typeof VaccinationStatusSchema>;
export declare const AuditActionSchema: z.ZodEnum<{
    CREATE: "CREATE";
    UPDATE: "UPDATE";
    DELETE: "DELETE";
    LOGIN: "LOGIN";
    LOGOUT: "LOGOUT";
}>;
export type AuditAction = z.infer<typeof AuditActionSchema>;
export declare const CategoryTypeSchema: z.ZodEnum<{
    EXPENSE: "EXPENSE";
    SALES: "SALES";
    INVENTORY: "INVENTORY";
}>;
export type CategoryType = z.infer<typeof CategoryTypeSchema>;
export declare const ReminderTypeSchema: z.ZodEnum<{
    VACCINATION: "VACCINATION";
    FEEDING: "FEEDING";
    MEDICATION: "MEDICATION";
    CLEANING: "CLEANING";
    WEIGHING: "WEIGHING";
    SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
    CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
    GENERAL: "GENERAL";
}>;
export type ReminderType = z.infer<typeof ReminderTypeSchema>;
export declare const ReminderStatusSchema: z.ZodEnum<{
    COMPLETED: "COMPLETED";
    PENDING: "PENDING";
    OVERDUE: "OVERDUE";
    CANCELLED: "CANCELLED";
}>;
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;
export declare const RecurrencePatternSchema: z.ZodEnum<{
    NONE: "NONE";
    DAILY: "DAILY";
    WEEKLY: "WEEKLY";
    MONTHLY: "MONTHLY";
    CUSTOM: "CUSTOM";
}>;
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>;
export declare const BaseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, z.core.$strip>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>;
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        PENDING_VERIFICATION: "PENDING_VERIFICATION";
    }>;
    ownerId: z.ZodNullable<z.ZodString>;
    companyName: z.ZodNullable<z.ZodString>;
    CompanyFarmLocation: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type User = z.infer<typeof UserSchema>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodEmail>;
    name: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>>;
    gender: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        MALE: "MALE";
        FEMALE: "FEMALE";
        OTHER: "OTHER";
    }>>>;
    ownerId: z.ZodOptional<z.ZodString>;
    companyName: z.ZodOptional<z.ZodString>;
    CompanyFarmLocation: z.ZodOptional<z.ZodString>;
    CompanyFarmNumber: z.ZodOptional<z.ZodString>;
    CompanyFarmCapacity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export declare const UpdateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodEmail>;
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>;
    gender: z.ZodOptional<z.ZodEnum<{
        MALE: "MALE";
        FEMALE: "FEMALE";
        OTHER: "OTHER";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        PENDING_VERIFICATION: "PENDING_VERIFICATION";
    }>>;
    ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    companyName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    CompanyFarmLocation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    CompanyFarmNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    CompanyFarmCapacity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>;
export type UpdateUser = z.infer<typeof UpdateUserSchema>;
export declare const FarmSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    capacity: z.ZodNumber;
    description: z.ZodNullable<z.ZodString>;
    ownerId: z.ZodString;
    managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type Farm = z.infer<typeof FarmSchema>;
export declare const FarmOwnerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>;
}, z.core.$strip>;
export type FarmOwner = z.infer<typeof FarmOwnerSchema>;
export declare const FarmManagerSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>;
}, z.core.$strip>;
export type FarmManager = z.infer<typeof FarmManagerSchema>;
export declare const FarmCountSchema: z.ZodObject<{
    batches: z.ZodNumber;
    activeBatches: z.ZodOptional<z.ZodNumber>;
    closedBatches: z.ZodOptional<z.ZodNumber>;
    expenses: z.ZodNumber;
    sales: z.ZodNumber;
}, z.core.$strip>;
export type FarmCount = z.infer<typeof FarmCountSchema>;
export declare const FarmResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    capacity: z.ZodNumber;
    description: z.ZodNullable<z.ZodString>;
    ownerId: z.ZodString;
    owner: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
    }, z.core.$strip>;
    managers: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
    }, z.core.$strip>>;
    _count: z.ZodObject<{
        batches: z.ZodNumber;
        activeBatches: z.ZodOptional<z.ZodNumber>;
        closedBatches: z.ZodOptional<z.ZodNumber>;
        expenses: z.ZodNumber;
        sales: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type FarmResponse = z.infer<typeof FarmResponseSchema>;
export declare const CreateFarmSchema: z.ZodObject<{
    name: z.ZodString;
    capacity: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type CreateFarm = z.infer<typeof CreateFarmSchema>;
export declare const UpdateFarmSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    capacity: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type UpdateFarm = z.infer<typeof UpdateFarmSchema>;
export declare const BatchSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    batchNumber: z.ZodString;
    startDate: z.ZodDate;
    endDate: z.ZodNullable<z.ZodDate>;
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>;
    batchType: z.ZodEnum<{
        BROILER: "BROILER";
        LAYERS: "LAYERS";
    }>;
    initialChicks: z.ZodNumber;
    initialChickWeight: z.ZodNumber;
    farmId: z.ZodString;
    notes: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Batch = z.infer<typeof BatchSchema>;
export declare const BatchFarmSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    capacity: z.ZodNumber;
    owner: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BatchFarm = z.infer<typeof BatchFarmSchema>;
export declare const BatchCountSchema: z.ZodObject<{
    expenses: z.ZodNumber;
    sales: z.ZodNumber;
    mortalities: z.ZodNumber;
    vaccinations: z.ZodNumber;
    feedConsumptions: z.ZodNumber;
    birdWeights: z.ZodNumber;
    notes: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type BatchCount = z.infer<typeof BatchCountSchema>;
export declare const BatchResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    batchNumber: z.ZodString;
    startDate: z.ZodDate;
    endDate: z.ZodNullable<z.ZodDate>;
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>;
    batchType: z.ZodEnum<{
        BROILER: "BROILER";
        LAYERS: "LAYERS";
    }>;
    initialChicks: z.ZodNumber;
    initialChickWeight: z.ZodNumber;
    farmId: z.ZodString;
    currentChicks: z.ZodNumber;
    farm: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        owner: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        date: z.ZodDate;
        amount: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        quantity: z.ZodNullable<z.ZodNumber>;
        unitPrice: z.ZodNullable<z.ZodNumber>;
        category: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        date: z.ZodDate;
        amount: z.ZodNumber;
        quantity: z.ZodNumber;
        weight: z.ZodNumber;
        unitPrice: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        isCredit: z.ZodBoolean;
        paidAmount: z.ZodNumber;
        dueAmount: z.ZodNullable<z.ZodNumber>;
        category: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodString;
        }, z.core.$strip>;
    }, z.core.$strip>>>;
    _count: z.ZodObject<{
        expenses: z.ZodNumber;
        sales: z.ZodNumber;
        mortalities: z.ZodNumber;
        vaccinations: z.ZodNumber;
        feedConsumptions: z.ZodNumber;
        birdWeights: z.ZodNumber;
        notes: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type BatchResponse = z.infer<typeof BatchResponseSchema>;
export declare const CreateBatchSchema: z.ZodObject<{
    batchNumber: z.ZodString;
    startDate: z.ZodString;
    endDate: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>>>;
    batchType: z.ZodEnum<{
        BROILER: "BROILER";
        LAYERS: "LAYERS";
    }>;
    initialChicks: z.ZodOptional<z.ZodNumber>;
    initialChickWeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    farmId: z.ZodString;
    chicksInventory: z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        quantity: z.ZodNumber;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateBatch = z.infer<typeof CreateBatchSchema>;
export declare const UpdateBatchSchema: z.ZodObject<{
    batchNumber: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>>;
    batchType: z.ZodOptional<z.ZodEnum<{
        BROILER: "BROILER";
        LAYERS: "LAYERS";
    }>>;
    initialChicks: z.ZodOptional<z.ZodNumber>;
    initialChickWeight: z.ZodOptional<z.ZodNumber>;
    farmId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateBatch = z.infer<typeof UpdateBatchSchema>;
export declare const CloseBatchSchema: z.ZodObject<{
    endDate: z.ZodOptional<z.ZodString>;
    finalNotes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CloseBatch = z.infer<typeof CloseBatchSchema>;
export declare const EggCategorySchema: z.ZodEnum<{
    LARGE: "LARGE";
    MEDIUM: "MEDIUM";
    SMALL: "SMALL";
}>;
export type EggCategory = z.infer<typeof EggCategorySchema>;
export declare const CreateEggProductionSchema: z.ZodObject<{
    date: z.ZodString;
    largeCount: z.ZodDefault<z.ZodNumber>;
    mediumCount: z.ZodDefault<z.ZodNumber>;
    smallCount: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CreateEggProduction = z.infer<typeof CreateEggProductionSchema>;
export declare const UpdateEggProductionSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    largeCount: z.ZodOptional<z.ZodNumber>;
    mediumCount: z.ZodOptional<z.ZodNumber>;
    smallCount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UpdateEggProduction = z.infer<typeof UpdateEggProductionSchema>;
export declare const EggProductionSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    batchId: z.ZodString;
    date: z.ZodDate;
    largeCount: z.ZodNumber;
    mediumCount: z.ZodNumber;
    smallCount: z.ZodNumber;
}, z.core.$strip>;
export type EggProductionRecord = z.infer<typeof EggProductionSchema>;
export declare const EggInventoryResponseSchema: z.ZodObject<{
    LARGE: z.ZodNumber;
    MEDIUM: z.ZodNumber;
    SMALL: z.ZodNumber;
}, z.core.$strip>;
export type EggInventoryResponse = z.infer<typeof EggInventoryResponseSchema>;
export declare const BatchSummarySchema: z.ZodObject<{
    initialChicks: z.ZodNumber;
    finalChicks: z.ZodNumber;
    soldChicks: z.ZodNumber;
    naturalMortality: z.ZodNumber;
    remainingAtClosure: z.ZodNumber;
    totalMortality: z.ZodNumber;
    totalSales: z.ZodNumber;
    totalExpenses: z.ZodNumber;
    profit: z.ZodNumber;
    totalSalesQuantity: z.ZodNumber;
    totalSalesWeight: z.ZodNumber;
    daysActive: z.ZodNumber;
}, z.core.$strip>;
export type BatchSummary = z.infer<typeof BatchSummarySchema>;
export declare const CategorySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<{
        EXPENSE: "EXPENSE";
        SALES: "SALES";
        INVENTORY: "INVENTORY";
    }>;
    description: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type Category = z.infer<typeof CategorySchema>;
export declare const CreateCategorySchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        EXPENSE: "EXPENSE";
        SALES: "SALES";
        INVENTORY: "INVENTORY";
    }>;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export declare const UpdateCategorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        EXPENSE: "EXPENSE";
        SALES: "SALES";
        INVENTORY: "INVENTORY";
    }>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
export declare const ExpenseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    amount: z.ZodNumber;
    description: z.ZodNullable<z.ZodString>;
    quantity: z.ZodNullable<z.ZodNumber>;
    unitPrice: z.ZodNullable<z.ZodNumber>;
    farmId: z.ZodString;
    batchId: z.ZodNullable<z.ZodString>;
    categoryId: z.ZodString;
}, z.core.$strip>;
export type Expense = z.infer<typeof ExpenseSchema>;
export declare const CreateExpenseSchema: z.ZodObject<{
    date: z.ZodString;
    amount: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    farmId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    categoryId: z.ZodString;
    inventoryItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
        itemId: z.ZodString;
        quantity: z.ZodNumber;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type CreateExpense = z.infer<typeof CreateExpenseSchema>;
export declare const UpdateExpenseSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    farmId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    categoryId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateExpense = z.infer<typeof UpdateExpenseSchema>;
export declare const SalesItemTypeSchema: z.ZodEnum<{
    OTHER: "OTHER";
    Chicken_Meat: "Chicken_Meat";
    CHICKS: "CHICKS";
    FEED: "FEED";
    MEDICINE: "MEDICINE";
    EGGS: "EGGS";
    EQUIPMENT: "EQUIPMENT";
}>;
export type SalesItemType = z.infer<typeof SalesItemTypeSchema>;
export declare const SaleSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    amount: z.ZodNumber;
    quantity: z.ZodNumber;
    weight: z.ZodNumber;
    unitPrice: z.ZodNumber;
    description: z.ZodNullable<z.ZodString>;
    isCredit: z.ZodBoolean;
    paidAmount: z.ZodNumber;
    dueAmount: z.ZodNullable<z.ZodNumber>;
    farmId: z.ZodString;
    batchId: z.ZodNullable<z.ZodString>;
    customerId: z.ZodNullable<z.ZodString>;
    itemType: z.ZodEnum<{
        OTHER: "OTHER";
        Chicken_Meat: "Chicken_Meat";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EGGS: "EGGS";
        EQUIPMENT: "EQUIPMENT";
    }>;
    categoryId: z.ZodNullable<z.ZodString>;
}, z.core.$strip>;
export type Sale = z.infer<typeof SaleSchema>;
export declare const CreateSaleSchema: z.ZodObject<{
    date: z.ZodString;
    amount: z.ZodNumber;
    quantity: z.ZodNumber;
    weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    unitPrice: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
    isCredit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    paidAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    farmId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    customerId: z.ZodOptional<z.ZodString>;
    itemType: z.ZodOptional<z.ZodEnum<{
        OTHER: "OTHER";
        Chicken_Meat: "Chicken_Meat";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EGGS: "EGGS";
        EQUIPMENT: "EQUIPMENT";
    }>>;
    eggCategory: z.ZodOptional<z.ZodEnum<{
        LARGE: "LARGE";
        MEDIUM: "MEDIUM";
        SMALL: "SMALL";
    }>>;
    categoryId: z.ZodOptional<z.ZodString>;
    customerData: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type CreateSale = z.infer<typeof CreateSaleSchema>;
export declare const UpdateSaleSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    quantity: z.ZodOptional<z.ZodNumber>;
    weight: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isCredit: z.ZodOptional<z.ZodBoolean>;
    paidAmount: z.ZodOptional<z.ZodNumber>;
    farmId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    itemType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        OTHER: "OTHER";
        Chicken_Meat: "Chicken_Meat";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EGGS: "EGGS";
        EQUIPMENT: "EQUIPMENT";
    }>>>;
    categoryId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateSale = z.infer<typeof UpdateSaleSchema>;
export declare const SalePaymentSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    amount: z.ZodNumber;
    date: z.ZodDate;
    description: z.ZodNullable<z.ZodString>;
    saleId: z.ZodString;
}, z.core.$strip>;
export type SalePayment = z.infer<typeof SalePaymentSchema>;
export declare const CreateSalePaymentSchema: z.ZodObject<{
    amount: z.ZodNumber;
    date: z.ZodDefault<z.ZodOptional<z.ZodDate>>;
    description: z.ZodOptional<z.ZodString>;
    saleId: z.ZodString;
}, z.core.$strip>;
export type CreateSalePayment = z.infer<typeof CreateSalePaymentSchema>;
export declare const InventoryItemTypeSchema: z.ZodEnum<{
    OTHER: "OTHER";
    CHICKS: "CHICKS";
    FEED: "FEED";
    MEDICINE: "MEDICINE";
    EQUIPMENT: "EQUIPMENT";
}>;
export type InventoryItemType = z.infer<typeof InventoryItemTypeSchema>;
export declare const InventoryItemSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    currentStock: z.ZodNumber;
    unit: z.ZodString;
    minStock: z.ZodNullable<z.ZodNumber>;
    userId: z.ZodString;
    categoryId: z.ZodString;
    itemType: z.ZodOptional<z.ZodEnum<{
        OTHER: "OTHER";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EQUIPMENT: "EQUIPMENT";
    }>>;
}, z.core.$strip>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export declare const CreateInventoryItemSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    currentStock: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    unit: z.ZodString;
    minStock: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
    itemType: z.ZodOptional<z.ZodEnum<{
        OTHER: "OTHER";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EQUIPMENT: "EQUIPMENT";
    }>>;
    rate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type CreateInventoryItem = z.infer<typeof CreateInventoryItemSchema>;
export declare const UpdateInventoryItemSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    currentStock: z.ZodOptional<z.ZodNumber>;
    unit: z.ZodOptional<z.ZodString>;
    minStock: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    categoryId: z.ZodOptional<z.ZodString>;
    itemType: z.ZodOptional<z.ZodEnum<{
        OTHER: "OTHER";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EQUIPMENT: "EQUIPMENT";
    }>>;
}, z.core.$strip>;
export type UpdateInventoryItem = z.infer<typeof UpdateInventoryItemSchema>;
export declare const InventoryTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    totalAmount: z.ZodNumber;
    date: z.ZodDate;
    description: z.ZodNullable<z.ZodString>;
    itemId: z.ZodString;
}, z.core.$strip>;
export type InventoryTransaction = z.infer<typeof InventoryTransactionSchema>;
export declare const CreateInventoryTransactionSchema: z.ZodObject<{
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    totalAmount: z.ZodNumber;
    date: z.ZodDate;
    description: z.ZodOptional<z.ZodString>;
    itemId: z.ZodString;
}, z.core.$strip>;
export type CreateInventoryTransaction = z.infer<typeof CreateInventoryTransactionSchema>;
export declare const InventoryUsageSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNullable<z.ZodNumber>;
    totalAmount: z.ZodNullable<z.ZodNumber>;
    notes: z.ZodNullable<z.ZodString>;
    itemId: z.ZodString;
    expenseId: z.ZodNullable<z.ZodString>;
    batchId: z.ZodNullable<z.ZodString>;
    farmId: z.ZodString;
}, z.core.$strip>;
export type InventoryUsage = z.infer<typeof InventoryUsageSchema>;
export declare const CreateInventoryUsageSchema: z.ZodObject<{
    date: z.ZodDate;
    quantity: z.ZodNumber;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    totalAmount: z.ZodOptional<z.ZodNumber>;
    notes: z.ZodOptional<z.ZodString>;
    itemId: z.ZodString;
    expenseId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    farmId: z.ZodString;
}, z.core.$strip>;
export type CreateInventoryUsage = z.infer<typeof CreateInventoryUsageSchema>;
export declare const EntityTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    amount: z.ZodNumber;
    quantity: z.ZodNullable<z.ZodNumber>;
    itemName: z.ZodNullable<z.ZodString>;
    date: z.ZodDate;
    description: z.ZodNullable<z.ZodString>;
    reference: z.ZodNullable<z.ZodString>;
    entityType: z.ZodString;
    entityId: z.ZodString;
}, z.core.$strip>;
export type EntityTransaction = z.infer<typeof EntityTransactionSchema>;
export declare const CreateEntityTransactionSchema: z.ZodObject<{
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    amount: z.ZodNumber;
    quantity: z.ZodOptional<z.ZodNumber>;
    itemName: z.ZodOptional<z.ZodString>;
    date: z.ZodDate;
    description: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    entityType: z.ZodString;
    entityId: z.ZodString;
}, z.core.$strip>;
export type CreateEntityTransaction = z.infer<typeof CreateEntityTransactionSchema>;
export declare const DealerSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type Dealer = z.infer<typeof DealerSchema>;
export declare const CreateDealerSchema: z.ZodObject<{
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateDealer = z.infer<typeof CreateDealerSchema>;
export declare const UpdateDealerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    contact: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateDealer = z.infer<typeof UpdateDealerSchema>;
export declare const DealerTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    amount: z.ZodNumber;
    quantity: z.ZodNullable<z.ZodNumber>;
    itemName: z.ZodNullable<z.ZodString>;
    date: z.ZodDate;
    description: z.ZodNullable<z.ZodString>;
    reference: z.ZodNullable<z.ZodString>;
    entityType: z.ZodString;
    entityId: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, z.core.$strip>;
export type DealerTransaction = z.infer<typeof DealerTransactionSchema>;
export declare const DealerResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    balance: z.ZodNumber;
    thisMonthAmount: z.ZodNumber;
    totalTransactions: z.ZodNumber;
    recentTransactions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        quantity: z.ZodNullable<z.ZodNumber>;
        itemName: z.ZodNullable<z.ZodString>;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        reference: z.ZodNullable<z.ZodString>;
        entityType: z.ZodString;
        entityId: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DealerResponse = z.infer<typeof DealerResponseSchema>;
export declare const DealerStatisticsSchema: z.ZodObject<{
    totalDealers: z.ZodNumber;
    activeDealers: z.ZodNumber;
    outstandingAmount: z.ZodNumber;
    thisMonthAmount: z.ZodNumber;
}, z.core.$strip>;
export type DealerStatistics = z.infer<typeof DealerStatisticsSchema>;
export declare const DealerDetailResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
    balance: z.ZodNumber;
    thisMonthAmount: z.ZodNumber;
    totalTransactions: z.ZodNumber;
    transactionTable: z.ZodArray<z.ZodObject<{
        itemName: z.ZodString;
        rate: z.ZodNumber;
        quantity: z.ZodNumber;
        totalAmount: z.ZodNumber;
        amountPaid: z.ZodNumber;
        amountDue: z.ZodNumber;
        date: z.ZodDate;
        dueDate: z.ZodDate;
        payments: z.ZodArray<z.ZodObject<{
            amount: z.ZodNumber;
            date: z.ZodDate;
            reference: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    summary: z.ZodObject<{
        totalPurchases: z.ZodNumber;
        totalPayments: z.ZodNumber;
        outstandingAmount: z.ZodNumber;
        thisMonthPurchases: z.ZodNumber;
    }, z.core.$strip>;
}, z.core.$strip>;
export type DealerDetailResponse = z.infer<typeof DealerDetailResponseSchema>;
export declare const HatcherySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type Hatchery = z.infer<typeof HatcherySchema>;
export declare const CreateHatcherySchema: z.ZodObject<{
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateHatchery = z.infer<typeof CreateHatcherySchema>;
export declare const UpdateHatcherySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    contact: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateHatchery = z.infer<typeof UpdateHatcherySchema>;
export declare const MedicineSupplierSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type MedicineSupplier = z.infer<typeof MedicineSupplierSchema>;
export declare const CreateMedicineSupplierSchema: z.ZodObject<{
    name: z.ZodString;
    contact: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateMedicineSupplier = z.infer<typeof CreateMedicineSupplierSchema>;
export declare const UpdateMedicineSupplierSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    contact: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateMedicineSupplier = z.infer<typeof UpdateMedicineSupplierSchema>;
export declare const CustomerSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    name: z.ZodString;
    phone: z.ZodString;
    category: z.ZodNullable<z.ZodString>;
    address: z.ZodNullable<z.ZodString>;
    balance: z.ZodNumber;
    userId: z.ZodString;
}, z.core.$strip>;
export type Customer = z.infer<typeof CustomerSchema>;
export declare const CreateCustomerSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    balance: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export declare const UpdateCustomerSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    balance: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;
export declare const CustomerTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    amount: z.ZodNumber;
    date: z.ZodDate;
    description: z.ZodNullable<z.ZodString>;
    reference: z.ZodNullable<z.ZodString>;
    customerId: z.ZodString;
}, z.core.$strip>;
export type CustomerTransaction = z.infer<typeof CustomerTransactionSchema>;
export declare const CreateCustomerTransactionSchema: z.ZodObject<{
    type: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    amount: z.ZodNumber;
    date: z.ZodDate;
    description: z.ZodOptional<z.ZodString>;
    reference: z.ZodOptional<z.ZodString>;
    customerId: z.ZodString;
}, z.core.$strip>;
export type CreateCustomerTransaction = z.infer<typeof CreateCustomerTransactionSchema>;
export declare const MortalitySchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    count: z.ZodNumber;
    reason: z.ZodNullable<z.ZodString>;
    batchId: z.ZodString;
}, z.core.$strip>;
export type Mortality = z.infer<typeof MortalitySchema>;
export declare const CreateMortalitySchema: z.ZodObject<{
    date: z.ZodDate;
    count: z.ZodNumber;
    reason: z.ZodOptional<z.ZodString>;
    batchId: z.ZodString;
}, z.core.$strip>;
export type CreateMortality = z.infer<typeof CreateMortalitySchema>;
export declare const UpdateMortalitySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodDate>;
    count: z.ZodOptional<z.ZodNumber>;
    reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export type UpdateMortality = z.infer<typeof UpdateMortalitySchema>;
export declare const VaccinationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    vaccineName: z.ZodString;
    scheduledDate: z.ZodDate;
    completedDate: z.ZodNullable<z.ZodDate>;
    status: z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        MISSED: "MISSED";
        OVERDUE: "OVERDUE";
    }>;
    notes: z.ZodNullable<z.ZodString>;
    batchId: z.ZodString;
}, z.core.$strip>;
export type Vaccination = z.infer<typeof VaccinationSchema>;
export declare const CreateVaccinationSchema: z.ZodObject<{
    vaccineName: z.ZodString;
    scheduledDate: z.ZodDate;
    completedDate: z.ZodOptional<z.ZodDate>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        MISSED: "MISSED";
        OVERDUE: "OVERDUE";
    }>>>;
    notes: z.ZodOptional<z.ZodString>;
    batchId: z.ZodString;
}, z.core.$strip>;
export type CreateVaccination = z.infer<typeof CreateVaccinationSchema>;
export declare const UpdateVaccinationSchema: z.ZodObject<{
    vaccineName: z.ZodOptional<z.ZodString>;
    scheduledDate: z.ZodOptional<z.ZodDate>;
    completedDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    status: z.ZodOptional<z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        MISSED: "MISSED";
        OVERDUE: "OVERDUE";
    }>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type UpdateVaccination = z.infer<typeof UpdateVaccinationSchema>;
export declare const FeedConsumptionSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    quantity: z.ZodNumber;
    feedType: z.ZodString;
    batchId: z.ZodString;
}, z.core.$strip>;
export type FeedConsumption = z.infer<typeof FeedConsumptionSchema>;
export declare const CreateFeedConsumptionSchema: z.ZodObject<{
    date: z.ZodDate;
    quantity: z.ZodNumber;
    feedType: z.ZodString;
    batchId: z.ZodString;
}, z.core.$strip>;
export type CreateFeedConsumption = z.infer<typeof CreateFeedConsumptionSchema>;
export declare const UpdateFeedConsumptionSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodDate>;
    quantity: z.ZodOptional<z.ZodNumber>;
    feedType: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateFeedConsumption = z.infer<typeof UpdateFeedConsumptionSchema>;
export declare const BirdWeightSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    date: z.ZodDate;
    avgWeight: z.ZodNumber;
    sampleCount: z.ZodNumber;
    batchId: z.ZodString;
}, z.core.$strip>;
export type BirdWeight = z.infer<typeof BirdWeightSchema>;
export declare const CreateBirdWeightSchema: z.ZodObject<{
    date: z.ZodDate;
    avgWeight: z.ZodNumber;
    sampleCount: z.ZodNumber;
    batchId: z.ZodString;
}, z.core.$strip>;
export type CreateBirdWeight = z.infer<typeof CreateBirdWeightSchema>;
export declare const UpdateBirdWeightSchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodDate>;
    avgWeight: z.ZodOptional<z.ZodNumber>;
    sampleCount: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UpdateBirdWeight = z.infer<typeof UpdateBirdWeightSchema>;
export declare const NotificationSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    type: z.ZodEnum<{
        LOW_INVENTORY: "LOW_INVENTORY";
        VACCINATION_DUE: "VACCINATION_DUE";
        BATCH_COMPLETION: "BATCH_COMPLETION";
        PAYMENT_DUE: "PAYMENT_DUE";
        MORTALITY_ALERT: "MORTALITY_ALERT";
    }>;
    title: z.ZodString;
    message: z.ZodString;
    status: z.ZodEnum<{
        PENDING: "PENDING";
        READ: "READ";
        DISMISSED: "DISMISSED";
    }>;
    data: z.ZodNullable<z.ZodAny>;
    userId: z.ZodString;
}, z.core.$strip>;
export type Notification = z.infer<typeof NotificationSchema>;
export declare const CreateNotificationSchema: z.ZodObject<{
    type: z.ZodEnum<{
        LOW_INVENTORY: "LOW_INVENTORY";
        VACCINATION_DUE: "VACCINATION_DUE";
        BATCH_COMPLETION: "BATCH_COMPLETION";
        PAYMENT_DUE: "PAYMENT_DUE";
        MORTALITY_ALERT: "MORTALITY_ALERT";
    }>;
    title: z.ZodString;
    message: z.ZodString;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        READ: "READ";
        DISMISSED: "DISMISSED";
    }>>>;
    data: z.ZodOptional<z.ZodAny>;
    userId: z.ZodString;
}, z.core.$strip>;
export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
export declare const UpdateNotificationSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        LOW_INVENTORY: "LOW_INVENTORY";
        VACCINATION_DUE: "VACCINATION_DUE";
        BATCH_COMPLETION: "BATCH_COMPLETION";
        PAYMENT_DUE: "PAYMENT_DUE";
        MORTALITY_ALERT: "MORTALITY_ALERT";
    }>>;
    title: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        PENDING: "PENDING";
        READ: "READ";
        DISMISSED: "DISMISSED";
    }>>;
    data: z.ZodOptional<z.ZodNullable<z.ZodAny>>;
}, z.core.$strip>;
export type UpdateNotification = z.infer<typeof UpdateNotificationSchema>;
export declare const ReminderSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    type: z.ZodEnum<{
        VACCINATION: "VACCINATION";
        FEEDING: "FEEDING";
        MEDICATION: "MEDICATION";
        CLEANING: "CLEANING";
        WEIGHING: "WEIGHING";
        SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
        CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
        GENERAL: "GENERAL";
    }>;
    status: z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        OVERDUE: "OVERDUE";
        CANCELLED: "CANCELLED";
    }>;
    dueDate: z.ZodDate;
    isRecurring: z.ZodBoolean;
    recurrencePattern: z.ZodEnum<{
        NONE: "NONE";
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
        CUSTOM: "CUSTOM";
    }>;
    recurrenceInterval: z.ZodNullable<z.ZodNumber>;
    lastTriggered: z.ZodNullable<z.ZodDate>;
    farmId: z.ZodNullable<z.ZodString>;
    farm: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
    }, z.core.$strip>>>;
    batchId: z.ZodNullable<z.ZodString>;
    batch: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        batchNumber: z.ZodString;
    }, z.core.$strip>>>;
    data: z.ZodNullable<z.ZodAny>;
    userId: z.ZodString;
}, z.core.$strip>;
export type Reminder = z.infer<typeof ReminderSchema>;
export declare const CreateReminderSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<{
        VACCINATION: "VACCINATION";
        FEEDING: "FEEDING";
        MEDICATION: "MEDICATION";
        CLEANING: "CLEANING";
        WEIGHING: "WEIGHING";
        SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
        CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
        GENERAL: "GENERAL";
    }>;
    dueDate: z.ZodString;
    isRecurring: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    recurrencePattern: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        NONE: "NONE";
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
        CUSTOM: "CUSTOM";
    }>>>;
    recurrenceInterval: z.ZodOptional<z.ZodNumber>;
    farmId: z.ZodOptional<z.ZodString>;
    batchId: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export type CreateReminder = z.infer<typeof CreateReminderSchema>;
export declare const UpdateReminderSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        VACCINATION: "VACCINATION";
        FEEDING: "FEEDING";
        MEDICATION: "MEDICATION";
        CLEANING: "CLEANING";
        WEIGHING: "WEIGHING";
        SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
        CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
        GENERAL: "GENERAL";
    }>>;
    dueDate: z.ZodOptional<z.ZodString>;
    isRecurring: z.ZodOptional<z.ZodBoolean>;
    recurrencePattern: z.ZodOptional<z.ZodEnum<{
        NONE: "NONE";
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
        CUSTOM: "CUSTOM";
    }>>;
    recurrenceInterval: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        OVERDUE: "OVERDUE";
        CANCELLED: "CANCELLED";
    }>>;
    farmId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    data: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export type UpdateReminder = z.infer<typeof UpdateReminderSchema>;
export declare const AuditLogSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    action: z.ZodEnum<{
        CREATE: "CREATE";
        UPDATE: "UPDATE";
        DELETE: "DELETE";
        LOGIN: "LOGIN";
        LOGOUT: "LOGOUT";
    }>;
    tableName: z.ZodString;
    recordId: z.ZodString;
    oldValues: z.ZodNullable<z.ZodAny>;
    newValues: z.ZodNullable<z.ZodAny>;
    ipAddress: z.ZodNullable<z.ZodString>;
    userAgent: z.ZodNullable<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export declare const CreateAuditLogSchema: z.ZodObject<{
    action: z.ZodEnum<{
        CREATE: "CREATE";
        UPDATE: "UPDATE";
        DELETE: "DELETE";
        LOGIN: "LOGIN";
        LOGOUT: "LOGOUT";
    }>;
    tableName: z.ZodString;
    recordId: z.ZodString;
    oldValues: z.ZodOptional<z.ZodAny>;
    newValues: z.ZodOptional<z.ZodAny>;
    ipAddress: z.ZodOptional<z.ZodString>;
    userAgent: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type CreateAuditLog = z.infer<typeof CreateAuditLogSchema>;
export declare const LoginSchema: z.ZodObject<{
    emailOrPhone: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type Login = z.infer<typeof LoginSchema>;
export declare const LanguageSchema: z.ZodEnum<{
    ENGLISH: "ENGLISH";
    NEPALI: "NEPALI";
}>;
export declare const CalendarTypeSchema: z.ZodEnum<{
    AD: "AD";
    BS: "BS";
}>;
export declare const SignupSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    password: z.ZodString;
    role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>>>;
    companyName: z.ZodOptional<z.ZodString>;
    companyFarmLocation: z.ZodOptional<z.ZodString>;
    language: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ENGLISH: "ENGLISH";
        NEPALI: "NEPALI";
    }>>>;
    calendarType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        AD: "AD";
        BS: "BS";
    }>>>;
}, z.core.$strip>;
export type Signup = z.infer<typeof SignupSchema>;
export declare const BatchAnalyticsSchema: z.ZodObject<{
    batchId: z.ZodString;
    currentChicks: z.ZodNumber;
    totalMortality: z.ZodNumber;
    totalExpenses: z.ZodNumber;
    totalSales: z.ZodNumber;
    fcr: z.ZodNullable<z.ZodNumber>;
    avgWeight: z.ZodNullable<z.ZodNumber>;
    daysActive: z.ZodNumber;
    fcrData: z.ZodOptional<z.ZodObject<{
        totalFeedConsumed: z.ZodNumber;
        initialTotalWeight: z.ZodNumber;
        currentTotalWeight: z.ZodNumber;
        totalWeightGained: z.ZodNumber;
        initialWeightPerChick: z.ZodNumber;
        status: z.ZodEnum<{
            calculated: "calculated";
            no_weight_data: "no_weight_data";
            no_feed_data: "no_feed_data";
            insufficient_data: "insufficient_data";
        }>;
        message: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BatchAnalytics = z.infer<typeof BatchAnalyticsSchema>;
export declare const FarmAnalyticsSchema: z.ZodObject<{
    farmId: z.ZodString;
    totalBatches: z.ZodNumber;
    activeBatches: z.ZodNumber;
    totalExpenses: z.ZodNumber;
    totalSales: z.ZodNumber;
    profit: z.ZodNumber;
    profitMargin: z.ZodNumber;
}, z.core.$strip>;
export type FarmAnalytics = z.infer<typeof FarmAnalyticsSchema>;
export declare const UserResponseSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    role: z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>;
    gender: z.ZodEnum<{
        MALE: "MALE";
        FEMALE: "FEMALE";
        OTHER: "OTHER";
    }>;
    status: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        INACTIVE: "INACTIVE";
        PENDING_VERIFICATION: "PENDING_VERIFICATION";
    }>;
    managedFarms: z.ZodOptional<z.ZodArray<z.ZodString>>;
    companyName: z.ZodOptional<z.ZodString>;
    companyFarmLocation: z.ZodOptional<z.ZodString>;
    companyFarmNumber: z.ZodOptional<z.ZodString>;
    companyFarmCapacity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export declare const AuthResponseSchema: z.ZodObject<{
    accessToken: z.ZodString;
    user: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodString;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
        gender: z.ZodEnum<{
            MALE: "MALE";
            FEMALE: "FEMALE";
            OTHER: "OTHER";
        }>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            PENDING_VERIFICATION: "PENDING_VERIFICATION";
        }>;
        managedFarms: z.ZodOptional<z.ZodArray<z.ZodString>>;
        companyName: z.ZodOptional<z.ZodString>;
        companyFarmLocation: z.ZodOptional<z.ZodString>;
        companyFarmNumber: z.ZodOptional<z.ZodString>;
        companyFarmCapacity: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export declare const FarmListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        owner: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>;
        managers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>>;
        _count: z.ZodObject<{
            batches: z.ZodNumber;
            activeBatches: z.ZodOptional<z.ZodNumber>;
            closedBatches: z.ZodOptional<z.ZodNumber>;
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FarmListResponse = z.infer<typeof FarmListResponseSchema>;
export declare const FarmDetailResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        owner: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>;
        managers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>>;
        _count: z.ZodObject<{
            batches: z.ZodNumber;
            activeBatches: z.ZodOptional<z.ZodNumber>;
            closedBatches: z.ZodOptional<z.ZodNumber>;
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FarmDetailResponse = z.infer<typeof FarmDetailResponseSchema>;
export declare const BatchListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        batchNumber: z.ZodString;
        startDate: z.ZodDate;
        endDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>;
        batchType: z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>;
        initialChicks: z.ZodNumber;
        initialChickWeight: z.ZodNumber;
        farmId: z.ZodString;
        currentChicks: z.ZodNumber;
        farm: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            capacity: z.ZodNumber;
            owner: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            quantity: z.ZodNullable<z.ZodNumber>;
            unitPrice: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            quantity: z.ZodNumber;
            weight: z.ZodNumber;
            unitPrice: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            isCredit: z.ZodBoolean;
            paidAmount: z.ZodNumber;
            dueAmount: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        _count: z.ZodObject<{
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
            mortalities: z.ZodNumber;
            vaccinations: z.ZodNumber;
            feedConsumptions: z.ZodNumber;
            birdWeights: z.ZodNumber;
            notes: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>>;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, z.core.$strip>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BatchListResponse = z.infer<typeof BatchListResponseSchema>;
export declare const BatchDetailResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        batchNumber: z.ZodString;
        startDate: z.ZodDate;
        endDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>;
        batchType: z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>;
        initialChicks: z.ZodNumber;
        initialChickWeight: z.ZodNumber;
        farmId: z.ZodString;
        currentChicks: z.ZodNumber;
        farm: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            capacity: z.ZodNumber;
            owner: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            quantity: z.ZodNullable<z.ZodNumber>;
            unitPrice: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            quantity: z.ZodNumber;
            weight: z.ZodNumber;
            unitPrice: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            isCredit: z.ZodBoolean;
            paidAmount: z.ZodNumber;
            dueAmount: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        _count: z.ZodObject<{
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
            mortalities: z.ZodNumber;
            vaccinations: z.ZodNumber;
            feedConsumptions: z.ZodNumber;
            birdWeights: z.ZodNumber;
            notes: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type BatchDetailResponse = z.infer<typeof BatchDetailResponseSchema>;
export declare const schemas: {
    readonly UserRole: z.ZodEnum<{
        OWNER: "OWNER";
        MANAGER: "MANAGER";
        DEALER: "DEALER";
        COMPANY: "COMPANY";
        SUPER_ADMIN: "SUPER_ADMIN";
    }>;
    readonly BatchStatus: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        COMPLETED: "COMPLETED";
    }>;
    readonly BatchType: z.ZodEnum<{
        BROILER: "BROILER";
        LAYERS: "LAYERS";
    }>;
    readonly TransactionType: z.ZodEnum<{
        PURCHASE: "PURCHASE";
        SALE: "SALE";
        PAYMENT: "PAYMENT";
        RECEIPT: "RECEIPT";
        ADJUSTMENT: "ADJUSTMENT";
        OPENING_BALANCE: "OPENING_BALANCE";
        USAGE: "USAGE";
    }>;
    readonly NotificationType: z.ZodEnum<{
        LOW_INVENTORY: "LOW_INVENTORY";
        VACCINATION_DUE: "VACCINATION_DUE";
        BATCH_COMPLETION: "BATCH_COMPLETION";
        PAYMENT_DUE: "PAYMENT_DUE";
        MORTALITY_ALERT: "MORTALITY_ALERT";
    }>;
    readonly NotificationStatus: z.ZodEnum<{
        PENDING: "PENDING";
        READ: "READ";
        DISMISSED: "DISMISSED";
    }>;
    readonly VaccinationStatus: z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        MISSED: "MISSED";
        OVERDUE: "OVERDUE";
    }>;
    readonly AuditAction: z.ZodEnum<{
        CREATE: "CREATE";
        UPDATE: "UPDATE";
        DELETE: "DELETE";
        LOGIN: "LOGIN";
        LOGOUT: "LOGOUT";
    }>;
    readonly CategoryType: z.ZodEnum<{
        EXPENSE: "EXPENSE";
        SALES: "SALES";
        INVENTORY: "INVENTORY";
    }>;
    readonly InventoryItemType: z.ZodEnum<{
        OTHER: "OTHER";
        CHICKS: "CHICKS";
        FEED: "FEED";
        MEDICINE: "MEDICINE";
        EQUIPMENT: "EQUIPMENT";
    }>;
    readonly ReminderType: z.ZodEnum<{
        VACCINATION: "VACCINATION";
        FEEDING: "FEEDING";
        MEDICATION: "MEDICATION";
        CLEANING: "CLEANING";
        WEIGHING: "WEIGHING";
        SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
        CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
        GENERAL: "GENERAL";
    }>;
    readonly ReminderStatus: z.ZodEnum<{
        COMPLETED: "COMPLETED";
        PENDING: "PENDING";
        OVERDUE: "OVERDUE";
        CANCELLED: "CANCELLED";
    }>;
    readonly RecurrencePattern: z.ZodEnum<{
        NONE: "NONE";
        DAILY: "DAILY";
        WEEKLY: "WEEKLY";
        MONTHLY: "MONTHLY";
        CUSTOM: "CUSTOM";
    }>;
    readonly Base: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, z.core.$strip>;
    readonly User: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        password: z.ZodString;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            PENDING_VERIFICATION: "PENDING_VERIFICATION";
        }>;
        ownerId: z.ZodNullable<z.ZodString>;
        companyName: z.ZodNullable<z.ZodString>;
        CompanyFarmLocation: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    readonly CreateUser: z.ZodObject<{
        email: z.ZodOptional<z.ZodEmail>;
        name: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        password: z.ZodString;
        role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>>>;
        gender: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            MALE: "MALE";
            FEMALE: "FEMALE";
            OTHER: "OTHER";
        }>>>;
        ownerId: z.ZodOptional<z.ZodString>;
        companyName: z.ZodOptional<z.ZodString>;
        CompanyFarmLocation: z.ZodOptional<z.ZodString>;
        CompanyFarmNumber: z.ZodOptional<z.ZodString>;
        CompanyFarmCapacity: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly UpdateUser: z.ZodObject<{
        email: z.ZodOptional<z.ZodEmail>;
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>>;
        gender: z.ZodOptional<z.ZodEnum<{
            MALE: "MALE";
            FEMALE: "FEMALE";
            OTHER: "OTHER";
        }>>;
        status: z.ZodOptional<z.ZodEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            PENDING_VERIFICATION: "PENDING_VERIFICATION";
        }>>;
        ownerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        companyName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        CompanyFarmLocation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        CompanyFarmNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        CompanyFarmCapacity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    }, z.core.$strip>;
    readonly Farm: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    readonly CreateFarm: z.ZodObject<{
        name: z.ZodString;
        capacity: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        ownerId: z.ZodOptional<z.ZodString>;
        managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    readonly UpdateFarm: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        capacity: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodString>;
        ownerId: z.ZodOptional<z.ZodString>;
        managers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    readonly FarmResponse: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        ownerId: z.ZodString;
        owner: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>;
        managers: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
        }, z.core.$strip>>;
        _count: z.ZodObject<{
            batches: z.ZodNumber;
            activeBatches: z.ZodOptional<z.ZodNumber>;
            closedBatches: z.ZodOptional<z.ZodNumber>;
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly FarmOwner: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
    }, z.core.$strip>;
    readonly FarmManager: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodNullable<z.ZodString>;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
    }, z.core.$strip>;
    readonly FarmCount: z.ZodObject<{
        batches: z.ZodNumber;
        activeBatches: z.ZodOptional<z.ZodNumber>;
        closedBatches: z.ZodOptional<z.ZodNumber>;
        expenses: z.ZodNumber;
        sales: z.ZodNumber;
    }, z.core.$strip>;
    readonly FarmDetailResponse: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodObject<{
            id: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            name: z.ZodString;
            capacity: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            ownerId: z.ZodString;
            owner: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
                role: z.ZodEnum<{
                    OWNER: "OWNER";
                    MANAGER: "MANAGER";
                    DEALER: "DEALER";
                    COMPANY: "COMPANY";
                    SUPER_ADMIN: "SUPER_ADMIN";
                }>;
            }, z.core.$strip>;
            managers: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
                role: z.ZodEnum<{
                    OWNER: "OWNER";
                    MANAGER: "MANAGER";
                    DEALER: "DEALER";
                    COMPANY: "COMPANY";
                    SUPER_ADMIN: "SUPER_ADMIN";
                }>;
            }, z.core.$strip>>;
            _count: z.ZodObject<{
                batches: z.ZodNumber;
                activeBatches: z.ZodOptional<z.ZodNumber>;
                closedBatches: z.ZodOptional<z.ZodNumber>;
                expenses: z.ZodNumber;
                sales: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly FarmListResponse: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            name: z.ZodString;
            capacity: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            ownerId: z.ZodString;
            owner: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
                role: z.ZodEnum<{
                    OWNER: "OWNER";
                    MANAGER: "MANAGER";
                    DEALER: "DEALER";
                    COMPANY: "COMPANY";
                    SUPER_ADMIN: "SUPER_ADMIN";
                }>;
            }, z.core.$strip>;
            managers: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
                role: z.ZodEnum<{
                    OWNER: "OWNER";
                    MANAGER: "MANAGER";
                    DEALER: "DEALER";
                    COMPANY: "COMPANY";
                    SUPER_ADMIN: "SUPER_ADMIN";
                }>;
            }, z.core.$strip>>;
            _count: z.ZodObject<{
                batches: z.ZodNumber;
                activeBatches: z.ZodOptional<z.ZodNumber>;
                closedBatches: z.ZodOptional<z.ZodNumber>;
                expenses: z.ZodNumber;
                sales: z.ZodNumber;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly Batch: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        batchNumber: z.ZodString;
        startDate: z.ZodDate;
        endDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>;
        batchType: z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>;
        initialChicks: z.ZodNumber;
        initialChickWeight: z.ZodNumber;
        farmId: z.ZodString;
        notes: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    readonly CreateBatch: z.ZodObject<{
        batchNumber: z.ZodString;
        startDate: z.ZodString;
        endDate: z.ZodOptional<z.ZodString>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>>>;
        batchType: z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>;
        initialChicks: z.ZodOptional<z.ZodNumber>;
        initialChickWeight: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        farmId: z.ZodString;
        chicksInventory: z.ZodArray<z.ZodObject<{
            itemId: z.ZodString;
            quantity: z.ZodNumber;
            notes: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly UpdateBatch: z.ZodObject<{
        batchNumber: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        status: z.ZodOptional<z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>>;
        batchType: z.ZodOptional<z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>>;
        initialChicks: z.ZodOptional<z.ZodNumber>;
        initialChickWeight: z.ZodOptional<z.ZodNumber>;
        farmId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly BatchResponse: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        batchNumber: z.ZodString;
        startDate: z.ZodDate;
        endDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            COMPLETED: "COMPLETED";
        }>;
        batchType: z.ZodEnum<{
            BROILER: "BROILER";
            LAYERS: "LAYERS";
        }>;
        initialChicks: z.ZodNumber;
        initialChickWeight: z.ZodNumber;
        farmId: z.ZodString;
        currentChicks: z.ZodNumber;
        farm: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            capacity: z.ZodNumber;
            owner: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                email: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            quantity: z.ZodNullable<z.ZodNumber>;
            unitPrice: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            date: z.ZodDate;
            amount: z.ZodNumber;
            quantity: z.ZodNumber;
            weight: z.ZodNumber;
            unitPrice: z.ZodNumber;
            description: z.ZodNullable<z.ZodString>;
            isCredit: z.ZodBoolean;
            paidAmount: z.ZodNumber;
            dueAmount: z.ZodNullable<z.ZodNumber>;
            category: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodString;
            }, z.core.$strip>;
        }, z.core.$strip>>>;
        _count: z.ZodObject<{
            expenses: z.ZodNumber;
            sales: z.ZodNumber;
            mortalities: z.ZodNumber;
            vaccinations: z.ZodNumber;
            feedConsumptions: z.ZodNumber;
            birdWeights: z.ZodNumber;
            notes: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly BatchFarm: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        capacity: z.ZodNumber;
        owner: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodNullable<z.ZodString>;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly BatchCount: z.ZodObject<{
        expenses: z.ZodNumber;
        sales: z.ZodNumber;
        mortalities: z.ZodNumber;
        vaccinations: z.ZodNumber;
        feedConsumptions: z.ZodNumber;
        birdWeights: z.ZodNumber;
        notes: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    readonly BatchListResponse: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            batchNumber: z.ZodString;
            startDate: z.ZodDate;
            endDate: z.ZodNullable<z.ZodDate>;
            status: z.ZodEnum<{
                ACTIVE: "ACTIVE";
                COMPLETED: "COMPLETED";
            }>;
            batchType: z.ZodEnum<{
                BROILER: "BROILER";
                LAYERS: "LAYERS";
            }>;
            initialChicks: z.ZodNumber;
            initialChickWeight: z.ZodNumber;
            farmId: z.ZodString;
            currentChicks: z.ZodNumber;
            farm: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                capacity: z.ZodNumber;
                owner: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    email: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>;
            }, z.core.$strip>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                date: z.ZodDate;
                amount: z.ZodNumber;
                description: z.ZodNullable<z.ZodString>;
                quantity: z.ZodNullable<z.ZodNumber>;
                unitPrice: z.ZodNullable<z.ZodNumber>;
                category: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    type: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>>>;
            sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                date: z.ZodDate;
                amount: z.ZodNumber;
                quantity: z.ZodNumber;
                weight: z.ZodNumber;
                unitPrice: z.ZodNumber;
                description: z.ZodNullable<z.ZodString>;
                isCredit: z.ZodBoolean;
                paidAmount: z.ZodNumber;
                dueAmount: z.ZodNullable<z.ZodNumber>;
                category: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    type: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>>>;
            _count: z.ZodObject<{
                expenses: z.ZodNumber;
                sales: z.ZodNumber;
                mortalities: z.ZodNumber;
                vaccinations: z.ZodNumber;
                feedConsumptions: z.ZodNumber;
                birdWeights: z.ZodNumber;
                notes: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>>;
        pagination: z.ZodObject<{
            page: z.ZodNumber;
            limit: z.ZodNumber;
            total: z.ZodNumber;
            totalPages: z.ZodNumber;
        }, z.core.$strip>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly BatchDetailResponse: z.ZodObject<{
        success: z.ZodBoolean;
        data: z.ZodObject<{
            id: z.ZodString;
            createdAt: z.ZodString;
            updatedAt: z.ZodString;
            batchNumber: z.ZodString;
            startDate: z.ZodDate;
            endDate: z.ZodNullable<z.ZodDate>;
            status: z.ZodEnum<{
                ACTIVE: "ACTIVE";
                COMPLETED: "COMPLETED";
            }>;
            batchType: z.ZodEnum<{
                BROILER: "BROILER";
                LAYERS: "LAYERS";
            }>;
            initialChicks: z.ZodNumber;
            initialChickWeight: z.ZodNumber;
            farmId: z.ZodString;
            currentChicks: z.ZodNumber;
            farm: z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                capacity: z.ZodNumber;
                owner: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    email: z.ZodNullable<z.ZodString>;
                }, z.core.$strip>;
            }, z.core.$strip>;
            expenses: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                date: z.ZodDate;
                amount: z.ZodNumber;
                description: z.ZodNullable<z.ZodString>;
                quantity: z.ZodNullable<z.ZodNumber>;
                unitPrice: z.ZodNullable<z.ZodNumber>;
                category: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    type: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>>>;
            sales: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                date: z.ZodDate;
                amount: z.ZodNumber;
                quantity: z.ZodNumber;
                weight: z.ZodNumber;
                unitPrice: z.ZodNumber;
                description: z.ZodNullable<z.ZodString>;
                isCredit: z.ZodBoolean;
                paidAmount: z.ZodNumber;
                dueAmount: z.ZodNullable<z.ZodNumber>;
                category: z.ZodObject<{
                    id: z.ZodString;
                    name: z.ZodString;
                    type: z.ZodString;
                }, z.core.$strip>;
            }, z.core.$strip>>>;
            _count: z.ZodObject<{
                expenses: z.ZodNumber;
                sales: z.ZodNumber;
                mortalities: z.ZodNumber;
                vaccinations: z.ZodNumber;
                feedConsumptions: z.ZodNumber;
                birdWeights: z.ZodNumber;
                notes: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>;
        }, z.core.$strip>;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly Category: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<{
            EXPENSE: "EXPENSE";
            SALES: "SALES";
            INVENTORY: "INVENTORY";
        }>;
        description: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateCategory: z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<{
            EXPENSE: "EXPENSE";
            SALES: "SALES";
            INVENTORY: "INVENTORY";
        }>;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly UpdateCategory: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            EXPENSE: "EXPENSE";
            SALES: "SALES";
            INVENTORY: "INVENTORY";
        }>>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    readonly Expense: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        amount: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        quantity: z.ZodNullable<z.ZodNumber>;
        unitPrice: z.ZodNullable<z.ZodNumber>;
        farmId: z.ZodString;
        batchId: z.ZodNullable<z.ZodString>;
        categoryId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateExpense: z.ZodObject<{
        date: z.ZodString;
        amount: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        quantity: z.ZodOptional<z.ZodNumber>;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        farmId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        categoryId: z.ZodString;
        inventoryItems: z.ZodOptional<z.ZodArray<z.ZodObject<{
            itemId: z.ZodString;
            quantity: z.ZodNumber;
            notes: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    readonly UpdateExpense: z.ZodObject<{
        date: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        quantity: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        unitPrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        farmId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        categoryId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly Sale: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        amount: z.ZodNumber;
        quantity: z.ZodNumber;
        weight: z.ZodNumber;
        unitPrice: z.ZodNumber;
        description: z.ZodNullable<z.ZodString>;
        isCredit: z.ZodBoolean;
        paidAmount: z.ZodNumber;
        dueAmount: z.ZodNullable<z.ZodNumber>;
        farmId: z.ZodString;
        batchId: z.ZodNullable<z.ZodString>;
        customerId: z.ZodNullable<z.ZodString>;
        itemType: z.ZodEnum<{
            OTHER: "OTHER";
            Chicken_Meat: "Chicken_Meat";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EGGS: "EGGS";
            EQUIPMENT: "EQUIPMENT";
        }>;
        categoryId: z.ZodNullable<z.ZodString>;
    }, z.core.$strip>;
    readonly CreateSale: z.ZodObject<{
        date: z.ZodString;
        amount: z.ZodNumber;
        quantity: z.ZodNumber;
        weight: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        unitPrice: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
        isCredit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        paidAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        farmId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        customerId: z.ZodOptional<z.ZodString>;
        itemType: z.ZodOptional<z.ZodEnum<{
            OTHER: "OTHER";
            Chicken_Meat: "Chicken_Meat";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EGGS: "EGGS";
            EQUIPMENT: "EQUIPMENT";
        }>>;
        eggCategory: z.ZodOptional<z.ZodEnum<{
            LARGE: "LARGE";
            MEDIUM: "MEDIUM";
            SMALL: "SMALL";
        }>>;
        categoryId: z.ZodOptional<z.ZodString>;
        customerData: z.ZodOptional<z.ZodObject<{
            name: z.ZodString;
            phone: z.ZodString;
            category: z.ZodOptional<z.ZodString>;
            address: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly UpdateSale: z.ZodObject<{
        date: z.ZodOptional<z.ZodString>;
        amount: z.ZodOptional<z.ZodNumber>;
        quantity: z.ZodOptional<z.ZodNumber>;
        weight: z.ZodOptional<z.ZodNumber>;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isCredit: z.ZodOptional<z.ZodBoolean>;
        paidAmount: z.ZodOptional<z.ZodNumber>;
        farmId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        customerId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        itemType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            OTHER: "OTHER";
            Chicken_Meat: "Chicken_Meat";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EGGS: "EGGS";
            EQUIPMENT: "EQUIPMENT";
        }>>>;
        categoryId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly SalePayment: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        amount: z.ZodNumber;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        saleId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateSalePayment: z.ZodObject<{
        amount: z.ZodNumber;
        date: z.ZodDefault<z.ZodOptional<z.ZodDate>>;
        description: z.ZodOptional<z.ZodString>;
        saleId: z.ZodString;
    }, z.core.$strip>;
    readonly InventoryItem: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        currentStock: z.ZodNumber;
        unit: z.ZodString;
        minStock: z.ZodNullable<z.ZodNumber>;
        userId: z.ZodString;
        categoryId: z.ZodString;
        itemType: z.ZodOptional<z.ZodEnum<{
            OTHER: "OTHER";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EQUIPMENT: "EQUIPMENT";
        }>>;
    }, z.core.$strip>;
    readonly CreateInventoryItem: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        currentStock: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        unit: z.ZodString;
        minStock: z.ZodOptional<z.ZodNumber>;
        categoryId: z.ZodOptional<z.ZodString>;
        itemType: z.ZodOptional<z.ZodEnum<{
            OTHER: "OTHER";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EQUIPMENT: "EQUIPMENT";
        }>>;
        rate: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly UpdateInventoryItem: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        currentStock: z.ZodOptional<z.ZodNumber>;
        unit: z.ZodOptional<z.ZodString>;
        minStock: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        categoryId: z.ZodOptional<z.ZodString>;
        itemType: z.ZodOptional<z.ZodEnum<{
            OTHER: "OTHER";
            CHICKS: "CHICKS";
            FEED: "FEED";
            MEDICINE: "MEDICINE";
            EQUIPMENT: "EQUIPMENT";
        }>>;
    }, z.core.$strip>;
    readonly InventoryTransaction: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        totalAmount: z.ZodNumber;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        itemId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateInventoryTransaction: z.ZodObject<{
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        totalAmount: z.ZodNumber;
        date: z.ZodDate;
        description: z.ZodOptional<z.ZodString>;
        itemId: z.ZodString;
    }, z.core.$strip>;
    readonly InventoryUsage: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNullable<z.ZodNumber>;
        totalAmount: z.ZodNullable<z.ZodNumber>;
        notes: z.ZodNullable<z.ZodString>;
        itemId: z.ZodString;
        expenseId: z.ZodNullable<z.ZodString>;
        batchId: z.ZodNullable<z.ZodString>;
        farmId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateInventoryUsage: z.ZodObject<{
        date: z.ZodDate;
        quantity: z.ZodNumber;
        unitPrice: z.ZodOptional<z.ZodNumber>;
        totalAmount: z.ZodOptional<z.ZodNumber>;
        notes: z.ZodOptional<z.ZodString>;
        itemId: z.ZodString;
        expenseId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        farmId: z.ZodString;
    }, z.core.$strip>;
    readonly EntityTransaction: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        quantity: z.ZodNullable<z.ZodNumber>;
        itemName: z.ZodNullable<z.ZodString>;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        reference: z.ZodNullable<z.ZodString>;
        entityType: z.ZodString;
        entityId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateEntityTransaction: z.ZodObject<{
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        quantity: z.ZodOptional<z.ZodNumber>;
        itemName: z.ZodOptional<z.ZodString>;
        date: z.ZodDate;
        description: z.ZodOptional<z.ZodString>;
        reference: z.ZodOptional<z.ZodString>;
        entityType: z.ZodString;
        entityId: z.ZodString;
    }, z.core.$strip>;
    readonly Dealer: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateDealer: z.ZodObject<{
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly UpdateDealer: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        contact: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    readonly DealerResponse: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        balance: z.ZodNumber;
        thisMonthAmount: z.ZodNumber;
        totalTransactions: z.ZodNumber;
        recentTransactions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<{
                PURCHASE: "PURCHASE";
                SALE: "SALE";
                PAYMENT: "PAYMENT";
                RECEIPT: "RECEIPT";
                ADJUSTMENT: "ADJUSTMENT";
                OPENING_BALANCE: "OPENING_BALANCE";
                USAGE: "USAGE";
            }>;
            amount: z.ZodNumber;
            quantity: z.ZodNullable<z.ZodNumber>;
            itemName: z.ZodNullable<z.ZodString>;
            date: z.ZodDate;
            description: z.ZodNullable<z.ZodString>;
            reference: z.ZodNullable<z.ZodString>;
            entityType: z.ZodString;
            entityId: z.ZodString;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly DealerTransaction: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        quantity: z.ZodNullable<z.ZodNumber>;
        itemName: z.ZodNullable<z.ZodString>;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        reference: z.ZodNullable<z.ZodString>;
        entityType: z.ZodString;
        entityId: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
    }, z.core.$strip>;
    readonly DealerStatistics: z.ZodObject<{
        totalDealers: z.ZodNumber;
        activeDealers: z.ZodNumber;
        outstandingAmount: z.ZodNumber;
        thisMonthAmount: z.ZodNumber;
    }, z.core.$strip>;
    readonly DealerDetailResponse: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
        balance: z.ZodNumber;
        thisMonthAmount: z.ZodNumber;
        totalTransactions: z.ZodNumber;
        transactionTable: z.ZodArray<z.ZodObject<{
            itemName: z.ZodString;
            rate: z.ZodNumber;
            quantity: z.ZodNumber;
            totalAmount: z.ZodNumber;
            amountPaid: z.ZodNumber;
            amountDue: z.ZodNumber;
            date: z.ZodDate;
            dueDate: z.ZodDate;
            payments: z.ZodArray<z.ZodObject<{
                amount: z.ZodNumber;
                date: z.ZodDate;
                reference: z.ZodNullable<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        summary: z.ZodObject<{
            totalPurchases: z.ZodNumber;
            totalPayments: z.ZodNumber;
            outstandingAmount: z.ZodNumber;
            thisMonthPurchases: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>;
    readonly Hatchery: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateHatchery: z.ZodObject<{
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly UpdateHatchery: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        contact: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    readonly MedicineSupplier: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateMedicineSupplier: z.ZodObject<{
        name: z.ZodString;
        contact: z.ZodString;
        address: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly UpdateMedicineSupplier: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        contact: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    readonly Customer: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        name: z.ZodString;
        phone: z.ZodString;
        category: z.ZodNullable<z.ZodString>;
        address: z.ZodNullable<z.ZodString>;
        balance: z.ZodNumber;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateCustomer: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        balance: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strip>;
    readonly UpdateCustomer: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        balance: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly CustomerTransaction: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        date: z.ZodDate;
        description: z.ZodNullable<z.ZodString>;
        reference: z.ZodNullable<z.ZodString>;
        customerId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateCustomerTransaction: z.ZodObject<{
        type: z.ZodEnum<{
            PURCHASE: "PURCHASE";
            SALE: "SALE";
            PAYMENT: "PAYMENT";
            RECEIPT: "RECEIPT";
            ADJUSTMENT: "ADJUSTMENT";
            OPENING_BALANCE: "OPENING_BALANCE";
            USAGE: "USAGE";
        }>;
        amount: z.ZodNumber;
        date: z.ZodDate;
        description: z.ZodOptional<z.ZodString>;
        reference: z.ZodOptional<z.ZodString>;
        customerId: z.ZodString;
    }, z.core.$strip>;
    readonly Mortality: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        count: z.ZodNumber;
        reason: z.ZodNullable<z.ZodString>;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateMortality: z.ZodObject<{
        date: z.ZodDate;
        count: z.ZodNumber;
        reason: z.ZodOptional<z.ZodString>;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly UpdateMortality: z.ZodObject<{
        date: z.ZodOptional<z.ZodDate>;
        count: z.ZodOptional<z.ZodNumber>;
        reason: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, z.core.$strip>;
    readonly Vaccination: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        vaccineName: z.ZodString;
        scheduledDate: z.ZodDate;
        completedDate: z.ZodNullable<z.ZodDate>;
        status: z.ZodEnum<{
            COMPLETED: "COMPLETED";
            PENDING: "PENDING";
            MISSED: "MISSED";
            OVERDUE: "OVERDUE";
        }>;
        notes: z.ZodNullable<z.ZodString>;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateVaccination: z.ZodObject<{
        vaccineName: z.ZodString;
        scheduledDate: z.ZodDate;
        completedDate: z.ZodOptional<z.ZodDate>;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            COMPLETED: "COMPLETED";
            PENDING: "PENDING";
            MISSED: "MISSED";
            OVERDUE: "OVERDUE";
        }>>>;
        notes: z.ZodOptional<z.ZodString>;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly UpdateVaccination: z.ZodObject<{
        vaccineName: z.ZodOptional<z.ZodString>;
        scheduledDate: z.ZodOptional<z.ZodDate>;
        completedDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
        status: z.ZodOptional<z.ZodEnum<{
            COMPLETED: "COMPLETED";
            PENDING: "PENDING";
            MISSED: "MISSED";
            OVERDUE: "OVERDUE";
        }>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
    readonly FeedConsumption: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        quantity: z.ZodNumber;
        feedType: z.ZodString;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateFeedConsumption: z.ZodObject<{
        date: z.ZodDate;
        quantity: z.ZodNumber;
        feedType: z.ZodString;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly UpdateFeedConsumption: z.ZodObject<{
        date: z.ZodOptional<z.ZodDate>;
        quantity: z.ZodOptional<z.ZodNumber>;
        feedType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
    readonly BirdWeight: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        date: z.ZodDate;
        avgWeight: z.ZodNumber;
        sampleCount: z.ZodNumber;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateBirdWeight: z.ZodObject<{
        date: z.ZodDate;
        avgWeight: z.ZodNumber;
        sampleCount: z.ZodNumber;
        batchId: z.ZodString;
    }, z.core.$strip>;
    readonly UpdateBirdWeight: z.ZodObject<{
        date: z.ZodOptional<z.ZodDate>;
        avgWeight: z.ZodOptional<z.ZodNumber>;
        sampleCount: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly Notification: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        type: z.ZodEnum<{
            LOW_INVENTORY: "LOW_INVENTORY";
            VACCINATION_DUE: "VACCINATION_DUE";
            BATCH_COMPLETION: "BATCH_COMPLETION";
            PAYMENT_DUE: "PAYMENT_DUE";
            MORTALITY_ALERT: "MORTALITY_ALERT";
        }>;
        title: z.ZodString;
        message: z.ZodString;
        status: z.ZodEnum<{
            PENDING: "PENDING";
            READ: "READ";
            DISMISSED: "DISMISSED";
        }>;
        data: z.ZodNullable<z.ZodAny>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateNotification: z.ZodObject<{
        type: z.ZodEnum<{
            LOW_INVENTORY: "LOW_INVENTORY";
            VACCINATION_DUE: "VACCINATION_DUE";
            BATCH_COMPLETION: "BATCH_COMPLETION";
            PAYMENT_DUE: "PAYMENT_DUE";
            MORTALITY_ALERT: "MORTALITY_ALERT";
        }>;
        title: z.ZodString;
        message: z.ZodString;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            PENDING: "PENDING";
            READ: "READ";
            DISMISSED: "DISMISSED";
        }>>>;
        data: z.ZodOptional<z.ZodAny>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly UpdateNotification: z.ZodObject<{
        type: z.ZodOptional<z.ZodEnum<{
            LOW_INVENTORY: "LOW_INVENTORY";
            VACCINATION_DUE: "VACCINATION_DUE";
            BATCH_COMPLETION: "BATCH_COMPLETION";
            PAYMENT_DUE: "PAYMENT_DUE";
            MORTALITY_ALERT: "MORTALITY_ALERT";
        }>>;
        title: z.ZodOptional<z.ZodString>;
        message: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodEnum<{
            PENDING: "PENDING";
            READ: "READ";
            DISMISSED: "DISMISSED";
        }>>;
        data: z.ZodOptional<z.ZodNullable<z.ZodAny>>;
    }, z.core.$strip>;
    readonly Reminder: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        title: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        type: z.ZodEnum<{
            VACCINATION: "VACCINATION";
            FEEDING: "FEEDING";
            MEDICATION: "MEDICATION";
            CLEANING: "CLEANING";
            WEIGHING: "WEIGHING";
            SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
            CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
            GENERAL: "GENERAL";
        }>;
        status: z.ZodEnum<{
            COMPLETED: "COMPLETED";
            PENDING: "PENDING";
            OVERDUE: "OVERDUE";
            CANCELLED: "CANCELLED";
        }>;
        dueDate: z.ZodDate;
        isRecurring: z.ZodBoolean;
        recurrencePattern: z.ZodEnum<{
            NONE: "NONE";
            DAILY: "DAILY";
            WEEKLY: "WEEKLY";
            MONTHLY: "MONTHLY";
            CUSTOM: "CUSTOM";
        }>;
        recurrenceInterval: z.ZodNullable<z.ZodNumber>;
        lastTriggered: z.ZodNullable<z.ZodDate>;
        farmId: z.ZodNullable<z.ZodString>;
        farm: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
        }, z.core.$strip>>>;
        batchId: z.ZodNullable<z.ZodString>;
        batch: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            id: z.ZodString;
            batchNumber: z.ZodString;
        }, z.core.$strip>>>;
        data: z.ZodNullable<z.ZodAny>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateReminder: z.ZodObject<{
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<{
            VACCINATION: "VACCINATION";
            FEEDING: "FEEDING";
            MEDICATION: "MEDICATION";
            CLEANING: "CLEANING";
            WEIGHING: "WEIGHING";
            SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
            CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
            GENERAL: "GENERAL";
        }>;
        dueDate: z.ZodString;
        isRecurring: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        recurrencePattern: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            NONE: "NONE";
            DAILY: "DAILY";
            WEEKLY: "WEEKLY";
            MONTHLY: "MONTHLY";
            CUSTOM: "CUSTOM";
        }>>>;
        recurrenceInterval: z.ZodOptional<z.ZodNumber>;
        farmId: z.ZodOptional<z.ZodString>;
        batchId: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
    readonly UpdateReminder: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodOptional<z.ZodEnum<{
            VACCINATION: "VACCINATION";
            FEEDING: "FEEDING";
            MEDICATION: "MEDICATION";
            CLEANING: "CLEANING";
            WEIGHING: "WEIGHING";
            SUPPLIER_PAYMENT: "SUPPLIER_PAYMENT";
            CUSTOMER_PAYMENT: "CUSTOMER_PAYMENT";
            GENERAL: "GENERAL";
        }>>;
        dueDate: z.ZodOptional<z.ZodString>;
        isRecurring: z.ZodOptional<z.ZodBoolean>;
        recurrencePattern: z.ZodOptional<z.ZodEnum<{
            NONE: "NONE";
            DAILY: "DAILY";
            WEEKLY: "WEEKLY";
            MONTHLY: "MONTHLY";
            CUSTOM: "CUSTOM";
        }>>;
        recurrenceInterval: z.ZodOptional<z.ZodNumber>;
        status: z.ZodOptional<z.ZodEnum<{
            COMPLETED: "COMPLETED";
            PENDING: "PENDING";
            OVERDUE: "OVERDUE";
            CANCELLED: "CANCELLED";
        }>>;
        farmId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        batchId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        data: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>;
    readonly AuditLog: z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
        action: z.ZodEnum<{
            CREATE: "CREATE";
            UPDATE: "UPDATE";
            DELETE: "DELETE";
            LOGIN: "LOGIN";
            LOGOUT: "LOGOUT";
        }>;
        tableName: z.ZodString;
        recordId: z.ZodString;
        oldValues: z.ZodNullable<z.ZodAny>;
        newValues: z.ZodNullable<z.ZodAny>;
        ipAddress: z.ZodNullable<z.ZodString>;
        userAgent: z.ZodNullable<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly CreateAuditLog: z.ZodObject<{
        action: z.ZodEnum<{
            CREATE: "CREATE";
            UPDATE: "UPDATE";
            DELETE: "DELETE";
            LOGIN: "LOGIN";
            LOGOUT: "LOGOUT";
        }>;
        tableName: z.ZodString;
        recordId: z.ZodString;
        oldValues: z.ZodOptional<z.ZodAny>;
        newValues: z.ZodOptional<z.ZodAny>;
        ipAddress: z.ZodOptional<z.ZodString>;
        userAgent: z.ZodOptional<z.ZodString>;
        userId: z.ZodString;
    }, z.core.$strip>;
    readonly Login: z.ZodObject<{
        emailOrPhone: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
    readonly Signup: z.ZodObject<{
        name: z.ZodString;
        phone: z.ZodString;
        password: z.ZodString;
        role: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>>>;
        companyName: z.ZodOptional<z.ZodString>;
        companyFarmLocation: z.ZodOptional<z.ZodString>;
        language: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            ENGLISH: "ENGLISH";
            NEPALI: "NEPALI";
        }>>>;
        calendarType: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
            AD: "AD";
            BS: "BS";
        }>>>;
    }, z.core.$strip>;
    readonly BatchAnalytics: z.ZodObject<{
        batchId: z.ZodString;
        currentChicks: z.ZodNumber;
        totalMortality: z.ZodNumber;
        totalExpenses: z.ZodNumber;
        totalSales: z.ZodNumber;
        fcr: z.ZodNullable<z.ZodNumber>;
        avgWeight: z.ZodNullable<z.ZodNumber>;
        daysActive: z.ZodNumber;
        fcrData: z.ZodOptional<z.ZodObject<{
            totalFeedConsumed: z.ZodNumber;
            initialTotalWeight: z.ZodNumber;
            currentTotalWeight: z.ZodNumber;
            totalWeightGained: z.ZodNumber;
            initialWeightPerChick: z.ZodNumber;
            status: z.ZodEnum<{
                calculated: "calculated";
                no_weight_data: "no_weight_data";
                no_feed_data: "no_feed_data";
                insufficient_data: "insufficient_data";
            }>;
            message: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly FarmAnalytics: z.ZodObject<{
        farmId: z.ZodString;
        totalBatches: z.ZodNumber;
        activeBatches: z.ZodNumber;
        totalExpenses: z.ZodNumber;
        totalSales: z.ZodNumber;
        profit: z.ZodNumber;
        profitMargin: z.ZodNumber;
    }, z.core.$strip>;
    readonly UserResponse: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodString;
        role: z.ZodEnum<{
            OWNER: "OWNER";
            MANAGER: "MANAGER";
            DEALER: "DEALER";
            COMPANY: "COMPANY";
            SUPER_ADMIN: "SUPER_ADMIN";
        }>;
        gender: z.ZodEnum<{
            MALE: "MALE";
            FEMALE: "FEMALE";
            OTHER: "OTHER";
        }>;
        status: z.ZodEnum<{
            ACTIVE: "ACTIVE";
            INACTIVE: "INACTIVE";
            PENDING_VERIFICATION: "PENDING_VERIFICATION";
        }>;
        managedFarms: z.ZodOptional<z.ZodArray<z.ZodString>>;
        companyName: z.ZodOptional<z.ZodString>;
        companyFarmLocation: z.ZodOptional<z.ZodString>;
        companyFarmNumber: z.ZodOptional<z.ZodString>;
        companyFarmCapacity: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    readonly AuthResponse: z.ZodObject<{
        accessToken: z.ZodString;
        user: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            email: z.ZodString;
            phone: z.ZodString;
            role: z.ZodEnum<{
                OWNER: "OWNER";
                MANAGER: "MANAGER";
                DEALER: "DEALER";
                COMPANY: "COMPANY";
                SUPER_ADMIN: "SUPER_ADMIN";
            }>;
            gender: z.ZodEnum<{
                MALE: "MALE";
                FEMALE: "FEMALE";
                OTHER: "OTHER";
            }>;
            status: z.ZodEnum<{
                ACTIVE: "ACTIVE";
                INACTIVE: "INACTIVE";
                PENDING_VERIFICATION: "PENDING_VERIFICATION";
            }>;
            managedFarms: z.ZodOptional<z.ZodArray<z.ZodString>>;
            companyName: z.ZodOptional<z.ZodString>;
            companyFarmLocation: z.ZodOptional<z.ZodString>;
            companyFarmNumber: z.ZodOptional<z.ZodString>;
            companyFarmCapacity: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>;
    }, z.core.$strip>;
};
export declare const ApiResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    message: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodArray<T>;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, z.core.$strip>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export interface CompanyDealerAccount {
    id: string;
    companyId: string;
    dealerId: string;
    balance: number;
    totalSales: number;
    totalPayments: number;
    lastSaleDate?: Date | null;
    lastPaymentDate?: Date | null;
    balanceLimit?: number | null;
    balanceLimitSetAt?: Date | null;
    balanceLimitSetBy?: string | null;
}
export interface BalanceLimitCheckResult {
    allowed: boolean;
    currentBalance: number;
    newBalance: number;
    limit: number | null;
    exceedsBy?: number;
}
