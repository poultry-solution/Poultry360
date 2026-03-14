"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/common/store/store";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ListForSaleSection from "@/components/landing/ListForSaleSection";
import Features from "@/components/landing/Features";
import Reviews from "@/components/landing/Reviews";
import Contact from "@/components/landing/Contact";
import Footer from "@/components/landing/Footer";

export default function Home() {
  const router = useRouter();
  const { isInitialized, isLoading, isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!isAuthenticated || !user) return;

    // Redirect logged-in users to their role dashboard
    const role = user.role;
    if (role === "OWNER" || role === "MANAGER") {
      router.replace("/farmer/dashboard/home");
    } else if (role === "DOCTOR") {
      router.replace("/doctor/dashboard");
    } else if (role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
    } else if (role === "DEALER") {
      router.replace("/dealer/dashboard/home");
    } else if (role === "COMPANY") {
      router.replace("/company/dashboard/home");
    }
  }, [isInitialized, isLoading, isAuthenticated, user, router]);

  // Show loading while auth is initializing (avoids flashing landing then redirect)
  if (!isInitialized || isLoading) {
    return <AppLoadingScreen message="Initializing authentication..." />;
  }

  // If authenticated, show loading until redirect completes
  if (isAuthenticated && user) {
    const role = user.role;
    const hasRedirect =
      role === "OWNER" ||
      role === "MANAGER" ||
      role === "DOCTOR" ||
      role === "SUPER_ADMIN" ||
      role === "DEALER" ||
      role === "COMPANY";
    if (hasRedirect) {
      return <AppLoadingScreen message="Taking you to your dashboard..." />;
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ListForSaleSection />
      <Features />
      <Reviews />
      <Contact />
      <Footer />
    </div>
  );
}