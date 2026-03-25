import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Gift, CreditCard, Loader2 } from "lucide-react";

type Props = {
  payTitle: string;
  payDescription: string;
  payButtonLabel: string;
  amountLine: string;
  trialTitle: string;
  trialDescription: string;
  trialCtaLabel: string;
  trialLoadingLabel: string;
  onSelectPay: () => void;
  onSelectTrial: () => void;
  trialLoading: boolean;
  trialDisabled: boolean;
};

export function PaymentChoiceCards({
  payTitle,
  payDescription,
  payButtonLabel,
  amountLine,
  trialTitle,
  trialDescription,
  trialCtaLabel,
  trialLoadingLabel,
  onSelectPay,
  onSelectTrial,
  trialLoading,
  trialDisabled,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="relative overflow-hidden border-primary/15 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/6 to-transparent"
        />
        <CardContent className="relative space-y-4 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CreditCard className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{payTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{payDescription}</p>
            <p className="text-sm font-medium text-foreground pt-1">{amountLine}</p>
          </div>
          <Button type="button" className="w-full rounded-xl" onClick={onSelectPay}>
            {payButtonLabel}
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-emerald-500/15 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/6 to-transparent"
        />
        <CardContent className="relative space-y-4 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
            <Gift className="h-5 w-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{trialTitle}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{trialDescription}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-emerald-500/30 hover:bg-emerald-500/5"
            onClick={onSelectTrial}
            disabled={trialLoading || trialDisabled}
          >
            {trialLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {trialLoadingLabel}
              </>
            ) : (
              trialCtaLabel
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
