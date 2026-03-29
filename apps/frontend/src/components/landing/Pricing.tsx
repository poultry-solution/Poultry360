"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import BookDemoModal from "@/components/landing/BookDemoModal";
import { Check } from "lucide-react";

type Plan = {
  id: string;
  title: string;
  priceLine: string;
  ctaLabel: string;
  trialHref: string;
  features: string[];
  accent: {
    border: string;
    glow: string;
    badge: string;
    badgeText: string;
    ctaVariant: "default" | "outline";
    ctaClassName?: string;
  };
};

const tickIcon = (
  <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
);

export default function Pricing() {
  const [bookDemoOpen, setBookDemoOpen] = useState(false);

  const plans: Plan[] = [
    {
      id: "layer-broiler",
      title: "Layer / Broiler Farmer",
      priceLine: "NPR 3800 / year",
      ctaLabel: "Start free trial",
      trialHref: "/auth/signup",
      features: [
        "Farm management",
        "Batch management",
        "Expenses management",
        "Mortality management",
        "Sales management",
        "Sales balance management",
        "Parties management",
        "Inventory management",
        "Purchase management",
        "Feed Suppplier management",
        "Connection supplier features",
        "List for sale your products",
        "Staff salary management",
        "FCR evaluation",
        "Egg production tracking by type",
        "Egg % Tracking ",


      ],
      accent: {
        border: "border-emerald-400/20",
        glow: "from-emerald-500/15 to-transparent",
        badge: "bg-emerald-500/10",
        badgeText: "text-emerald-600",
        ctaVariant: "outline",
      },
    },
    {
      id: "feed-dealer",
      title: "Feed Dealer",
      priceLine: "NPR 4700 / year",
      ctaLabel: "Start free trial",
      trialHref: "/auth/signup/dealer",
      features: [
        "Company purchase management",
        "Company balance management",
        "Inventory management",
        "Sales management",
        "Farmer management",
        "Staff salary management",
        "Connection with farmer",
      ],
      accent: {
        border: "border-emerald-400/20",
        glow: "from-emerald-500/15 to-transparent",
        badge: "bg-emerald-500/10",
        badgeText: "text-emerald-600",
        ctaVariant: "outline",
      },
    },
    {
      id: "feed-mill",
      title: "Feed Mill company",
      priceLine: "NPR 39999 / year",
      ctaLabel: "Start free trial",
      trialHref: "/auth/signup/company",
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
        border: "border-indigo-500/20",
        glow: "from-indigo-500/15 to-transparent",
        badge: "bg-indigo-500/10",
        badgeText: "text-indigo-700",
        ctaVariant: "outline",
        ctaClassName: "hover:border-indigo-500/50",
      },
    },
    {
      id: "hatchery",
      title: "Hatchery",
      priceLine: "NPR 15600 / year",
      ctaLabel: "Start free trial",
      trialHref: "/auth/signup/hatchery",
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
        border: "border-amber-500/20",
        glow: "from-amber-500/15 to-transparent",
        badge: "bg-amber-500/10",
        badgeText: "text-amber-700",
        ctaVariant: "outline",
        ctaClassName: "hover:border-amber-500/50",
      },
    },
  ];

  return (
    <section id="pricing" className="py-16 lg:py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-10 lg:mb-14">
          <Badge className="bg-primary text-primary-foreground px-4 py-2 rounded-full mb-4">
            Pricing
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Choose the plan that fits your business
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Start with a free trial, then subscribe annually.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-7">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={[
                "relative overflow-hidden",
                "border shadow-sm hover:shadow-lg transition-shadow",
                plan.accent.border,
              ].join(" ")}
            >
              <div
                aria-hidden
                className={[
                  "absolute inset-0 opacity-100",
                  "bg-gradient-to-br",
                  plan.accent.glow,
                ].join(" ")}
              />

              <CardHeader className="relative p-6 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">
                      {plan.id === "layer-broiler" ? "For Layer/Broiler" : ""}
                      {plan.id === "feed-dealer" ? "For Feed Dealer" : ""}
                      {plan.id === "feed-mill" ? "For Feed Mill" : ""}
                      {plan.id === "hatchery" ? "For Hatchery" : ""}
                    </p>
                    <h3 className="text-xl font-bold text-gray-900">
                      {plan.title}
                    </h3>
                  </div>
                  <Badge
                    className={[
                      plan.accent.badge,
                      plan.accent.badgeText,
                      "border border-transparent",
                      "px-3 py-1 rounded-full",
                      "whitespace-nowrap",
                    ].join(" ")}
                    variant="secondary"
                  >
                    Annual
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {plan.priceLine}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="relative p-6 pt-0">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      {tickIcon}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button
                    asChild
                    variant={plan.accent.ctaVariant === "default" ? "default" : "outline"}
                    className={[
                      "w-full rounded-xl",
                      plan.accent.ctaClassName || "",
                    ].join(" ")}
                  >
                    <Link href={plan.trialHref}>{plan.ctaLabel}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 lg:mt-10 flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-primary/30 hover:bg-primary/5"
            onClick={() => setBookDemoOpen(true)}
          >
            Book a demo
          </Button>
        </div>

        <BookDemoModal
          open={bookDemoOpen}
          onOpenChange={setBookDemoOpen}
        />
      </div>
    </section>
  );
}

