"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface ShopLayoutProps {
  title: string;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function ShopLayout({ title, headerActions, children }: ShopLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-2">{headerActions}</div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        <Card className="p-4">{children}</Card>
      </div>
    </div>
  );
}

