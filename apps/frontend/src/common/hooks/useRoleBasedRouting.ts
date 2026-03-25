"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
// import { crossPortAuth } from "@myapp/shared-auth"; // Removed - no longer using shared packages

interface RoleRouteConfig {
  [key: string]: {
    basePath: string;
    defaultRoute: string;
    port?: number;
    isCrossPort?: boolean;
    allowedPaths?: string[];
  };
}

// Define role-based routing configuration
const ROLE_ROUTES: RoleRouteConfig = {
  DOCTOR: {
    basePath: "/doctor",
    defaultRoute: "/doctor/dashboard",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/doctor", "/auth", "/payment"],
  },
  OWNER: {
    basePath: "/farmer",
    defaultRoute: "/farmer/dashboard/home",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/farmer", "/auth", "/payment"],
  },
  MANAGER: {
    basePath: "/farmer",
    defaultRoute: "/farmer/dashboard/home",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/farmer", "/auth", "/payment"],
  },
  SUPER_ADMIN: {
    basePath: "/admin",
    defaultRoute: "/admin/dashboard",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/admin", "/auth", "/payment"],
  },
  DEALER: {
    basePath: "/dealer",
    defaultRoute: "/dealer/dashboard/home",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/dealer", "/auth", "/payment"],
  },
  COMPANY: {
    basePath: "/company",
    defaultRoute: "/company/dashboard/home",
    port: 3000,
    isCrossPort: false,
    allowedPaths: ["/company", "/auth", "/payment"],
  },
};


export const useRoleBasedRouting = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [isCheckingRoute, setIsCheckingRoute] = useState(false);

  const isTrialAccessActive = (trialEndsAt?: string | null): boolean => {
    if (!trialEndsAt) return false;
    const end = new Date(trialEndsAt).getTime();
    if (!Number.isFinite(end)) return false;
    return end > Date.now();
  };

  // Check if current path is allowed for user's role
  const isPathAllowed = (userRole: string, currentPath: string): boolean => {
    // Public share pages are always allowed
    if (currentPath.startsWith("/share/")) return true;
    const roleConfig = ROLE_ROUTES[userRole];
    if (!roleConfig) return false;

    // Check if path starts with any allowed base path
    return roleConfig.allowedPaths?.some(allowedPath => 
      currentPath.startsWith(allowedPath)
    ) || false;
  };

  // Navigate to role-appropriate dashboard
  const navigateToRoleDashboard = async (userRole: string) => {
    const roleConfig = ROLE_ROUTES[userRole];
    if (!roleConfig) {
      console.error(`Unknown role: ${userRole}`);
      router.push("/auth/login");
      return;
    }

    try {
      // Navigate to role-specific dashboard
      console.log(`🔄 Navigating ${userRole} to ${roleConfig.defaultRoute}`);
      router.push(roleConfig.defaultRoute);
    } catch (error) {
      console.error("Navigation error:", error);
      router.push("/auth/login");
    }
  };

  // Check and redirect if user is on wrong path
  const checkAndRedirect = async () => {
    if (!isAuthenticated || !user) return;

    const userRole = user.role;
    const roleConfig = ROLE_ROUTES[userRole];
    
    if (!roleConfig) {
      console.error(`Unknown role: ${userRole}`);
      return;
    }

    // Public share pages should never trigger redirects
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/share/")) {
      return;
    }

    // Payment-gated onboarding: force non-approved users onto `/payment`.
    const trialActive = isTrialAccessActive(user.onboardingPayment?.trialEndsAt);
    const isPaymentGateBlocking =
      user.onboardingPayment?.lockedUntilApproved &&
      user.onboardingPayment?.state !== "PAYMENT_APPROVED" &&
      (!trialActive || user.onboardingPayment?.state === "PENDING_REVIEW");

    if (isPaymentGateBlocking) {
      if (!pathname.startsWith("/payment")) {
        router.push("/payment");
        return;
      }
    }

    // If approved user somehow visits `/payment`, send them to role dashboard.
    if (
      pathname.startsWith("/payment") &&
      user.onboardingPayment?.state === "PAYMENT_APPROVED"
    ) {
      await navigateToRoleDashboard(userRole);
      return;
    }

    // Check if current path is allowed for this role
    if (!isPathAllowed(userRole, pathname)) {
      console.log(`🔄 Path ${pathname} not allowed for role ${userRole}, redirecting to role dashboard`);
      await navigateToRoleDashboard(userRole);
      return;
    }
  };

  // Auto-check routing on mount and when user/pathname changes
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsCheckingRoute(true);
      checkAndRedirect().finally(() => {
        setIsCheckingRoute(false);
      });
    }
  }, [isAuthenticated, user, pathname]);

  // When trial ends, proactively re-run the gate and redirect to `/payment`.
  // This avoids waiting for an API call to fail after the trial expires.
  useEffect(() => {
    if (!isAuthenticated || !user?.onboardingPayment?.trialEndsAt) return;
    if (user.onboardingPayment.state === "PAYMENT_APPROVED") return;

    const trialEnd = new Date(user.onboardingPayment.trialEndsAt).getTime();
    if (!Number.isFinite(trialEnd)) return;

    const delayMs = trialEnd - Date.now();
    if (delayMs <= 0) {
      if (!pathname.startsWith("/payment") && user.onboardingPayment?.lockedUntilApproved) {
        router.push("/payment");
      }
      return;
    }

    const timer = window.setTimeout(() => {
      const stillTrialActive = isTrialAccessActive(user.onboardingPayment?.trialEndsAt);
      if (stillTrialActive) return;

      if (
        !pathname.startsWith("/payment") &&
        user.onboardingPayment?.lockedUntilApproved &&
        user.onboardingPayment.state !== "PAYMENT_APPROVED"
      ) {
        router.push("/payment");
      }
    }, delayMs + 1000);

    return () => window.clearTimeout(timer);
  }, [
    isAuthenticated,
    user?.onboardingPayment?.trialEndsAt,
    user?.onboardingPayment?.lockedUntilApproved,
    user?.onboardingPayment?.state,
    pathname,
    router,
  ]);

  return {
    isCheckingRoute,
    navigateToRoleDashboard,
    isPathAllowed,
    checkAndRedirect,
    roleRoutes: ROLE_ROUTES,
  };
};

// Hook for handling login redirects
export const useLoginRedirect = () => {
  const { navigateToRoleDashboard } = useRoleBasedRouting();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleLoginRedirect = async (userRole: string) => {
    setIsRedirecting(true);
    try {
      await navigateToRoleDashboard(userRole);
    } catch (error) {
      console.error("Login redirect error:", error);
      setIsRedirecting(false);
    }
  };

  return {
    isRedirecting,
    handleLoginRedirect,
  };
};

// Hook for role-based navigation utilities
export const useRoleNavigation = () => {
  const { navigateToRoleDashboard } = useRoleBasedRouting();

  const getRoleDefaultRoute = (userRole: string): string => {
    const roleConfig = ROLE_ROUTES[userRole];
    return roleConfig?.defaultRoute || "/auth/login";
  };

  const isCrossPortRole = (userRole: string): boolean => {
    const roleConfig = ROLE_ROUTES[userRole];
    return roleConfig?.isCrossPort || false;
  };

  const getRolePort = (userRole: string): number | undefined => {
    const roleConfig = ROLE_ROUTES[userRole];
    return roleConfig?.port;
  };

  return {
    navigateToRoleDashboard,
    getRoleDefaultRoute,
    isCrossPortRole,
    getRolePort,
    roleRoutes: ROLE_ROUTES,
  };
};
