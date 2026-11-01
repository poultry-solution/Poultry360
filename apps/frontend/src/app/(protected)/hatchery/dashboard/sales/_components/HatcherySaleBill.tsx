"use client";

import { useMemo } from "react";
import { BillModal } from "@/components/bills/BillModal";
import { useBillBusiness } from "@/components/bills/useBillBusiness";
import { useAuthStore } from "@/common/store/store";
import {
  useGetHatcherySaleById,
  type HatcherySaleType,
} from "@/fetchers/hatchery/hatcherySaleQueries";
import {
  eggSaleToBill,
  parentSaleToBill,
  chickSaleToBill,
} from "@/lib/bills/hatcherySaleBill";
import type { BillBusiness, BillData } from "@/components/bills/BillDocument";

export const hatcheryBillPrintHref = (type: HatcherySaleType, saleId: string) =>
  `/hatchery/dashboard/sales/print/${type}/${saleId}`;

function saleToBill(
  type: HatcherySaleType,
  sale: any,
  business: BillBusiness
): BillData {
  if (type === "egg_sale") return eggSaleToBill(sale, business);
  if (type === "parent_sale") return parentSaleToBill(sale, business);
  return chickSaleToBill(sale, business);
}

/** Hatchery sale bill data (shared by the pop-up and the print page). */
export function useHatcherySaleBill(
  type: HatcherySaleType | null | undefined,
  saleId: string | null | undefined
) {
  const { data, isLoading, isError } = useGetHatcherySaleById(type, saleId);
  const sale = data?.sale;
  // Shown only until Settings → Bill details load (hatchery name by default).
  // `user.hatchery` is populated by `/auth/@me` for both owner and staff —
  // see auth.ts and staffAuthController.ts.
  const fallbackName = useAuthStore((state) => {
    const user = state.user as any;
    return user?.hatchery?.name || user?.companyName || "Hatchery";
  });
  const business = useBillBusiness(fallbackName);
  const bill = useMemo(
    () => (type && sale ? saleToBill(type, sale, business) : undefined),
    [type, sale, business]
  );
  const enabled = !!type && !!saleId;
  return {
    bill,
    loading: enabled && isLoading,
    error: isError || (!isLoading && enabled && !sale),
  };
}

/** Bill pop-up for one hatchery sale. */
export function HatcherySaleBill({
  saleType,
  saleId,
  onClose,
}: {
  saleType: HatcherySaleType | null;
  saleId: string | null;
  onClose: () => void;
}) {
  const { bill, loading, error } = useHatcherySaleBill(saleType, saleId);
  const open = !!saleType && !!saleId;
  return (
    <BillModal
      isOpen={open}
      onClose={onClose}
      bill={bill}
      loading={loading}
      error={error}
      printHref={open ? hatcheryBillPrintHref(saleType!, saleId!) : ""}
    />
  );
}
