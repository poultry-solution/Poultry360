"use client";

import Link from "next/link";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { useAuthStore } from "@/common/store/store";
import { useGetOnboardingStatus } from "@/fetchers/onboarding/onboardingPaymentQueries";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

export default function AccountApprovalPage() {
  const { handleLoginRedirect } = useLoginRedirect();
  const { data: status, isLoading, refetch, isRefetching } =
    useGetOnboardingStatus();
  const validateToken = useAuthStore((s) => s.validateToken);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-muted/40 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 to-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-border/60 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-semibold">Couldn&apos;t load your account status</h1>
            <p className="text-sm text-muted-foreground">
              Please sign in again to continue.
            </p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/auth/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApproved = status.state === "PAYMENT_APPROVED";
  const isRejected = status.state === "PAYMENT_REJECTED";

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/35 via-background to-background py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-8 space-y-6">
            {isApproved ? (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700">
                  <CheckCircle2 className="h-7 w-7" aria-hidden />
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl font-bold">Your account is active</h1>
                  <p className="text-sm text-muted-foreground">
                    Your account has been approved. You now have full access.
                  </p>
                </div>
                <Button
                  className="rounded-xl"
                  onClick={async () => {
                    await validateToken();
                    handleLoginRedirect(status.userRole);
                  }}
                >
                  Continue to app
                </Button>
              </div>
            ) : isRejected ? (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                  <XCircle className="h-7 w-7" aria-hidden />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold">Account request declined</h1>
                  <p className="text-sm text-muted-foreground">
                    Your account request was not approved. Please reach out to us
                    to resolve this.
                  </p>
                  {status.rejectionReason ? (
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Reason: </span>
                      {status.rejectionReason}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  {isRefetching ? "Checking..." : "Refresh status"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700">
                  <Clock className="h-7 w-7" aria-hidden />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl font-bold">Account under review</h1>
                  <p className="text-sm text-muted-foreground">
                    Thanks for signing up! Your account is pending approval. Our
                    team will reach out to you shortly to set things up and
                    activate your account.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                >
                  {isRefetching ? "Checking..." : "Refresh status"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
