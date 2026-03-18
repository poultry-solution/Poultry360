import { useState } from "react";
import { useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { SearchableSelectOption } from "@/components/common/SearchableSelect";

export function useSearchableDealerProductSelect() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetDealerProducts({
    search: search || undefined,
    limit: 100,
  });

  const products = data?.data || [];

  const options: SearchableSelectOption[] = products
    .filter((product: any) => Number(product.currentStock) > 0)
    .map((product: any) => {
      const sellingPrice = Number(product.sellingPrice) || 0;
      const supplierName = product.manualCompany?.name || product.supplierCompany?.name;
      return {
        value: product.id,
        label: supplierName ? `${product.name} (${supplierName})` : product.name,
        subtitle: `Stock: ${product.currentStock} ${product.unit} | Price: रू ${sellingPrice.toFixed(2)}`,
        data: product,
      };
    });

  return {
    options,
    isLoading,
    onSearch: setSearch,
    products, // Return products for additional data access
  };
}
