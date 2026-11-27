import type { Metadata } from "next";
import { HatcherySharedBatchReport } from "@/components/share/hatchery/HatcherySharedBatchReport";

export const metadata: Metadata = {
  title: "Hatchery batch report · Poultry360",
  description: "A hatchery shared this batch's health, eggs and hatching with you.",
  robots: { index: false, follow: false },
};

/**
 * Public hatchery batch report opened from a share link (no login, no money).
 * Loaded in the browser so each viewer is rate-limited on their own address.
 */
export default async function SharedHatcheryBatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <HatcherySharedBatchReport token={token} />;
}
