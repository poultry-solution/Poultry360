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
 *
 * 404 handling: a deleted or wrong-owner saleId is a legitimate "not found"
 * state, not an error. We tell axios to treat 404 as success so the global
 * error toast ("Sale not found") does not fire — the modal / print page
 * surfaces its own "bill not found" UI. We also return `null` on 404 so
 * React Query's default retry policy does not re-hit the endpoint three
 * more times.
 */
export const useGetHatcherySaleById = (
  type: HatcherySaleType | "" | null | undefined,
  saleId: string | null | undefined
) => {
  return useQuery({
    queryKey: hatcherySaleKeys.detail((type || "") as HatcherySaleType, saleId || ""),
    queryFn: async () => {
      const resp = await axiosInstance.get(
        `/hatchery/sales/${type}/${saleId}`,
        { validateStatus: (status) => status === 200 || status === 404 }
      );
      if (resp.status === 404) return null;
      return resp.data as {
        type: HatcherySaleType;
        sale: any;
      };
    },
    enabled: !!type && !!saleId,
    retry: false,
  });
};
