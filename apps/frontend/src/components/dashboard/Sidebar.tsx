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
  CreditCard,

} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useAuth } from "@/common/store/store";
import { LucideIcon } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

// Navigation item type
export interface NavigationItem {
  nameKey: string;
  href: string;
  icon: LucideIcon;
}

// Role-based navigation configurations
export const farmerNavigation: NavigationItem[] = [
  { nameKey: "sidebar.nav.home", href: "/farmer/dashboard/home", icon: Home },
  { nameKey: "sidebar.nav.farms", href: "/farmer/dashboard/farms", icon: Building2 },
  { nameKey: "sidebar.nav.batches", href: "/farmer/dashboard/batches", icon: Layers },
  { nameKey: "sidebar.nav.dealers", href: "/farmer/dashboard/dealers", icon: Users },
  { nameKey: "sidebar.nav.salesLedger", href: "/farmer/dashboard/sales-ledger", icon: Receipt },
  {
    nameKey: "sidebar.nav.medicalSupplierLedger",
    href: "/farmer/dashboard/medical-supplier-ledger",
    icon: Pill,
  },
  { nameKey: "sidebar.nav.hatcheryLedger", href: "/farmer/dashboard/hatchery-ledger", icon: Egg },
  { nameKey: "sidebar.nav.inventory", href: "/farmer/dashboard/inventory", icon: Package },
  {
    nameKey: "sidebar.nav.chatWithDoctor",
    href: "/farmer/dashboard/chat-doctor",
    icon: MessageCircle,
  },
  { nameKey: "sidebar.nav.accounts", href: "/farmer/dashboard/accounts", icon: CreditCard },
  { nameKey: "sidebar.nav.vaccinations", href: "/farmer/dashboard/vaccinations", icon: Syringe },
];

const doctorNavigation: NavigationItem[] = [
  { nameKey: "sidebar.nav.dashboard", href: "/doctor/dashboard", icon: Home },
  { nameKey: "sidebar.nav.chat", href: "/doctor/dashboard/chat", icon: MessageCircle },
  { nameKey: "sidebar.nav.ledger", href: "/doctor/dashboard/ledger", icon: Receipt },
];

export const dealerNavigation: NavigationItem[] = [
  { nameKey: "sidebar.nav.home", href: "/dealer/dashboard/home", icon: Home },
  { nameKey: "sidebar.nav.companies", href: "/dealer/dashboard/company", icon: Building2 },
  { nameKey: "sidebar.nav.inventory", href: "/dealer/dashboard/inventory", icon: Package },
  { nameKey: "sidebar.nav.farmers", href: "/dealer/dashboard/customers", icon: Users },
  { nameKey: "sidebar.nav.sales", href: "/dealer/dashboard/sales", icon: Receipt },
  { nameKey: "sidebar.nav.ledger", href: "/dealer/dashboard/ledger", icon: FileText },

];

export const companyNavigation: NavigationItem[] = [
  { nameKey: "sidebar.nav.home", href: "/company/dashboard/home", icon: Home },
  { nameKey: "sidebar.nav.products", href: "/company/dashboard/products", icon: Package },
  { nameKey: "sidebar.nav.dealers", href: "/company/dashboard/dealers", icon: Users },
  { nameKey: "sidebar.nav.sales", href: "/company/dashboard/sales", icon: Receipt },
  { nameKey: "sidebar.nav.ledger", href: "/company/dashboard/ledger", icon: FileText },
  { nameKey: "sidebar.nav.consignments", href: "/company/dashboard/consignments", icon: Truck },
  { nameKey: "sidebar.nav.payments", href: "/company/dashboard/payments", icon: DollarSign },
  { nameKey: "sidebar.nav.analytics", href: "/company/dashboard/analytics", icon: BarChart3 },
];

const adminNavigation: NavigationItem[] = [
  { nameKey: "sidebar.nav.overview", href: "/admin/dashboard", icon: BarChart3 },
  { nameKey: "sidebar.nav.users", href: "/admin/dashboard/users", icon: Users },
  { nameKey: "sidebar.nav.farms", href: "/admin/dashboard/farms", icon: Building2 },
  { nameKey: "sidebar.nav.batches", href: "/admin/dashboard/batches", icon: Package },
  { nameKey: "sidebar.nav.financial", href: "/admin/dashboard/financial", icon: DollarSign },
  { nameKey: "sidebar.nav.suppliers", href: "/admin/dashboard/suppliers", icon: Truck },
  { nameKey: "sidebar.nav.performance", href: "/admin/dashboard/performance", icon: TrendingUp },
  { nameKey: "sidebar.nav.reports", href: "/admin/dashboard/reports", icon: FileText },
  { nameKey: "sidebar.nav.companies", href: "/admin/dashboard/company", icon: Building2 },
  { nameKey: "sidebar.nav.dealers", href: "/admin/dashboard/dealers", icon: Users },
];

interface SidebarProps {
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY";
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ role, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();

  // Get navigation based on role
  const getNavigation = () => {
    if (role === "DOCTOR") return doctorNavigation;
    if (role === "SUPER_ADMIN") return adminNavigation;
    if (role === "DEALER") return dealerNavigation;
    if (role === "COMPANY") return companyNavigation;
    return farmerNavigation; // Default to farmer navigation
  };

  const navigation = getNavigation();

  // Get role display info
  const getRoleInfo = () => {
    if (role === "DOCTOR") {
      return {
        title: t("sidebar.roles.doctor.title"),
        subtitle: t("sidebar.roles.doctor.subtitle"),
        userTitle: t("sidebar.roles.doctor.userTitle")
      };
    }
    if (role === "SUPER_ADMIN") {
      return {
        title: t("sidebar.roles.admin.title"),
        subtitle: t("sidebar.roles.admin.subtitle"),
        userTitle: t("sidebar.roles.admin.userTitle")
      };
    }
    if (role === "DEALER") {
      return {
        title: t("sidebar.roles.dealer.title"),
        subtitle: t("sidebar.roles.dealer.subtitle"),
        userTitle: t("sidebar.roles.dealer.userTitle")
      };
    }
    if (role === "COMPANY") {
      return {
        title: t("sidebar.roles.company.title"),
        subtitle: t("sidebar.roles.company.subtitle"),
        userTitle: t("sidebar.roles.company.userTitle")
      };
    }
    return {
      title: t("sidebar.roles.farmer.title"),
      subtitle: t("sidebar.roles.farmer.subtitle"),
      userTitle: t("sidebar.roles.farmer.userTitle")
    };
  };

  const roleInfo = getRoleInfo();

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white border-r transition-all duration-300 ease-in-out",
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
            title={t("sidebar.collapse")}
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
          } else if (item.href === "/dealer/dashboard/home") {
            // For dealer home, only active if exactly on /dealer/dashboard/home
            isActive = pathname === "/dealer/dashboard/home";
          } else if (item.href === "/company/dashboard/home") {
            // For company home, only active if exactly on /company/dashboard/home
            isActive = pathname === "/company/dashboard/home";
          } else {
            // For all other routes, use the original logic (exact match or sub-routes)
            isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          }

          return (
            <Link
            key={item.nameKey}
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
              <span className="flex-1">{t(item.nameKey)}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
