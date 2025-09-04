"use client";

import { ReactNode, useEffect } from "react";
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

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  // While initializing/loading, show fallback
  if (!isInitialized || isLoading) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
