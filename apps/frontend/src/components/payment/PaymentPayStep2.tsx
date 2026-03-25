"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { ArrowLeft, Loader2 } from "lucide-react";

type Props = {
  stepIndicator: string;
  stepTitle: string;
  uploadReceiptLabel: string;
  uploadPlaceholder: string;
  notesOptionalLabel: string;
  notesPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  backLabel: string;
  receiptUrl: string;
  onReceiptChange: (url: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitPending: boolean;
  submitDisabled: boolean;
};

export function PaymentPayStep2({
  stepIndicator,
  stepTitle,
  uploadReceiptLabel,
  uploadPlaceholder,
  notesOptionalLabel,
  notesPlaceholder,
  submitLabel,
  submittingLabel,
  backLabel,
  receiptUrl,
  onReceiptChange,
  notes,
  onNotesChange,
  onSubmit,
  onBack,
  submitPending,
  submitDisabled,
}: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <Card className="border-primary/15 shadow-sm overflow-hidden">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stepIndicator}</p>
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground outline-none">
            {stepTitle}
          </h2>
        </div>

        <div className="space-y-2">
          <Label>{uploadReceiptLabel}</Label>
          <ImageUpload
            value={receiptUrl}
            onChange={onReceiptChange}
            folder="onboarding-payments"
            placeholder={uploadPlaceholder}
            disabled={submitPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-payment-notes">{notesOptionalLabel}</Label>
          <Textarea
            id="onboarding-payment-notes"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={notesPlaceholder}
            rows={3}
            className="rounded-xl resize-y min-h-[80px]"
          />
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:items-center pt-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            {backLabel}
          </Button>
          <Button type="button" className="rounded-xl sm:min-w-[180px]" onClick={onSubmit} disabled={submitDisabled}>
            {submitPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {submittingLabel}
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
