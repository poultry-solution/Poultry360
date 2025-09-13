"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/store";

interface AuthProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  fallback = <div>Loading...</div>,
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
    return <>{fallback}</>;
  }

  return <>{children}</>;
};