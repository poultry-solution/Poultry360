"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { crossPortAuth } from "@myapp/shared-auth";
import { useAuthStore } from "@/store/authStore";

export default function AuthSyncPage() {
  const router = useRouter();
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const syncAuth = async () => {
      // Handle auth data from URL parameter
      const authData = await crossPortAuth.handleAuthFromUrl();
      
      if (authData) {
        console.log("Auth data received from main app:", authData);
        // Initialize auth store with the received data
        await initialize();
        
        // Wait for authentication to be set up
        if (isAuthenticated) {
          router.push("/dashboard");
        }
      } else {
        console.log("No auth data, redirecting to main app login");
        // No auth data, redirect to main app login
        // window.location.href = "http://localhost:3000/auth/login";
      }
    };

    syncAuth();
  }, [router, initialize, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Syncing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
}
