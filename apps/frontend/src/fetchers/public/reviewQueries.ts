import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/common/lib/axios";
import type { LandingReview } from "@/lib/reviews";

export type { LandingReview } from "@/lib/reviews";

// ==================== TYPES ====================

export interface CreateReviewBody {
  name: string;
  business: string;
  address: string;
  phoneNumber: string;
  stars: number;
  review: string;
}

interface ReviewsResponse {
  success: boolean;
  data: LandingReview[];
}

interface CreateReviewResponse {
  success: boolean;
  data: LandingReview;
  message?: string;
}

// ==================== QUERY KEYS ====================

export const landingReviewKeys = {
  all: ["landing-reviews"] as const,
  list: (limit?: number) => [...landingReviewKeys.all, "list", limit] as const,
};

// ==================== QUERIES ====================

export function useLandingReviews(
  limit = 20,
  initialReviews?: LandingReview[],
) {
  return useQuery<ReviewsResponse>({
    queryKey: landingReviewKeys.list(limit),
    queryFn: async () => {
      const { data } = await publicApi.get<ReviewsResponse>(
        `/public/reviews?limit=${limit}`,
      );
      return data;
    },
    initialData:
      initialReviews === undefined
        ? undefined
        : { success: true, data: initialReviews },
  });
}

// ==================== MUTATIONS ====================

export function useCreateLandingReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateReviewBody) => {
      const { data } = await publicApi.post<CreateReviewResponse>(
        "/public/reviews",
        body,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: landingReviewKeys.all });
    },
  });
}
