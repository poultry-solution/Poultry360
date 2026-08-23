"use client";

import { useAuth } from "@/common/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function UniversalDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Redirect to role-specific dashboard
      if (user?.role === "OWNER" || user?.role === "MANAGER") {
        router.push("/farmer/dashboard/home");
      } else if (user?.role === "DOCTOR") {
        router.push("/doctor/dashboard");
      } else if (user?.role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/auth/login");
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  return <AppLoadingScreen message="Loading..." />;
}
