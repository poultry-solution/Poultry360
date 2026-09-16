"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft, Phone, ShieldCheck, KeyRound, CheckCircle2 } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import axiosInstance from "@/common/lib/axios";

type Step = "phone" | "otp" | "new-password" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizedPhone = `+977${phone.replace(/\D/g, "").slice(0, 10)}`;

  const requestCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await axiosInstance.post("/auth/forgot-password/generate-otp", { phone: normalizedPhone });
      setOtp("");
      setStep("otp");
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to send a reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    await requestCode();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/auth/forgot-password/verify-otp", {
        phone: normalizedPhone,
        otp,
      });
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid or expired reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      await axiosInstance.post("/auth/forgot-password/reset", { resetToken, newPassword });
      setStep("success");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-100">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 lg:px-6">
          <Link href="/" className="shrink-0 text-4xl font-[family-name:var(--font-caveat)]">Poultry360</Link>
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-md">
        <Link href="/auth/login" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Login
        </Link>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {step === "phone" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10"><Phone className="size-6 text-primary" /></div>
                <h1 className="text-xl font-semibold text-foreground">Forgot Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Enter the phone number registered to your account.</p>
              </div>
              {error && <ErrorMessage message={error} />}
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-stretch">
                    <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground"><span aria-hidden>🇳🇵</span><span className="text-sm font-medium">+977</span></div>
                    <Input id="phone" value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }} inputMode="numeric" placeholder="98XXXXXXXX" className="rounded-l-none" required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Send reset code"}</Button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-blue-100"><ShieldCheck className="size-6 text-blue-600" /></div>
                <h1 className="text-xl font-semibold text-foreground">Enter reset code</h1>
                <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code by SMS. It expires in 10 minutes.</p>
              </div>
              {error && <ErrorMessage message={error} />}
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">SMS Code</Label>
                  <Input id="otp" value={otp} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} inputMode="numeric" placeholder="Enter 6-digit OTP" className="text-center font-mono text-lg tracking-[0.5em]" maxLength={6} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying..." : "Verify code"}</Button>
              </form>
              <div className="mt-4 text-center">
                <button type="button" onClick={requestCode} disabled={loading} className="text-sm text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">Resend code</button>
              </div>
            </>
          )}

          {step === "new-password" && (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-purple-100"><KeyRound className="size-6 text-purple-600" /></div>
                <h1 className="text-xl font-semibold text-foreground">Set New Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">Create a new password for your account.</p>
              </div>
              {error && <ErrorMessage message={error} />}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <PasswordField id="newPassword" label="New Password" value={newPassword} onChange={(value) => { setNewPassword(value); setError(null); }} show={showPassword} setShow={setShowPassword} placeholder="At least 6 characters" />
                <PasswordField id="confirmPassword" label="Confirm Password" value={confirmPassword} onChange={(value) => { setConfirmPassword(value); setError(null); }} show={showConfirm} setShow={setShowConfirm} placeholder="Re-enter your new password" />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? "Resetting..." : "Reset Password"}</Button>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-100"><CheckCircle2 className="size-7 text-green-600" /></div>
              <h1 className="text-xl font-semibold text-foreground">Password Reset Successful</h1>
              <p className="mb-6 mt-2 text-sm text-muted-foreground">Your password has been updated. You can now log in with it.</p>
              <Link href="/auth/login"><Button className="w-full">Go to Login</Button></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3"><p className="text-sm text-red-600">{message}</p></div>;
}

function PasswordField({ id, label, value, onChange, show, setShow, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; show: boolean; setShow: (show: boolean) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" required />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
