import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type BusinessAuditLog = {
  id: string; accountOwnerId: string; businessType: string | null; businessId: string | null;
  actorId: string; actorType: "USER" | "STAFF"; actorName: string; actorRole: string | null;
  action: string; targetType: string; targetId: string; description: string;
  metadata: Record<string, unknown> | null; createdAt: string; archivedAt: string | null;
  securityMetadata?: {
    ipAddress: string | null; browserFamily: string; operatingSystem: string; deviceType: string;
    countryCode: string | null; region: string | null; locationSource: string | null;
    createdAt: string; expiresAt: string;
  };
};

export type AuditFilters = { page?: number; limit?: number; search?: string; actorType?: string; action?: string; targetType?: string; startDate?: string; endDate?: string; archived?: "true" | "false" | "all"; accountOwnerId?: string };

function params(filters: AuditFilters) {
  return new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== "").map(([key, value]) => [key, String(value)])).toString();
}

export function useBusinessAudit(scope: "account" | "admin", filters: AuditFilters, enabled = true) {
  return useQuery({
    queryKey: ["business-audit", scope, filters],
    queryFn: async () => (await axiosInstance.get(`${scope === "account" ? "/business-activity" : "/admin/activity"}?${params(filters)}`)).data as { data: BusinessAuditLog[]; pagination: { page: number; total: number; totalPages: number } },
    enabled,
  });
}

export const useDealerBusinessAudit = (filters: AuditFilters, enabled = true) => useBusinessAudit("account", filters, enabled);
export const useAdminBusinessAudit = (filters: AuditFilters, enabled = true) => useBusinessAudit("admin", filters, enabled);

export async function exportBusinessAudit(scope: "account" | "admin", filters: AuditFilters) {
  const endpoint = scope === "account" ? "/business-activity/export" : "/admin/activity/export";
  return (await axiosInstance.get(`${endpoint}?${params(filters)}`)).data.data as BusinessAuditLog[];
}
