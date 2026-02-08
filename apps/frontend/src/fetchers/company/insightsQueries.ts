import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const businessInsightsQueryKeys = {
    all: ["business-insights"] as const,
    dealers: () => [...businessInsightsQueryKeys.all, "dealers"] as const,
};

export const useGetDealerInsights = (options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: businessInsightsQueryKeys.dealers(),
        queryFn: async () => {
            const response = await axiosInstance.get("/company/insights/dealers");
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options,
    });
};
