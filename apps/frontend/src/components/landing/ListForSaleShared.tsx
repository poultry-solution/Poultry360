"use client";

import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent } from "@/common/components/ui/card";
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

export function formatDate(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return s;
  }
}

export function formatRate(rate: number | null | undefined): string {
  if (rate == null || rate === 0) return "Contact for Rate";
  return String(rate);
}

function rateDisplay(rate: number | null | undefined, contactForRate: string): string {
  if (rate == null || rate === 0) return contactForRate;
  return String(rate);
}

export function ListingCard({ item }: { item: ListForSalePublicItem }) {
  const { t } = useI18n();
  const contactForRate = t("landing.listForSale.contactForRate");
  const available = t("landing.listForSale.available");
  const avgWeight = t("landing.listForSale.avgWeight");
  const contactLabel = t("landing.listForSale.contactLabel");
  const addressLabel = t("landing.listForSale.addressLabel");

  const hasVariants =
    (item.eggVariants && item.eggVariants.length > 0) || (item.typeVariants && item.typeVariants.length > 0);

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="secondary">{item.category}</Badge>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{item.companyName}</h3>
        {(item.province || item.address) && (
          <p className="text-xs text-gray-500 mb-2">
            <span className="font-medium text-gray-600">{addressLabel} </span>
            {item.province}
            {item.province && item.address ? ", " : ""}
            {item.address}
          </p>
        )}
        <div className="text-sm text-gray-600 space-y-1">
          {hasVariants ? (
            <>
              {item.eggVariants && item.eggVariants.length > 0 && (
                <ul className="list-none space-y-0.5">
                  {item.eggVariants.map((v, i) => (
                    <li key={i}>
                      <span className="font-medium text-gray-700">{v.size}:</span> {v.quantity} {item.unit} @{" "}
                      {rateDisplay(v.rate, contactForRate)}
                    </li>
                  ))}
                </ul>
              )}
              {item.typeVariants && item.typeVariants.length > 0 && (
                <ul className="list-none space-y-0.5">
                  {item.typeVariants.map((v, i) => (
                    <li key={i}>
                      <span className="font-medium text-gray-700">{v.type}:</span> {v.quantity} {item.unit} @{" "}
                      {rateDisplay(v.rate, contactForRate)}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p>
              {item.quantity} {item.unit}
              {item.rate != null && item.rate !== 0 ? ` @ ${item.rate}` : ` @ ${contactForRate}`}
            </p>
          )}
          <p>
            {available}: {formatDate(item.availabilityFrom)} – {formatDate(item.availabilityTo)}
          </p>
          {item.avgWeightKg != null && item.avgWeightKg > 0 && (
            <p>{avgWeight}: {item.avgWeightKg} kg</p>
          )}
        </div>
        {item.phone && (
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium text-gray-700">{contactLabel} </span>
            <a
              href={`tel:${item.phone.replace(/\s/g, "")}`}
              className="font-medium text-primary hover:underline"
            >
              {item.phone}
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
