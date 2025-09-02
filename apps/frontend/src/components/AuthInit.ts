"use client";

import { useAuthStore } from "@/store/store";
import { useEffect } from "react";

export const AuthInitializer = () => {
  const { initialize, isInitialized, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [initialize, isInitialized]);

  return {
    isInitialized,
    isLoading,
  };
};
