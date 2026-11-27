import type { Metadata } from "next";
import { HatcherySharedIncubationReport } from "@/components/share/hatchery/HatcherySharedIncubationReport";

export const metadata: Metadata = {
  title: "Incubation report · Poultry360",
  description: "A hatchery shared this incubation with you.",
  robots: { index: false, follow: false },
};

/** One incubation of a shared hatchery batch (no login, no money). */
export default async function SharedHatcheryIncubationPage({
  params,
}: {
  params: Promise<{ token: string; incubationId: string }>;
}) {
  const { token, incubationId } = await params;
  return <HatcherySharedIncubationReport token={token} incubationId={incubationId} />;
}
