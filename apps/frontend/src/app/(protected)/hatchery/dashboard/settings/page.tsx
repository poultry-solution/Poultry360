"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { CALENDAR_TOGGLE_VISIBLE } from "@/common/config/calendar";
import axiosInstance from "@/common/lib/axios";
import { useAuth, useAuthStore } from "@/common/store/store";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
  useUpdateCurrentAccountFeature,
} from "@/fetchers/accountFeatureQueries";
import { useI18n } from "@/i18n/useI18n";

function HatcherySettingsContent() {
  const { user } = useAuth();
  const { t, language: uiLanguage, setLanguage } = useI18n();
  const [calendarType, setCalendarType] = useState<"AD" | "BS">(
    user?.calendarType || "AD",
  );
  const purchaseBillFeature = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD,
  );
  const updateAccountFeature = useUpdateCurrentAccountFeature();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      setLanguage(newLanguage === "NEPALI" ? "ne" : "en");
      await axiosInstance.patch("/users/preferences", {
        language: newLanguage,
      });
      toast.success(t("settings.languageUpdated"));
    } catch {
      toast.error(t("settings.languageUpdateFailed"));
    }
  };

  const handleCalendarChange = async (newCalendar: string) => {
    try {
      const { data } = await axiosInstance.patch("/users/preferences", {
        calendarType: newCalendar,
      });
      setCalendarType(newCalendar as "AD" | "BS");
      if (user && data?.data) {
        useAuthStore.getState().setUser({ ...user, ...data.data });
      }
      toast.success(t("settings.calendarUpdated"));
    } catch {
      toast.error(t("settings.calendarUpdateFailed"));
    }
  };

  const handlePurchaseBillToggle = async () => {
    try {
      await updateAccountFeature.mutateAsync({
        featureKey: ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD,
        enabled: !purchaseBillFeature.isEnabled,
      });
      toast.success(t("settings.purchaseBillUpdated"));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          t("settings.purchaseBillUpdateFailed"),
      );
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {user && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.ownerInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="owner-name">{t("settings.ownerName")}</Label>
              <Input
                id="owner-name"
                value={user.name}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="owner-phone">{t("settings.phoneNumber")}</Label>
              <Input
                id="owner-phone"
                value={user.phone}
                readOnly
                className="bg-muted"
              />
            </div>
            {user.hatchery && (
              <div>
                <Label htmlFor="hatchery-name">Hatchery Name</Label>
                <Input
                  id="hatchery-name"
                  value={user.hatchery.name}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.optionalFeatures")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("settings.purchaseBillUpload")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("settings.purchaseBillDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-medium text-muted-foreground">
                {updateAccountFeature.isPending
                  ? t("settings.updatingFeature")
                  : purchaseBillFeature.isEnabled
                    ? t("settings.featureOn")
                    : t("settings.featureOff")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={purchaseBillFeature.isEnabled}
                aria-label={t("settings.purchaseBillUpload")}
                disabled={
                  purchaseBillFeature.isLoading ||
                  updateAccountFeature.isPending
                }
                onClick={handlePurchaseBillToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  purchaseBillFeature.isEnabled
                    ? "bg-emerald-600"
                    : "bg-gray-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    purchaseBillFeature.isEnabled
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.preferences")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t("settings.language")}</Label>
            <Select
              value={uiLanguage === "ne" ? "NEPALI" : "ENGLISH"}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENGLISH">
                  {t("settings.languageEnglish")}
                </SelectItem>
                <SelectItem value="NEPALI">
                  {t("settings.languageNepali")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {CALENDAR_TOGGLE_VISIBLE && (
            <div>
              <Label>{t("settings.calendar")}</Label>
              <Select value={calendarType} onValueChange={handleCalendarChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AD">{t("settings.calendarAD")}</SelectItem>
                  <SelectItem value="BS">{t("settings.calendarBS")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function HatcherySettingsPage() {
  const { user } = useAuth();
  if (user?.isStaff) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">Owner access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Staff accounts cannot change Hatchery account settings.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <HatcherySettingsContent />;
}
