"use client";

import { Landmark, Wallet } from "lucide-react";

import { Card, CardContent } from "@/common/components/ui/card";
import type { CashAccount } from "@/fetchers/farmer/farmerCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";

interface AccountBalancesCardProps {
  accounts: CashAccount[];
  showArchived?: boolean;
}

/**
 * Semantic color for a signed amount. Positive = money in hand (emerald),
 * negative = overdrawn / debt (destructive), zero = neutral muted. Kept
 * tiny and reusable so the per-account row and the total line stay in sync.
 */
function balanceTone(amount: number): string {
  if (amount > 0) return "text-emerald-600";
  if (amount < 0) return "text-destructive";
  return "text-muted-foreground";
}

export function AccountBalancesCard({
  accounts,
  showArchived = false,
}: AccountBalancesCardProps) {
  const visible = accounts.filter((a) =>
    showArchived ? true : a.archivedAt === null,
  );
  const total = visible.reduce((sum, a) => sum + a.balance, 0);

  return (
    <Card>
      <CardContent className="py-5">
        <h2 className="mb-4 text-base font-semibold">Account balances</h2>
        <ul className="divide-y divide-gray-100">
          {visible.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">
              No accounts yet.
            </li>
          )}
          {visible.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    a.type === "CASH"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {a.type === "CASH" ? (
                    <Wallet className="h-5 w-5" />
                  ) : (
                    <Landmark className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-medium">
                    {a.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.type === "CASH" ? "System cash" : "Bank account"}
                    {a.archivedAt && " · archived"}
                  </div>
                </div>
              </div>
              <span
                className={`text-lg font-semibold tabular-nums ${balanceTone(a.balance)}`}
              >
                {formatCashAmount(a.balance)}
              </span>
            </li>
          ))}
        </ul>
        {visible.length > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
            <span className="text-sm font-semibold text-muted-foreground">
              Total balance
            </span>
            <span
              className={`text-2xl font-bold tabular-nums ${balanceTone(total)}`}
            >
              {formatCashAmount(total)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
