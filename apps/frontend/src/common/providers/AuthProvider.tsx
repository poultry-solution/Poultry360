"use client";

import { ReactNode, useEffect } from "react";
import { useAuthStore } from "@/common/store/store";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

interface AuthProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  blockWhileInitializing?: boolean;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({
  children,
  fallback,
  blockWhileInitializing = true,
}) => {
  const { initialize, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  if (blockWhileInitializing && (!isInitialized || isLoading)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <AppLoadingScreen message="Initializing authentication..." />;
  }

  return <>{children}</>;
};
