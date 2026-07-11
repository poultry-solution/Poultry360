"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Badge } from "@/common/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import axiosInstance from "@/common/lib/axios";
import { useI18n } from "@/i18n/useI18n";

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

function formatNPR(value: number) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
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

        {!isLoading && !isError && data && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="font-normal">
                {data.source === "SYSTEM"
                  ? t("cashInHand.historyDetail.autoClosed")
                  : t("cashInHand.historyDetail.closedByYou")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">{t("cashInHand.historyDetail.openBalance")}</p>
                <p className="font-semibold">{formatNPR(data.openingSnapshot)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("cashInHand.historyDetail.closeBalance")}</p>
                <p
                  className={`font-semibold ${
                    data.closingSnapshot < 0 ? "text-red-600" : "text-green-700"
                  }`}
                >
                  {formatNPR(data.closingSnapshot)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">{t("cashInHand.historyDetail.movementsTitle")}</p>
              {data.movements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("cashInHand.historyDetail.noMovements")}
                </p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {data.movements.map((m) => (
                    <li key={m.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-start gap-2 min-w-0">
                        {m.direction === "IN" ? (
                          <div className="rounded-full bg-green-100 p-1 mt-0.5 shrink-0">
                            <ArrowDownLeft className="h-3.5 w-3.5 text-green-700" />
                          </div>
                        ) : (
                          <div className="rounded-full bg-red-100 p-1 mt-0.5 shrink-0">
                            <ArrowUpRight className="h-3.5 w-3.5 text-red-700" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.partyName}</p>
                          {m.notes ? (
                            <p className="text-xs text-muted-foreground break-words">{m.notes}</p>
                          ) : null}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(m.createdAt).toLocaleString([], {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-semibold shrink-0 ${
                          m.direction === "IN" ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {m.direction === "IN" ? "+" : "-"}
                        {formatNPR(m.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
