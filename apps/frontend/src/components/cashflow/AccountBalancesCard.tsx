"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import type { CashAccount } from "@/fetchers/farmer/farmerCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";

interface AccountBalancesCardProps {
  accounts: CashAccount[];
  showArchived?: boolean;
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
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          Account balances
        </h2>
        <ul className="divide-y divide-gray-100">
          {visible.length === 0 && (
            <li className="py-3 text-sm text-muted-foreground">
              No accounts yet.
            </li>
          )}
          {visible.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between py-2 text-sm"
            >
              <span className="flex items-center gap-2">
                <span>{a.name}</span>
                {a.type === "CASH" && (
                  <span className="text-xs text-muted-foreground">
                    (system)
                  </span>
                )}
                {a.archivedAt && (
                  <span className="text-xs text-muted-foreground">
                    (archived)
                  </span>
                )}
              </span>
              <span className="tabular-nums">
                {formatCashAmount(a.balance)}
              </span>
            </li>
          ))}
        </ul>
        {visible.length > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCashAmount(total)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
