"use client";

import { AuthGuard } from "@/common/components/auth/AuthGuard";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { useState } from "react";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <AuthGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="SUPER_ADMIN" isCollapsed={isCollapsed} onToggle={handleToggle} />
        <div className="flex-1 flex flex-col">
          <Topbar role="SUPER_ADMIN" isCollapsed={isCollapsed} onToggle={handleToggle} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
