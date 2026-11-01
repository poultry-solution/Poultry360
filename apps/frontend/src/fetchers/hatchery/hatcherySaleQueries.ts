import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type HatcherySaleType = "egg_sale" | "parent_sale" | "chick_sale";

export const hatcherySaleKeys = {
  all: ["hatchery-sales"] as const,
  details: () => [...hatcherySaleKeys.all, "detail"] as const,
  detail: (type: HatcherySaleType | "", saleId: string) =>
    [...hatcherySaleKeys.details(), type, saleId] as const,
};

/**
 * Fetch a single hatchery sale by (type, id). Backs the bill modal + print
 * page. See `hatcherySaleController.getHatcherySaleById` on the backend for
 * the response shape — this hook returns the raw payload: `{ type, sale }`.
 */
export const useGetHatcherySaleById = (
  type: HatcherySaleType | "" | null | undefined,
  saleId: string | null | undefined
) => {
  return useQuery({
    queryKey: hatcherySaleKeys.detail((type || "") as HatcherySaleType, saleId || ""),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/sales/${type}/${saleId}`
      );
      return data as {
        type: HatcherySaleType;
        sale: any;
      };
    },
    enabled: !!type && !!saleId,
  });
};
