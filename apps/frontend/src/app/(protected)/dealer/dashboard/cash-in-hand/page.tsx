import { permanentRedirect } from "next/navigation";

// The Dealer Cash in Hand flow is permanently retired — 308 so browsers,
// bookmarks, and search caches update the URL instead of re-querying.
export default function DealerCashInHandRedirect() {
  permanentRedirect("/dealer/dashboard/cashflow");
}
