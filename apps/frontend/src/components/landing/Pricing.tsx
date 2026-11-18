"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils";
import BookDemoModal from "@/components/landing/BookDemoModal";
import { landingModules } from "@/content/landingModules";

export default function Modules() {
  const [activeId, setActiveId] = useState(landingModules[0].id);
  const [bookDemoOpen, setBookDemoOpen] = useState(false);

  const active = landingModules.find((m) => m.id === activeId) ?? landingModules[0];
  const Icon = active.icon;

  return (
    <section id="modules" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mb-8 text-center lg:mb-10">
          <Badge className="mb-4 rounded-full bg-primary px-4 py-2 text-primary-foreground">Modules</Badge>
          <h2 className="mb-3 text-3xl font-bold text-gray-900 lg:text-4xl">Built for every role in the poultry chain</h2>
          <p className="mx-auto max-w-lg text-gray-500">Choose your business. See what you get.</p>
        </div>

        {/* Role picker: a grid on phones (all roles visible), one row of pills from sm up. */}
        <div className="mb-6 flex justify-center">
          <div className="grid w-full grid-cols-2 gap-2 sm:inline-flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-1.5 sm:rounded-2xl sm:bg-gray-100 sm:p-1.5">
            {landingModules.map((m) => {
              const isActive = m.id === active.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveId(m.id)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors last:col-span-2",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 sm:border-transparent sm:bg-transparent sm:hover:bg-white/70",
                  )}
                >
                  <m.icon className="h-4 w-4 shrink-0" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={active.id} className="animate-in fade-in overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm duration-300">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">{active.eyebrow}</p>
                <h3 className="text-xl font-bold text-gray-900">{active.label}</h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-gray-600">{active.description}</p>
                {active.detailHref && (
                  <Link href={active.detailHref} className="mt-2 inline-flex text-sm font-medium text-primary hover:text-primary/80">
                    View module details
                  </Link>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
              <Button asChild className="gap-1.5 rounded-xl">
                <Link href={active.signupHref}>
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 border-t border-gray-100 bg-gray-50/70 p-4 sm:p-6 md:grid-cols-2 lg:p-8">
            {active.groups.map((group) => (
              <div key={group.title} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <group.icon className="h-4 w-4 text-primary" />
                  </span>
                  <h4 className="font-semibold text-gray-900">{group.title}</h4>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
            onClick={() => setBookDemoOpen(true)}
          >
            Book a demo
          </Button>
        </div>

        <BookDemoModal open={bookDemoOpen} onOpenChange={setBookDemoOpen} />

      </div>
    </section>
  );
}
