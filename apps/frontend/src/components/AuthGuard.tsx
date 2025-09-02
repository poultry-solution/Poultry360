import { useAuthStore } from "@/store/store";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<"MANAGER" | "OWNER" | "ADMIN">;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = <div>Loading...</div>,
  requireAuth = true,
  allowedRoles = [],
}) => {
  const { isAuthenticated, user, isInitialized, isLoading } = useAuthStore();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return <>{fallback}</>;
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Redirect to login page or show login form
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <>{fallback}</>;
  }

  // Check role permissions
  if (requireAuth && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role as "MANAGER" | "OWNER" | "ADMIN")) {
      return <div>Access denied. Insufficient permissions.</div>;
    }
  }

  return <>{children}</>;
};
