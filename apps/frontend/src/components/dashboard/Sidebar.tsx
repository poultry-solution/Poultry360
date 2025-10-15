"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/common/lib/utils";
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
  Syringe,
  BarChart3,
  DollarSign,
  Truck,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useAuth } from "@/common/store/store";

// Role-based navigation configurations
const farmerNavigation = [
  { name: "Home", href: "/farmer/dashboard/home", icon: Home },
  { name: "Farms", href: "/farmer/dashboard/farms", icon: Building2 },
  { name: "Batches", href: "/farmer/dashboard/batches", icon: Layers },
  { name: "Sales Ledger", href: "/farmer/dashboard/sales-ledger", icon: Receipt },
  { name: "Feed Ledger", href: "/farmer/dashboard/dealer-ledger", icon: Users },
  {
    name: "Medical Supplier Ledger",
    href: "/farmer/dashboard/medical-supplier-ledger",
    icon: Pill,
  },
  { name: "Hatchery Ledger", href: "/farmer/dashboard/hatchery-ledger", icon: Egg },
  { name: "Inventory", href: "/farmer/dashboard/inventory", icon: Package },
  {
    name: "Chat with Doctor",
    href: "/farmer/dashboard/chat-doctor",
    icon: MessageCircle,
  },
  { name: "Vaccinations", href: "/farmer/dashboard/vaccinations", icon: Syringe },
];

const doctorNavigation = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: Home },
  { name: "Chat", href: "/doctor/dashboard/chat", icon: MessageCircle },
  { name: "Ledger", href: "/doctor/dashboard/ledger", icon: Receipt },
];

const adminNavigation = [
  { name: "Overview", href: "/admin/dashboard", icon: BarChart3 },
  { name: "Users", href: "/admin/dashboard/users", icon: Users },
  { name: "Farms", href: "/admin/dashboard/farms", icon: Building2 },
  { name: "Batches", href: "/admin/dashboard/batches", icon: Package },
  { name: "Financial", href: "/admin/dashboard/financial", icon: DollarSign },
  { name: "Suppliers", href: "/admin/dashboard/suppliers", icon: Truck },
  { name: "Performance", href: "/admin/dashboard/performance", icon: TrendingUp },
  { name: "Reports", href: "/admin/dashboard/reports", icon: FileText },
];

interface SidebarProps {
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN";
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ role, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Get navigation based on role
  const getNavigation = () => {
    if (role === "DOCTOR") return doctorNavigation;
    if (role === "SUPER_ADMIN") return adminNavigation;
    return farmerNavigation; // Default to farmer navigation
  };

  const navigation = getNavigation();

  // Get role display info
  const getRoleInfo = () => {
    if (role === "DOCTOR") {
      return {
        title: "Doctor Portal",
        subtitle: "Veterinary Services",
        userTitle: "Doctor"
      };
    }
    if (role === "SUPER_ADMIN") {
      return {
        title: "Admin Panel",
        subtitle: "System Management",
        userTitle: "Administrator"
      };
    }
    return {
      title: "Poultry360",
      subtitle: "Farm Management",
      userTitle: "Owner"
    };
  };

  const roleInfo = getRoleInfo();

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
            <h1 className="font-bold text-foreground">{roleInfo.title}</h1>
            <p className="text-xs text-muted-foreground">{roleInfo.subtitle}</p>
          </div>
        </div>

        {/* Collapse Button */}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="cursor-pointer h-8 w-8 flex-shrink-0 hover:bg-gray-100 hover:shadow-sm transition-all duration-200"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* User Info Display */}
      <div className="px-6 py-4 border-b min-w-0">
        <p className="text-sm font-medium text-foreground">
          {user?.companyName || user?.name}
        </p>
        <p className="text-xs text-muted-foreground">{roleInfo.userTitle}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 min-w-0">
        {navigation.map((item) => {
          // More precise active state logic
          let isActive = false;
          
          if (item.href === "/admin/dashboard") {
            // For admin overview, only active if exactly on /admin/dashboard
            isActive = pathname === "/admin/dashboard";
          } else if (item.href === "/farmer/dashboard/home") {
            // For farmer home, only active if exactly on /farmer/dashboard/home
            isActive = pathname === "/farmer/dashboard/home";
          } else if (item.href === "/doctor/dashboard") {
            // For doctor dashboard, only active if exactly on /doctor/dashboard
            isActive = pathname === "/doctor/dashboard";
          } else {
            // For all other routes, use the original logic (exact match or sub-routes)
            isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          }
          
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
