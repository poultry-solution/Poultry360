"use client";

import StaffManagementPage from "@/components/staff/StaffManagementPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import Link from "next/link";
import { useAuthStore } from "@/common/store/store";

export default function DealerStaffPage() {
  const user = useAuthStore((state) => state.user);
  const canViewStaffManagement = !user?.isStaff || user.permissions?.includes("DEALER_VIEW_STAFF_MANAGEMENT");
  if (!canViewStaffManagement) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardHeader><CardTitle>Staff management restricted</CardTitle><CardDescription>Your owner has not enabled access to staff salary records for this account.</CardDescription></CardHeader><CardContent><Link href="/dealer/dashboard/home"><Button>Back to dashboard</Button></Link></CardContent></Card>;
  }
  return <StaffManagementPage owner="dealer" titlePrefix="dealer" />;
}
