"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { crossPortAuth } from "@myapp/shared-auth";
import { useAuthStore } from "@/store/authStore";
import { AppLoadingScreen } from "@/components/loading-screen";

export default function AuthSyncPage() {
  const router = useRouter();
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const syncAuth = async () => {
      // Initialize auth store first
      await initialize();

      // Get the current auth state after initialization
      const authState = useAuthStore.getState();

      if (authState.isAuthenticated) {
        console.log("Authentication successful, redirecting to dashboard");
        router.push("/dashboard");
      } else {
        console.log("No authentication found, redirecting to main app login");
        // No auth data, redirect to main app login
        window.location.href = "http://localhost:3000/auth/login";
      }
    };

    syncAuth();
  }, [router, initialize]);

  if (isLoading) {
    return <AppLoadingScreen message="Syncing authentication..." />;
  }

  return <AppLoadingScreen message="Processing authentication..." />;
}
