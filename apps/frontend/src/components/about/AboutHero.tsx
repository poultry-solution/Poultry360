"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ArrowRight } from "lucide-react";

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
          About <span className="text-primary font-bold">Livine</span>
        </h1>

        <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed w-full font-normal">
          Welcome to Livine, your trusted partner in poultry management since 2009. At Livine, we specialize in providing cutting-edge SaaS software solutions tailored to streamline hatchery and poultry operations worldwide. Livine&apos;s platform streamlines every aspect of your poultry business, from flock monitoring to feed management and beyond. With features like automated data tracking and real-time insights, you&apos;ll have everything you need to optimize productivity and profitability.
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
            Since 2009, Livine has propelled large poultry enterprises in India, the Middle East, and Southeast Asia with innovative solutions. Our team of poultry and technology experts collaborates to deliver transformative results, ensuring your enterprise achieves peak efficiency and productivity.
          </p>

          <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed">
            Partner today and say goodbye to the hassle with Livine&apos;s advanced poultry management software!
          </p>

          <div className="pt-2">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-base font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              Book a demo <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Right Column: Large Rounded Card with Illustration */}
        <div className="lg:col-span-6">
          <div className="relative w-full aspect-[4/3] rounded-3xl bg-[#F8FAFC] border border-slate-100 overflow-hidden flex items-center justify-center p-6 sm:p-10 shadow-xs">
            <Image
              src="/about-illustration.png"
              alt="Poultry Operations Dashboard Illustration"
              fill
              priority
              className="object-contain p-6"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
