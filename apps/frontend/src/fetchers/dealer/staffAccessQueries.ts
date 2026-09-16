import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import type { StaffPermission } from "@/common/store/store";

export interface StaffAccessUser {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
  permissions: StaffPermission[];
  createdAt: string;
}

const key = ["dealer-staff-access"] as const;

export function useStaffAccessUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: key,
    queryFn: async () => (await axiosInstance.get<{ data: StaffAccessUser[] }>("/staff-auth/users")).data.data,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateStaffAccessUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; phone: string; password: string; permissions: StaffPermission[] }) =>
      (await axiosInstance.post("/staff-auth/users", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateStaffAccessUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<StaffAccessUser> & { id: string; password?: string }) =>
      (await axiosInstance.patch(`/staff-auth/users/${id}`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
