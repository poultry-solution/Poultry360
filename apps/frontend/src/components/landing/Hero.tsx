"use client";

import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import { Monitor } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import BookDemoModal from "@/components/landing/BookDemoModal";

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
              className="w-full sm:w-auto min-h-[44px] border border-green-300 hover:border-green-400 hover:bg-green-50 px-6 sm:px-8 py-3 rounded-lg flex flex-col items-center justify-center transition-colors"
            >
              <span className="text-xs font-bold text-green-800 leading-tight">Contact us</span>
              <span className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-500 shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +977 9705428337
              </span>
            </a>
          </div>
        </div>

        {/* Right Column - Visual Illustration */}
        <div className="relative">
          {/* Background Shape */}
          <div className="absolute inset-0 bg-primary rounded-2xl lg:rounded-[3rem] transform rotate-3 scale-100 lg:scale-105 opacity-10"></div>

          {/* Main Illustration Container */}
          <div className="relative bg-white rounded-xl lg:rounded-[2rem] p-4 sm:p-6 lg:p-8 shadow-2xl border border-gray-100">
            {/* Central Figure - Poultry Farmer */}
            <div className="flex justify-center mb-4 lg:mb-6">
              <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-3xl lg:text-4xl">👨‍🌾</span>
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute top-3 right-3 lg:top-4 lg:right-4 bg-white rounded-lg p-2 sm:p-3 shadow-lg border">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-yellow-400 rounded-full shrink-0"></div>
                <span className="text-[10px] sm:text-xs font-medium">{t("landing.hero.notifications")}</span>
              </div>
            </div>

            <div className="absolute top-12 left-3 lg:top-16 lg:left-4 bg-white rounded-lg p-2 sm:p-3 shadow-lg border">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-400 rounded-full shrink-0"></div>
                <span className="text-[10px] sm:text-xs font-medium">{t("landing.hero.paymentDue")}</span>
              </div>
            </div>

            <div className="absolute bottom-12 right-2 sm:right-4 lg:bottom-16 lg:right-8 bg-white rounded-lg p-2 sm:p-3 shadow-lg border">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-orange-400 rounded-full shrink-0"></div>
                <span className="text-[10px] sm:text-xs font-medium">{t("landing.hero.lowStockAlert")}</span>
              </div>
            </div>

            {/* App Interface Mockup */}
            <div className="bg-gray-50 rounded-lg p-3 lg:p-4 mt-3 lg:mt-4">
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex justify-between mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">1,250</div>
                  <div className="text-xs text-gray-500">{t("landing.hero.birds")}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">₹45,000</div>
                  <div className="text-xs text-gray-500">{t("landing.hero.revenue")}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">85%</div>
                  <div className="text-xs text-gray-500">{t("landing.hero.health")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

<BookDemoModal open={bookDemoOpen} onOpenChange={setBookDemoOpen} />
    </section>
  );
}
