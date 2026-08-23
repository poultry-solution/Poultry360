"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import BookDemoModal from "@/components/landing/BookDemoModal";
import {
  ArrowRight,
  Bird,
  Check,
  Egg,
  Factory,
  Layers,
  ShoppingBag,
} from "lucide-react";

// ─── shared feature data ──────────────────────────────────────────────────────

const BASE_FARMER_FEATURES = [
  "Farm management",
  "Batch management",
  "Expenses management",
  "Mortality management",
  "Sales management",
  "Sales balance management",
  "Parties management",
  "Inventory management",
  "Purchase management",
  "Feed Supplier management",
  "Connection supplier features",
  "List for sale your products",
  "Staff salary management",
  "FCR evaluation",
];

// ─── module definitions ───────────────────────────────────────────────────────

type Module = {
  id: string;
  label: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  href: string;
  features: string[];
  accent: {
    tab: string;
    tabText: string;
    iconBg: string;
    iconColor: string;
    gradientFrom: string;
    border: string;
    check: string;
    featureBadge: string;
    cta: string;
  };
};

const MODULES: Module[] = [
  {
    id: "layer",
    label: "Layer Farmer",
    subtitle: "For egg-producing farms",
    description:
      "Complete management system built for layer farms — from flock lifecycle to egg production analytics.",
    icon: Egg,
    href: "/layer-farm-software",
    features: [
      ...BASE_FARMER_FEATURES,
      "Egg production tracking by type",
      "Egg % tracking",
    ],
    accent: {
      tab: "bg-emerald-500",
      tabText: "text-white",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-600",
      gradientFrom: "from-emerald-500/[0.07]",
      border: "border-emerald-400/30",
      check: "text-emerald-500",
      featureBadge:
        "bg-emerald-50 text-emerald-700 border border-emerald-200/80",
      cta: "bg-emerald-500 hover:bg-emerald-600 text-white border-0",
    },
  },
  {
    id: "broiler",
    label: "Broiler Farmer",
    subtitle: "For meat bird operations",
    description:
      "End-to-end batch and sales tracking purpose-built for the fast turnaround of broiler farming.",
    icon: Bird,
    href: "/broiler-farm-software",
    features: BASE_FARMER_FEATURES,
    accent: {
      tab: "bg-orange-500",
      tabText: "text-white",
      iconBg: "bg-orange-500/15",
      iconColor: "text-orange-600",
      gradientFrom: "from-orange-500/[0.07]",
      border: "border-orange-400/30",
      check: "text-orange-500",
      featureBadge: "bg-orange-50 text-orange-700 border border-orange-200/80",
      cta: "bg-orange-500 hover:bg-orange-600 text-white border-0",
    },
  },
  {
    id: "dealer",
    label: "Feed Dealer",
    subtitle: "For feed distribution businesses",
    description:
      "Manage inventory, sales pipeline, and your full farmer network — all from a single dashboard.",
    icon: ShoppingBag,
    href: "/feed-dealer-software",
    features: [
      "Company Purchase management",
      "Company Balance management",
      "Company Payment management",
      "Inventory management",
      "Sales management",
      "Farmer management",
      "Staff salary management",
      "Connection with farmer",
    ],
    accent: {
      tab: "bg-blue-500",
      tabText: "text-white",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-600",
      gradientFrom: "from-blue-500/[0.07]",
      border: "border-blue-400/30",
      check: "text-blue-500",
      featureBadge: "bg-blue-50 text-blue-700 border border-blue-200/80",
      cta: "bg-blue-500 hover:bg-blue-600 text-white border-0",
    },
  },
  {
    id: "feedmill",
    label: "Feed Mill Company",
    subtitle: "For feed manufacturing companies",
    description:
      "Full production tracking, dealer network management, and balance controls — built for scale.",
    icon: Factory,
    href: "/auth/signup/company",
    features: [
      "Dealer management",
      "Sales management",
      "Purchase management",
      "Production management",
      "Balance limit features",
      "Staff salary management",
      "Inventory management",
    ],
    accent: {
      tab: "bg-violet-500",
      tabText: "text-white",
      iconBg: "bg-violet-500/15",
      iconColor: "text-violet-600",
      gradientFrom: "from-violet-500/[0.07]",
      border: "border-violet-400/30",
      check: "text-violet-500",
      featureBadge: "bg-violet-50 text-violet-700 border border-violet-200/80",
      cta: "bg-violet-500 hover:bg-violet-600 text-white border-0",
    },
  },
  {
    id: "hatchery",
    label: "Hatchery",
    subtitle: "For hatchery operations",
    description:
      "From parent flock management and incubation lifecycle to chick grading and delivery — all in one place.",
    icon: Layers,
    href: "/hatchery-software",
    features: [
      "Supplier ledger management",
      "Inventory management",
      "Parent flock batch management",
      "Egg production tracking by type",
      "Batch-wise egg inventory",
      "Incubation lifecycle (setter/candling/hatcher)",
      "Hatch result and chick grade tracking",
      "Chick sales management",
      "Party ledger and payments",
      "Produced chicks stock view",
    ],
    accent: {
      tab: "bg-rose-500",
      tabText: "text-white",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-600",
      gradientFrom: "from-rose-500/[0.07]",
      border: "border-rose-400/30",
      check: "text-rose-500",
      featureBadge: "bg-rose-50 text-rose-700 border border-rose-200/80",
      cta: "bg-rose-500 hover:bg-rose-600 text-white border-0",
    },
  },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function Modules() {
  const [activeId, setActiveId] = useState<string>("layer");
  const [bookDemoOpen, setBookDemoOpen] = useState(false);

  const active = MODULES.find((m) => m.id === activeId)!;
  const Icon = active.icon;

  return (
    <section id="modules" className="py-16 lg:py-24 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 lg:px-6">

        {/* ── Section header ── */}
        <div className="text-center mb-10 lg:mb-12">
          <Badge className="bg-primary text-primary-foreground px-4 py-2 rounded-full mb-4">
            Modules
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Built for every role in the poultry chain
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Select your business type and explore everything that&apos;s
            included.
          </p>
        </div>

        {/* ── Tab strip ── */}
        <div className="flex justify-start lg:justify-center mb-8 overflow-x-auto pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
          <div className="flex gap-1.5 bg-gray-100 p-1.5 rounded-2xl min-w-max">
            {MODULES.map((m) => {
              const isActive = m.id === activeId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={[
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                    "text-sm font-semibold whitespace-nowrap",
                    "transition-all duration-300 ease-out",
                    isActive
                      ? `${m.accent.tab} ${m.accent.tabText} shadow-sm`
                      : "text-gray-500 hover:text-gray-800 hover:bg-white/70",
                  ].join(" ")}
                >
                  <m.icon className="h-3.5 w-3.5 shrink-0" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content panel ── */}
        {/* key forces remount on tab switch → entrance animation replays */}
        <div
          key={activeId}
          className={[
            "relative rounded-2xl border bg-white overflow-hidden shadow-sm",
            "animate-in fade-in slide-in-from-bottom-2 duration-300",
            active.accent.border,
          ].join(" ")}
        >
          {/* Subtle gradient tint */}
          <div
            aria-hidden
            className={[
              "pointer-events-none absolute inset-0",
              "bg-gradient-to-br",
              active.accent.gradientFrom,
              "to-transparent",
            ].join(" ")}
          />

          {/* Panel header */}
          <div className="relative px-6 py-6 lg:px-8 lg:py-7 border-b border-gray-100/80">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

              {/* Icon + name + description */}
              <div className="flex items-start gap-4">
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    active.accent.iconBg,
                  ].join(" ")}
                >
                  <Icon className={`h-5 w-5 ${active.accent.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">
                    {active.subtitle}
                  </p>
                  <Link
                    href={active.href}
                    className="inline-block text-lg font-bold leading-tight text-gray-900 transition-colors hover:text-primary"
                  >
                    {active.label}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1.5 max-w-md leading-relaxed">
                    {active.description}
                  </p>
                  <Link
                    href={active.href}
                    className="mt-2 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    View module details
                  </Link>
                </div>
              </div>

              {/* Badge + CTA */}
              <div className="flex items-center gap-3 shrink-0 sm:mt-1">
                <span
                  className={[
                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                    active.accent.featureBadge,
                  ].join(" ")}
                >
                  {active.features.length} features
                </span>
                <Button
                  asChild
                  size="sm"
                  className={["rounded-xl gap-1.5 text-sm", active.accent.cta].join(" ")}
                >
                  <Link href={active.href}>
                    Get Started
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Features grid */}
          <div className="relative px-6 py-6 lg:px-8 lg:py-7">
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3.5">
              {active.features.map((feature, i) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 text-sm text-gray-700 animate-in fade-in duration-500"
                  style={{
                    animationDelay: `${i * 45}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <Check
                    className={`h-4 w-4 shrink-0 ${active.accent.check}`}
                    strokeWidth={2.5}
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Book a demo ── */}
        <div className="mt-8 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300"
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
