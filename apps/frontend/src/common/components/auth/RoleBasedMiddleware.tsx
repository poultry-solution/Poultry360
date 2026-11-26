"use client";

import { useRoleBasedRouting } from "@/common/hooks/useRoleBasedRouting";

interface RoleBasedMiddlewareProps {
  children: React.ReactNode;
}

/**
 * Middleware component that automatically handles role-based routing.
 * Mounted high in the tree so the redirect effect fires on every route change.
 */
export const RoleBasedMiddleware: React.FC<RoleBasedMiddlewareProps> = ({ children }) => {
  useRoleBasedRouting();
  return <>{children}</>;
};

export default RoleBasedMiddleware;
