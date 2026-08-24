"use client";

import Image from "next/image";

export function AboutStats() {
  return (
    <section className="w-full py-16 sm:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
        {/* Left Column: Image Illustration Card */}
        <div className="lg:col-span-6">
          <div className="relative w-full aspect-[4/3] rounded-3xl bg-[#F8FAFC] border border-slate-100 overflow-hidden flex items-center justify-center p-6 sm:p-10 shadow-xs">
            <Image
              src="/about-us/number-section-about-us.png"
              alt="Poultry360 journey illustration"
              fill
              className="object-contain p-6"
            />
          </div>
        </div>

        {/* Right Column: Numbers and Stats */}
        <div className="lg:col-span-6 space-y-6">
          <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Numbers
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-semibold text-slate-900 leading-tight tracking-tight">
            We&apos;re building the digital foundation for what comes next
          </h2>

          <div className="grid grid-cols-2 gap-y-8 gap-x-6 pt-4">
            <div>
              <div className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
                2025
              </div>
              <div className="mt-2 font-semibold text-slate-900 text-base">
                Product development started
              </div>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
                Jan 2026
              </div>
              <div className="mt-2 font-semibold text-slate-900 text-base">
                Public launch
              </div>
            </div>

            <div className="col-span-2 pt-2">
              <div className="text-4xl sm:text-5xl font-bold text-primary tracking-tight">
                Nepal-first
              </div>
              <div className="mt-2 font-semibold text-slate-900 text-base">
                Built to digitize the poultry ecosystem
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
