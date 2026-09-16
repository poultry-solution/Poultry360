"use client";

import Link from "next/link";
import { LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import {
  useAccountFeature,
  type AccountFeatureKey,
} from "@/fetchers/accountFeatureQueries";

interface AccountFeatureGuardProps {
  featureKey: AccountFeatureKey;
  children: React.ReactNode;
  fallbackHref: string;
}

export function AccountFeatureGuard({
  featureKey,
  children,
  fallbackHref,
}: AccountFeatureGuardProps) {
  const { feature, isEnabled, isLoading, isError, refetch } =
    useAccountFeature(featureKey);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking feature access...
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="py-10 text-center">
          <p className="font-medium">Could not verify feature access</p>
          <Button className="mt-4" variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isEnabled) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="py-10 text-center">
          <LockKeyhole className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold">
            {feature?.name ?? "Feature"} is not enabled
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact the administrator to enable this feature for your account.
          </p>
          <Button className="mt-5" variant="outline" asChild>
            <Link href={fallbackHref}>Return to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return children;
}
