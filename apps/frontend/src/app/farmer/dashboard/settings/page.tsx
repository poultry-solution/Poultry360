"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { useAuth } from "@/common/store/store";
import { useState } from "react";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";

export default function SettingsPage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState<'ENGLISH' | 'NEPALI'>(user?.language || 'ENGLISH');
  const [calendarType, setCalendarType] = useState<'AD' | 'BS'>(user?.calendarType || 'AD');
  
  // Fetch owned and managed farms
  const { data: ownedFarmsResponse, isLoading: ownedFarmsLoading } = useGetUserFarms("owned");
  const { data: managedFarmsResponse, isLoading: managedFarmsLoading } = useGetUserFarms("managed");
  
  const ownedFarms = ownedFarmsResponse?.data || [];
  const managedFarms = managedFarmsResponse?.data || [];
  
  const handleLanguageChange = async (newLanguage: string) => {
    try {
      await axiosInstance.patch('/users/preferences', { language: newLanguage });
      setLanguage(newLanguage as 'ENGLISH' | 'NEPALI');
      toast.success('Language updated successfully');
    } catch (error) {
      toast.error('Failed to update language');
    }
  };
  
  const handleCalendarChange = async (newCalendar: string) => {
    try {
      await axiosInstance.patch('/users/preferences', { calendarType: newCalendar });
      setCalendarType(newCalendar as 'AD' | 'BS');
      toast.success('Calendar preference updated successfully');
    } catch (error) {
      toast.error('Failed to update calendar preference');
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
      
      {/* Owned Farms */}
      {ownedFarms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Owned Farms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ownedFarmsLoading ? (
              <p className="text-sm text-muted-foreground">Loading farms...</p>
            ) : (
              ownedFarms.map((farm: any) => (
                <div key={farm.id} className="border rounded-lg p-4 space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Farm Name</Label>
                    <Input
                      value={farm.name}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Capacity</Label>
                    <Input
                      value={farm.capacity || "Not set"}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  {farm.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
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
            <CardTitle>Managed Farms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {managedFarmsLoading ? (
              <p className="text-sm text-muted-foreground">Loading farms...</p>
            ) : (
              managedFarms.map((farm: any) => (
                <div key={farm.id} className="border rounded-lg p-4 space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Farm Name</Label>
                    <Input
                      value={farm.name}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Capacity</Label>
                    <Input
                      value={farm.capacity || "Not set"}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  {farm.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
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
              No farms found. You don't own or manage any farms yet.
            </p>
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
