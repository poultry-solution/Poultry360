"use client";

import { useParams } from "next/navigation";
import { BillPrintPage } from "@/components/bills/BillPrintPage";
import { useDealerSaleBill } from "../../_components/DealerSaleBill";

export default function DealerSalePrintPage() {
  const params = useParams<{ saleId: string }>();
  const { bill, loading, error } = useDealerSaleBill(params?.saleId);
  return <BillPrintPage bill={bill} loading={loading} error={error} backHref="/dealer/dashboard/sales" />;
}
