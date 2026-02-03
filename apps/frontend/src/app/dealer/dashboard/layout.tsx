"use client";

import { useState } from "react";
import Sidebar, { dealerNavigation } from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { MobileNavSheet } from "@/components/dashboard/MobileNavSheet";
import { QuickActionsProvider } from "@/contexts/QuickActionsContext";
import { useAuthStore } from "@/common/store/store";

export default function DealerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();

  const role = user?.role as "DEALER";

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <QuickActionsProvider>
      <div className="flex h-screen bg-background relative">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar
            role={role}
            isCollapsed={isCollapsed}
            onToggle={toggleSidebar}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar
            isCollapsed={isCollapsed}
            onToggle={toggleSidebar}
            role={role}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>

        {/* Mobile Navigation - FAB + Sheet */}
        <MobileNavSheet navigation={dealerNavigation} title="Navigation" />
      </div>
    </QuickActionsProvider>
  );
}
