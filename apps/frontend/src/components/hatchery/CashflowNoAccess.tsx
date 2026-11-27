import { Lock } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";

/** Shown to hatchery staff who open Cash & Bank without the permission. */
export function CashflowNoAccess() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
        <Lock className="h-8 w-8 text-muted-foreground" />
        <p className="font-medium">You can&apos;t open Cash & Bank</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ask the owner to turn on &quot;Cash & Bank&quot; for your staff login. You can still pick Cash or Bank when you record a payment.
        </p>
      </CardContent>
    </Card>
  );
}
