"use client";

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
import { useAuth } from "@/common/store/store";
import { useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";

export default function SettingsPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<"ENGLISH" | "NEPALI">(
    user?.language || "ENGLISH"
  );
  const [calendarType, setCalendarType] = useState<"AD" | "BS">(
    user?.calendarType || "AD"
  );

  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await axiosInstance.patch("/users/preferences", {
        language: newLanguage,
      });
      setLanguage(newLanguage as "ENGLISH" | "NEPALI");
      toast.success("Language updated successfully");
    } catch (error) {
      toast.error("Failed to update language");
    }
  };

  const handleCalendarChange = async (newCalendar: string) => {
    try {
      await axiosInstance.patch("/users/preferences", {
        calendarType: newCalendar,
      });
      setCalendarType(newCalendar as "AD" | "BS");
      toast.success("Calendar preference updated successfully");
    } catch (error) {
      toast.error("Failed to update calendar preference");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Owner Information */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="owner-name">Owner Name</Label>
              <Input
                id="owner-name"
                value={user.name}
                readOnly
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="owner-phone">Phone Number</Label>
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
                <Label htmlFor="owner-company">Company Name</Label>
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
                <Label htmlFor="owner-location">Location</Label>
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
            <CardTitle>Company Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="company-name">Company Name</Label>
              <Input
                id="company-name"
                value={user.company.name}
                readOnly
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="company-address">Address</Label>
              <Input
                id="company-address"
                value={user.company.address || "Not provided"}
                readOnly
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Language</Label>
            <Select value={language} onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENGLISH">English</SelectItem>
                <SelectItem value="NEPALI">Nepali</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Calendar Type</Label>
            <Select value={calendarType} onValueChange={handleCalendarChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AD">Gregorian (AD)</SelectItem>
                <SelectItem value="BS">Bikram Sambat (BS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
