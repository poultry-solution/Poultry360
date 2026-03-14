"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

interface RoleBasedRedirectProps {
  userRole: string;
  currentPath: string;
  allowedRoles: string[];
  onRedirectComplete?: () => void;
}

interface RoleRouteConfig {
  [key: string]: {
    basePath: string;
    defaultRoute: string;
    port?: number;
    isCrossPort?: boolean;
  };
}

// Define role-based routing configuration
const ROLE_ROUTES: RoleRouteConfig = {
  DOCTOR: {
    basePath: "/doctor",
    defaultRoute: "/doctor/dashboard",
    port: 3000,
    isCrossPort: false,
  },
  OWNER: {
    basePath: "/farmer",
    defaultRoute: "/farmer/dashboard/home",
    port: 3000,
    isCrossPort: false,
  },
  MANAGER: {
    basePath: "/farmer",
    defaultRoute: "/farmer/dashboard/home",
    port: 3000,
    isCrossPort: false,
  },
  DEALER: {
    basePath: "/dealer",
    defaultRoute: "/dealer/dashboard/home",
    port: 3000,
    isCrossPort: false,
  },
  SUPER_ADMIN: {
    basePath: "/admin",
    defaultRoute: "/admin/dashboard",
    port: 3000,
    isCrossPort: false,
  },
};

export const RoleBasedRedirect: React.FC<RoleBasedRedirectProps> = ({
  userRole,
  currentPath,
  allowedRoles,
  onRedirectComplete,
}) => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState("");

  useEffect(() => {
    const handleRedirect = async () => {
      setIsRedirecting(true);

      try {
        const roleConfig = ROLE_ROUTES[userRole];

        if (!roleConfig) {
          console.error(`Unknown role: ${userRole}`);
          setRedirectMessage("Unknown user role. Redirecting to login...");
          setTimeout(() => {
            router.push("/auth/login");
          }, 2000);
          return;
        }

        // Check if user is trying to access a path they're not allowed to
        const isAccessingRestrictedPath = !allowedRoles.includes(userRole);

        if (isAccessingRestrictedPath) {
          setRedirectMessage(
            `Redirecting to ${userRole.toLowerCase()} dashboard...`
          );

          // Small delay to show the message
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Redirect to role-specific dashboard
          console.log(
            `🔄 Redirecting ${userRole} to ${roleConfig.defaultRoute}`
          );
          router.push(roleConfig.defaultRoute);
        } else {
          // User has permission, no redirect needed
          setIsRedirecting(false);
          onRedirectComplete?.();
        }
      } catch (error) {
        console.error("Error during role-based redirect:", error);
        setRedirectMessage("Redirect failed. Going to login...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      }
    };

    handleRedirect();
  }, [userRole, currentPath, allowedRoles, router, onRedirectComplete]);

  if (isRedirecting) {
    return (
      <AppLoadingScreen
        message={redirectMessage || `Redirecting ${userRole.toLowerCase()}...`}
      />
    );
  }

  return null;
};

// Hook for role-based navigation
export const useRoleBasedNavigation = () => {
  const router = useRouter();

  const navigateBasedOnRole = async (
    userRole: string,
    fallbackPath?: string
  ) => {
    const roleConfig = ROLE_ROUTES[userRole];

    if (!roleConfig) {
      console.error(`Unknown role: ${userRole}`);
      router.push(fallbackPath || "/auth/login");
      return;
    }

    try {
      // Navigate to role-specific dashboard
      console.log(`🔄 Navigating ${userRole} to ${roleConfig.defaultRoute}`);
      router.push(roleConfig.defaultRoute);
    } catch (error) {
      console.error("Navigation error:", error);
      router.push(fallbackPath || "/auth/login");
    }
  };

  const getRoleDefaultRoute = (userRole: string): string => {
    const roleConfig = ROLE_ROUTES[userRole];
    return roleConfig?.defaultRoute || "/auth/login";
  };

  const isCrossPortRole = (userRole: string): boolean => {
    const roleConfig = ROLE_ROUTES[userRole];
    return roleConfig?.isCrossPort || false;
  };

  return {
    navigateBasedOnRole,
    getRoleDefaultRoute,
    isCrossPortRole,
    roleRoutes: ROLE_ROUTES,
  };
};

// Component for handling login redirects
export const LoginRedirectHandler: React.FC<{ userRole: string }> = ({
  userRole,
}) => {
  const { navigateBasedOnRole } = useRoleBasedNavigation();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const handleLoginRedirect = async () => {
      try {
        await navigateBasedOnRole(userRole);
      } catch (error) {
        console.error("Login redirect error:", error);
        setIsRedirecting(false);
      }
    };

    handleLoginRedirect();
  }, [userRole, navigateBasedOnRole]);

  if (isRedirecting) {
    return (
      <AppLoadingScreen
        message={`Welcome ${userRole.toLowerCase()}! Redirecting to your dashboard...\nPoultry360\nSmart Poultry Management System`}
      />
    );
  }

  return null;
};

export default RoleBasedRedirect;
