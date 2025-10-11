"use client";

import { useAuth } from "@/common/store/store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/auth/login");
        return;
      }

      // Redirect non-farmer users to their appropriate dashboard
      if (user?.role === "DOCTOR") {
        router.push("/doctor/dashboard");
        return;
      }

      if (user?.role === "SUPER_ADMIN") {
        router.push("/admin/dashboard");
        return;
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <AppLoadingScreen message="Loading farmer dashboard..." />;
  }

  if (!isAuthenticated) {
    return <AppLoadingScreen message="Redirecting to login..." />;
  }

  return <div className="farmer-layout">{children}</div>;
}
