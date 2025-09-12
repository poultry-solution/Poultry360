// ==================== USER QUERIES ====================
export * from "./users/userQueries";

// ==================== FARM QUERIES ====================
export * from "./farms/farmQueries";

// ==================== BATCH QUERIES ====================
export * from "./batches/batchQueries";

// ==================== REMINDER QUERIES ====================
export * from "./remainder/remainderQueries";
export * from "./dashboard/dashboardQueries";

// ==================== AUTH QUERIES ====================
// These would typically be in a separate auth file, but including here for completeness
export const authKeys = {
  all: ["auth"] as const,
  current: () => [...authKeys.all, "current"] as const,
  validate: () => [...authKeys.all, "validate"] as const,
};

// ==================== COMMON TYPES ====================
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  message?: string;
};

// ==================== QUERY CONFIGURATION ====================
export const queryConfig = {
  defaultStaleTime: 5 * 60 * 1000, // 5 minutes
  defaultCacheTime: 10 * 60 * 1000, // 10 minutes
  retry: 3,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 30000),
};
