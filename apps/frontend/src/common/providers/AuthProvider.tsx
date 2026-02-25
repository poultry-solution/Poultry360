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

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

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
