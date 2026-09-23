"use client";

import Link from "next/link";
import StaffManagementPage from "@/components/staff/StaffManagementPage";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useAuthStore } from "@/common/store/store";

function CompanyStaffContent() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("COMPANY_VIEW_STAFF_MANAGEMENT")) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardHeader><CardTitle>Staff management restricted</CardTitle><CardDescription>Your owner has not enabled access to staff salary records for this account.</CardDescription></CardHeader><CardContent><Link href="/company/dashboard/home"><Button>Back to dashboard</Button></Link></CardContent></Card>;
  }
  return <StaffManagementPage owner="company" titlePrefix="company" />;
}

export default function CompanyStaffPage() {
  return <AccountFeatureGuard featureKey={ACCOUNT_FEATURE_KEYS.COMPANY_STAFF_OPERATIONS} fallbackHref="/company/dashboard/home"><CompanyStaffContent /></AccountFeatureGuard>;
}
