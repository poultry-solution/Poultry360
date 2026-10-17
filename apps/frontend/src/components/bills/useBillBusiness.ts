import type { BillBusiness } from "@/components/bills/BillDocument";
import { useGetBillSettings } from "@/fetchers/billSettings/billSettingsQueries";

/** Business header for bills: Settings → Bill details, with a name to show until they load. */
export function useBillBusiness(fallbackName: string): BillBusiness {
  const { data } = useGetBillSettings();
  const details = data?.effective;
  return {
    name: details?.businessName || fallbackName,
    address: details?.address,
    phone: details?.phone,
    panNumber: details?.panNumber,
    footerNote: details?.footerNote,
  };
}
