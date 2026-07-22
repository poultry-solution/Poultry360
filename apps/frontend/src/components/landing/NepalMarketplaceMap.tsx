"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import type { ListForSalePublicItem } from "@/fetchers/public/listForSaleQueries";

const NEPAL_BOUNDS = {
  west: 80.0,
  east: 88.35,
  south: 26.2,
  north: 30.55,
};

type MarkerListing = {
  item: ListForSalePublicItem;
  left: number;
  top: number;
};

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getMarkerPosition(item: ListForSalePublicItem, index: number) {
  const lng = item.longitude ?? 0;
  const lat = item.latitude ?? 0;
  const nx = normalize(lng, NEPAL_BOUNDS.west, NEPAL_BOUNDS.east);
  const ny = normalize(lat, NEPAL_BOUNDS.south, NEPAL_BOUNDS.north);
  const seed = hashString(item.id) + index * 31;
  const jitterX = ((seed % 7) - 3) * 0.002;
  const jitterY = (((seed >> 3) % 7) - 3) * 0.002;

  return {
    left: Math.min(95, Math.max(5, 7 + nx * 86 + jitterX * 100)),
    top: Math.min(88, Math.max(8, 82 - ny * 62 + jitterY * 100)),
  };
}

function MapBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.7),transparent_26%),linear-gradient(180deg,#f7fbff_0%,#eef7fb_48%,#e8f4f9_100%)]" />
      <div className="absolute inset-0 opacity-85">
        <img
          src="/nepal-map.svg"
          alt=""
          aria-hidden="true"
          className="h-full w-full select-none object-contain object-center"
          draggable={false}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.18)_22%,transparent_42%),linear-gradient(225deg,transparent_0%,rgba(255,255,255,0.12)_22%,transparent_42%)]" />
    </div>
  );
}

export default function NepalMarketplaceMap({
  listings,
  marketplaceHref,
}: {
  listings: ListForSalePublicItem[];
  marketplaceHref: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const markers = useMemo<MarkerListing[]>(
    () =>
      listings
        .filter((item) => item.latitude != null && item.longitude != null)
        .map((item, index) => ({
          item,
          ...getMarkerPosition(item, index),
        })),
    [listings]
  );

  const hoveredMarker = markers.find((marker) => marker.item.id === hoveredId) ?? null;
  const selectedMarker = markers.find((marker) => marker.item.id === selectedId) ?? null;
  const previewMarker = selectedMarker ?? hoveredMarker;

  useEffect(() => {
    setHoveredId(null);
    setSelectedId(null);
  }, [listings]);

  const hasMarkers = markers.length > 0;

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.10)]">
      <div className="relative aspect-[16/10] min-h-[440px] w-full overflow-hidden sm:aspect-[16/9] lg:min-h-[560px]">
        <MapBackdrop />

        {!hasMarkers ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="max-w-md rounded-3xl border border-slate-200 bg-white/92 px-5 py-4 text-center shadow-lg backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">No map listings yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Listings with latitude and longitude will appear here once sellers save a location.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
                <Link href={marketplaceHref}>Open marketplace</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {markers.map((marker) => {
              const isActive = previewMarker?.item.id === marker.item.id;
              const isHovered = hoveredId === marker.item.id;

              return (
                <button
                  key={marker.item.id}
                  type="button"
                  aria-label={marker.item.companyName}
                  className="group absolute z-20 -translate-x-1/2 -translate-y-full"
                  style={{
                    left: `${marker.left}%`,
                    top: `${marker.top}%`,
                  }}
                  onMouseEnter={() => setHoveredId(marker.item.id)}
                  onMouseLeave={() => setHoveredId((current) => (current === marker.item.id ? null : current))}
                  onFocus={() => setHoveredId(marker.item.id)}
                  onBlur={() => setHoveredId((current) => (current === marker.item.id ? null : current))}
                  onClick={() => setSelectedId(marker.item.id)}
                >
                  <span
                    className={`absolute left-1/2 top-full mt-1 h-3 w-[2px] -translate-x-1/2 rounded-full ${
                      isActive ? "bg-emerald-600" : "bg-slate-700/70"
                    }`}
                  />
                  <span
                    className={`absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      isActive ? "bg-emerald-500/20" : "bg-slate-900/10"
                    } animate-ping`}
                  />
                  <MapPin
                    className={`relative h-10 w-10 drop-shadow-[0_8px_14px_rgba(15,23,42,0.28)] transition-transform duration-200 ${
                      isActive ? "scale-110 text-emerald-600" : "text-slate-900 group-hover:scale-110"
                    }`}
                    fill="currentColor"
                  />

                  <span
                    className={`pointer-events-none absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-lg transition-all duration-200 ${
                      isHovered || isActive
                        ? "translate-y-0 opacity-100 border-emerald-200 bg-white text-slate-900"
                        : "translate-y-1 opacity-0 border-transparent bg-white text-transparent"
                    }`}
                  >
                    {marker.item.companyName}
                  </span>
                </button>
              );
            })}
          </>
        )}

        <div className="absolute inset-x-3 bottom-3 z-30 lg:hidden">
          {selectedMarker ? (
            <div className="rounded-2xl border border-slate-200 bg-white/96 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selected listing</p>
                  <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
                    {selectedMarker.item.companyName}
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close listing preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Button asChild size="sm" className="mt-3 w-full rounded-xl">
                <Link href={marketplaceHref}>Open marketplace</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/70 bg-white/88 px-4 py-3 text-sm text-slate-600 shadow-lg backdrop-blur">
              Tap a pin to preview the company name.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
