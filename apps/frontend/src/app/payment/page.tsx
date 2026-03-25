"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { toast } from "sonner";
import { useAuthStore } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";

import {
  useGetOnboardingPaymentContext,
  useGetOnboardingPaymentHistory,
  useSubmitOnboardingPayment,
  useStartOnboardingTrial,
  type OnboardingPaymentSubmission,
} from "@/fetchers/onboarding/onboardingPaymentQueries";

import { Loader2 } from "lucide-react";

function formatAmount(amountNpr: number) {
  return `NPR ${Number(amountNpr).toLocaleString("en-US")}`;
}

/** Human-readable label for onboarding payment (shown to users, not raw enum). */
function getOnboardingAccountLabel(userRole: string): string {
  switch (userRole) {
    case "OWNER":
      return "Layer/Broiler farmer";
    case "MANAGER":
      return "Farm manager";
    case "DEALER":
      return "Feed dealer";
    case "COMPANY":
      return "Company";
    case "DOCTOR":
      return "Doctor";
    case "SUPER_ADMIN":
      return "Administrator";
    default:
      return userRole;
  }
}

export default function PaymentPage() {
  const { handleLoginRedirect } = useLoginRedirect();
  const { data: context, isLoading, refetch } = useGetOnboardingPaymentContext();
  const { data: historyData } = useGetOnboardingPaymentHistory();
  const submitMutation = useSubmitOnboardingPayment();
  const startTrialMutation = useStartOnboardingTrial();
  const validateToken = useAuthStore((s) => s.validateToken);
  const { t } = useI18n();

  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  const submissions: OnboardingPaymentSubmission[] = useMemo(() => {
    return historyData?.submissions ?? [];
  }, [historyData]);

  useEffect(() => {
    // Reset local upload state when backend context changes state.
    // (For example, when user resubmits after rejection.)
    setReceiptUrl("");
    setNotes("");
  }, [context?.state]);

  const canUploadAndSubmit =
    context?.state === "PENDING_PAYMENT" ||
    context?.state === "PAYMENT_REJECTED";

  const canStartTrial =
    (context?.state === "PENDING_PAYMENT" ||
      context?.state === "PAYMENT_REJECTED") &&
    !context?.trialEndsAt;

  const formatTrialEndsAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const onSubmit = async () => {
    if (!receiptUrl) {
      toast.error("Please upload your payment receipt.");
      return;
    }
    try {
      await submitMutation.mutateAsync({
        receiptUrl,
        notes: notes.trim() || undefined,
      });
      // Context gets invalidated by react-query; just show optimistic UX.
      toast.success("Submitted successfully. Please wait for approval.");
    } catch (e) {
      // axiosInstance already toasts most errors; this is a fallback.
      toast.error("Failed to submit payment. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment onboarding</CardTitle>
            <CardDescription>We couldn’t load your payment onboarding info.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/auth/login" className="text-primary underline">
              Go to login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Payment to activate your account</CardTitle>
          <CardDescription>
            Complete your onboarding payment to get access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-3">
            <p className="text-sm">
              <span className="text-muted-foreground">You are activating: </span>
              <span className="font-medium text-foreground">
                {getOnboardingAccountLabel(context.userRole)}
              </span>
            </p>
            <Badge variant="outline" className="w-fit">
              Amount: {formatAmount(context.amountNpr)} per year
            </Badge>
          </div>

          {context.state === "PENDING_REVIEW" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your account is sent for approval. Usually it takes 3-4 hours.
              </p>
              <p className="text-sm">
                For faster onboarding call:{" "}
                <span className="font-medium">{context.qr.phoneDisplay}</span>
              </p>
              <div className="flex gap-2 flex-wrap pt-2">
                <Button type="button" variant="outline" onClick={() => refetch()}>
                  Refresh status
                </Button>
              </div>
            </div>
          )}

          {context.state === "PAYMENT_REJECTED" && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your payment was rejected. {context.rejectionReason ? "Reason:" : ""}
              </p>
              {context.rejectionReason && (
                <p className="text-sm">
                  <span className="font-medium">{context.rejectionReason}</span>
                </p>
              )}
            </div>
          )}

          {context.state !== "PAYMENT_APPROVED" &&
            context.trialActive &&
            context.trialEndsAt && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {t("onboardingPaymentTrial.trialActive")}
              </p>
              <p className="text-sm">
                {t("onboardingPaymentTrial.trialEndsAt", {
                  date: formatTrialEndsAt(context.trialEndsAt),
                })}
              </p>
            </div>
          )}

          {context.state === "PAYMENT_APPROVED" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Your payment has been approved. Your account is ready.
              </p>
              <Button
                type="button"
                onClick={async () => {
                  // Critical: refresh auth store onboarding/payment state
                  // so RoleBasedRouting guard doesn't redirect back to `/payment`.
                  await validateToken();
                  handleLoginRedirect(context.userRole);
                }}
              >
                Continue
              </Button>
            </div>
          )}

          {canUploadAndSubmit && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>QR / Payment details</Label>
                <p className="text-xs text-muted-foreground">
                  {context.qr.accountHint}
                </p>
              </div>
              <div className="space-y-2">
                {context.qr.qrImageUrl ? (
                  <img
                    src={context.qr.qrImageUrl}
                    alt={context.qr.qrText || "Poultry360 Onboarding Payment"}
                    className="w-full max-w-[320px] mx-auto border rounded"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    QR image is not configured yet. Please contact admin.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Upload payment receipt</Label>
                <ImageUpload
                  value={receiptUrl}
                  onChange={setReceiptUrl}
                  folder="onboarding-payments"
                  placeholder="Upload receipt image"
                  disabled={submitMutation.isPending}
                />
              </div>

              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. transaction id / bank reference"
                  rows={2}
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {canStartTrial && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={startTrialMutation.isPending || !!receiptUrl}
                    onClick={async () => {
                      try {
                        await startTrialMutation.mutateAsync();
                        await validateToken();
                        await refetch();
                        // Trial should unlock the app, so route user to dashboard immediately.
                        await handleLoginRedirect(context.userRole);
                        toast.success(
                          t("onboardingPaymentTrial.trialStartedSuccess")
                        );
                      } catch {
                        toast.error("Failed to start trial. Please try again.");
                      }
                    }}
                  >
                    {t("onboardingPaymentTrial.startTrialCta", {
                      days: context.trialDurationDays,
                    })}
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={submitMutation.isPending || !receiptUrl}
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit for approval"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

