"use client";

import { Card, CardContent } from "@/common/components/ui/card";

function SkeletonCard() {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-6 w-28 animate-pulse rounded bg-slate-100" />
      <div className="h-2.5 w-32 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function OverviewLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <Card className="border-slate-200/80 shadow-sm">
          <CardContent className="p-5">
            <div className="h-[320px] rounded-2xl bg-slate-100 animate-pulse" />
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5">
              <div className="h-[240px] rounded-2xl bg-slate-100 animate-pulse" />
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 shadow-sm">
            <CardContent className="p-5">
              <div className="h-[240px] rounded-2xl bg-slate-100 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function BatchAnalyticsLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-[320px] rounded-2xl bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export function IncubationAnalyticsLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-[320px] rounded-2xl bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ProductionAnalyticsLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-[340px] rounded-2xl bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesAnalyticsLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="h-10 w-full rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-[340px] rounded-2xl bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
