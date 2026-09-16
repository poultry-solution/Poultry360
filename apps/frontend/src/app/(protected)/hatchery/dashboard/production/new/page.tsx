"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MaterialProductionForm } from "@/components/production/MaterialProductionForm";
import {
  useGetHatcheryInventory,
  type HatcheryInventoryItem,
} from "@/fetchers/hatchery/hatcheryInventoryQueries";
import {
  useGetHatcheryProducts,
  type HatcheryManufacturedProduct,
} from "@/fetchers/hatchery/hatcheryProductQueries";
import { useCreateHatcheryProduction } from "@/fetchers/hatchery/hatcheryProductionQueries";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function NewHatcheryProductionPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION}
      fallbackHref="/hatchery/dashboard/home"
    >
      <NewHatcheryProductionContent />
    </AccountFeatureGuard>
  );
}

function NewHatcheryProductionContent() {
  const router = useRouter();
  const createProduction = useCreateHatcheryProduction();
  const [materialSearch, setMaterialSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { data: inventoryResponse, isLoading: inventoryLoading } =
    useGetHatcheryInventory({
      itemType: "RAW_MATERIAL",
      search: materialSearch || undefined,
      limit: 30,
    });
  const { data: productsResponse, isLoading: productsLoading } =
    useGetHatcheryProducts({
      search: productSearch || undefined,
      limit: 30,
    });

  const materials = (
    (inventoryResponse?.data ?? []) as HatcheryInventoryItem[]
  ).map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    currentStock: Number(item.currentStock),
    unitCost: Number(item.effectiveUnitCost ?? item.unitPrice),
    subtitle: `${item.supplier?.name ?? "Supplier"} · ${Number(item.currentStock)} ${item.unit} available · Rs. ${Number(item.effectiveUnitCost ?? item.unitPrice).toFixed(2)}/${item.unit}`,
  }));
  const products = (
    (productsResponse?.data ?? []) as HatcheryManufacturedProduct[]
  ).map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    currentStock: Number(product.currentStock),
  }));

  return (
    <MaterialProductionForm
      backHref="/hatchery/dashboard/production"
      inventoryHref="/hatchery/dashboard/inventory"
      materials={materials}
      products={products}
      isLoadingMaterials={inventoryLoading}
      isLoadingProducts={productsLoading}
      isSubmitting={createProduction.isPending}
      onMaterialSearch={setMaterialSearch}
      onProductSearch={setProductSearch}
      onSubmit={async (input) => {
        try {
          await createProduction.mutateAsync(input);
          toast.success("Production recorded and inventory updated");
          router.push("/hatchery/dashboard/production");
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || "Failed to record production"
          );
        }
      }}
    />
  );
}
