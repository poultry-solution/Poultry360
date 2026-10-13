"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bird, ReceiptText } from "lucide-react";
import { cn } from "@/common/lib/utils";
import { useGetChickenSalesByFarmer } from "@/fetchers/dealer/dealerSaleQueries";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";

const SALES_PATH = "/dealer/dashboard/sales";
const SETTLEMENTS_PATH = "/dealer/dashboard/sales/chicken-by-farmer";

/**
 * "All sales | Broiler settlements" tabs. Shown only when the account uses
 * Broiler sales; the badge counts farmers waiting to be settled.
 */
export function DealerSalesTabs() {
  const pathname = usePathname();
  const broilerFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_BROILER_SALES_AND_SETTLEMENTS);
  const waiting = useGetChickenSalesByFarmer(undefined, { enabled: broilerFeature.isEnabled });

  if (!broilerFeature.isEnabled) return null;

  const waitingCount = waiting.data?.data?.length ?? 0;
  const tabs = [
    { href: SALES_PATH, label: "All sales", icon: ReceiptText, count: 0 },
    { href: SETTLEMENTS_PATH, label: "Broiler settlements", icon: Bird, count: waitingCount },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Sales sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {tab.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
