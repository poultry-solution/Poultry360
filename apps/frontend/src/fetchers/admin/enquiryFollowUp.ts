import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

/** "new" = nobody contacted yet; "contacted" = a super admin marked it. */
export type EnquiryStatus = "new" | "contacted";

export interface EnquiryListResponse<T> {
  success: boolean;
  data: Array<T & { contactedAt: string | null; createdAt: string }>;
  counts: { new: number; contacted: number };
}

/**
 * List + "mark contacted / move to new" hooks for one admin lead list.
 * Used by Book a demo (/admin/demo-enquiries) and Contact form (/admin/landing-contacts).
 */
export function makeEnquiryFollowUpHooks<T>(basePath: string, queryKeyRoot: string) {
  const keys = {
    all: [queryKeyRoot] as const,
    list: (status: EnquiryStatus, limit: number) => [queryKeyRoot, "list", status, limit] as const,
  };

  function useList(status: EnquiryStatus, limit = 200) {
    return useQuery<EnquiryListResponse<T>>({
      queryKey: keys.list(status, limit),
      queryFn: async () => {
        const { data } = await axiosInstance.get<EnquiryListResponse<T>>(basePath, {
          params: { status, limit },
        });
        return data;
      },
      staleTime: 3000,
      refetchOnWindowFocus: false,
    });
  }

  function useSetContacted() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, contacted }: { id: string; contacted: boolean }) => {
        const { data } = await axiosInstance.patch(`${basePath}/${id}/${contacted ? "contacted" : "new"}`);
        return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
    });
  }

  return { keys, useList, useSetContacted };
}
