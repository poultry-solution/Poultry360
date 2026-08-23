import Link from "next/link";
import { ArrowRight, Egg } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import EmptyMarketingPageShell from "@/components/landing/EmptyMarketingPageShell";
import type { ModulePageContent } from "@/content/modulePages";

const siteUrl = "https://www.poultry360.org";

export default function ModuleSeoPage({
  content,
}: {
  content: ModulePageContent;
}) {
  const pageUrl = `${siteUrl}/${content.slug}`;

  const softwareJsonLd = {
    "@context": "https://schema.org",
    "@type": ["SoftwareApplication", "WebApplication"],
    name: content.schemaName,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: content.schemaSubCategory,
    operatingSystem: "Web",
    url: pageUrl,
    description: content.metaDescription,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "NPR",
      availability: "https://schema.org/InStock",
      url: pageUrl,
    },
    featureList: content.features.map((feature) => feature.title),
    areaServed: {
      "@type": "Country",
      name: "Nepal",
    },
    provider: {
      "@type": "Organization",
      name: "Poultry360",
      url: siteUrl,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <EmptyMarketingPageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 lg:px-6 lg:pb-24 lg:pt-10">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div
                className={`inline-flex items-center rounded-full border bg-white px-4 py-2 text-sm font-medium shadow-sm ${content.accent.border} ${content.accent.chipText}`}
              >
                {content.heroBadge}
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {content.heroTitle}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                {content.heroDescription}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary px-7 text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/auth/signup">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={`bg-white hover:bg-slate-50 ${content.accent.border} ${content.accent.chipText}`}
                >
                  <Link href="/#contact">Book a Demo</Link>
                </Button>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {content.useCases.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`rounded-[2rem] border bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.08)] ${content.accent.border}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${content.accent.iconBg} ${content.accent.iconText}`}
                  >
                    <Egg className="h-7 w-7" />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${content.accent.chipText}`}>
                      {content.moduleEyebrow}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">
                      {content.moduleTitle}
                    </h2>
                  </div>
                </div>
                <div
                  className={`rounded-full border px-4 py-2 text-sm font-semibold ${content.accent.chipBg} ${content.accent.chipBorder} ${content.accent.chipText}`}
                >
                  {content.features.length} features
                </div>
              </div>

              <p className="mt-6 text-base leading-7 text-slate-600">
                {content.moduleSummary}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {content.outcomes.map((item) => (
                  <div key={item} className="rounded-2xl bg-slate-50 px-4 py-4">
                    <p className="text-sm font-semibold text-slate-900">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="max-w-3xl">
            <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${content.accent.chipText}`}>
              What is included
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Every essential feature, explained clearly
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              If someone is searching for poultry software in Nepal, they usually want fewer blind spots across production,
              inventory, cost control, and business records. These features are designed to solve those real operational problems.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {content.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className={`group rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${content.accent.border}`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${content.accent.iconBg} ${content.accent.iconText}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/70 py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-6">
          <div>
            <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${content.accent.chipText}`}>
              Why this works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {content.whyTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {content.whyDescription}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {content.valueProps.map((item) => (
              <div key={item.title} className="rounded-3xl bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="max-w-3xl">
            <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${content.accent.chipText}`}>
              FAQs
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Common questions about this module
            </h2>
          </div>

          <div className="mt-10 space-y-4">
            {content.faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6"
              >
                <h3 className="text-lg font-semibold text-slate-900">
                  {faq.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-6">
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.92),rgba(30,41,59,0.96))] px-6 py-10 shadow-2xl lg:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className={`text-sm font-semibold uppercase tracking-[0.22em] ${content.accent.chipText}`}>
                  Ready to upgrade this workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {content.ctaHeading}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-200">
                  {content.ctaDescription}
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary px-7 text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/auth/signup">
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <Link href="/#contact">Talk to Our Team</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </EmptyMarketingPageShell>
  );
}
