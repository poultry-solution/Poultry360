import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type LandingReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdminLandingReview {
  id: string;
  name: string;
  business: string;
  address: string;
  phoneNumber: string;
  stars: number;
  review: string;
  status: LandingReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLandingReviewFilters {
  status: LandingReviewStatus;
  search?: string;
  page?: number;
  limit?: number;
}

interface AdminLandingReviewResponse {
  success: boolean;
  data: AdminLandingReview[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const keys = {
  all: ["admin-landing-reviews"] as const,
  list: (query: string) => ["admin-landing-reviews", "list", query] as const,
};

export function useAdminLandingReviews(filters: AdminLandingReviewFilters) {
  const query = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return useQuery<AdminLandingReviewResponse>({
    queryKey: keys.list(query),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminLandingReviewResponse>(
        `/admin/landing-reviews?${query}`,
      );
      return data;
    },
    enabled: !filters.search || filters.search.length >= 2,
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
}

function useModerateReview(action: "approve" | "reject" | "pending") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      rejectionReason,
    }: {
      reviewId: string;
      rejectionReason?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/admin/landing-reviews/${reviewId}/${action}`,
        rejectionReason ? { rejectionReason } : undefined,
      );
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export const useApproveLandingReview = () => useModerateReview("approve");
export const useRejectLandingReview = () => useModerateReview("reject");
export const useReturnLandingReviewToPending = () =>
  useModerateReview("pending");
