"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="flex h-screen bg-background relative">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      {/* Mobile Backdrop - visible only when sidebar is open */}
      {!isCollapsed && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
