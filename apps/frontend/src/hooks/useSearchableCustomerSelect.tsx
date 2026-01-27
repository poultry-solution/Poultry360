import { useState } from "react";
import { useSearchCustomers } from "@/fetchers/dealer/dealerSaleQueries";
import { SearchableSelectOption } from "@/components/common/SearchableSelect";

export function useSearchableCustomerSelect() {
  const [search, setSearch] = useState("");

  // Only search when user types at least 2 characters
  const { data, isLoading } = useSearchCustomers(search);

  const customers = data?.data || [];

  const options: SearchableSelectOption[] = customers.map((customer: any) => ({
    value: customer.id,
    label: customer.name,
    subtitle: `${customer.phone}${customer.address ? ` • ${customer.address}` : ""}`,
    data: customer,
  }));

  return {
    options,
    isLoading: isLoading && search.length >= 2, // Only show loading when actually searching
    onSearch: setSearch,
    customers,
  };
}
