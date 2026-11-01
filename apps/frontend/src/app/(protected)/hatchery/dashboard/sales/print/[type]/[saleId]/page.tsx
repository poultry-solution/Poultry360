"use client";

import { useParams } from "next/navigation";
import { BillPrintPage } from "@/components/bills/BillPrintPage";
import {
  useHatcherySaleBill,
} from "../../../_components/HatcherySaleBill";
import type { HatcherySaleType } from "@/fetchers/hatchery/hatcherySaleQueries";

const VALID_TYPES: HatcherySaleType[] = ["egg_sale", "parent_sale", "chick_sale"];

export default function HatcherySalePrintPage() {
  const params = useParams<{ type: string; saleId: string }>();
  const type = VALID_TYPES.includes(params?.type as HatcherySaleType)
    ? (params?.type as HatcherySaleType)
    : null;
  const { bill, loading, error } = useHatcherySaleBill(type, params?.saleId);
  return (
    <BillPrintPage
      bill={bill}
      loading={loading}
      error={error || !type}
      backHref="/hatchery/dashboard/home"
    />
  );
}
