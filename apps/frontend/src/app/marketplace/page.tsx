"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Badge } from "@/common/components/ui/badge";
import { Tag, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { usePublicListForSale, type ListForSaleCategoryPublic } from "@/fetchers/public/listForSaleQueries";
import { FILTERS, ListingCard } from "@/components/landing/ListForSaleShared";

const MARKETPLACE_LIMIT = 100;

const VALID_CATEGORIES = new Set<string>(["CHICKEN", "EGGS", "LAYERS", "FISH"]);

export default function MarketplacePage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const initialCategory: ListForSaleCategoryPublic | null =
    categoryParam && VALID_CATEGORIES.has(categoryParam) ? (categoryParam as ListForSaleCategoryPublic) : null;

  const [category, setCategory] = useState<ListForSaleCategoryPublic | null>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const { data, isLoading } = usePublicListForSale(category, MARKETPLACE_LIMIT, 0);
  const listings = data?.data ?? [];

  const setCategoryAndUrl = (value: ListForSaleCategoryPublic | null) => {
    setCategory(value);
    const url = new URL(window.location.href);
    if (value) {
      url.searchParams.set("category", value);
    } else {
      url.searchParams.delete("category");
    }
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="py-12 lg:py-16 bg-gradient-to-b from-gray-50 to-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 lg:px-6">
            <div className="text-center mb-10">
              <Badge className="bg-primary/10 text-primary px-3 py-1 rounded-full mb-4 inline-flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" />
                {t("landing.marketplacePage.badge")}
              </Badge>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {t("landing.marketplacePage.title")}
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {t("landing.marketplacePage.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {FILTERS.map((f) => (
                <button
                  key={f.labelKey}
                  onClick={() => setCategoryAndUrl(f.value)}
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

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : listings.length === 0 ? (
              <p className="text-center text-gray-500 py-12">{t("landing.marketplacePage.emptyCategory")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {listings.map((item) => (
                  <ListingCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
