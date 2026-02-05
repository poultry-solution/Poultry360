"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { useAuth, useAuthStore } from "@/common/store/store";
import { PublicDealerSearchSelect } from "@/common/components/forms/PublicDealerSearchSelect";
// import { crossPortAuth } from "@myapp/shared-auth"; // Removed - no longer using shared packages
import { Eye, EyeOff, CheckCircle } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

export default function SignupPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  const { t } = useI18n();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    province: "Bagmati",
    location: "",
    countryCode: "+977",
    phone: "",
    password: "",
    confirmPassword: "",
    language: "ENGLISH",
    calendarType: "AD",
    dealerId: null as string | null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (error) clearError();
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      alert(t("auth.signup.errors.passwordMismatch"));
      return false;
    }

    if (formData.password.length < 6) {
      alert(t("auth.signup.errors.passwordTooShort"));
      return false;
    }

    if (!formData.phone) {
      alert(t("auth.signup.errors.phoneRequired"));
      return false;
    }

    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Phone verification only

    // Simulate sending OTP
    console.log(
      `Sending OTP to ${formData.countryCode + formData.phone}`
    );
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp !== "11111") {
      alert(t("auth.signup.errors.invalidOtp"));
      return;
    }

    try {
      const name = formData.name;
      const companyFarmLocation = `${formData.province}, ${formData.location}`;

      const phone = `${formData.countryCode}${formData.phone}`;
      const registerData = {
        name,
        phone,
        password: formData.password,
        role: "OWNER" as const,
        companyName: formData.companyName,
        companyFarmLocation,
        language: formData.language as "ENGLISH" | "NEPALI",
        calendarType: formData.calendarType as "AD" | "BS",
        dealerId: formData.dealerId || undefined,
      };

      await register(registerData);

      // Check user role and redirect accordingly
      const { user, accessToken } = useAuthStore.getState();
      // TODO: Handle doctor cross-port navigation when implementing unified architecture
      // if (user?.role === "DOCTOR") {
      //   // Store auth data and navigate to doctor app using shared-auth
      //   crossPortAuth.setAuthData({
      //     accessToken: accessToken!,
      //     user: {
      //       id: user.id,
      //       name: user.name,
      //       phone: user.phone,
      //       role: user.role,
      //       companyName: user.companyName,
      //     },
      //   });
      //   setTimeout(() => {
      //     crossPortAuth.navigateToDoctorApp();
      //   }, 1000);
      // } else {
      // Redirect farmers/managers to farmer dashboard
      setTimeout(() => {
        router.push("/dashboard/home");
      }, 1000);
      // }
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  const getVerificationTarget = () => {
    return `${formData.countryCode}${formData.phone}`;
  };

  const fillTestData = () => {
    const now = new Date();
    const timestamp = now.getTime();

    const phone = `98${timestamp.toString().slice(-8)}`;

    setFormData({
      name: `Test User ${timestamp}`,
      companyName: `Test Farm Company ${timestamp}`,
      province: "Bagmati",
      location: `Test City ${timestamp}`,
      countryCode: "+977",
      phone: phone,
      password: "test123",
      confirmPassword: "test123",
      language: "ENGLISH",
      calendarType: "AD",
      dealerId: null,
    });
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
          {step === "form" ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-foreground">
                  {t("auth.signup.title")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("auth.signup.subtitle")}
                </p>
                <button
                  type="button"
                  onClick={fillTestData}
                  className="mt-3 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border"
                >
                  🧪 {t("auth.signup.fillTestData")}
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t("auth.signup.companyNameLabel")}</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">{t("auth.signup.ownerNameLabel")}</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">{t("auth.signup.provinceLabel")}</Label>
                    <select
                      id="province"
                      name="province"
                      value={formData.province}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="Koshi">Koshi Province</option>
                      <option value="Madhesh">Madhesh Province</option>
                      <option value="Bagmati">Bagmati Province</option>
                      <option value="Gandaki">Gandaki Province</option>
                      <option value="Lumbini">Lumbini Province</option>
                      <option value="Karnali">Karnali Province</option>
                      <option value="Sudurpashchim">
                        Sudurpashchim Province
                      </option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">{t("auth.signup.locationLabel")}</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t("auth.signup.phoneLabel")}</Label>
                  <div className="flex gap-2">
                    <select
                      id="countryCode"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label={t("auth.signup.countryCodeLabel")}
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+977">+977 (NP)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                    </select>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("auth.signup.phoneHelp")}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">{t("auth.signup.languageLabel")}</Label>
                    <select
                      id="language"
                      name="language"
                      value={formData.language}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="ENGLISH">{t("settings.languageEnglish")}</option>
                      <option value="NEPALI">{t("settings.languageNepali")}</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calendarType">{t("auth.signup.calendarLabel")}</Label>
                    <select
                      id="calendarType"
                      name="calendarType"
                      value={formData.calendarType}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="AD">{t("settings.calendarAD")}</option>
                      <option value="BS">{t("settings.calendarBS")}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <PublicDealerSearchSelect
                    value={formData.dealerId}
                    onValueChange={(value: string | null) =>
                      setFormData({ ...formData, dealerId: value })
                    }
                    placeholder={t("auth.signup.dealerPlaceholder")}
                    label={t("auth.signup.dealerLabel")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("auth.signup.dealerHelp")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.signup.passwordLabel")}</Label>
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
                  <Label htmlFor="confirmPassword">{t("auth.signup.confirmPasswordLabel")}</Label>
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
                  {isLoading ? t("auth.signup.creatingAccount") : t("auth.signup.continue")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground">
                  {t("auth.signup.verifyTitle")}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("auth.signup.verifySubtitle")}
                </p>
                <p className="text-sm font-medium text-foreground">
                  {getVerificationTarget()}
                </p>
              </div>


              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">{t("auth.signup.verificationCodeLabel")}</Label>
                  <Input
                    id="otp"
                    name="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-blue-600 text-center">
                    {t("auth.signup.otpTestHint", { code: "11111" })}
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading
                    ? t("auth.signup.creatingAccount")
                    : t("auth.signup.verifyCreate")}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  ← {t("auth.signup.backToForm")}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.signup.alreadyHaveAccount")}{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                {t("auth.signup.login")}
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.signup.registerDealer")}{" "}
              <Link
                href="/auth/signup/dealer"
                className="text-primary hover:underline"
              >
                {t("auth.signup.signupDealer")}
              </Link>
            </p>

          </div>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {t("auth.signup.registerCompany")}{" "}
              <Link
                href="/auth/signup/company"
                className="text-primary hover:underline"
              >
                {t("auth.signup.signupCompany")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
