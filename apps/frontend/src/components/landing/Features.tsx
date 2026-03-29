"use client";

import { Badge } from "@/common/components/ui/badge";
import { Layers, Bird, Truck, Factory, Egg, Stethoscope } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

type FeatureCardId =
  | "layer"
  | "broiler"
  | "feedSupplier"
  | "feedMill"
  | "hatchery"
  | "veterinary";

const FEATURE_IDS: FeatureCardId[] = [
  "layer",
  "broiler",
  "feedSupplier",
  "feedMill",
  "hatchery",
  "veterinary",
];

const FEATURE_ICONS: Record<FeatureCardId, React.ComponentType<{ className?: string }>> = {
  layer: Layers,
  broiler: Bird,
  feedSupplier: Truck,
  feedMill: Factory,
  hatchery: Egg,
  veterinary: Stethoscope,
};

export default function Features() {
  const { t } = useI18n();

  return (
    <section id="features" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-primary text-primary-foreground px-3 py-1 rounded-full mb-4">
            {t("landing.features.badge")}
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            {t("landing.features.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURE_IDS.map((featureId) => {
            const Icon = FEATURE_ICONS[featureId];
            const title = t(`landing.features.cards.${featureId}.title`);
            const description = t(`landing.features.cards.${featureId}.description`);

            return (
              <div
                key={featureId}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 whitespace-nowrap">{title}</h3>
                <p className="text-gray-600 text-sm">{description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
