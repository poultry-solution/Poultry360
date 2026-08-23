"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import {
  usePublicListForSale,
  type ListForSaleCategoryPublic,
} from "@/fetchers/public/listForSaleQueries";
import {
  FILTERS,
  ListingCard,
  NEPAL_PROVINCES,
} from "@/components/landing/ListForSaleShared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";

const MARKETPLACE_LIMIT = 100;
const VALID_CATEGORIES = new Set<string>(["CHICKEN", "EGGS", "LAYERS"]);

export function MarketplaceClientContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const provinceParam = searchParams.get("province");
  const initialCategory: ListForSaleCategoryPublic | null =
    categoryParam && VALID_CATEGORIES.has(categoryParam)
      ? (categoryParam as ListForSaleCategoryPublic)
      : null;

  const [category, setCategory] =
    useState<ListForSaleCategoryPublic | null>(initialCategory);
  const [province, setProvince] = useState<string | null>(provinceParam || null);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const { data, isLoading } = usePublicListForSale(
    category,
    MARKETPLACE_LIMIT,
    0,
    province
  );
  const listings = data?.data ?? [];

  const setSearchParamsInUrl = (
    nextCategory: ListForSaleCategoryPublic | null,
    nextProvince: string | null
  ) => {
    const url = new URL(window.location.href);

    if (nextCategory) {
      url.searchParams.set("category", nextCategory);
    } else {
      url.searchParams.delete("category");
    }

    if (nextProvince) {
      url.searchParams.set("province", nextProvince);
    } else {
      url.searchParams.delete("province");
    }

    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const setCategoryAndUrl = (value: ListForSaleCategoryPublic | null) => {
    setCategory(value);
    setSearchParamsInUrl(value, province);
  };

  const setProvinceAndUrl = (value: string | null) => {
    setProvince(value);
    setSearchParamsInUrl(category, value);
  };

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {FILTERS.map((filter) => (
          <button
            key={filter.labelKey}
            onClick={() => setCategoryAndUrl(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              category === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t(filter.labelKey)}
          </button>
        ))}
      </div>

      <div className="flex justify-center mb-8">
        <div className="w-full max-w-xs">
          <Select
            value={province ?? "ALL"}
            onValueChange={(value) =>
              setProvinceAndUrl(value === "ALL" ? null : value)
            }
          >
            <SelectTrigger>
              <SelectValue
                placeholder={t("landing.listForSale.provinceFilterPlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {t("landing.listForSale.filters.allProvinces")}
              </SelectItem>
              {NEPAL_PROVINCES.map((provinceName) => (
                <SelectItem key={provinceName} value={provinceName}>
                  {provinceName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          {t("landing.marketplacePage.emptyCategory")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {listings.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
