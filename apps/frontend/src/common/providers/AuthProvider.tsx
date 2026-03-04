"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import {
  AuthLoadingScreen,
  AppLoadingScreen,
} from "@/common/components/ui/loading-screen";

interface AuthProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  fallback,
}) => {
  const { initialize, isInitialized, isLoading } = useAuthStore();
  const pathname = usePathname();

  // Check if we're on auth pages (login/signup) or public share pages
  const isAuthPage = pathname?.startsWith("/auth/");
  const isPublicSharePage = pathname?.startsWith("/share/");

  // Run initialize() only after Zustand persist has rehydrated from localStorage,
  // so the persisted accessToken is available and we don't rely on refresh cookie on first load (fixes prod redirect to login on refresh).
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      initialize();
    });
    // Fallback: if hydration already completed before we subscribed, initialize after a short delay.
    const fallback = setTimeout(() => {
      if (!useAuthStore.getState().isInitialized) {
        initialize();
      }
    }, 150);
    return () => {
      unsub?.();
      clearTimeout(fallback);
    };
  }, [initialize]);

  // Public share pages render immediately — no auth needed
  if (isPublicSharePage) {
    return <>{children}</>;
  }

  // Show loading fallback during initialization for all routes (including auth pages)
  // This prevents the login form from flashing before we know if user is already authenticated
  if (!isInitialized || isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <AppLoadingScreen message="Initializing authentication..." />;
  }

  return <>{children}</>;
};
