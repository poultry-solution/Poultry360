"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { CALENDAR_TOGGLE_VISIBLE } from "@/common/config/calendar";
import { useAuth, useAuthStore } from "@/common/store/store";
import { useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useI18n } from "@/i18n/useI18n";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
  useUpdateCurrentAccountFeature,
} from "@/fetchers/accountFeatureQueries";

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, language: uiLanguage, setLanguage } = useI18n();
  const [calendarType, setCalendarType] = useState<'AD' | 'BS'>(user?.calendarType || 'AD');
  const purchaseBillFeature = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD
  );
  const cfcrFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.FARMER_CFCR);
  const updateAccountFeature = useUpdateCurrentAccountFeature();

  // Fetch owned and managed farms
  const { data: ownedFarmsResponse, isLoading: ownedFarmsLoading } = useGetUserFarms("owned");
  const { data: managedFarmsResponse, isLoading: managedFarmsLoading } = useGetUserFarms("managed");

  const ownedFarms = ownedFarmsResponse?.data || [];
  const managedFarms = managedFarmsResponse?.data || [];

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      const nextUiLanguage = newLanguage === "NEPALI" ? "ne" : "en";
      setLanguage(nextUiLanguage);
      await axiosInstance.patch('/users/preferences', { language: newLanguage });
      toast.success(t("settings.languageUpdated"));
    } catch (error) {
      toast.error(t("settings.languageUpdateFailed"));
    }
  };

  const handleCalendarChange = async (newCalendar: string) => {
    try {
      const { data } = await axiosInstance.patch<{ success: boolean; data: typeof user }>(
        "/users/preferences",
        { calendarType: newCalendar }
      );
      setCalendarType(newCalendar as "AD" | "BS");
      if (user && data?.data) {
        useAuthStore.getState().setUser({ ...user, ...data.data });
      }
      toast.success(t("settings.calendarUpdated"));
    } catch (error) {
      toast.error(t("settings.calendarUpdateFailed"));
    }
  };

  const handlePurchaseBillToggle = async () => {
    try {
      await updateAccountFeature.mutateAsync({
        featureKey: ACCOUNT_FEATURE_KEYS.FARMER_PURCHASE_BILL_UPLOAD,
        enabled: !purchaseBillFeature.isEnabled,
      });
      toast.success(t("settings.purchaseBillUpdated"));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("settings.purchaseBillUpdateFailed")
      );
    }
  };

  const handleCfcrToggle = async () => {
    try {
      await updateAccountFeature.mutateAsync({
        featureKey: ACCOUNT_FEATURE_KEYS.FARMER_CFCR,
        enabled: !cfcrFeature.isEnabled,
      });
      toast.success(t("settings.cfcrUpdated"));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("settings.cfcrUpdateFailed")
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

      {/* Owned Farms */}
      {ownedFarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.ownedFarms")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownedFarmsLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (
              ownedFarms.map((farm: any) => (
                <div key={farm.id} className="border rounded-lg p-4 space-y-2">
                  <div>
                    <Label className="text-sm font-medium">{t("settings.farmName")}</Label>
                    <Input
                      value={farm.name}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("settings.capacity")}</Label>
                    <Input
                      value={farm.capacity || t("common.notSet")}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  {farm.description && (
                    <div>
                      <Label className="text-sm font-medium">{t("settings.description")}</Label>
                      <Input
                        value={farm.description}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Managed Farms */}
      {managedFarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.managedFarms")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {managedFarmsLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (
              managedFarms.map((farm: any) => (
                <div key={farm.id} className="border rounded-lg p-4 space-y-2">
                  <div>
                    <Label className="text-sm font-medium">{t("settings.farmName")}</Label>
                    <Input
                      value={farm.name}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t("settings.capacity")}</Label>
                    <Input
                      value={farm.capacity || t("common.notSet")}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  {farm.description && (
                    <div>
                      <Label className="text-sm font-medium">{t("settings.description")}</Label>
                      <Input
                        value={farm.description}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Show message if no farms */}
      {!ownedFarmsLoading && !managedFarmsLoading && ownedFarms.length === 0 && managedFarms.length === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground text-center">
              {t("settings.noFarms")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.optionalFeatures")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  purchaseBillFeature.isLoading || updateAccountFeature.isPending
                }
                onClick={handlePurchaseBillToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  purchaseBillFeature.isEnabled ? "bg-emerald-600" : "bg-gray-300"
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
          <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{t("settings.cfcr")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("settings.cfcrDescription")}
              </p>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs font-medium text-muted-foreground">
                {updateAccountFeature.isPending
                  ? t("settings.updatingFeature")
                  : cfcrFeature.isEnabled
                    ? t("settings.featureOn")
                    : t("settings.featureOff")}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={cfcrFeature.isEnabled}
                aria-label={t("settings.cfcr")}
                disabled={cfcrFeature.isLoading || updateAccountFeature.isPending}
                onClick={handleCfcrToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  cfcrFeature.isEnabled ? "bg-emerald-600" : "bg-gray-300"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    cfcrFeature.isEnabled ? "translate-x-5" : "translate-x-0"
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
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ENGLISH">{t("settings.languageEnglish")}</SelectItem>
                <SelectItem value="NEPALI">{t("settings.languageNepali")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {CALENDAR_TOGGLE_VISIBLE && (
            <div>
              <Label>{t("settings.calendar")}</Label>
              <Select value={calendarType} onValueChange={handleCalendarChange}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
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
