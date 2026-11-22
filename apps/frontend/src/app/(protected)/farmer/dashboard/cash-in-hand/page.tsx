import { permanentRedirect } from "next/navigation";

// The Farmer Cash in Hand flow is permanently retired — 308 so browsers,
// bookmarks, and search caches update the URL instead of re-querying.
export default function FarmerCashInHandRedirect() {
  permanentRedirect("/farmer/dashboard/cashflow");
}
