"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Phone, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import axiosInstance from "@/common/lib/axios";

type Step = "phone" | "otp-info" | "otp-verify" | "new-password" | "success";

const ADMIN_CONTACT = "+977 9810000001";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedPhone = `+977${phone.replace(/\D/g, "").slice(0, 10)}`;

  // Step 1: Submit phone number
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setStep("otp-info");
  };

  // Step 2: Generate OTP
  const handleGenerateOtp = async () => {
    setError(null);
    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password/generate-otp", {
        phone: normalizedPhone,
      });
      setStep("otp-verify");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to generate OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify OTP only
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password/verify-otp", {
        phone: normalizedPhone,
        otp,
      });
      setStep("new-password");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid or expired OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password/reset", {
        phone: normalizedPhone,
        otp,
        newPassword,
      });
      setStep("success");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      <div className="w-full max-w-md mx-auto mt-10">
        {/* Back to login */}
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Login
        </Link>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {/* ====== STEP 1: Enter phone ====== */}
          {step === "phone" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="size-6 text-primary" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  Forgot Password
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter your registered phone number to start the reset process
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-stretch gap-0">
                    <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground">
                      <span aria-hidden>🇳🇵</span>
                      <span className="text-sm font-medium">+977</span>
                    </div>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setError(null);
                      }}
                      inputMode="numeric"
                      placeholder="98XXXXXXXX"
                      className="rounded-l-none"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Continue
                </Button>
              </form>
            </>
          )}

          {/* ====== STEP 2: OTP Info - explain process ====== */}
          {step === "otp-info" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-orange-100">
                  <ShieldCheck className="size-6 text-orange-600" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  Generate OTP
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  An OTP will be generated for your account. You will need to contact the admin to get this OTP.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="mb-5 rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">How it works:</p>
                <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Click &quot;Generate OTP&quot; below</li>
                  <li>Call the admin to get your OTP code</li>
                  <li>Enter the OTP and set your new password</li>
                </ol>
                <div className="pt-2 border-t mt-3">
                  <p className="text-xs text-muted-foreground">Admin Contact</p>
                  <p className="text-sm font-semibold">{ADMIN_CONTACT}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setStep("phone"); setError(null); }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGenerateOtp}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate OTP"}
                </Button>
              </div>
            </>
          )}

          {/* ====== STEP 3: Enter OTP ====== */}
          {step === "otp-verify" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-blue-100">
                  <ShieldCheck className="size-6 text-blue-600" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  Enter OTP
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the 6-digit OTP you received from admin
                </p>
              </div>

              {/* Admin contact reminder */}
              <div className="mb-4 rounded-lg border bg-blue-50 border-blue-200 p-3 flex items-center gap-3">
                <Phone className="size-4 text-blue-600 shrink-0" />
                <div>
                  <p className="text-xs text-blue-600">Call admin for your OTP</p>
                  <p className="text-sm font-semibold text-blue-800">{ADMIN_CONTACT}</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP Code</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError(null);
                    }}
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    maxLength={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            </>
          )}

          {/* ====== STEP 4: Set new password ====== */}
          {step === "new-password" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-purple-100">
                  <KeyRound className="size-6 text-purple-600" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">
                  Set New Password
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Create a new password for your account
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                      placeholder="At least 6 characters"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Re-enter your new password"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}

          {/* ====== STEP 5: Success ====== */}
          {step === "success" && (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="size-7 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">
                Password Reset Successful
              </h1>
              <p className="text-sm text-muted-foreground mt-2 mb-6">
                Your password has been updated. You can now login with your new password.
              </p>
              <Link href="/auth/login">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
