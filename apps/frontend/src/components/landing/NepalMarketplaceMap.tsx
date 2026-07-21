"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Navigation, X } from "lucide-react";
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
  const jitterX = ((seed % 7) - 3) * 0.0025;
  const jitterY = (((seed >> 3) % 7) - 3) * 0.0025;

  return {
    left: Math.min(95, Math.max(5, 7 + nx * 86 + jitterX * 100)),
    top: Math.min(88, Math.max(8, 84 - ny * 60 - nx * 6 + jitterY * 100)),
  };
}

function NepalBackdrop() {
  return (
    <svg
      viewBox="0 0 1200 500"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="nepalFill" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#d9ecf7" />
          <stop offset="40%" stopColor="#cae2f0" />
          <stop offset="100%" stopColor="#b9d7ea" />
        </linearGradient>
        <linearGradient id="nepalStroke" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9abbd0" />
          <stop offset="100%" stopColor="#7ea3bb" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0f172a" floodOpacity="0.16" />
        </filter>
      </defs>

      <rect width="1200" height="500" fill="url(#nepalFill)" opacity="0.18" />
      <circle cx="260" cy="80" r="170" fill="#ffffff" opacity="0.35" />
      <circle cx="930" cy="120" r="180" fill="#ffffff" opacity="0.28" />
      <circle cx="650" cy="420" r="220" fill="#ffffff" opacity="0.18" />

      <path
        d="M60 340 C120 314, 160 300, 220 296 C270 293, 320 296, 372 286 C430 274, 486 254, 545 232 C607 209, 664 185, 724 178 C786 170, 844 180, 902 168 C962 156, 1040 120, 1130 82 L1112 150 C1052 176, 1004 206, 952 236 C897 268, 842 284, 790 299 C734 316, 681 330, 624 346 C562 364, 503 377, 444 384 C380 391, 321 392, 258 399 C200 406, 142 406, 88 396 Z"
        transform="translate(10 10)"
        fill="#7e97a8"
        opacity="0.22"
      />
      <path
        d="M60 340 C120 314, 160 300, 220 296 C270 293, 320 296, 372 286 C430 274, 486 254, 545 232 C607 209, 664 185, 724 178 C786 170, 844 180, 902 168 C962 156, 1040 120, 1130 82 L1112 150 C1052 176, 1004 206, 952 236 C897 268, 842 284, 790 299 C734 316, 681 330, 624 346 C562 364, 503 377, 444 384 C380 391, 321 392, 258 399 C200 406, 142 406, 88 396 Z"
        fill="url(#nepalFill)"
        stroke="url(#nepalStroke)"
        strokeWidth="2.4"
        filter="url(#shadow)"
      />

      <path d="M195 330 L340 315" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />
      <path d="M340 300 L500 270" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />
      <path d="M500 255 L650 225" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />
      <path d="M650 220 L790 205" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />
      <path d="M790 190 L930 178" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />
      <path d="M930 168 L1080 138" stroke="#8aa6bb" strokeWidth="1.5" opacity="0.55" />

      <g fill="#ffffff" opacity="0.9" fontSize="19" fontWeight="700" letterSpacing="1">
        <text x="130" y="365" transform="rotate(-18 130 365)">SUDURPASCHIM</text>
        <text x="260" y="340" transform="rotate(-16 260 340)">KARNALI</text>
        <text x="430" y="305" transform="rotate(-12 430 305)">LUMBINI</text>
        <text x="580" y="255" transform="rotate(-9 580 255)">GANDAKI</text>
        <text x="735" y="230" transform="rotate(-9 735 230)">BAGMATI</text>
        <text x="865" y="195" transform="rotate(-10 865 195)">MADHESH</text>
        <text x="980" y="150" transform="rotate(-14 980 150)">KOSHI</text>
      </g>

      <text x="610" y="124" fill="#9ca3af" opacity="0.75" fontSize="26" fontWeight="700" letterSpacing="4">
        NEPAL
      </text>
    </svg>
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
    <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-sky-50/70 to-emerald-50/60 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="absolute left-4 top-4 z-10 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
        Hover a pin to preview
      </div>
      <div className="absolute right-4 top-4 z-10 rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
        Only listings with exact location are shown
      </div>

      <div className="relative aspect-[16/10] min-h-[420px] w-full sm:aspect-[16/9] lg:min-h-[520px]">
        <NepalBackdrop />

        {!hasMarkers ? (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <div className="max-w-md rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 text-center shadow-lg backdrop-blur">
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
                      isActive ? "bg-emerald-600" : "bg-slate-700/60"
                    }`}
                  />
                  <span
                    className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                      isActive ? "bg-emerald-500/20" : "bg-slate-900/10"
                    } animate-ping`}
                  />
                  <MapPin
                    className={`relative h-10 w-10 drop-shadow-[0_8px_12px_rgba(15,23,42,0.28)] transition-transform duration-200 ${
                      isActive ? "scale-110 text-emerald-600" : "text-slate-900 group-hover:scale-110"
                    }`}
                    fill={isActive ? "currentColor" : "currentColor"}
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
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
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
            <div className="rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm text-slate-600 shadow-lg backdrop-blur">
              Tap a pin to preview the company name.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
