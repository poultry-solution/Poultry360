"use client";
import { useAuthStore } from "@/store/store";
import { usePathname } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<"MANAGER" | "OWNER" | "ADMIN">;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = <div>Loading...</div>,
  requireAuth = false,
  allowedRoles = ["OWNER", "MANAGER", "ADMIN"],
}) => {
  const { isAuthenticated, user, isInitialized, isLoading } = useAuthStore();
  const pathname = usePathname();

  // if path name starts with /dashboard then requireAuth should be true
  const needsAuth = requireAuth || pathname.startsWith("/dashboard");

  // Show loading while initializing or during auth operations
  if (!isInitialized || isLoading) {
    return <>{fallback}</>;
  }

  // If auth is required but user is not authenticated
  if (needsAuth && !isAuthenticated) {
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return <>{fallback}</>;
  }

  // Check role permissions for authenticated users
  if (needsAuth && isAuthenticated && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role as "MANAGER" | "OWNER" | "ADMIN")) {
      return <div>Access denied. Insufficient permissions.</div>;
    }
  }

  return <>{children}</>;
};
