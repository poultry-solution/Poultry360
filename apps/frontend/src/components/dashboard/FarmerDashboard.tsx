"use client";

import { useAuth } from "@/common/store/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function FarmerDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Check if user has farmer role
      if (user?.role !== "OWNER" && user?.role !== "MANAGER") {
        // Redirect to appropriate dashboard
        if (user?.role === "DOCTOR") {
          router.push("/doctor/dashboard");
        } else if (user?.role === "SUPER_ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/auth/login");
        }
        return;
      }

      setIsReady(true);
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading || !isReady) {
    return <AppLoadingScreen message="Loading farmer dashboard..." />;
  }

  if (!isAuthenticated) {
    return <AppLoadingScreen message="Redirecting to login..." />;
  }

  // Instead of redirecting, show a simple farmer dashboard
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Farmer Dashboard</h1>
      <p className="text-gray-600 mb-4">
        Welcome back, {user?.name || "Farmer"}!
      </p>
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold text-blue-900">Quick Actions</h2>
          <p className="text-blue-700">Access your farmer tools and features</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-semibold text-green-900">Your Farms</h2>
          <p className="text-green-700">Manage your poultry farms and batches</p>
        </div>
      </div>
    </div>
  );
}
