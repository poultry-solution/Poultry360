"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { useAuth, useAuthStore } from "@/common/store/store";
import { useLoginRedirect } from "@/common/hooks/useRoleBasedRouting";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();
  const { isRedirecting, handleLoginRedirect } = useLoginRedirect();

  const [formData, setFormData] = useState({
    // emailOrPhone will hold ONLY the 10 local digits; +977 is shown separately
    emailOrPhone: "",
    password: "",
  });

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Normalize Nepal phone number: always prefix with +977 and require 10 digits
      const localDigits = formData.emailOrPhone.replace(/\D/g, "");
      if (localDigits.length !== 10) {
        // Do not proceed if not exactly 10 digits
        return;
      }
      const normalizedPhone = `+977${localDigits}`;

      await login({
        emailOrPhone: normalizedPhone,
        password: formData.password,
      });

      // Get user data after successful login
      const { user, accessToken } = useAuthStore.getState();

      // TODO: Handle doctor cross-port navigation when implementing unified architecture
      // if (user?.role === "DOCTOR") {
      //   // Store auth data for cross-port navigation
      //   console.log('🔍 Main app - storing auth data for doctor navigation');
      //   const emailForAuth = (user as unknown as { email?: string })?.email ?? "";
      //   crossPortAuth.setAuthData({
      //     accessToken: accessToken!,
      //     user: {
      //       id: user.id,
      //       name: user.name,
      //       phone: user.phone,
      //       role: user.role,
      //       email: (user as any).email || "",
      //       companyName: user.companyName,
      //     },
      //   });
      // }

      // Use the new role-based redirection system
      await handleLoginRedirect(user?.role || "OWNER");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  // Show loading screen during redirection
  if (isRedirecting) {
    return <AppLoadingScreen message="Redirecting to your dashboard..." />;
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
      <div className="w-full max-w-md mx-auto bg-card border rounded-xl p-6 shadow-sm mt-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Log in to your account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="emailOrPhone">Phone</Label>
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
                placeholder="98XXXXXXXX"
                className="rounded-l-none"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the 10-digit Nepal number (without country code).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          New to Poultry360?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
