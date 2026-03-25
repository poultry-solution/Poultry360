"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { toast } from "sonner";
import { useAuthStore } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";

import {
  useGetOnboardingPaymentContext,
  useSubmitOnboardingPayment,
  useStartOnboardingTrial,
} from "@/fetchers/onboarding/onboardingPaymentQueries";

import { Loader2 } from "lucide-react";
import { formatAmount } from "@/components/payment/onboardingPaymentUtils";
import { PaymentGateHeader } from "@/components/payment/PaymentGateHeader";
import { PaymentChoiceCards } from "@/components/payment/PaymentChoiceCards";
import { PaymentPayStep1 } from "@/components/payment/PaymentPayStep1";
import { PaymentPayStep2 } from "@/components/payment/PaymentPayStep2";
import {
  PaymentApprovedCard,
  PaymentPendingReviewCard,
  PaymentRejectedCard,
  TrialActiveBanner,
  TrialUnavailableBanner,
} from "@/components/payment/PaymentOnboardingStatus";

type PayFlowStep = "choose" | "instructions" | "upload";

export default function PaymentPage() {
  const { handleLoginRedirect } = useLoginRedirect();
  const { data: context, isLoading, refetch } = useGetOnboardingPaymentContext();
  const submitMutation = useSubmitOnboardingPayment();
  const startTrialMutation = useStartOnboardingTrial();
  const validateToken = useAuthStore((s) => s.validateToken);
  const { t } = useI18n();

  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [payFlowStep, setPayFlowStep] = useState<PayFlowStep>("choose");

  useEffect(() => {
    setReceiptUrl("");
    setNotes("");
    if (!context) return;
    const canTrial =
      (context.state === "PENDING_PAYMENT" || context.state === "PAYMENT_REJECTED") &&
      !context.trialEndsAt;
    setPayFlowStep(canTrial ? "choose" : "instructions");
  }, [context?.state, context?.trialEndsAt]);

  const canUploadAndSubmit =
    context?.state === "PENDING_PAYMENT" || context?.state === "PAYMENT_REJECTED";

  const canStartTrial =
    (context?.state === "PENDING_PAYMENT" || context?.state === "PAYMENT_REJECTED") &&
    !context?.trialEndsAt;

  /** Avoid empty first paint when trial is unavailable but state is still initial `choose`. */
  const resolvedPayStep: PayFlowStep =
    !canStartTrial && payFlowStep === "choose" ? "instructions" : payFlowStep;

  const formatTrialEndsAt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const accountKindLabel = context
    ? t(`onboardingPaymentFlow.roles.${context.userRole}`)
    : "";

  const onSubmit = async () => {
    if (!receiptUrl) {
      toast.error(t("onboardingPaymentFlow.toastReceiptRequired"));
      return;
    }
    try {
      await submitMutation.mutateAsync({
        receiptUrl,
        notes: notes.trim() || undefined,
      });
      toast.success(t("onboardingPaymentFlow.toastSubmitSuccess"));
    } catch {
      toast.error(t("onboardingPaymentFlow.toastSubmitError"));
    }
  };

  const handleBackToInstructions = () => {
    setReceiptUrl("");
    setNotes("");
    setPayFlowStep("instructions");
  };

  const handleBackToChoose = () => {
    setPayFlowStep("choose");
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-muted/40 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 to-background p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-border/60 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <h1 className="text-lg font-semibold">{t("onboardingPaymentFlow.loadErrorTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("onboardingPaymentFlow.loadErrorDescription")}</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/auth/login">{t("onboardingPaymentFlow.goToLogin")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountLine = t("onboardingPaymentFlow.amountPerYear", {
    amount: formatAmount(context.amountNpr),
  });

  const stepIndicator = (current: number) =>
    t("onboardingPaymentFlow.stepIndicator", { current, total: 2 });

  const supportPhoneLine = context.qr.phoneDisplay
    ? t("onboardingPaymentFlow.supportPhone", { phone: context.qr.phoneDisplay })
    : null;

  const qrAlt = context.qr.qrText || t("onboardingPaymentFlow.qrAlt");

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/35 via-background to-background py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-border/60 shadow-lg overflow-hidden">
          <PaymentGateHeader
            title={t("onboardingPaymentFlow.title")}
            subtitle={t("onboardingPaymentFlow.subtitle")}
            roleLabel={t("onboardingPaymentFlow.roleLabel")}
            accountKindLabel={accountKindLabel}
            amountLine={amountLine}
          />
          <CardContent className="space-y-6 px-6 pb-8 pt-0">
            {context.state === "PENDING_REVIEW" && (
              <PaymentPendingReviewCard
                body={t("onboardingPaymentFlow.pendingReviewBody")}
                callLine={t("onboardingPaymentFlow.pendingReviewCall")}
                phoneDisplay={context.qr.phoneDisplay}
                refreshLabel={t("onboardingPaymentFlow.refreshStatus")}
                onRefresh={() => refetch()}
              />
            )}

            {context.state === "PAYMENT_REJECTED" && (
              <PaymentRejectedCard
                title={t("onboardingPaymentFlow.rejectedTitle")}
                body={t("onboardingPaymentFlow.rejectedBody")}
                reasonLabel={t("onboardingPaymentFlow.rejectedReasonLabel")}
                reason={context.rejectionReason}
              />
            )}

            {context.state === "PAYMENT_APPROVED" && (
              <PaymentApprovedCard
                body={t("onboardingPaymentFlow.approvedBody")}
                continueLabel={t("onboardingPaymentFlow.continueToApp")}
                onContinue={async () => {
                  await validateToken();
                  handleLoginRedirect(context.userRole);
                }}
              />
            )}

            {context.state !== "PAYMENT_APPROVED" &&
              context.trialActive &&
              context.trialEndsAt && (
                <TrialActiveBanner
                  trialActiveLine={t("onboardingPaymentTrial.trialActive")}
                  trialEndsLine={t("onboardingPaymentTrial.trialEndsAt", {
                    date: formatTrialEndsAt(context.trialEndsAt),
                  })}
                />
              )}

            {canUploadAndSubmit && context.trialEndsAt && !canStartTrial && (
              <TrialUnavailableBanner message={t("onboardingPaymentFlow.trialUnavailable")} />
            )}

            {canUploadAndSubmit && (
              <div
                key={resolvedPayStep}
                className="animate-in fade-in duration-200"
              >
                {canStartTrial && resolvedPayStep === "choose" && (
                  <PaymentChoiceCards
                    payTitle={t("onboardingPaymentFlow.choicePayTitle")}
                    payDescription={t("onboardingPaymentFlow.choicePayDescription")}
                    payButtonLabel={t("onboardingPaymentFlow.choicePayButton")}
                    amountLine={amountLine}
                    trialTitle={t("onboardingPaymentFlow.choiceTrialTitle")}
                    trialDescription={t("onboardingPaymentFlow.choiceTrialDescription", {
                      days: context.trialDurationDays,
                    })}
                    trialCtaLabel={t("onboardingPaymentTrial.startTrialCta", {
                      days: context.trialDurationDays,
                    })}
                    trialLoadingLabel={t("onboardingPaymentFlow.trialLoading")}
                    onSelectPay={() => setPayFlowStep("instructions")}
                    onSelectTrial={async () => {
                      try {
                        await startTrialMutation.mutateAsync();
                        await validateToken();
                        await refetch();
                        await handleLoginRedirect(context.userRole);
                        toast.success(t("onboardingPaymentTrial.trialStartedSuccess"));
                      } catch {
                        toast.error(t("onboardingPaymentFlow.toastTrialError"));
                      }
                    }}
                    trialLoading={startTrialMutation.isPending}
                    trialDisabled={false}
                  />
                )}

                {resolvedPayStep === "instructions" && (
                  <PaymentPayStep1
                    stepIndicator={stepIndicator(1)}
                    stepTitle={t("onboardingPaymentFlow.stepPayTitle")}
                    payInstructionsIntro={t("onboardingPaymentFlow.payInstructionsIntro")}
                    payBullet1={t("onboardingPaymentFlow.payBullet1")}
                    payBullet2={t("onboardingPaymentFlow.payBullet2")}
                    paymentDetailsLabel={t("onboardingPaymentFlow.paymentDetailsLabel")}
                    continueLabel={t("onboardingPaymentFlow.continue")}
                    backToOptionsLabel={t("onboardingPaymentFlow.backToOptions")}
                    qrAlt={qrAlt}
                    qrMissing={t("onboardingPaymentFlow.qrMissing")}
                    qr={context.qr}
                    supportPhoneLine={supportPhoneLine}
                    showBackToChoose={canStartTrial}
                    onContinue={() => setPayFlowStep("upload")}
                    onBackToChoose={handleBackToChoose}
                  />
                )}

                {resolvedPayStep === "upload" && (
                  <PaymentPayStep2
                    stepIndicator={stepIndicator(2)}
                    stepTitle={t("onboardingPaymentFlow.stepUploadTitle")}
                    uploadReceiptLabel={t("onboardingPaymentFlow.uploadReceipt")}
                    uploadPlaceholder={t("onboardingPaymentFlow.uploadPlaceholder")}
                    notesOptionalLabel={t("onboardingPaymentFlow.notesOptional")}
                    notesPlaceholder={t("onboardingPaymentFlow.notesPlaceholder")}
                    submitLabel={t("onboardingPaymentFlow.submitForApproval")}
                    submittingLabel={t("onboardingPaymentFlow.submitting")}
                    backLabel={t("onboardingPaymentFlow.back")}
                    receiptUrl={receiptUrl}
                    onReceiptChange={setReceiptUrl}
                    notes={notes}
                    onNotesChange={setNotes}
                    onSubmit={onSubmit}
                    onBack={handleBackToInstructions}
                    submitPending={submitMutation.isPending}
                    submitDisabled={submitMutation.isPending || !receiptUrl}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
