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
import { useI18n } from "@/i18n/useI18n";

interface FarmerRawMaterial {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  unitPrice?: number | null;
  effectiveUnitCost?: number;
  firstPurchaseDate?: string | null;
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
  const { t } = useI18n();
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
      firstPurchaseDate: item.firstPurchaseDate ?? null,
    })
  );
  const products = (
    (productsResponse?.data ?? []) as FarmerManufacturedProduct[]
  ).map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit,
    currentStock: Number(product.currentStock),
  }));

  return (
    <MaterialProductionForm
      backHref="/farmer/dashboard/production"
      inventoryHref="/farmer/dashboard/inventory"
      purchaseHref="/farmer/dashboard/supplier-ledger"
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
          toast.success(t("production.toast.saved"));
          router.push("/farmer/dashboard/production");
        } catch (error: any) {
          toast.error(
            error?.response?.data?.message || t("production.toast.saveFailed")
          );
        }
      }}
    />
  );
}
