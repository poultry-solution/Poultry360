"use client";

import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Monitor, Download, Check } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

export default function Hero() {
  const { t } = useI18n();

  return (
    <section className="max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Column - Text Content */}
        <div className="space-y-8">
          {/* Trust Badge */}
          <Badge className="bg-primary text-primary-foreground px-3 py-1 rounded-full flex items-center w-fit">
            <Check className="w-4 h-4 mr-2" />
            {t("landing.hero.trustBadge")}
          </Badge>

          {/* Main Heading */}
          <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
            {t("landing.hero.headingMain")}
            <span className="text-primary">{t("landing.hero.headingHighlight")}</span>
          </h1>

          {/* Description */}
          <p className="text-lg text-gray-600 leading-relaxed">
            {t("landing.hero.description")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="/auth/signup">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                {t("landing.hero.useWeb")}
              </Button>
            </a>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-lg flex items-center">
              <Download className="w-5 h-5 mr-2" />
              {t("landing.hero.download")}
            </Button>
          </div>
        </div>

        {/* Right Column - Visual Illustration */}
        <div className="relative">
          {/* Background Shape */}
          <div className="absolute inset-0 bg-primary rounded-[3rem] transform rotate-3 scale-105 opacity-10"></div>

          {/* Main Illustration Container */}
          <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl border border-gray-100">
            {/* Central Figure - Poultry Farmer */}
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-4xl">👨‍🌾</span>
              </div>
            </div>

            {/* Floating UI Elements */}
            <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-xs font-medium">{t("landing.hero.notifications")}</span>
              </div>
            </div>

            <div className="absolute top-16 left-4 bg-white rounded-lg p-3 shadow-lg border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-xs font-medium">{t("landing.hero.paymentDue")}</span>
              </div>
            </div>

            <div className="absolute bottom-16 right-8 bg-white rounded-lg p-3 shadow-lg border">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-xs font-medium">{t("landing.hero.lowStockAlert")}</span>
              </div>
            </div>

            {/* App Interface Mockup */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
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
    </section>
  );
}
