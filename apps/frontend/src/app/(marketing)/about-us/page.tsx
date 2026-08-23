import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutStats } from "@/components/about/AboutStats";
import { WhyChooseUs } from "@/components/about/WhyChooseUs";
import { AboutCtaBanner } from "@/components/about/AboutCtaBanner";

export const metadata: Metadata = {
  title: "About Us | Livine Poultry Software | Poultry360",
  description:
    "Discover how Livine empowers poultry enterprises with cutting-edge SaaS software solutions tailored to streamline hatchery and poultry operations worldwide.",
  alternates: {
    canonical: "/about-us",
  },
};

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <Navbar />

      <main className="flex-grow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
          <AboutHero />
          <AboutStats />
          <WhyChooseUs />
          <AboutCtaBanner />
        </div>
      </main>

      <Footer />
    </div>
  );
}
