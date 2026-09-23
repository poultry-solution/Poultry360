import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { StaffAccessPage } from "@/components/staff/StaffAccessPage";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";

export default function CompanyStaffAccessPage() {
  return (
    <AccountFeatureGuard
      featureKey={ACCOUNT_FEATURE_KEYS.COMPANY_STAFF_OPERATIONS}
      fallbackHref="/company/dashboard/home"
    >
      <StaffAccessPage module="company" />
    </AccountFeatureGuard>
  );
}
