"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/store";
import { AuthLoadingScreen, AppLoadingScreen } from "@/components/ui/loading-screen";

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

  // Check if we're on auth pages (login/signup)
  const isAuthPage = pathname?.startsWith("/auth/");

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // On auth pages, always show children
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Show loading fallback during initialization
  if (!isInitialized || isLoading) {
    // Use custom fallback if provided, otherwise use appropriate loading screen
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return <AppLoadingScreen message="Initializing authentication..." />;
  }

  return <>{children}</>;
};