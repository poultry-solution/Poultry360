"use client";

import StaffManagementPage from "@/components/staff/StaffManagementPage";
import { AccountFeatureGuard } from "@/components/features/AccountFeatureGuard";
import { ACCOUNT_FEATURE_KEYS } from "@/fetchers/accountFeatureQueries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useAuthStore } from "@/common/store/store";
import Link from "next/link";

function HatcheryStaffContent() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("HATCHERY_VIEW_STAFF_MANAGEMENT")) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardHeader><CardTitle>Staff management restricted</CardTitle><CardDescription>Your owner has not enabled access to staff salary records for this account.</CardDescription></CardHeader><CardContent><Link href="/hatchery/dashboard/home"><Button>Back to dashboard</Button></Link></CardContent></Card>;
  }
  return <StaffManagementPage owner="hatchery" titlePrefix="hatchery" />;
}

export default function HatcheryStaffPage() {
  return <AccountFeatureGuard featureKey={ACCOUNT_FEATURE_KEYS.HATCHERY_STAFF_OPERATIONS} fallbackHref="/hatchery/dashboard/home"><HatcheryStaffContent /></AccountFeatureGuard>;
}
