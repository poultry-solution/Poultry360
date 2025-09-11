"use client";

import {
  Search,
  Bell,
  User,
  Menu,
  Settings,
  LogOut,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/store/store";
import { useRouter } from "next/navigation";
interface TopbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Topbar({ isCollapsed, onToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  console.log("user", user);
  const router = useRouter();
  const handleProfileClick = () => {
    console.log("Profile clicked");
    // Add your profile logic here
  };

  const handleSettingsClick = () => {
    console.log("Settings clicked");
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
            title="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search Bar */}
        <div className="max-w-md w-full">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search farms, batches, inventory..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring h-9"
            />
          </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Button */}
        <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9 relative hover:bg-gray-100 hover:shadow-sm transition-all duration-200">
          <Bell className="h-5 w-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            3
          </Badge>
        </Button>

        {/* Settings Button */}
        <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200">
          <Settings className="h-5 w-5" />
        </Button>

        {/* User Profile Section */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon" className="cursor-pointer h-9 w-9 hover:bg-gray-100 hover:shadow-sm transition-all duration-200">
              <User className="h-5 w-5 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOutClick}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
