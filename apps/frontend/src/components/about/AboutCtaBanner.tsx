"use client";

import Link from "next/link";
import { Button } from "@/common/components/ui/button";

export function AboutCtaBanner() {
  return (
    <section className="w-full py-12 sm:py-16 my-8">
      <div className="rounded-3xl bg-gradient-to-r from-primary/95 via-primary to-primary/80 p-8 sm:p-14 text-center text-white space-y-6 shadow-md">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight max-w-4xl mx-auto leading-snug">
          If you&apos;re unsure how to start, book a demo now and discover firsthand how Livine can empower your poultry enterprise to thrive in a competitive market landscape.
        </h2>

        <div className="pt-4 flex justify-center">
          <Button
            asChild
            className="bg-white text-primary hover:bg-slate-100 font-bold text-base px-8 py-6 rounded-lg shadow-sm"
          >
            <Link href="/contact">Book a demo</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
