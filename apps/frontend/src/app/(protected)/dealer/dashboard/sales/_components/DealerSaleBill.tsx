"use client";

import { useMemo } from "react";
import { BillModal } from "@/components/bills/BillModal";
import { useBillBusiness } from "@/components/bills/useBillBusiness";
import { useAuthStore } from "@/common/store/store";
import { useGetDealerSaleById } from "@/fetchers/dealer/dealerSaleQueries";
import { dealerSaleToBill } from "@/lib/bills/dealerSaleBill";

export const dealerBillPrintHref = (saleId: string) => `/dealer/dashboard/sales/print/${saleId}`;

/** Dealer sale bill data (shared by the pop-up and the print page). */
export function useDealerSaleBill(saleId: string | null | undefined) {
  const { data, isLoading, isError } = useGetDealerSaleById(saleId || "");
  const sale = (data as any)?.data;
  // Shown only until Settings → Bill details load (shop name by default).
  const fallbackName = useAuthStore((state) => {
    const user = state.user as any;
    return user?.dealer?.name || user?.companyName || user?.company?.name || "Dealer";
  });
  const business = useBillBusiness(fallbackName);
  const bill = useMemo(() => (sale ? dealerSaleToBill(sale, business) : undefined), [sale, business]);
  return { bill, loading: !!saleId && isLoading, error: isError || (!isLoading && !!saleId && !sale) };
}

/** Bill pop-up for one dealer sale. */
export function DealerSaleBill({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { bill, loading, error } = useDealerSaleBill(saleId);
  return (
    <BillModal
      isOpen={!!saleId}
      onClose={onClose}
      bill={bill}
      loading={loading}
      error={error}
      printHref={saleId ? dealerBillPrintHref(saleId) : ""}
    />
  );
}
