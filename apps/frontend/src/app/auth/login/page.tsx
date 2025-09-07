"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    emailOrPhone: "",
    password: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({
        emailOrPhone: formData.emailOrPhone.trim(),
        password: formData.password,
      });
      router.push("/dashboard/home");
    } catch (err) {
      console.error("Login failed:", err);
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
            <Label htmlFor="emailOrPhone">  Phone</Label>
            <Input
              id="emailOrPhone"
              name="emailOrPhone"
              placeholder=" +9779876543210"
              value={formData.emailOrPhone}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
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
