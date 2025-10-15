"use client";

import { Bell, Edit, LogOut } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";

interface DoctorHeaderProps {
  user: {
    name: string;
  } | null;
  totalUnread: number;
  doctorStatus: {
    success: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      isOnline: boolean;
      lastSeen: string | null;
    };
    stats: {
      activeConversations: number;
      unreadMessages: number;
    };
  } | undefined;
  statusLoading: boolean;
  isUpdating: boolean;
  onToggleStatus: () => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

export function DoctorHeader({
  user,
  totalUnread,
  doctorStatus,
  statusLoading,
  isUpdating,
  onToggleStatus,
  onLogout,
  onEditProfile,
}: DoctorHeaderProps) {
  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-slate-200/60 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-xl">
                  P
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Poultry360
                </h1>
                <p className="text-xs text-slate-500">Veterinary Portal</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="relative hover:bg-primary/5"
            >
              <Bell className="h-5 w-5 text-slate-600" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {totalUnread}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold text-sm">
                      {user?.name?.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">
                      Dr. {user?.name}
                    </p>
                    <p className="text-xs text-slate-500">Veterinarian</p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 bg-white border shadow-xl rounded-xl"
              >
                <DropdownMenuItem
                  onClick={onEditProfile}
                  className="cursor-pointer rounded-lg"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onLogout}
                  className="cursor-pointer text-red-600 focus:text-red-600 rounded-lg"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={doctorStatus?.user?.isOnline ? "outline" : "default"}
              size="sm"
              onClick={onToggleStatus}
              disabled={isUpdating || statusLoading}
              className={`rounded-xl font-medium shadow-sm transition-all ${
                doctorStatus?.user?.isOnline
                  ? "border-2 border-green-500 text-green-700 hover:bg-green-50"
                  : "bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/30"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  doctorStatus?.user?.isOnline
                    ? "bg-green-500 animate-pulse"
                    : "bg-slate-400"
                }`}
              />
              {isUpdating
                ? "Updating..."
                : statusLoading
                  ? "Loading..."
                  : doctorStatus?.user?.isOnline
                    ? "Online"
                    : "Go Online"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
