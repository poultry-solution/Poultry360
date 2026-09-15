"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialProductionList } from "@/components/production/MaterialProductionList";
import {
  useDeleteFarmerProduction,
  useGetFarmerProduction,
} from "@/fetchers/farmer/farmerProductionQueries";

export default function FarmerProductionPage() {
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
      isLoading={isLoading}
      isRemoving={remove.isPending}
      search={search}
      onSearchChange={setSearch}
      onRemove={async (run) => {
        try {
          await remove.mutateAsync(run.id);
          toast.success("Production reversed");
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || "Could not reverse production"
          );
          throw error;
        }
      }}
    />
  );
}
