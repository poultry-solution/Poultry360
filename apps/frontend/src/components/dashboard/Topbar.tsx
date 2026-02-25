"use client";

import { Search, User, Menu, Settings, LogOut } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
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
import { NotificationBell } from "@/common/components/notifications/NotificationBell";
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
    if (role === "DOCTOR") {
      return {
        searchPlaceholder: t("topbar.search.doctor"),
        settingsPath: "/doctor/dashboard/settings"
      };
    }
    if (role === "SUPER_ADMIN") {
      return {
        searchPlaceholder: t("topbar.search.admin"),
        settingsPath: "/admin/dashboard/settings"
      };
    }

    if (role === "DEALER") {
      return {
        searchPlaceholder: t("topbar.search.dealer"),
        settingsPath: "/dealer/dashboard/settings"
      };
    }
    if (role === "COMPANY") {
      return {
        searchPlaceholder: t("topbar.search.company"),
        settingsPath: "/company/dashboard/settings"
      };
    }
    return {
      searchPlaceholder: t("topbar.search.farmer"),
      settingsPath: "/farmer/dashboard/settings"
    };
  };

  const roleSettings = getRoleSettings();

  const handleProfileClick = () => {
    console.log("Profile clicked");
    // Add your profile logic here
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
    router.push(roleSettings.settingsPath);
    // Add your settings logic here
  };

  const handleSignOutClick = () => {
    console.log("Sign out clicked");
    logout();
    router.push("/auth/login");
    // Add your sign out logic here
  };

  return (
    <div className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left Side - Expand Button and Search */}
      <div className="flex items-center gap-4 flex-1">
        {/* Expand Sidebar Button - Only show when collapsed */}
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200"
            title={t("topbar.expandSidebar")}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search Bar */}
        <div className="max-w-md w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={roleSettings.searchPlaceholder}
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring h-9"
            />
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />


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
            <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              {t("topbar.myProfile")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              {t("topbar.settings")}
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
