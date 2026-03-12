"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Tag, Loader2, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { usePublicListForSale, type ListForSaleCategoryPublic } from "@/fetchers/public/listForSaleQueries";
import { FILTERS, ListingCard, NEPAL_PROVINCES } from "./ListForSaleShared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";

const LANDING_LIMIT = 4;

export default function ListForSaleSection() {
  const { t } = useI18n();
  const [category, setCategory] = useState<ListForSaleCategoryPublic | null>(null);
  const [province, setProvince] = useState<string | null>(null);
  const { data, isLoading } = usePublicListForSale(category, LANDING_LIMIT, 0, province);
  const listings = data?.data ?? [];

  const marketplaceHrefParams = new URLSearchParams();
  if (category) marketplaceHrefParams.set("category", category);
  if (province) marketplaceHrefParams.set("province", province);
  const marketplaceHref =
    marketplaceHrefParams.toString().length > 0 ? `/marketplace?${marketplaceHrefParams.toString()}` : "/marketplace";

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-10">
          <Badge className="bg-primary/10 text-primary px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
            <Tag className="h-3.5 w-3.5" />
            {t("landing.listForSale.badge")}
          </Badge>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            {t("landing.listForSale.title")}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t("landing.listForSale.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.labelKey}
              onClick={() => setCategory(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                category === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <div className="w-full max-w-xs">
            <Select
              value={province ?? "ALL"}
              onValueChange={(val) => setProvince(val === "ALL" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("landing.listForSale.provinceFilterPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("landing.listForSale.filters.allProvinces")}</SelectItem>
                {NEPAL_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
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
          <p className="text-center text-gray-500 py-12">{t("landing.listForSale.emptyCategory")}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <Button asChild variant="outline" size="lg" className="gap-2">
                <Link href={marketplaceHref}>
                  {t("landing.listForSale.more")} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
