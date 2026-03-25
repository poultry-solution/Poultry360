import { Badge } from "@/common/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";

type Props = {
  title: string;
  subtitle: string;
  roleLabel: string;
  accountKindLabel: string;
  amountLine: string;
};

export function PaymentGateHeader({
  title,
  subtitle,
  roleLabel,
  accountKindLabel,
  amountLine,
}: Props) {
  return (
    <CardHeader className="space-y-1 pb-4">
      <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</CardTitle>
      <CardDescription className="text-base">{subtitle}</CardDescription>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 pt-2">
        <p className="text-sm text-muted-foreground">
          <span>{roleLabel} </span>
          <span className="font-medium text-foreground">{accountKindLabel}</span>
        </p>
        <Badge variant="outline" className="w-fit rounded-lg border-primary/25 bg-primary/5 px-3 py-1 text-sm font-medium">
          {amountLine}
        </Badge>
      </div>
    </CardHeader>
  );
}
