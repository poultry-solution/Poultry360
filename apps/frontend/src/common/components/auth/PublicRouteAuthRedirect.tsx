"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ROLE_ROUTES } from "@/common/hooks/useRoleBasedRouting";
import { useAuthStore } from "@/common/store/store";

export function PublicRouteAuthRedirect() {
  const router = useRouter();
  const { isInitialized, isLoading, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading || !isAuthenticated || !user) return;

    const targetRoute = ROLE_ROUTES[user.role]?.defaultRoute;
    if (!targetRoute) return;

    router.replace(targetRoute);
  }, [isAuthenticated, isInitialized, isLoading, router, user]);

  return null;
}
