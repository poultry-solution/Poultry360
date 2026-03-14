"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { useAuth, useAuthStore } from "@/common/store/store";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { useI18n } from "@/i18n/useI18n";

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const { isRedirecting, handleLoginRedirect } = useLoginRedirect();
  const { t } = useI18n();
  const { isAuthenticated, isInitialized } = useAuthStore();

  // Redirect to dashboard if already authenticated (e.g. user navigates to /auth/login with valid session)
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const { user } = useAuthStore.getState();
      handleLoginRedirect(user?.role || "OWNER");
    }
  }, [isInitialized, isAuthenticated, handleLoginRedirect]);

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    // emailOrPhone will hold ONLY the 10 local digits; +977 is shown separately
    emailOrPhone: "",
    password: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Sanitize phone to digits only and cap at 10 when editing the phone field
    if (name === "emailOrPhone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (error) clearError();
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    try {
      // Normalize Nepal phone number: always prefix with +977 and require 10 digits
      let localDigits = formData.emailOrPhone.replace(/\D/g, "");
      // Strip leading 977 if user included country code (avoids +977977...)
      if (localDigits.startsWith("977")) {
        localDigits = localDigits.slice(3);
      }
      if (localDigits.length !== 10) {
        setValidationError(t("auth.login.phoneFormatError") || "Enter 10 digits without +977");
        return;
      }
      const normalizedPhone = `+977${localDigits}`;

      await login({
        emailOrPhone: normalizedPhone,
        password: formData.password,
      });

      // Get user data after successful login
      const { user, accessToken } = useAuthStore.getState();


      await handleLoginRedirect(user?.role || "OWNER");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  // Show loading screen during redirection
  if (isRedirecting) {
    return <AppLoadingScreen message={t("auth.login.redirecting")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center">
          <Link
            href="/"
            className="text-4xl shrink-0 font-[family-name:var(--font-caveat)]"
          >
            Poultry360
          </Link>
        </div>
      </div>
      <div className="w-full max-w-md mx-auto bg-card border rounded-xl p-6 shadow-sm mt-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("auth.login.welcomeBack")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("auth.login.subtitle")}
          </p>
        </div>

        {(error || validationError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error || validationError}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="emailOrPhone">{t("auth.login.phoneLabel")}</Label>
            <div className="flex items-stretch gap-0">
              <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground">
                <span aria-hidden>🇳🇵</span>
                <span className="text-sm font-medium">+977</span>
              </div>
              <Input
                id="emailOrPhone"
                name="emailOrPhone"
                value={formData.emailOrPhone}
                onChange={handleInputChange}
                inputMode="numeric"
                pattern="[0-9]{10}"
                placeholder={t("auth.login.phonePlaceholder")}
                className="rounded-l-none"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("auth.login.phoneHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.login.password")}</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
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
            {isLoading ? t("auth.login.submitting") : t("auth.login.submit")}
          </Button>
        </form>
        <div className="mt-3 text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-3 text-center">
          {t("auth.login.newTo")}{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            {t("auth.login.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}
