"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface ShopTabsProps {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
  extra?: ReactNode;
}

export function ShopTabs({ tabs, active, onChange, extra }: ShopTabsProps) {
  return (
    <div className="flex items-center justify-between border-b mb-4">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              active === t.id
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">{extra}</div>
    </div>
  );
}

