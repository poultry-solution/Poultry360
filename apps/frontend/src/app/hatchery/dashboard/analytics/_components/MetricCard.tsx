"use client";

import type { ComponentType } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent } from "@/common/components/ui/card";
import { cn } from "@/common/lib/utils";

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "text-slate-900",
  valueClassName,
  badge,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
  valueClassName?: string;
  badge?: string;
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
            <p className={cn("text-2xl font-semibold tracking-tight", tone, valueClassName)}>
              {value}
            </p>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
            {badge ? (
              <Badge variant="outline" className="rounded-full border-slate-200 text-[11px]">
                {badge}
              </Badge>
            ) : null}
          </div>
          <Icon className={cn("h-5 w-5", tone)} />
        </div>
      </CardContent>
    </Card>
  );
}
