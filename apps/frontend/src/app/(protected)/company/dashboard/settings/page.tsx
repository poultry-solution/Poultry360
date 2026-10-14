"use client";
import { BillSettingsCard } from "@/components/settings/BillSettingsCard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { CALENDAR_TOGGLE_VISIBLE } from "@/common/config/calendar";
import { useAuth } from "@/common/store/store";
import { useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useI18n } from "@/i18n/useI18n";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
  useUpdateCurrentAccountFeature,
} from "@/fetchers/accountFeatureQueries";

function CompanySettingsContent() {
  const { user } = useAuth();
  const { t, language: uiLanguage, setLanguage } = useI18n();
  const [calendarType, setCalendarType] = useState<"AD" | "BS">(
    user?.calendarType || "AD"
  );
  const purchaseBillFeature = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD
  );
  const updateAccountFeature = useUpdateCurrentAccountFeature();

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      const nextUiLanguage = newLanguage === "NEPALI" ? "ne" : "en";
      setLanguage(nextUiLanguage);
      await axiosInstance.patch("/users/preferences", {
        language: newLanguage,
      });
      toast.success(t("settings.languageUpdated"));
    } catch (error) {
      toast.error(t("settings.languageUpdateFailed"));
    }
  };

  const handleCalendarChange = async (newCalendar: string) => {
    try {
      await axiosInstance.patch("/users/preferences", {
        calendarType: newCalendar,
      });
      setCalendarType(newCalendar as "AD" | "BS");
      toast.success(t("settings.calendarUpdated"));
    } catch (error) {
      toast.error(t("settings.calendarUpdateFailed"));
    }
  };

  const handlePurchaseBillToggle = async () => {
    try {
      await updateAccountFeature.mutateAsync({
        featureKey: ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD,
        enabled: !purchaseBillFeature.isEnabled,
      });
      toast.success(t("settings.purchaseBillUpdated"));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("settings.purchaseBillUpdateFailed")
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {/* Owner Information */}
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
                type="tel"
                value={user.phone}
                readOnly
                className="bg-muted"
              />
            </div>

            {user.companyName && (
              <div>
                <Label htmlFor="owner-company">{t("settings.companyName")}</Label>
                <Input
                  id="owner-company"
                  value={user.companyName}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}

            {user.companyFarmLocation && (
              <div>
                <Label htmlFor="owner-location">{t("settings.location")}</Label>
                <Input
                  id="owner-location"
                  value={user.companyFarmLocation}
                  readOnly
                  className="bg-muted"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Business Information */}
      {user?.company && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.companyBusinessInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company-name">{t("settings.companyName")}</Label>
              <Input
                id="company-name"
                value={user.company.name}
                readOnly
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="company-address">{t("settings.address")}</Label>
              <Input
                id="company-address"
                value={user.company.address || t("common.notProvided")}
                readOnly
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <BillSettingsCard />

      {/* User Preferences */}
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
                <SelectItem value="ENGLISH">{t("settings.languageEnglish")}</SelectItem>
                <SelectItem value="NEPALI">{t("settings.languageNepali")}</SelectItem>
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

          {user?.company && !user.isStaff && (
            <div className="flex items-center justify-between gap-4 border-t pt-4">
              <div>
                <Label htmlFor="purchase-bill-toggle">
                  {t("settings.purchaseBillUpload")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("settings.purchaseBillDescription")}
                </p>
              </div>
              <button
                id="purchase-bill-toggle"
                type="button"
                role="switch"
                aria-checked={purchaseBillFeature.isEnabled}
                aria-label={t("settings.purchaseBillUpload")}
                disabled={
                  purchaseBillFeature.isLoading || updateAccountFeature.isPending
                }
                onClick={handlePurchaseBillToggle}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  purchaseBillFeature.isEnabled
                    ? "border-primary bg-primary"
                    : "border-slate-500 bg-slate-400"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    purchaseBillFeature.isEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  if (user?.isStaff) {
    return (
      <Card className="mx-auto mt-10 max-w-lg">
        <CardContent className="py-10 text-center">
          <h1 className="text-lg font-semibold">Owner access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Staff accounts cannot change Company account settings.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <CompanySettingsContent />;
}
