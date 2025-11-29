"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { QuickActionsProvider } from "@/contexts/QuickActionsContext";
import { useAuthStore } from "@/common/store/store";

export default function CompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuthStore();
  const role = user?.role as "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY";
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Lock body scroll on mobile when the sidebar (off-canvas) is open
  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      if (!isCollapsed) {
        document.body.classList.add("overflow-hidden");
      } else {
        document.body.classList.remove("overflow-hidden");
      }
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isCollapsed]);

  return (
    <QuickActionsProvider>
      <div className="flex h-screen bg-background relative">
        {/* Sidebar - Hidden on mobile, shown on desktop */}
        <div className="hidden md:block">
          <Sidebar 
            role={user?.role as "OWNER" | "MANAGER" | "DOCTOR" | "SUPER_ADMIN" | "DEALER" | "COMPANY"}
            isCollapsed={isCollapsed} 
            onToggle={toggleSidebar} 
          />
        </div>

        {/* Mobile Backdrop - visible only when sidebar is open on mobile */}
        {!isCollapsed && (
          <div
            onClick={toggleSidebar}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <Topbar isCollapsed={isCollapsed} onToggle={toggleSidebar} role={role} />

          {/* Page Content - Add padding-bottom on mobile for bottom nav */}
          <main className="flex-1 overflow-y-auto p-6 pb-24 md:pb-6">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </QuickActionsProvider>
  );
}

