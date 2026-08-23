"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ROLE_ROUTES } from "@/common/hooks/useRoleBasedRouting";
import { useAuthStore } from "@/common/store/store";

const redirectablePublicRoutes = new Set(["/", "/marketplace"]);

export function PublicRouteAuthRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isInitialized, isLoading, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading || !isAuthenticated || !user) return;
    if (!pathname || !redirectablePublicRoutes.has(pathname)) return;

    const targetRoute = ROLE_ROUTES[user.role]?.defaultRoute;
    if (!targetRoute) return;

    router.replace(targetRoute);
  }, [isAuthenticated, isInitialized, isLoading, pathname, router, user]);

  return null;
}
