"use client";

import { useState } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Layers, Bird, Truck, Factory, Stethoscope } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { FeatureLearnMoreModal, type FeatureId } from "./FeatureLearnMoreModal";

const FEATURE_IDS: FeatureId[] = ["layer", "broiler", "feedSupplier", "feedMill", "veterinary"];

const FEATURE_ICONS: Record<FeatureId, React.ComponentType<{ className?: string }>> = {
  layer: Layers,
  broiler: Bird,
  feedSupplier: Truck,
  feedMill: Factory,
  veterinary: Stethoscope,
};

export default function Features() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFeatureId, setModalFeatureId] = useState<FeatureId | null>(null);

  const openModal = (featureId: FeatureId) => {
    setModalFeatureId(featureId);
    setModalOpen(true);
  };

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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {FEATURE_IDS.map((featureId) => {
            const Icon = FEATURE_ICONS[featureId];
            const title = t(`landing.features.cards.${featureId}.title`);
            const description = t(`landing.features.cards.${featureId}.description`);

            return (
              <div
                key={featureId}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow flex flex-col"
              >
                <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 whitespace-nowrap">{title}</h3>
                <p className="text-gray-600 text-sm flex-1 min-h-[4.5rem]">{description}</p>
                <Button
                  variant="default"
                  className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={() => openModal(featureId)}
                >
                  {t("landing.features.learnMore")}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <FeatureLearnMoreModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureId={modalFeatureId}
      />
    </section>
  );
}
