"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import axiosInstance from "@/common/lib/axios";
import { useI18n } from "@/i18n/useI18n";
import { formatCashAmount as formatNPR, formatNepalTime } from "@/components/cash-in-hand/cashFormat";

export interface ClosedDayMovement {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  partyName: string;
  notes: string | null;
  createdAt: string;
}

export interface ClosedDayDetail {
  bsDate: string;
  openingSnapshot: number;
  closingSnapshot: number;
  source: "USER" | "SYSTEM";
  closedAt: string;
  movements: ClosedDayMovement[];
}

interface HistoryDayDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bsDate: string | null;
  apiBase: "/dealer/cash-in-hand" | "/farmer/cash-in-hand";
}

export function HistoryDayDetailDialog({
  open,
  onOpenChange,
  bsDate,
  apiBase,
}: HistoryDayDetailDialogProps) {
  const { t } = useI18n();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cash-in-hand-closed-day", apiBase, bsDate],
    queryFn: async () => {
      const res = await axiosInstance.get(
        `${apiBase}/closed-day/${encodeURIComponent(bsDate!)}`
      );
      return res.data.data as ClosedDayDetail;
    },
    enabled: open && !!bsDate,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("cashInHand.historyDetail.title")}
            {bsDate ? (
              <span className="ml-2 font-mono text-base font-normal text-muted-foreground">
                {bsDate}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("cashInHand.historyDetail.movementsTitle")}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-destructive py-4">{t("cashInHand.historyDetail.loadError")}</p>
        )}

        {!isLoading && !isError && data && (() => {
          const cashIn = data.movements.filter((m) => m.direction === "IN").reduce((sum, m) => sum + Number(m.amount || 0), 0);
          const cashOut = data.movements.filter((m) => m.direction === "OUT").reduce((sum, m) => sum + Number(m.amount || 0), 0);
          return (
            <div className="space-y-4">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${data.source === "SYSTEM" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>
                {data.source === "SYSTEM"
                  ? t("cashInHand.historyDetail.autoClosed")
                  : t("cashInHand.historyDetail.closedByYou")}
              </span>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
                {[
                  { label: t("cashInHand.historyDetail.openBalance"), value: formatNPR(data.openingSnapshot), className: "" },
                  { label: "Cash in", value: `+ ${formatNPR(cashIn)}`, className: "text-green-700" },
                  { label: "Cash out", value: `− ${formatNPR(cashOut)}`, className: "text-red-600" },
                  {
                    label: t("cashInHand.historyDetail.closeBalance"),
                    value: formatNPR(data.closingSnapshot),
                    className: data.closingSnapshot < 0 ? "text-red-600" : "",
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-white px-3 py-2">
                    <p className="text-[11px] text-gray-500">{item.label}</p>
                    <p className={`text-sm font-semibold ${item.className}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">{t("cashInHand.historyDetail.movementsTitle")}</p>
                {data.movements.length === 0 ? (
                  <p className="py-2 text-sm text-gray-500">{t("cashInHand.historyDetail.noMovements")}</p>
                ) : (
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {data.movements.map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className={`mt-0.5 shrink-0 rounded-full p-1 ${m.direction === "IN" ? "bg-green-100" : "bg-red-100"}`}>
                            {m.direction === "IN" ? (
                              <ArrowDownLeft className="h-3.5 w-3.5 text-green-700" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-red-700" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{m.partyName}</p>
                            <p className="text-xs text-gray-500">
                              {formatNepalTime(m.createdAt)}
                              {m.notes ? ` · ${m.notes}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className={`shrink-0 text-sm font-semibold ${m.direction === "IN" ? "text-green-700" : "text-red-600"}`}>
                          {m.direction === "IN" ? "+" : "−"} {formatNPR(m.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
