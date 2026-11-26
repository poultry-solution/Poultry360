"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import { ROLE_ROUTES } from "@/common/hooks/useRoleBasedRouting";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function NotFound() {
  const router = useRouter();
  const { isInitialized, isAuthenticated, user, initialize } = useAuthStore();

  // Root layout doesn't mount AuthProvider, so we self-initialize here.
  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (!isInitialized) return;

    if (isAuthenticated && user) {
      const target = ROLE_ROUTES[user.role]?.defaultRoute ?? "/";
      router.replace(target);
    } else {
      router.replace("/");
    }
  }, [isInitialized, isAuthenticated, user, router]);

  return <AppLoadingScreen message="Page not found — redirecting you home..." />;
}
