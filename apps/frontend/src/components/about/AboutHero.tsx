"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { AboutBookDemoButton } from "@/components/about/AboutBookDemoButton";

export function AboutHero() {
  return (
    <section className="w-full">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6 font-normal">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-700 font-medium">About Us</span>
      </nav>

      {/* Top Header */}
      <div className="space-y-4 mb-12 sm:mb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-slate-900 leading-tight">
          About <span className="text-primary font-bold">Poultry360</span>
        </h1>

        <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed w-full font-normal">
          Poultry360 is a Nepal-focused poultry management platform built to help digitize the country&apos;s poultry ecosystem. We started building the product in 2025 and launched in January 2026 with a clear goal: give poultry farms, hatcheries, feed dealers, and related businesses one practical system to manage operations, records, inventory, sales, and performance with confidence.
        </p>
      </div>

      {/* Hero Sub-section Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Operations Made Simple */}
        <div className="lg:col-span-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-slate-900 leading-tight tracking-tight">
            Your Poultry Operations Made{" "}
            <span className="text-primary font-bold">Simple, Efficient, Profitable</span>
          </h2>

          <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed">
            Poultry360 is designed around the real workflows of Nepal&apos;s poultry industry. From broiler and layer farms to hatchery operations, feed distribution, and business coordination, we are building software that reduces manual work, improves visibility, and helps poultry businesses make faster and better decisions every day.
          </p>

          <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed">
            Our mission is to move the poultry sector away from scattered notebooks and disconnected spreadsheets toward a modern, connected operating system built for growth in Nepal.
          </p>

          <div className="pt-2">
            <AboutBookDemoButton
              className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-base font-semibold text-primary transition-colors hover:bg-primary/5"
            />
          </div>
        </div>

        {/* Right Column: Large Rounded Card with Illustration */}
        <div className="lg:col-span-6">
          <div className="relative w-full aspect-[4/3] rounded-3xl border border-slate-100 overflow-hidden bg-white shadow-xs">
            <Image
              src="/about-us-hero.png"
              alt="Poultry360 poultry management illustration"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
