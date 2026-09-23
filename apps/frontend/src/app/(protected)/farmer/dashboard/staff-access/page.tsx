import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { StaffAccessPage } from "@/components/staff/StaffAccessPage";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function FarmerStaffAccessPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.FARMER_STAFF_OPERATIONS}
      fallbackHref="/farmer/dashboard/home"
    >
      <StaffAccessPage module="farmer" />
    </AccountFeatureGuard>
  );
}
