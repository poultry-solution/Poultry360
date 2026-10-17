"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";
import { CashInHandView, type CashInHandApi } from "@/components/cash-in-hand/CashInHandView";
import {
  useAddFarmerCashMovement,
  useCloseFarmerCashDay,
  useDeleteFarmerCashMovement,
  useGetFarmerCashHistory,
  useGetFarmerCashToday,
  useSetupFarmerCashBook,
} from "@/fetchers/farmer/farmerCashInHandQueries";

const farmerCashApi: CashInHandApi = {
  apiBase: "/farmer/cash-in-hand",
  useToday: () => useGetFarmerCashToday(),
  useHistory: () => useGetFarmerCashHistory(),
  useSetup: useSetupFarmerCashBook,
  useAddMovement: useAddFarmerCashMovement,
  useDeleteMovement: useDeleteFarmerCashMovement,
  useCloseDay: useCloseFarmerCashDay,
};

export default function FarmerCashInHandPage() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("FARMER_VIEW_CASH_HISTORY")) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">Cash access restricted</h1>
          <p className="mt-2 text-sm text-gray-500">Your owner has not enabled cash-in-hand access for this staff account.</p>
        </CardContent>
      </Card>
    );
  }
  return <CashInHandView api={farmerCashApi} />;
}
