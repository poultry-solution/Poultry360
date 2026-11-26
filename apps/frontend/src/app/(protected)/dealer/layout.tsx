"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import { AuthGuard } from "@/common/components/auth/AuthGuard";

export default function DealerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect to dealer dashboard if on root dealer path
  useEffect(() => {
    if (isAuthenticated && user && pathname === "/dealer") {
      router.push("/dealer/dashboard/home");
    }
  }, [isAuthenticated, user, pathname, router]);

  return (
    <AuthGuard
      requireAuth={true}
      allowedRoles={ ["DEALER"]} // Phase 2A: Using OWNER role for dealers until DEALER role is added to backend
    >
      {children}
    </AuthGuard>
  );
}

