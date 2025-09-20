"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppLoadingScreen } from "@/components/loading-screen";

export default function Home() {
  const router = useRouter();
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await initialize();

      if (isAuthenticated) {
        router.push("/dashboard");
      } else {
        // Redirect to main app login since doctor frontend doesn't have its own login
        window.location.href = "http://localhost:3000/auth/login";
      }
    };

    initAuth();
  }, [initialize, isAuthenticated, router]);

  if (isLoading) {
    return (
        <AppLoadingScreen message="Initializing authentication..." />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-primary-foreground font-bold text-2xl">
            P360
          </span>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Poultry360 Doctor</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
