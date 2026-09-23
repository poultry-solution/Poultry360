import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { StaffAccessPage } from "@/components/staff/StaffAccessPage";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function DealerStaffAccessPage() {
  return <AccountFeatureGuard featureKey={ACCOUNT_FEATURE_KEYS.DEALER_STAFF_OPERATIONS} fallbackHref="/dealer/dashboard/home"><StaffAccessPage module="dealer" /></AccountFeatureGuard>;
}
