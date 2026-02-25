"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { Eye, EyeOff, Building2 } from "lucide-react";
import axiosInstance from "@/common/lib/axios";
import { useAuthStore } from "@/common/store/store";
import { useI18n } from "@/i18n/useI18n";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function CompanySignupPage() {
    const { t } = useI18n();
    const { isRedirecting, handleLoginRedirect } = useLoginRedirect();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        ownerName: "",
        phone: "",
        password: "",
        confirmPassword: "",
        companyName: "",
        companyAddress: "",
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
            setError(t("auth.companySignup.errors.ownerNameRequired"));
            return false;
        }

        if (!formData.phone || formData.phone.length !== 10) {
            setError(t("auth.companySignup.errors.phoneInvalid"));
            return false;
        }

        if (!formData.companyName.trim()) {
            setError(t("auth.companySignup.errors.companyNameRequired"));
            return false;
        }

        if (!formData.password || formData.password.length < 6) {
            setError(t("auth.companySignup.errors.passwordTooShort"));
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError(t("auth.companySignup.errors.passwordMismatch"));
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
                entityType: "COMPANY",
                entityName: formData.companyName,
                entityAddress: formData.companyAddress || undefined,
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
                    dealer: null,
                    company: user.company,
                },
                accessToken,
                isAuthenticated: true,
                isInitialized: true,
            });

            await handleLoginRedirect(user.role || "COMPANY");
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                err.message ||
                t("auth.companySignup.errors.registrationFailed")
            );
            console.error("Registration error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isRedirecting) {
        return <AppLoadingScreen message={t("auth.login.redirecting")} />;
    }

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
                            <Building2 className="w-8 h-8 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            {t("auth.companySignup.title")}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("auth.companySignup.subtitle")}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ownerName">{t("auth.companySignup.ownerNameLabel")}</Label>
                            <Input
                                id="ownerName"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">{t("auth.companySignup.phoneLabel")}</Label>
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
                                        placeholder={t("auth.companySignup.phonePlaceholder")}
                                        className="rounded-l-none"
                                        required
                                    />
                                </div>
                            <p className="text-xs text-muted-foreground">
                                {t("auth.companySignup.phoneHelp")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyName">{t("auth.companySignup.companyNameLabel")}</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleInputChange}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("auth.companySignup.companyNameHelp")}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyAddress">{t("auth.companySignup.companyAddressLabel")}</Label>
                            <Input
                                id="companyAddress"
                                name="companyAddress"
                                value={formData.companyAddress}
                                onChange={handleInputChange}
                                placeholder={t("auth.companySignup.companyAddressPlaceholder")}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">{t("auth.companySignup.passwordLabel")}</Label>
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
                            <Label htmlFor="confirmPassword">{t("auth.companySignup.confirmPasswordLabel")}</Label>
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
                            {isLoading ? t("auth.companySignup.creatingAccount") : t("auth.companySignup.createAccount")}
                        </Button>
                    </form>

                    <div className="mt-6 space-y-2">
                        <p className="text-sm text-muted-foreground text-center">
                            {t("auth.companySignup.alreadyHaveAccount")}{" "}
                            <Link href="/auth/login" className="text-primary hover:underline">
                                {t("auth.companySignup.login")}
                            </Link>
                        </p>
                        <p className="text-sm text-muted-foreground text-center">
                            {t("auth.companySignup.registerOwner")}{" "}
                            <Link
                                href="/auth/signup"
                                className="text-primary hover:underline"
                            >
                                {t("auth.companySignup.signupOwner")}
                            </Link>
                        </p>
                        <p className="text-sm text-muted-foreground text-center">
                            {t("auth.companySignup.registerDealer")}{" "}
                            <Link
                                href="/auth/signup/dealer"
                                className="text-primary hover:underline"
                            >
                                {t("auth.companySignup.signupDealer")}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
