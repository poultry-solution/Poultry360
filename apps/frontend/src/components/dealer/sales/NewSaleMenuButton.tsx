"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Building2, ChevronDown, Package, Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";

const NEW_SALE_PATH = "/dealer/dashboard/sales/new";

/**
 * Main "New Sale" button. One click starts a normal feed/product sale; the
 * arrow lists the less common kinds (Broiler, sell to supplier) when the
 * account has them turned on.
 */
export function NewSaleMenuButton({ label }: { label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const broilerFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_BROILER_SALES_AND_SETTLEMENTS);
  const supplierFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_SUPPLIER_SETTLEMENT_SALES);

  const options = [
    {
      key: "product",
      label: "Feed / product sale",
      hint: "Sell items from your stock",
      icon: Package,
      href: NEW_SALE_PATH,
      show: true,
    },
    {
      key: "broiler",
      label: "Broiler sale",
      hint: "Sell a farmer's broilers, settle later",
      icon: Bird,
      href: `${NEW_SALE_PATH}?type=broiler`,
      show: broilerFeature.isEnabled,
    },
    {
      key: "supplier",
      label: "Sell to supplier",
      hint: "Give stock to lower what you owe",
      icon: Building2,
      href: "/dealer/dashboard/sales/supplier-settlement",
      show: supplierFeature.isEnabled,
    },
  ].filter((option) => option.show);

  const mainButton = (
    <Button
      onClick={() => router.push(NEW_SALE_PATH)}
      className={options.length > 1 ? "flex-1 rounded-r-none sm:flex-none" : "w-full sm:w-auto"}
    >
      <Plus className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );

  if (options.length <= 1) return mainButton;

  return (
    <div className="flex w-full sm:w-auto">
      {mainButton}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className="rounded-l-none border-l border-primary-foreground/30 px-2"
            aria-label="More sale types"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 bg-white p-1 shadow-lg">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                className="flex w-full items-start gap-3 rounded-sm px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => {
                  setOpen(false);
                  router.push(option.href);
                }}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
