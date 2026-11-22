"use client";

import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";
import { CashInHandView, type CashInHandApi } from "@/components/cash-in-hand/CashInHandView";
import {
  useAddCashMovement,
  useCloseCashDay,
  useDeleteCashMovement,
  useGetCashHistory,
  useGetCashToday,
  useSetupCashBook,
} from "@/fetchers/dealer/dealerCashInHandQueries";

const dealerCashApi: CashInHandApi = {
  apiBase: "/dealer/cash-in-hand",
  useToday: useGetCashToday,
  useHistory: useGetCashHistory,
  useSetup: useSetupCashBook,
  useAddMovement: useAddCashMovement,
  useDeleteMovement: useDeleteCashMovement,
  useCloseDay: useCloseCashDay,
};

export default function CashInHandPage() {
  return (
    <Card className="mx-auto mt-10 max-w-lg">
      <CardContent className="py-10 text-center">
        <h1 className="text-lg font-semibold">Cash in Hand is under maintenance</h1>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;re upgrading cash tracking across all modules. Please check back soon to use the new Cash in Hand.
        </p>
      </CardContent>
    </Card>
  );
}

// Preserved during Cash in Hand redesign. Swap this back into the default export
// (and delete the maintenance stub above) when the new behaviour ships.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CashInHandPageOriginal() {
  const user = useAuthStore((state) => state.user);
  const canUseCashInHand = !user?.isStaff || user.permissions?.includes("DEALER_VIEW_CASH_HISTORY");

  if (!canUseCashInHand) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">Cash in hand is hidden</h1>
          <p className="mt-2 text-sm text-gray-500">Ask the Feed Dealer owner to turn on Cash in hand for your staff login.</p>
        </CardContent>
      </Card>
    );
  }

  return <CashInHandView api={dealerCashApi} />;
}
