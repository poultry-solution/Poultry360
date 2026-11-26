"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import { AuthGuard } from "@/common/components/auth/AuthGuard";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  // Redirect to company dashboard if on root company path
  useEffect(() => {
    if (isAuthenticated && user && pathname === "/company") {
      router.push("/company/dashboard/home");
    }
  }, [isAuthenticated, user, pathname, router]);

  return (
    <AuthGuard
      requireAuth={true}
      allowedRoles={["OWNER", "COMPANY"]} // Phase 2A: Using OWNER role for companies until COMPANY role is properly configured
    >
      {children}
    </AuthGuard>
  );
}

