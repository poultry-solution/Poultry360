import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Pricing from "@/components/landing/Pricing";
import ListForSaleSection from "@/components/landing/ListForSaleSection";
import Reviews from "@/components/landing/Reviews";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";
import { getPublishedLandingReviews } from "@/lib/reviews";

const siteUrl = "https://www.poultry360.org";

export const metadata: Metadata = {
  title: "Poultry Farm Management Software for Nepal | Poultry360",
  description:
    "Poultry360 helps broiler farms, layer farms, hatcheries, feed dealers, feed mills, and poultry vets in Nepal manage batches, inventory, sales, expenses, and performance in one system.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Poultry Farm Management Software for Nepal | Poultry360",
    description:
      "Manage broiler and layer farms, hatcheries, feed operations, and veterinary workflows with Poultry360.",
    url: siteUrl,
    siteName: "Poultry360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poultry Farm Management Software for Nepal | Poultry360",
    description:
      "Manage broiler and layer farms, hatcheries, feed operations, and veterinary workflows with Poultry360.",
  },
};

export default async function Home() {
  let initialReviews;

  try {
    initialReviews = await getPublishedLandingReviews(6);
  } catch (error) {
    console.error("Unable to load reviews during homepage render:", error);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Pricing />
      <ListForSaleSection />
      <Reviews initialReviews={initialReviews} />
      <Contact />
      <Footer />
    </div>
  );
}
