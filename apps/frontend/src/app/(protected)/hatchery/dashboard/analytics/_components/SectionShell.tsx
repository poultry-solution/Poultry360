"use client";

import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";

export function SectionShell({
  title,
  description,
  icon: Icon,
  children,
  badgeLabel = "Coming next",
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  badgeLabel?: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardHeader className="space-y-2 border-b bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-4 w-4 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-medium">
            {badgeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-5">{children}</CardContent>
    </Card>
  );
}
