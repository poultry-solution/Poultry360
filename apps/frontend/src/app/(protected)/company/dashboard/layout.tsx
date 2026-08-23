"use client";

import { useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { MobileNavSheet } from "@/components/dashboard/MobileNavSheet";
import { useAuthStore } from "@/common/store/store";
import { companyNavigation } from "@/components/dashboard/Sidebar";

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();
  const role = user?.role as "COMPANY";

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
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
        <Topbar isCollapsed={isCollapsed} onToggle={toggleSidebar} role={role} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      {/* Mobile Navigation - FAB + Sheet */}
      <MobileNavSheet navigation={companyNavigation} title="Navigation" />
    </div>
  );
}
