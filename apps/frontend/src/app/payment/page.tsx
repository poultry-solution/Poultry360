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

import {
  useGetOnboardingPaymentContext,
  useGetOnboardingPaymentHistory,
  useSubmitOnboardingPayment,
  type OnboardingPaymentSubmission,
} from "@/fetchers/onboarding/onboardingPaymentQueries";

import { Loader2 } from "lucide-react";
import Image from "next/image";

function formatAmount(amountNpr: number) {
  return `NPR ${Number(amountNpr).toLocaleString("en-US")}`;
}

export default function PaymentPage() {
  const { handleLoginRedirect } = useLoginRedirect();
  const { data: context, isLoading, refetch } = useGetOnboardingPaymentContext();
  const { data: historyData } = useGetOnboardingPaymentHistory();
  const submitMutation = useSubmitOnboardingPayment();
  const validateToken = useAuthStore((s) => s.validateToken);

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
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              State: {context.state}
            </Badge>
            <Badge variant="outline">
              Amount: {formatAmount(context.amountNpr)}
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
              <Image
  src="/payment-qr.png"
  alt="Poultry360 Onboarding Payment"
  width={320}
  height={320}
  className="w-full max-w-[320px] mx-auto border rounded"
/>
            
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

