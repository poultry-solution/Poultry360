"use client";

import { useParams } from "next/navigation";
import { BillPrintPage } from "@/components/bills/BillPrintPage";
import { useFarmerSaleBill } from "../../_components/FarmerSaleBill";

export default function FarmerSalePrintPage() {
  const params = useParams<{ saleId: string }>();
  const { bill, loading, error } = useFarmerSaleBill(params?.saleId);
  return <BillPrintPage bill={bill} loading={loading} error={error} backHref="/farmer/dashboard/sales-ledger" />;
}
