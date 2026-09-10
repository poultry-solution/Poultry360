"use client";

import { useState } from "react";
import Script from "next/script";
import { Button } from "@/common/components/ui/button";
import { Monitor, PlayCircle } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import BookDemoModal from "@/components/landing/BookDemoModal";

const WISTIA_MEDIA_ID = "3n4jdjyfix";

export default function Hero() {
  const { t } = useI18n();
  const [bookDemoOpen, setBookDemoOpen] = useState(false);

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-6 py-10 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Column - Text Content */}
        <div className="space-y-5 lg:space-y-8">
          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-6xl font-bold text-gray-900 leading-tight">
            {t("landing.hero.headingMain")}
            <span className="text-primary">{t("landing.hero.headingHighlight")}</span>
          </h1>

          {/* Description */}
          <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
            {t("landing.hero.description")}
          </p>

          {/* CTA Buttons - full width stacked on mobile, row on sm+ */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              type="button"
              onClick={() => setBookDemoOpen(true)}
              className="w-full sm:w-auto min-h-[44px] bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 rounded-lg flex items-center justify-center"
            >
              <Monitor className="w-5 h-5 mr-2 shrink-0" />
              {t("landing.hero.bookDemo")}
            </Button>
            <a
              href="https://wa.me/9779705428337"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto min-h-[44px] border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-green-500 shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              9705428337
            </a>
          </div>
        </div>

        {/* Right Column - Demo Video */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary rounded-2xl lg:rounded-[3rem] transform rotate-3 scale-100 lg:scale-105 opacity-10"></div>

          <Script
            src={`https://fast.wistia.com/embed/medias/${WISTIA_MEDIA_ID}.jsonp`}
            strategy="afterInteractive"
          />
          <Script
            src="https://fast.wistia.com/assets/external/E-v1.js"
            strategy="afterInteractive"
          />

          <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-2xl lg:rounded-[2rem]">
            <div className="aspect-video w-full bg-gray-100">
              <div
                className={`wistia_embed wistia_async_${WISTIA_MEDIA_ID} popover=true popoverAnimateThumbnail=true videoFoam=true`}
                style={{ height: "100%", position: "relative", width: "100%" }}
              />
            </div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/95 text-white shadow-xl ring-8 ring-white/70 transition-transform sm:h-16 sm:w-16">
                <PlayCircle className="h-8 w-8 sm:h-9 sm:w-9" />
              </div>
            </div>
          </div>
        </div>
      </div>

<BookDemoModal open={bookDemoOpen} onOpenChange={setBookDemoOpen} />
    </section>
  );
}
