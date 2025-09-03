"use client";

import { Search, Bell, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TopbarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Topbar({ isCollapsed, onToggle }: TopbarProps) {
  return (
    <div className="flex h-16 items-center gap-4 border-b bg-background px-6">
      {/* Expand Sidebar Button - Only show when collapsed */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 mr-2"
          title="Expand sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search farms, batches, inventory..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2">
        {/* Notification Button */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            3
          </Badge>
        </Button>

        {/* User Profile Button */}
        <Button variant="ghost" size="icon">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary-foreground" />
          </div>
        </Button>
      </div>
    </div>
  );
}
