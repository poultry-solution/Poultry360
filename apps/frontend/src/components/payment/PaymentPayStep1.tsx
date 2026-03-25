import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { ArrowLeft, ArrowRight } from "lucide-react";

type QrContext = {
  qrImageUrl: string | null;
  qrText: string;
  accountHint: string;
  phoneDisplay: string;
};

type Props = {
  stepIndicator: string;
  stepTitle: string;
  payInstructionsIntro: string;
  payBullet1: string;
  payBullet2: string;
  paymentDetailsLabel: string;
  continueLabel: string;
  backToOptionsLabel: string;
  qrAlt: string;
  qrMissing: string;
  qr: QrContext;
  supportPhoneLine: string | null;
  showBackToChoose: boolean;
  onContinue: () => void;
  onBackToChoose: () => void;
};

export function PaymentPayStep1({
  stepIndicator,
  stepTitle,
  payInstructionsIntro,
  payBullet1,
  payBullet2,
  paymentDetailsLabel,
  continueLabel,
  backToOptionsLabel,
  qrAlt,
  qrMissing,
  qr,
  supportPhoneLine,
  showBackToChoose,
  onContinue,
  onBackToChoose,
}: Props) {
  return (
    <Card className="border-primary/15 shadow-sm overflow-hidden">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stepIndicator}</p>
          <h2 className="text-lg font-semibold text-foreground">{stepTitle}</h2>
          <p className="text-sm text-muted-foreground">{payInstructionsIntro}</p>
        </div>

        <ul className="list-disc space-y-2 pl-5 text-sm text-foreground">
          <li>{payBullet1}</li>
          <li>{payBullet2}</li>
        </ul>

        <div className="space-y-2">
          <Label className="text-sm font-medium">{paymentDetailsLabel}</Label>
          {qr.accountHint ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{qr.accountHint}</p>
          ) : null}
          <div className="overflow-hidden rounded-xl border bg-muted/30 p-4">
            {qr.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr.qrImageUrl}
                alt={qrAlt}
                className="mx-auto w-full max-w-[280px] rounded-lg border bg-white shadow-sm"
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground py-6">{qrMissing}</p>
            )}
          </div>
          {supportPhoneLine ? (
            <p className="text-sm text-muted-foreground pt-1">{supportPhoneLine}</p>
          ) : null}
        </div>

        <div
          className={[
            "flex flex-col-reverse gap-2 sm:flex-row sm:items-center pt-2",
            showBackToChoose ? "sm:justify-between" : "sm:justify-end",
          ].join(" ")}
        >
          {showBackToChoose ? (
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl text-muted-foreground"
              onClick={onBackToChoose}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              {backToOptionsLabel}
            </Button>
          ) : null}
          <Button type="button" className="rounded-xl sm:min-w-[160px]" onClick={onContinue}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
