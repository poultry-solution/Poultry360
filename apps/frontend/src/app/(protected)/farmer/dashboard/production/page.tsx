"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialProductionList } from "@/components/production/MaterialProductionList";
import {
  useDeleteFarmerProduction,
  useGetFarmerProduction,
} from "@/fetchers/farmer/farmerProductionQueries";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";
import { useI18n } from "@/i18n/useI18n";

export default function FarmerProductionPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION}
      fallbackHref="/farmer/dashboard/home"
    >
      <FarmerProductionContent />
    </AccountFeatureGuard>
  );
}

function FarmerProductionContent() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetFarmerProduction({
    limit: 100,
    search: search || undefined,
  });
  const remove = useDeleteFarmerProduction();

  return (
    <MaterialProductionList
      runs={data?.data ?? []}
      newHref="/farmer/dashboard/production/new"
      purchaseHref="/farmer/dashboard/supplier-ledger"
      inventoryHref="/farmer/dashboard/inventory"
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
