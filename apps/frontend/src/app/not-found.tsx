"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/common/store/store";
import { ROLE_ROUTES } from "@/common/hooks/useRoleBasedRouting";
import { Button } from "@/common/components/ui/button";

export default function NotFound() {
  const { isInitialized, isAuthenticated, user, initialize } = useAuthStore();

  // Root layout doesn't mount AuthProvider, so we self-initialize to learn
  // the user's role and show the right "go home" link.
  useEffect(() => {
    if (!isInitialized) {
      void initialize();
    }
  }, [isInitialized, initialize]);

  const home =
    isAuthenticated && user
      ? ROLE_ROUTES[user.role]?.defaultRoute ?? "/"
      : "/";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        404
      </p>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        Page not found
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link you followed may be broken, or the page may have been moved.
      </p>
      <Link href={home}>
        <Button className="mt-2">Go to dashboard</Button>
      </Link>
    </div>
  );
}
