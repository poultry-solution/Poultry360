"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { Eye, EyeOff, Store } from "lucide-react";
import axiosInstance from "@/common/lib/axios";
import { useAuthStore } from "@/common/store/store";
import { PublicCompanySearchSelect } from "@/common/components/forms/PublicCompanySearchSelect";
import { useI18n } from "@/i18n/useI18n";

export default function DealerSignupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    ownerName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    dealerName: "",
    dealerAddress: "",
    companyId: null as string | null,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // Only allow digits, max 10 characters
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.ownerName.trim()) {
      setError(t("auth.dealerSignup.errors.ownerNameRequired"));
      return false;
    }

    if (!formData.phone || formData.phone.length !== 10) {
      setError(t("auth.dealerSignup.errors.phoneInvalid"));
      return false;
    }

    if (!formData.dealerName.trim()) {
      setError(t("auth.dealerSignup.errors.dealerNameRequired"));
      return false;
    }

    if (!formData.password || formData.password.length < 6) {
      setError(t("auth.dealerSignup.errors.passwordTooShort"));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("auth.dealerSignup.errors.passwordMismatch"));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const phoneWithPrefix = `+977${formData.phone}`;

      const response = await axiosInstance.post("/auth/register-entity", {
        name: formData.ownerName,
        phone: phoneWithPrefix,
        password: formData.password,
        entityType: "DEALER",
        entityName: formData.dealerName,
        entityContact: phoneWithPrefix, // Use same phone for contact
        entityAddress: formData.dealerAddress || undefined,
        companyId: formData.companyId || undefined,
      });

      const { accessToken, user } = response.data;

      // Update auth store
      useAuthStore.setState({
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          companyName: user.companyName,
          companyFarmLocation: user.companyFarmLocation,
          role: user.role,
          status: user.status,
          language: user.language || "ENGLISH",
          calendarType: user.calendarType || "AD",
          managedFarms: [],
          ownedFarms: [],
          dealer: user.dealer,
          company: null,
        },
        accessToken,
        isAuthenticated: true,
      });

      // Redirect to dealer dashboard
      setTimeout(() => {
        router.push("/dealer/dashboard/home");
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t("auth.dealerSignup.errors.registrationFailed")
      );
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">
                P
              </span>
            </div>
            <span className="font-bold text-foreground">Poultry360</span>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-card border rounded-xl p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t("auth.dealerSignup.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.dealerSignup.subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ownerName">{t("auth.dealerSignup.ownerNameLabel")}</Label>
              <Input
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.dealerSignup.phoneLabel")}</Label>
              <div className="flex items-stretch gap-0">
                <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground">
                  <span aria-hidden>🇳🇵</span>
                  <span className="text-sm font-medium">+977</span>
                </div>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  placeholder={t("auth.dealerSignup.phonePlaceholder")}
                  className="rounded-l-none"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("auth.dealerSignup.phoneHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealerName">{t("auth.dealerSignup.dealerNameLabel")}</Label>
              <Input
                id="dealerName"
                name="dealerName"
                value={formData.dealerName}
                onChange={handleInputChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("auth.dealerSignup.dealerNameHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dealerAddress">{t("auth.dealerSignup.dealerAddressLabel")}</Label>
              <Input
                id="dealerAddress"
                name="dealerAddress"
                value={formData.dealerAddress}
                onChange={handleInputChange}
                placeholder={t("auth.dealerSignup.dealerAddressPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <PublicCompanySearchSelect
                value={formData.companyId}
                onValueChange={(value: string | null) =>
                  setFormData({ ...formData, companyId: value })
                }
                placeholder={t("auth.dealerSignup.companyPlaceholder")}
                label={t("auth.dealerSignup.companyLabel")}
              />
              <p className="text-xs text-muted-foreground">
                {t("auth.dealerSignup.companyHelp")}
              </p>
            </div>


            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.dealerSignup.passwordLabel")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.dealerSignup.confirmPasswordLabel")}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? t("auth.dealerSignup.creatingAccount") : t("auth.dealerSignup.createAccount")}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.dealerSignup.alreadyHaveAccount")}{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                {t("auth.dealerSignup.login")}
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.dealerSignup.registerOwner")}{" "}
              <Link
                href="/auth/signup"
                className="text-primary hover:underline"
              >
                {t("auth.dealerSignup.signupOwner")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
