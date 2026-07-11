import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminDemoEnquiriesKeys = {
  all: ["admin-demo-enquiries"] as const,
  list: (limit: number) => [...adminDemoEnquiriesKeys.all, "list", limit] as const,
};

export interface AdminDemoEnquiry {
  id: string;
  companyName: string;
  phoneNumber: string;
  message?: string | null;
  createdAt: string;
}

export interface AdminDemoEnquiriesResponse {
  success: boolean;
  data: AdminDemoEnquiry[];
}

export function useGetAdminDemoEnquiries(limit = 200) {
  return useQuery<AdminDemoEnquiriesResponse>({
    queryKey: adminDemoEnquiriesKeys.list(limit),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminDemoEnquiriesResponse>(
        `/admin/demo-enquiries?limit=${limit}`
      );
      return data;
    },
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
}

