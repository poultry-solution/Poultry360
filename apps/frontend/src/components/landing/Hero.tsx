"use client";

import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Monitor, Download, Smartphone } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import BookDemoModal from "@/components/landing/BookDemoModal";

export default function Hero() {
  const { t } = useI18n();
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
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
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto min-h-[44px] border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 sm:px-8 py-3 rounded-lg flex items-center justify-center"
              onClick={() => setPwaModalOpen(true)}
            >
              <Download className="w-5 h-5 mr-2 shrink-0" />
              {t("landing.hero.download")}
            </Button>
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

      {/* PWA Install / Add to Home Screen modal */}
      <Dialog open={pwaModalOpen} onOpenChange={setPwaModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-primary shrink-0" />
              {t("landing.hero.pwaModal.title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 -mt-2">
            {t("landing.hero.pwaModal.subtitle")}
          </p>
          <div className="space-y-5 pt-2">
            {/* Android */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {t("landing.hero.pwaModal.androidTitle")}
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                <li>{t("landing.hero.pwaModal.androidStep1")}</li>
                <li>{t("landing.hero.pwaModal.androidStep2")}</li>
                <li>{t("landing.hero.pwaModal.androidStep3")}</li>
              </ol>
            </div>
            {/* iPhone */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                {t("landing.hero.pwaModal.iphoneTitle")}
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-gray-700">
                <li>{t("landing.hero.pwaModal.iphoneStep1")}</li>
                <li>{t("landing.hero.pwaModal.iphoneStep2")}</li>
                <li>{t("landing.hero.pwaModal.iphoneStep3")}</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookDemoModal open={bookDemoOpen} onOpenChange={setBookDemoOpen} />
    </section>
  );
}
