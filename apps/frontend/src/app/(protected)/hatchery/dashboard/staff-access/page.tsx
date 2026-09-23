import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { StaffAccessPage } from "@/components/staff/StaffAccessPage";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function HatcheryStaffAccessPage() {
  return <AccountFeatureGuard featureKey={ACCOUNT_FEATURE_KEYS.HATCHERY_STAFF_OPERATIONS} fallbackHref="/hatchery/dashboard/home"><StaffAccessPage module="hatchery" /></AccountFeatureGuard>;
}
