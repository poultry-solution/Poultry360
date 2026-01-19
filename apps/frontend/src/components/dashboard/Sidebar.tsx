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
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useAuth } from "@/common/store/store";
import { useGetCompanyVerificationRequests } from "@/fetchers/company/companyVerificationQueries";
import { LucideIcon } from "lucide-react";
import { useGetDealerVerificationRequests } from "@/fetchers/dealer/dealerVerificationQueries";

// Navigation item type
interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

// Role-based navigation configurations
const farmerNavigation: NavigationItem[] = [
  { name: "Home", href: "/farmer/dashboard/home", icon: Home },
  { name: "Farms", href: "/farmer/dashboard/farms", icon: Building2 },
  { name: "Batches", href: "/farmer/dashboard/batches", icon: Layers },
  { name: "Dealers", href: "/farmer/dashboard/dealers", icon: Users },
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
  { name: "Accounts", href: "/farmer/dashboard/accounts", icon: CreditCard },
  { name: "Vaccinations", href: "/farmer/dashboard/vaccinations", icon: Syringe },
];

const doctorNavigation: NavigationItem[] = [
  { name: "Dashboard", href: "/doctor/dashboard", icon: Home },
  { name: "Chat", href: "/doctor/dashboard/chat", icon: MessageCircle },
  { name: "Ledger", href: "/doctor/dashboard/ledger", icon: Receipt },
];

const dealerNavigation: NavigationItem[] = [
  { name: "Home", href: "/dealer/dashboard/home", icon: Home },
  { name: "Companies", href: "/dealer/dashboard/company", icon: Building2 },
  { name: "Farmers", href: "/dealer/dashboard/farmers", icon: Users },
  { name: "Inventory", href: "/dealer/dashboard/inventory", icon: Package },
  { name: "Customers", href: "/dealer/dashboard/customers", icon: Users },
  { name: "Sales", href: "/dealer/dashboard/sales", icon: Receipt },
  { name: "Ledger", href: "/dealer/dashboard/ledger", icon: FileText },
  { name: "Consignments", href: "/dealer/dashboard/consignments", icon: Truck },
  { name: "Payments", href: "/dealer/dashboard/payments", icon: CreditCard },
];

const companyNavigation: NavigationItem[] = [
  { name: "Home", href: "/company/dashboard/home", icon: Home },
  { name: "Products", href: "/company/dashboard/products", icon: Package },
  { name: "Dealers", href: "/company/dashboard/dealers", icon: Users },
  { name: "Verification Requests", href: "/company/dashboard/verification", icon: CheckCircle2, badge: "verification" },
  { name: "Sales", href: "/company/dashboard/sales", icon: Receipt },
  { name: "Ledger", href: "/company/dashboard/ledger", icon: FileText },
  { name: "Consignments", href: "/company/dashboard/consignments", icon: Truck },
  { name: "Payments", href: "/company/dashboard/payments", icon: DollarSign },
  { name: "Analytics", href: "/company/dashboard/analytics", icon: BarChart3 },
];

const adminNavigation: NavigationItem[] = [
  { name: "Overview", href: "/admin/dashboard", icon: BarChart3 },
  { name: "Users", href: "/admin/dashboard/users", icon: Users },
  { name: "Farms", href: "/admin/dashboard/farms", icon: Building2 },
  { name: "Batches", href: "/admin/dashboard/batches", icon: Package },
  { name: "Financial", href: "/admin/dashboard/financial", icon: DollarSign },
  { name: "Suppliers", href: "/admin/dashboard/suppliers", icon: Truck },
  { name: "Performance", href: "/admin/dashboard/performance", icon: TrendingUp },
  { name: "Reports", href: "/admin/dashboard/reports", icon: FileText },
  { name: "Companies", href: "/admin/dashboard/company", icon: Building2 },
  { name: "Dealers", href: "/admin/dashboard/dealers", icon: Users },
];

interface SidebarProps {
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY";
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ role, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Get pending verification count for company role (only fetch for COMPANY role)
  const { data: companyPendingData } = useGetCompanyVerificationRequests(
    { status: "PENDING", limit: 1 },
    { enabled: role === "COMPANY" }
  );

  // Get dealer verification requests (only fetch for DEALER role)
  const { data: dealerRequestsData } = useGetDealerVerificationRequests({
    enabled: role === "DEALER",
  });
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
    if (role === "DEALER") {
      return {
        title: "Dealer Portal",
        subtitle: "Feed & Supply Management",
        userTitle: "Dealer"
      };
    }
    if (role === "COMPANY") {
      return {
        title: "Company Portal",
        subtitle: "Product & Distribution Management",
        userTitle: "Company"
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
              <span className="flex-1">{item.name}</span>
              {item.badge === "verification" && (() => {
                // Get pending count based on role
                let pendingCount = 0;
                if (role === "COMPANY" && companyPendingData?.pagination?.total) {
                  pendingCount = companyPendingData.pagination.total;
                } else if (role === "DEALER" && dealerRequestsData?.data) {
                  // Dealer requests return array, count PENDING items
                  pendingCount = dealerRequestsData.data.filter(
                    (req: any) => req.status === "PENDING"
                  ).length;
                }
                return pendingCount > 0 ? (
                  <Badge className="ml-auto bg-yellow-500 text-white text-xs">
                    {pendingCount}
                  </Badge>
                ) : null;
              })()}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
