"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MaterialProductionForm } from "@/components/production/MaterialProductionForm";
import { useGetInventoryItems } from "@/fetchers/inventory/inventoryQueries";
import {
  useGetFarmerProducts,
  type FarmerManufacturedProduct,
} from "@/fetchers/farmer/farmerProductQueries";
import { useCreateFarmerProduction } from "@/fetchers/farmer/farmerProductionQueries";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

interface FarmerRawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  unitPrice?: number | null;
  effectiveUnitCost?: number;
  supplierKey?: string | null;
  origin?: string;
}

export default function NewFarmerProductionPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION}
      fallbackHref="/farmer/dashboard/home"
    >
      <NewFarmerProductionContent />
    </AccountFeatureGuard>
  );
}

function NewFarmerProductionContent() {
  const router = useRouter();
  const createProduction = useCreateFarmerProduction();
  const [materialSearch, setMaterialSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const { data: inventoryResponse, isLoading: inventoryLoading } =
    useGetInventoryItems({
      itemType: "RAW_MATERIAL",
      search: materialSearch || undefined,
      limit: 30,
    });
  const { data: productsResponse, isLoading: productsLoading } =
    useGetFarmerProducts({
      search: productSearch || undefined,
      limit: 30,
    });

  const materials = ((inventoryResponse?.data ?? []) as FarmerRawMaterial[]).map(
    (item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock: Number(item.currentStock),
      unitCost: Number(item.effectiveUnitCost ?? item.unitPrice ?? 0),
      subtitle: `${item.origin === "SELF_MADE" ? "Self Feed" : "Purchased"} · ${Number(item.currentStock)} ${item.unit} available · Rs. ${Number(item.effectiveUnitCost ?? item.unitPrice ?? 0).toFixed(2)}/${item.unit}`,
    })
  );
  const products = (
    (productsResponse?.data ?? []) as FarmerManufacturedProduct[]
  ).map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    currentStock: Number(product.currentStock),
    subtitle: `${product.outputItemType.replaceAll("_", " ")} · ${product.unit} · ${Number(product.currentStock)} in stock`,
  }));

  return (
    <MaterialProductionForm
      backHref="/farmer/dashboard/production"
      inventoryHref="/farmer/dashboard/inventory"
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
          router.push("/farmer/dashboard/production");
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || "Failed to record production"
          );
        }
      }}
    />
  );
}
