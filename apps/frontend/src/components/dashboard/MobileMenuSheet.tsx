"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import {
  Home,
  Building2,
  Layers,
  Users,
  Pill,
  Egg,
  Package,
  MessageCircle,
  Receipt,
  Syringe,
  BarChart3,
  DollarSign,
  Truck,
  TrendingUp,
  FileText,
} from "lucide-react";

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN";
}

interface NavSection {
  category: string;
  items: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
}

// Organized navigation with categories
const farmerNavigation: NavSection[] = [
  {
    category: "Overview",
    items: [
      { name: "Home", href: "/farmer/dashboard/home", icon: Home },
      { name: "Farms", href: "/farmer/dashboard/farms", icon: Building2 },
      { name: "Batches", href: "/farmer/dashboard/batches", icon: Layers },
    ],
  },
  {
    category: "Sales & Ledgers",
    items: [
      { name: "Sales Ledger", href: "/farmer/dashboard/sales-ledger", icon: Receipt },
      { name: "Feed Ledger", href: "/farmer/dashboard/dealer-ledger", icon: Users },
      { name: "Medical Supplier", href: "/farmer/dashboard/medical-supplier-ledger", icon: Pill },
      { name: "Hatchery Ledger", href: "/farmer/dashboard/hatchery-ledger", icon: Egg },
    ],
  },
  {
    category: "Management",
    items: [
      { name: "Inventory", href: "/farmer/dashboard/inventory", icon: Package },
      { name: "Vaccinations", href: "/farmer/dashboard/vaccinations", icon: Syringe },
    ],
  },
  {
    category: "Support",
    items: [
      { name: "Chat with Doctor", href: "/farmer/dashboard/chat-doctor", icon: MessageCircle },
    ],
  },
];

const doctorNavigation: NavSection[] = [
  {
    category: "Main",
    items: [
      { name: "Dashboard", href: "/doctor/dashboard", icon: Home },
      { name: "Chat", href: "/doctor/dashboard/chat", icon: MessageCircle },
      { name: "Ledger", href: "/doctor/dashboard/ledger", icon: Receipt },
    ],
  },
];

const adminNavigation: NavSection[] = [
  {
    category: "Dashboard",
    items: [
      { name: "Overview", href: "/admin/dashboard", icon: BarChart3 },
      { name: "Performance", href: "/admin/dashboard/performance", icon: TrendingUp },
    ],
  },
  {
    category: "Management",
    items: [
      { name: "Users", href: "/admin/dashboard/users", icon: Users },
      { name: "Farms", href: "/admin/dashboard/farms", icon: Building2 },
      { name: "Batches", href: "/admin/dashboard/batches", icon: Package },
      { name: "Suppliers", href: "/admin/dashboard/suppliers", icon: Truck },
    ],
  },
  {
    category: "Financial",
    items: [
      { name: "Financial", href: "/admin/dashboard/financial", icon: DollarSign },
      { name: "Reports", href: "/admin/dashboard/reports", icon: FileText },
    ],
  },
];

export default function MobileMenuSheet({
  isOpen,
  onClose,
  role,
}: MobileMenuSheetProps) {
  const pathname = usePathname();

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Get navigation based on role
  const getNavigation = () => {
    if (role === "DOCTOR") return doctorNavigation;
    if (role === "SUPER_ADMIN") return adminNavigation;
    return farmerNavigation;
  };

  const navigation = getNavigation();

  // Get role display info
  const getRoleInfo = () => {
    if (role === "DOCTOR") {
      return {
        title: "Doctor Portal",
        subtitle: "Veterinary Services",
      };
    }
    if (role === "SUPER_ADMIN") {
      return {
        title: "Admin Panel",
        subtitle: "System Management",
      };
    }
    return {
      title: "Poultry360",
      subtitle: "Farm Management",
    };
  };

  const roleInfo = getRoleInfo();

  // Check if a link is active
  const isActiveLink = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    } else if (href === "/farmer/dashboard/home") {
      return pathname === "/farmer/dashboard/home";
    } else if (href === "/doctor/dashboard") {
      return pathname === "/doctor/dashboard";
    } else {
      return pathname === href || pathname.startsWith(href + "/");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col md:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {roleInfo.title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {roleInfo.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <nav className="space-y-6">
            {navigation.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {/* Category Label */}
                <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-3">
                  {section.category}
                </h3>

                {/* Category Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isActiveLink(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div
                          className={`mr-3 p-2 rounded-lg ${
                            isActive
                              ? "bg-blue-100 dark:bg-blue-900/30"
                              : "bg-gray-100 dark:bg-gray-800"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          />
                        </div>
                        <span className="font-medium text-base">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}