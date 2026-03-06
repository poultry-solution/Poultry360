"use client";

import Link from "next/link";
import Image from "next/image";
import { User, Menu, Settings, LogOut } from "lucide-react";
import { Button } from "@/common/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { useAuth } from "@/common/store/store";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
interface TopbarProps {
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY";
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export default function Topbar({ role, isCollapsed = false, onToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  // Get role-specific settings
  const getRoleSettings = () => {
    if (role === "DOCTOR") return { settingsPath: "/doctor/dashboard/settings", homePath: "/doctor/dashboard" };
    if (role === "SUPER_ADMIN") return { settingsPath: "/admin/dashboard/settings", homePath: "/admin/dashboard" };
    if (role === "DEALER") return { settingsPath: "/dealer/dashboard/settings", homePath: "/dealer/dashboard/home" };
    if (role === "COMPANY") return { settingsPath: "/company/dashboard/settings", homePath: "/company/dashboard/home" };
    return { settingsPath: "/farmer/dashboard/settings", homePath: "/farmer/dashboard/home" };
  };

  const roleSettings = getRoleSettings();

  const handleSignOutClick = () => {
    console.log("Sign out clicked");
    logout();
    router.push("/auth/login");
    // Add your sign out logic here
  };

  return (
    <div className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left Side - Logo (mobile only) + Expand Sidebar Button (when collapsed, desktop) */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Logo - visible only on mobile (sidebar has logo on desktop) */}
        <Link href={roleSettings.homePath} className="md:hidden flex-shrink-0">
        
        </Link>
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200 hidden md:flex"
            title={t("topbar.expandSidebar")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* User Profile Section */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200"
            >
              <User className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white border shadow-lg"
          >
            <DropdownMenuLabel>{t("topbar.myAccount")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0 cursor-pointer">
              <Link
                href={roleSettings.settingsPath}
                className="flex items-center w-full px-2 py-1.5 cursor-pointer outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <Settings className="mr-2 h-4 w-4" />
                {t("topbar.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOutClick}
              className="text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t("topbar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
