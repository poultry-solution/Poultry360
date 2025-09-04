"use client";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Reviews from "@/components/landing/Reviews";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function Home() {


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
