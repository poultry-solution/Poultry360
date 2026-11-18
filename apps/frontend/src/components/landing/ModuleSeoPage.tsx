import Link from "next/link";
import Script from "next/script";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import EmptyMarketingPageShell from "@/components/landing/EmptyMarketingPageShell";
import type { ModuleFeature, ModulePageContent } from "@/content/modulePages";

const siteUrl = "https://www.poultry360.org";

/** Feature cards grouped by `group`, in the page's `featureGroups` order. */
function groupFeatures(order: string[], features: ModuleFeature[]) {
  return order
    .map((title) => ({ title, features: features.filter((f) => f.group === title) }))
    .filter((g) => g.features.length > 0);
}

const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-primary";
const sectionTitle = "mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl";

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

  const featureGroups = groupFeatures(content.featureGroups, content.features);

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

      {/* ── Hero ── */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 lg:px-6 lg:pb-16 lg:pt-10">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-14">
            <div>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary sm:text-sm">
                {content.heroBadge}
              </span>
              <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem]">
                {content.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                {content.heroDescription}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="gap-2 rounded-xl">
                  <Link href={content.signupHref}>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-xl">
                  <Link href="/#contact">Book a demo</Link>
                </Button>
              </div>
            </div>

            {content.wistiaMediaId && (
              <div className="flex justify-center lg:justify-end">
                <Script
                  src={`https://fast.wistia.com/embed/medias/${content.wistiaMediaId}.jsonp`}
                  strategy="afterInteractive"
                />
                <Script
                  src="https://fast.wistia.com/assets/external/E-v1.js"
                  strategy="afterInteractive"
                />
                <div className="w-full max-w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg sm:max-w-[320px]">
                  <div className="aspect-[9/16] w-full">
                    <div
                      className={`wistia_embed wistia_async_${content.wistiaMediaId} videoFoam=true`}
                      style={{ height: "100%", width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Who it is for (summary, use cases, outcomes) ── */}
      <section className="bg-slate-50/70 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-6">
          <div>
            <p className={eyebrow}>{content.moduleEyebrow}</p>
            <h2 className={sectionTitle}>{content.moduleTitle}</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">{content.moduleSummary}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "What you can do", items: content.useCases },
              { title: "What you get", items: content.outcomes },
            ].map((list) => (
              <div key={list.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="text-sm font-semibold text-slate-900">{list.title}</h3>
                <ul className="mt-3 space-y-2.5">
                  {list.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What is included (grouped feature cards) ── */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="max-w-3xl">
            <p className={eyebrow}>What is included</p>
            <h2 className={sectionTitle}>Every essential feature, explained clearly</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              If someone is searching for poultry software in Nepal, they usually want fewer blind spots across production,
              inventory, cost control, and business records. These features are designed to solve those real operational problems.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {featureGroups.map((group) => (
              <div key={group.title}>
                <h3 className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                  {group.title}
                  <span className="h-px flex-1 bg-slate-200" aria-hidden />
                </h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <article key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-primary/30">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <h4 className="font-semibold text-slate-900">{feature.title}</h4>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why this works ── */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-12 lg:py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-6">
          <div>
            <p className={eyebrow}>Why this works</p>
            <h2 className={sectionTitle}>{content.whyTitle}</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">{content.whyDescription}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {content.valueProps.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs: answers stay in the HTML (good for search), shown as open/close rows ── */}
      <section className="bg-white py-12 lg:py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <p className={eyebrow}>FAQs</p>
          <h2 className={sectionTitle}>Common questions about this module</h2>
          <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
            {content.faqs.map((faq, i) => (
              <details key={faq.question} className="group px-5 py-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base">{faq.question}</h3>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call to action ── */}
      <section className="bg-white pb-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="flex flex-col gap-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-2xl">
              <p className={eyebrow}>Ready to upgrade this workflow</p>
              <h2 className={sectionTitle}>{content.ctaHeading}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{content.ctaDescription}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Button asChild size="lg" className="gap-2 rounded-xl">
                <Link href={content.signupHref}>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl bg-white">
                <Link href="/#contact">Talk to our team</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </EmptyMarketingPageShell>
  );
}
