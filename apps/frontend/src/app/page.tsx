"use client";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Reviews from "@/components/landing/Reviews";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";
import { AuthInitializer } from "@/components/AuthInit";

export default function Home() {
  const { isInitialized, isLoading } = AuthInitializer();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isInitialized) {
    return <div>Not initialized</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Reviews />
      <Contact />
      <Footer />
    </div>
  );
}
