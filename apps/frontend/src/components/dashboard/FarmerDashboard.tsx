"use client";

import { useAuth } from "@/common/store/store";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

// Import the existing farmer dashboard layout
// import DashboardLayout from "@/app/(farmer)/dashboard/layout";

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
          router.push("/dashboard"); // Will show doctor dashboard
        } else if (user?.role === "SUPER_ADMIN") {
          router.push("/dashboard"); // Will show admin dashboard
        } else {
          router.push("/auth/login");
        }
        return;
      }

      setIsReady(true);
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading || !isReady) {
    return (
      <AppLoadingScreen 
        message="Loading farmer dashboard..."
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <AppLoadingScreen 
        message="Redirecting to login..."
      />
    );
  }

  // Use the existing farmer dashboard layout
  return (
    <>
      {/* This will render the farmer dashboard content */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Farmer Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user?.name || "Farmer"}! Your existing farmer dashboard features are available.
        </p>
        {/* The existing farmer dashboard content will be rendered here */}
      </div>
    </>
  );
}
