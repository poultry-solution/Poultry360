"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CompanyPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to company dashboard home
    router.push("/company/dashboard/home");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to company dashboard...</p>
      </div>
    </div>
  );
}

