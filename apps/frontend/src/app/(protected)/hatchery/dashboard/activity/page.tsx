import { BusinessActivityPage } from "@/components/audit/BusinessActivityPage";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function HatcheryActivityPage() {
  return <AccountFeatureGuard featureKey={ACCOUNT_FEATURE_KEYS.HATCHERY_STAFF_OPERATIONS} fallbackHref="/hatchery/dashboard/home"><BusinessActivityPage scope="account" /></AccountFeatureGuard>;
}
