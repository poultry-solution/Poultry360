"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Building2,
  Layers,
  Package,
  MoreVertical,
  Receipt,
} from "lucide-react";
import { cn } from "@/common/lib/utils";
import ExpandableQuickActions from "./ExpandableQuickActions";
import MobileMenuSheet from "./MobileMenuSheet";
import { useAuth } from "@/common/store/store";
import { useQuickActions } from "@/contexts/QuickActionsContext";

interface QuickAccessItem {
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  label: string;
}

const quickAccessItems: QuickAccessItem[] = [
  { icon: Home, href: "/farmer/dashboard/home", label: "Home" },
  { icon: Building2, href: "/farmer/dashboard/farms", label: "Farms" },
  { icon: Receipt, href: "/farmer/dashboard/sales-ledger", label: "Sales" },
  { icon: Layers, href: "/farmer/dashboard/batches", label: "Batches" },
  { icon: Package, href: "/farmer/dashboard/inventory", label: "Inventory" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { handlers } = useQuickActions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/farmer/dashboard/home") {
      return pathname === "/farmer/dashboard/home";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <>
      {/* Bottom Navigation Bar - Mobile Only */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t shadow-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between px-2 py-2 h-16">
          {/* Left Quick Access Icons */}
          <div className="flex items-center gap-1 flex-1 justify-start">
            {quickAccessItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-colors",
                    "min-w-[44px] min-h-[44px]",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Center Expandable Quick Actions */}
          <div className="flex-shrink-0">
            <ExpandableQuickActions
              onAddExpense={handlers.onAddExpense || (() => {})}
              onAddSale={handlers.onAddSale || (() => {})}
              onAddMortality={handlers.onAddMortality || (() => {})}
              onRecordWeight={handlers.onRecordWeight || (() => {})}
            />
          </div>

          {/* Right Quick Access Icons */}
          <div className="flex items-center gap-1 flex-1 justify-end">
            {quickAccessItems.slice(3, 5).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-colors",
                    "min-w-[44px] min-h-[44px]",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] leading-tight">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* More Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-lg transition-colors",
                "min-w-[44px] min-h-[44px]",
                "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label="More menu"
            >
              <MoreVertical className="h-5 w-5" />
              <span className="text-[10px] leading-tight">More</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sheet */}
      <MobileMenuSheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        role={user?.role}
      />
    </>
  );
}
