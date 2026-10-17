"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialProductionList } from "@/components/production/MaterialProductionList";
import {
  useDeleteHatcheryProduction,
  useGetHatcheryProduction,
} from "@/fetchers/hatchery/hatcheryProductionQueries";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";
import { useI18n } from "@/i18n/useI18n";

export default function HatcheryProductionPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION}
      fallbackHref="/hatchery/dashboard/home"
    >
      <HatcheryProductionContent />
    </AccountFeatureGuard>
  );
}

function HatcheryProductionContent() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetHatcheryProduction({
    limit: 100,
    search: search || undefined,
  });
  const remove = useDeleteHatcheryProduction();

  return (
    <MaterialProductionList
      runs={data?.data ?? []}
      newHref="/hatchery/dashboard/production/new"
      purchaseHref="/hatchery/dashboard/supplier-ledger"
      inventoryHref="/hatchery/dashboard/inventory"
      isLoading={isLoading}
      isRemoving={remove.isPending}
      search={search}
      onSearchChange={setSearch}
      onRemove={async (run) => {
        try {
          await remove.mutateAsync(run.id);
          toast.success(t("production.toast.undone"));
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || t("production.toast.undoFailed")
          );
          throw error;
        }
      }}
    />
  );
}
