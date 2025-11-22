"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import { useRoleBasedRouting } from "@/common/hooks/useRoleBasedRouting";
import { AuthGuard } from "@/common/components/auth/AuthGuard";

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { isCheckingRoute } = useRoleBasedRouting();

  // Redirect to dealer dashboard if on root dealer path
  useEffect(() => {
    if (isAuthenticated && user && pathname === "/dealer") {
      router.push("/dealer/dashboard/home");
    }
  }, [isAuthenticated, user, pathname, router]);

  // Show loading while checking route
  if (isCheckingRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard
      requireAuth={true}
      allowedRoles={["OWNER", "MANAGER", "DEALER"]} // Phase 2A: Using OWNER role for dealers until DEALER role is added to backend
    >
      {children}
    </AuthGuard>
  );
}

