"use client";

import { useMemo } from "react";
import { BillModal } from "@/components/bills/BillModal";
import { useBillBusiness } from "@/components/bills/useBillBusiness";
import { useGetSale } from "@/fetchers/sale/saleQueries";
import { farmerBillFallbackName, farmerSaleToBill } from "@/lib/bills/farmerSaleBill";

export const farmerBillPrintHref = (saleId: string) => `/farmer/dashboard/sales-ledger/print/${saleId}`;

/** Farmer sale bill data (shared by the pop-up and the print page). */
export function useFarmerSaleBill(saleId: string | null | undefined) {
  const { data, isLoading, isError } = useGetSale(saleId || "", { enabled: !!saleId });
  const sale = (data as any)?.data;
  const business = useBillBusiness(farmerBillFallbackName(sale));
  const bill = useMemo(() => (sale ? farmerSaleToBill(sale, business) : undefined), [sale, business]);
  return { bill, loading: isLoading, error: isError || (!isLoading && !!saleId && !sale) };
}

/** Bill pop-up for one farmer sale. */
export function FarmerSaleBill({ saleId, onClose }: { saleId: string | null; onClose: () => void }) {
  const { bill, loading, error } = useFarmerSaleBill(saleId);
  return (
    <BillModal
      isOpen={!!saleId}
      onClose={onClose}
      bill={bill}
      loading={loading}
      error={error}
      printHref={saleId ? farmerBillPrintHref(saleId) : ""}
    />
  );
}
