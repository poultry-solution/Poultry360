"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";

export type FeatureId = "layer" | "broiler" | "feedSupplier" | "feedMill" | "veterinary";

type FeatureLearnMoreModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureId: FeatureId | null;
};

export function FeatureLearnMoreModal({
  open,
  onOpenChange,
  featureId,
}: FeatureLearnMoreModalProps) {
  const { t } = useI18n();

  if (!featureId) return null;

  const titleKey = `landing.features.cards.${featureId}.title`;
  const title = t(titleKey);

  const isBroiler = featureId === "broiler";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        {isBroiler ? <BroilerContent /> : <ComingSoonContent />}
      </DialogContent>
    </Dialog>
  );
}

function BroilerContent() {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {/* Record Transactions */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex space-x-2 mb-3">
          <div className="w-12 h-14 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-4 h-4 bg-primary rounded-full mb-1" />
            <div className="text-xs text-gray-600">₹2,500</div>
          </div>
          <div className="w-12 h-14 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mb-1" />
            <div className="text-xs text-gray-600">₹1,200</div>
          </div>
          <div className="w-12 h-14 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-4 h-4 bg-primary rounded-full mb-1" />
            <div className="text-xs text-gray-600">₹3,800</div>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.recordTransactions")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.recordTransactionsDesc")}</p>
      </div>

      {/* Manage Birds */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex space-x-2 mb-3">
          <div className="w-10 h-12 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-3 h-3 bg-primary rounded-full mb-1" />
            <div className="text-xs text-gray-600">1,250↑</div>
          </div>
          <div className="w-10 h-12 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mb-1" />
            <div className="text-xs text-gray-600">45↓</div>
          </div>
          <div className="w-10 h-12 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-3 h-3 bg-primary rounded-full mb-1" />
            <div className="text-xs text-gray-600">85%</div>
          </div>
          <div className="w-10 h-12 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
            <div className="w-3 h-3 bg-primary rounded-full mb-1" />
            <div className="text-xs text-gray-600">32d</div>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.manageBirds")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.manageBirdsDesc")}</p>
      </div>

      {/* Manage Inventory */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center space-x-3 mb-3">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center mb-1">
              <span className="text-white text-xs font-bold">+</span>
            </div>
            <div className="text-xs text-gray-600">{t("landing.features.add")}</div>
          </div>
          <div className="w-14 h-10 bg-amber-200 rounded border-2 border-amber-300 flex items-center justify-center">
            <span className="text-xs font-medium text-amber-800">{t("landing.features.feed")}</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center mb-1">
              <span className="text-white text-xs font-bold">-</span>
            </div>
            <div className="text-xs text-gray-600">{t("landing.features.remove")}</div>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.manageInventory")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.manageInventoryDesc")}</p>
      </div>

      {/* Farm Insights */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="w-full max-w-28 mb-3">
          <div className="flex items-end space-x-1.5 h-14">
            <div className="w-5 bg-primary rounded-t" style={{ height: "60%" }} />
            <div className="w-5 bg-red-500 rounded-t" style={{ height: "30%" }} />
            <div className="w-5 bg-primary rounded-t" style={{ height: "80%" }} />
            <div className="w-5 bg-primary rounded-t" style={{ height: "45%" }} />
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>₹45K↑</span>
            <span>₹12K↓</span>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.farmInsights")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.farmInsightsDesc")}</p>
      </div>

      {/* Vaccination Schedule */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-col items-center space-y-1.5 mb-3">
          <div className="w-20 h-7 bg-blue-100 rounded border border-blue-200 flex items-center justify-center">
            <span className="text-xs font-medium text-blue-800">Day 1</span>
          </div>
          <div className="w-20 h-7 bg-green-100 rounded border border-green-200 flex items-center justify-center">
            <span className="text-xs font-medium text-green-800">Day 7</span>
          </div>
          <div className="w-20 h-7 bg-yellow-100 rounded border border-yellow-200 flex items-center justify-center">
            <span className="text-xs font-medium text-yellow-800">Day 14</span>
          </div>
          <div className="w-20 h-7 bg-red-100 rounded border border-red-200 flex items-center justify-center">
            <span className="text-xs font-medium text-red-800">Day 21</span>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.vaccinationSchedule")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.vaccinationScheduleDesc")}</p>
      </div>

      {/* Feed Calculator */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-amber-800">50kg</span>
          </div>
          <span className="text-xl text-gray-400">÷</span>
          <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-800">1000</span>
          </div>
          <span className="text-xl text-gray-400">=</span>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">0.05</span>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.feedCalculator")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.feedCalculatorDesc")}</p>
      </div>

      {/* Mortality Tracking */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex flex-col items-center space-y-1.5 mb-3">
          <div className="flex items-center space-x-1.5">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </div>
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-[10px]">✓</span>
            </div>
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-[10px]">✗</span>
            </div>
          </div>
          <div className="text-xs text-gray-600">{t("landing.features.mortalityRate")}</div>
          <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="w-1/4 h-full bg-red-500" />
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.mortalityTracking")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.mortalityTrackingDesc")}</p>
      </div>

      {/* Production Planning */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="flex items-center space-x-1.5 mb-3">
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-[10px]">1</span>
          </div>
          <div className="w-0.5 h-3 bg-gray-300" />
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-[10px]">2</span>
          </div>
          <div className="w-0.5 h-3 bg-gray-300" />
          <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white text-[10px]">3</span>
          </div>
          <div className="w-0.5 h-3 bg-gray-300" />
          <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-[10px]">4</span>
          </div>
        </div>
        <h4 className="text-sm font-bold text-gray-900">{t("landing.features.productionPlanning")}</h4>
        <p className="text-gray-600 text-xs">{t("landing.features.productionPlanningDesc")}</p>
      </div>
    </div>
  );
}

function ComingSoonContent() {
  const { t } = useI18n();
  return (
    <div className="py-12 text-center">
      <p className="text-lg text-gray-600">{t("landing.features.modal.comingSoon")}</p>
    </div>
  );
}
