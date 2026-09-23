"use client";

import { BusinessActivityPage } from "@/components/audit/BusinessActivityPage";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";
import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";

function FarmerActivityContent() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardContent className="py-10 text-center"><h1 className="text-lg font-semibold">Owner access required</h1><p className="mt-2 text-sm text-muted-foreground">Staff accounts cannot view business activity history.</p></CardContent></Card>;
  }
  return <BusinessActivityPage scope="account" />;
}

export default function FarmerActivityPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.FARMER_STAFF_OPERATIONS}
      fallbackHref="/farmer/dashboard/home"
    >
      <FarmerActivityContent />
    </AccountFeatureGuard>
  );
}
