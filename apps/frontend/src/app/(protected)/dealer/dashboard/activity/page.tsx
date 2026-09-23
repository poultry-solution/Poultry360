import { BusinessActivityPage } from "@/components/audit/BusinessActivityPage";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function DealerActivityPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.DEALER_STAFF_OPERATIONS}
      fallbackHref="/dealer/dashboard/home"
    >
      <BusinessActivityPage scope="account" />
    </AccountFeatureGuard>
  );
}
