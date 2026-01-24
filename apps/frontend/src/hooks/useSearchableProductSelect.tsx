import { useState } from "react";
import { useGetCompanyProducts } from "@/fetchers/company/companyProductQueries";
import { SearchableSelectOption } from "@/components/common/SearchableSelect";

export function useSearchableProductSelect() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetCompanyProducts({
    search: search || undefined,
    limit: 100,
  });

  const products = data?.data || [];

  const options: SearchableSelectOption[] = products.map((product: any) => {
    const price = Number(product.price) || 0;
    return {
      value: product.id,
      label: product.name,
      subtitle: `Stock: ${product.currentStock} | Price: रू ${price.toFixed(2)}`,
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
