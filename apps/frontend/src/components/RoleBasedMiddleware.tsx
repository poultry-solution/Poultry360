"use client";

import { useEffect } from "react";
import { useRoleBasedRouting } from "@/hooks/useRoleBasedRouting";
import { AppLoadingScreen } from "@/components/ui/loading-screen";

interface RoleBasedMiddlewareProps {
  children: React.ReactNode;
}

/**
 * Middleware component that automatically handles role-based routing
 * This should be placed high in the component tree to catch all route changes
 */
export const RoleBasedMiddleware: React.FC<RoleBasedMiddlewareProps> = ({ children }) => {
  const { isCheckingRoute } = useRoleBasedRouting();

  // Show loading screen while checking routes
  if (isCheckingRoute) {
    return (
      <AppLoadingScreen 
        message="Checking permissions..."
      />
    );
  }

  return <>{children}</>;
};

export default RoleBasedMiddleware;
