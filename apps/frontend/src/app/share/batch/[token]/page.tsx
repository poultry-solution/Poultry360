import type { Metadata } from "next";
import { SharedBatchReport } from "@/components/share/SharedBatchReport";

export const metadata: Metadata = {
  title: "Batch health report · Poultry360",
  description: "A farmer shared this batch's health and growth with you.",
  robots: { index: false, follow: false },
};

/**
 * Public batch report opened from a share link (no login).
 * The report is loaded in the browser so each viewer is rate-limited on their own address.
 */
export default async function SharedBatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <SharedBatchReport token={token} />;
}
