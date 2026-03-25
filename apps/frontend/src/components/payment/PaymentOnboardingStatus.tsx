import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

type PendingProps = {
  body: string;
  callLine: string;
  phoneDisplay: string;
  refreshLabel: string;
  onRefresh: () => void;
};

export function PaymentPendingReviewCard({
  body,
  callLine,
  phoneDisplay,
  refreshLabel,
  onRefresh,
}: PendingProps) {
  return (
    <Card className="border-amber-500/20 bg-amber-500/[0.03] shadow-sm">
      <CardContent className="flex gap-4 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
          <Clock className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-3 flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">{callLine} </span>
            <span className="font-semibold text-foreground">{phoneDisplay}</span>
          </p>
          <Button type="button" variant="outline" className="rounded-xl" onClick={onRefresh}>
            {refreshLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type RejectedProps = {
  title: string;
  body: string;
  reasonLabel: string;
  reason?: string | null;
};

export function PaymentRejectedCard({ title, body, reasonLabel, reason }: RejectedProps) {
  return (
    <Card className="border-destructive/25 bg-destructive/[0.03] shadow-sm">
      <CardContent className="flex gap-4 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <XCircle className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          {reason ? (
            <p className="text-sm text-foreground">
              <span className="font-medium">{reasonLabel} </span>
              {reason}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

type ApprovedProps = {
  body: string;
  continueLabel: string;
  onContinue: () => void;
};

export function PaymentApprovedCard({ body, continueLabel, onContinue }: ApprovedProps) {
  return (
    <Card className="border-emerald-500/25 bg-emerald-500/[0.04] shadow-sm">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pt-1">{body}</p>
        </div>
        <Button type="button" className="rounded-xl shrink-0" onClick={onContinue}>
          {continueLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

type TrialBannerProps = {
  trialActiveLine: string;
  trialEndsLine: string;
};

export function TrialActiveBanner({ trialActiveLine, trialEndsLine }: TrialBannerProps) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3 text-sm">
      <p className="font-medium text-emerald-900 dark:text-emerald-100">{trialActiveLine}</p>
      <p className="text-muted-foreground mt-1">{trialEndsLine}</p>
    </div>
  );
}

type TrialUnavailableProps = {
  message: string;
};

export function TrialUnavailableBanner({ message }: TrialUnavailableProps) {
  return (
    <div className="rounded-xl border border-muted-foreground/20 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
