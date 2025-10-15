"use client";
import { useAuthStore } from "@/common/store/store";
import { usePathname } from "next/navigation";
import { AuthLoadingScreen, AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { RoleBasedRedirect } from "@/common/components/auth/RoleBasedRedirect";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<"MANAGER" | "OWNER" | "SUPER_ADMIN" | "DOCTOR">;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = false,
  allowedRoles = ["OWNER", "MANAGER", "SUPER_ADMIN", "DOCTOR"],
}) => {
  const { isAuthenticated, user, isInitialized, isLoading } = useAuthStore();
  const pathname = usePathname();

  // Check if path requires authentication (role-specific paths or explicit dashboard)
  const needsAuth = requireAuth || 
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/farmer") || 
    pathname.startsWith("/doctor") || 
    pathname.startsWith("/admin");

  // Show loading while initializing or during auth operations
  if (!isInitialized || isLoading) {
    // Use custom fallback if provided, otherwise use appropriate loading screen
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Show different loading screens based on context
    if (needsAuth) {
      return <AuthLoadingScreen message="Verifying authentication..." />;
    }
    
    return <AppLoadingScreen message="Initializing application..." />;
  }

  // If auth is required but user is not authenticated
  if (needsAuth && !isAuthenticated) {
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
    return <AuthLoadingScreen message="Redirecting to login..." />;
  }

  // Check role permissions for authenticated users
  if (needsAuth && isAuthenticated && allowedRoles.length > 0 && user) {
    if (!allowedRoles.includes(user.role as "MANAGER" | "OWNER" | "SUPER_ADMIN" | "DOCTOR")) {
      // Instead of showing an error screen, gracefully redirect to the appropriate dashboard
      return (
        <RoleBasedRedirect
          userRole={user.role}
          currentPath={pathname}
          allowedRoles={allowedRoles}
          onRedirectComplete={() => {
            // This will be called if the user actually has permission
            // (shouldn't happen in this case, but good to have)
          }}
        />
      );
    }
  }

  return <>{children}</>;
};
