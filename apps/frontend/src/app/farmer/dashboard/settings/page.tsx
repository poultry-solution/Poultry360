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

export default function SettingsPage() {
  const { user } = useAuth();
  const { t, language: uiLanguage, setLanguage } = useI18n();
  const [calendarType, setCalendarType] = useState<'AD' | 'BS'>(user?.calendarType || 'AD');

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
