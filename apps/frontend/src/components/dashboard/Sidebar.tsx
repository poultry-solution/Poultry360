"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Building2,
  Layers,
  Users,
  Pill,
  Egg,
  Package,
  MessageCircle,
  ChevronLeft,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/store";

const navigation = [
  { name: "Home", href: "/dashboard/home", icon: Home },
  { name: "Farms", href: "/dashboard/farms", icon: Building2 },
  { name: "Batches", href: "/dashboard/batches", icon: Layers },
  { name: "Sales Ledger", href: "/dashboard/sales-ledger", icon: Receipt },
  { name: "Feed Ledger", href: "/dashboard/dealer-ledger", icon: Users },
  {
    name: "Medical Supplier Ledger",
    href: "/dashboard/medical-supplier-ledger",
    icon: Pill,
  },
  { name: "Hatchery Ledger", href: "/dashboard/hatchery-ledger", icon: Egg },
  { name: "Inventory", href: "/dashboard/inventory", icon: Package },
  {
    name: "Chat with Doctor",
    href: "/dashboard/chat-doctor",
    icon: MessageCircle,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  console.log("user", user);
  return (
    <div
      className={cn(
        "flex h-full flex-col bg-card border-r transition-all duration-300 ease-in-out",
        // Base positioning: off-canvas on mobile, static on desktop
        "fixed inset-y-0 left-0 z-50 w-64 md:static",
        // Mobile transform (slide in/out)
        isCollapsed ? "-translate-x-full md:translate-x-0" : "translate-x-0",
        // Desktop width collapse/expand
        isCollapsed ? "md:w-0 md:overflow-hidden" : "md:w-64"
      )}
    >
      {/* Logo and Company Name */}
      <div className="flex h-16 items-center justify-between border-b px-6 min-w-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-foreground">Poultry360</h1>
            <p className="text-xs text-muted-foreground">Farm Management</p>
          </div>
        </div>

        {/* Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="cursor-pointer h-8 w-8 flex-shrink-0 hover:bg-gray-100 hover:shadow-sm transition-all duration-200"
          title="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Company Name Display */}
      <div className="px-6 py-4 border-b min-w-0">
        <p className="text-sm font-medium text-foreground">
          {user?.companyName || user?.name}
        </p>
        <p className="text-xs text-muted-foreground">Owner</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 min-w-0">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "cursor-pointer group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted hover:shadow-sm hover:scale-[1.02]"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
