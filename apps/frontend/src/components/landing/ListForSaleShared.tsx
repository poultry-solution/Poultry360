"use client";

import { Navigation } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";
import type { ListForSaleCategoryPublic, ListForSalePublicItem } from "@/fetchers/public/listForSaleQueries";

export const FILTERS: { value: ListForSaleCategoryPublic | null; labelKey: string }[] = [
  { value: null, labelKey: "landing.listForSale.filters.all" },
  { value: "CHICKEN", labelKey: "landing.listForSale.filters.chicken" },
  { value: "EGGS", labelKey: "landing.listForSale.filters.eggs" },
  { value: "LAYERS", labelKey: "landing.listForSale.filters.layers" },
  { value: "FISH", labelKey: "landing.listForSale.filters.fish" },
];

export const NEPAL_PROVINCES: string[] = [
  "Koshi Province",
  "Madhesh Province",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpashchim Province",
];

export function formatRate(rate: number | null | undefined): string {
  if (rate == null || rate === 0) return "Contact for Rate";
  return String(rate);
}

function rateDisplay(rate: number | null | undefined, contactForRate: string): string {
  if (rate == null || rate === 0) return contactForRate;
  return String(rate);
}

function buildNavigateUrl(item: ListForSalePublicItem): string | null {
  if (item.latitude != null && item.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;
  }

  const pieces = [item.address, item.province].filter(Boolean).join(", ").trim();
  if (!pieces) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pieces)}`;
}

export function ListingCard({ item }: { item: ListForSalePublicItem }) {
  const { t } = useI18n();
  const contactForRate = t("landing.listForSale.contactForRate");
  const available = t("landing.listForSale.available");
  const avgWeight = t("landing.listForSale.avgWeight");
  const contactLabel = t("landing.listForSale.contactLabel");
  const addressLabel = t("landing.listForSale.addressLabel");
  const navigateUrl = buildNavigateUrl(item);

  const hasVariants =
    (item.eggVariants && item.eggVariants.length > 0) || (item.typeVariants && item.typeVariants.length > 0);

  return (
    <Card className="group overflow-hidden border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-400" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Badge
              variant="secondary"
              className="mb-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700"
            >
              {item.category}
            </Badge>
            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">{item.companyName}</h3>
            {(item.province || item.address) && (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500">
                <span className="mt-0.5 shrink-0">•</span>
                <span className="min-w-0 truncate">
                  <span className="font-medium text-slate-600">{addressLabel}: </span>
                  {item.province}
                  {item.province && item.address ? ", " : ""}
                  {item.address}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {hasVariants ? (
            <div className="space-y-2">
              {item.eggVariants && item.eggVariants.length > 0 && (
                <div className="space-y-2">
                  {item.eggVariants.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{v.size}</p>
                        <p className="text-xs text-slate-500">
                          {v.quantity} {item.unit}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">{rateDisplay(v.rate, contactForRate)}</p>
                    </div>
                  ))}
                </div>
              )}

              {item.typeVariants && item.typeVariants.length > 0 && (
                <div className="space-y-2">
                  {item.typeVariants.map((v, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{v.type}</p>
                        <p className="text-xs text-slate-500">
                          {v.quantity} {item.unit}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">{rateDisplay(v.rate, contactForRate)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Listing</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {item.quantity} {item.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rate</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {item.rate != null && item.rate !== 0 ? item.rate : contactForRate}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{available}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              <DateDisplay date={item.availabilityFrom} format="short" /> -{" "}
              <DateDisplay date={item.availabilityTo} format="short" />
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{avgWeight}</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {item.avgWeightKg != null && item.avgWeightKg > 0 ? `${item.avgWeightKg} kg` : "Not specified"}
            </p>
          </div>
        </div>

        {item.phone && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{contactLabel}</p>
            <a
              href={`tel:${item.phone.replace(/\s/g, "")}`}
              className="mt-1 inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:ring-emerald-200 hover:text-emerald-700"
            >
              {item.phone}
            </a>
          </div>
        )}

        {navigateUrl && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-4 w-full justify-center gap-2 rounded-xl border-slate-200 bg-white text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <a href={navigateUrl} target="_blank" rel="noreferrer">
              <Navigation className="h-4 w-4" />
              Navigate
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
