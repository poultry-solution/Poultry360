import type { Metadata } from "next";

const siteUrl = "https://poultry360.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Marketplace | Poultry360",
  description:
    "Browse live poultry listings across Nepal on Poultry360's marketplace.",
  alternates: {
    canonical: "/marketplace",
  },
  openGraph: {
    title: "Marketplace | Poultry360",
    description:
      "Browse live poultry listings across Nepal on Poultry360's marketplace.",
    url: `${siteUrl}/marketplace`,
    siteName: "Poultry360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Marketplace | Poultry360",
    description:
      "Browse live poultry listings across Nepal on Poultry360's marketplace.",
  },
};

export default function MarketplaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
