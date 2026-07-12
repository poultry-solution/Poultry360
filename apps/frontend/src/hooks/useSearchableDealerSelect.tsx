import { useState } from "react";
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";
import { SearchableSelectOption } from "@/components/common/SearchableSelect";

export function useSearchableDealerSelect() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetCompanyDealers({
    search: search || undefined,
    limit: 50,
  });

  const dealers = data?.data || [];

  const options: SearchableSelectOption[] = dealers.map((dealer: any) => ({
    value: dealer.id,
    label: dealer.name,
    subtitle: dealer.contact,
    data: dealer,
  }));

  return {
    options,
    isLoading,
    onSearch: setSearch,
    dealers,
  };
}
