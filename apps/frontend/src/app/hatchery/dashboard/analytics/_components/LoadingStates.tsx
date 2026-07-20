"use client";

import { Card, CardContent } from "@/common/components/ui/card";

function SkeletonCard() {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="h-3 w-28 rounded bg-slate-100 animate-pulse" />
          <div className="h-8 w-36 rounded bg-slate-100 animate-pulse" />
          <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function OverviewLoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
