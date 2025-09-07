"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/store";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<
    "email" | "phone"
  >("email");

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    province: "Bagmati",
    location: "",
    countryCode: "+977",
    phone: "",
    email: "",
    farmsCount: "",
    totalCapacity: "",
    password: "",
    confirmPassword: "",
    gender: "OTHER" as "MALE" | "FEMALE" | "OTHER",
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
      alert("Passwords do not match!");
      return false;
    }

    if (formData.password.length < 6) {
      alert("Password must be at least 6 characters long!");
      return false;
    }

    if (!formData.email && !formData.phone) {
      alert("Please provide either an email or phone number!");
      return false;
    }

    return true;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Determine verification method based on what user provided
    if (formData.email && formData.phone) {
      // Both provided, let user choose
      setVerificationMethod("email"); // Default to email
    } else if (formData.email) {
      setVerificationMethod("email");
    } else {
      setVerificationMethod("phone");
    }

    // Simulate sending OTP
    console.log(
      `Sending OTP to ${verificationMethod === "email" ? formData.email : formData.countryCode + formData.phone}`
    );
    setStep("otp");
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp !== "11111") {
      alert("Invalid OTP! Please enter 11111 for testing.");
      return;
    }

    try {
      const email = formData.email;
      const name = formData.name;
      const companyFarmLocation = `${formData.province}, ${formData.location}`;

      const phone = formData.phone
        ? `${formData.countryCode}${formData.phone}`
        : undefined;
      const registerData = {
        name,
        email: email ? email : undefined,
        phone: phone ? phone : undefined,
        password: formData.password,
        gender: formData.gender,
        role: "OWNER" as const,
        companyName: formData.companyName,
        companyFarmLocation,
        companyFarmNumber: formData.farmsCount,
        companyFarmCapacity: parseInt(formData.totalCapacity) || 0,
      };

      await register(registerData);

      // Add 1 second delay before redirect to prevent white screen
      setTimeout(() => {
        router.push("/dashboard/home");
      }, 1000);
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  const getVerificationTarget = () => {
    if (verificationMethod === "email") {
      return formData.email;
    } else {
      return `${formData.countryCode}${formData.phone}`;
    }
  };

  const fillTestData = () => {
    const now = new Date();
    const timestamp = now.getTime();

    const phone = `98${timestamp.toString().slice(-8)}`;
    const email = `testuser${timestamp}@example.com`;

    const chooseToUSeEmailOrPhone = Math.random() < 0.5;



    setFormData({
      name: `Test User ${timestamp}`,
      companyName: `Test Farm Company ${timestamp}`,
      province: "Bagmati",
      location: `Test City ${timestamp}`,
      countryCode: "+977",
      phone: chooseToUSeEmailOrPhone ? phone : "",
      email: chooseToUSeEmailOrPhone ? "" : email,
      farmsCount: "2",
      totalCapacity: "1500",
      password: "test123",
      confirmPassword: "test123",
      gender: "MALE",
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
                  Create your account
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Start managing your farms in minutes.
                </p>
                <button
                  type="button"
                  onClick={fillTestData}
                  className="mt-3 px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border"
                >
                  🧪 Fill Test Data
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Poultry360 Farms Pvt. Ltd."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Owner name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ram Shrestha"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Province (Nepal)</Label>
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
                    <Label htmlFor="location">Location (city / area) *</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="Bharatpur, Chitwan"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="company@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex gap-2">
                    <select
                      id="countryCode"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      aria-label="Country code"
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
                      placeholder="98765 43210"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide either email or phone number (or both) for account
                    verification
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="farmsCount">Number of farms *</Label>
                    <Input
                      id="farmsCount"
                      name="farmsCount"
                      type="number"
                      min={1}
                      value={formData.farmsCount}
                      onChange={handleInputChange}
                      placeholder="1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalCapacity">
                    Total capacity (birds) *
                  </Label>
                  <Input
                    id="totalCapacity"
                    name="totalCapacity"
                    type="number"
                    min={1}
                    value={formData.totalCapacity}
                    onChange={handleInputChange}
                    placeholder="1000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
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
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
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
                  {isLoading ? "Creating account..." : "Continue"}
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
                  Verify your account
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  We've sent a verification code to
                </p>
                <p className="text-sm font-medium text-foreground">
                  {getVerificationTarget()}
                </p>
              </div>

              {/* Option to switch verification method if both email and phone are provided */}
              {formData.email && formData.phone && (
                <div className="mb-6 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-600 mb-2">
                    Didn't receive the code?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("email")}
                      className={`px-3 py-1 rounded text-xs ${
                        verificationMethod === "email"
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Send to Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationMethod("phone")}
                      className={`px-3 py-1 rounded text-xs ${
                        verificationMethod === "phone"
                          ? "bg-primary text-primary-foreground"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      Send to Phone
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code *</Label>
                  <Input
                    id="otp"
                    name="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    required
                    maxLength={6}
                    className="text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-blue-600 text-center">
                    For testing: use code <strong>11111</strong>
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isLoading
                    ? "Creating Account..."
                    : "Verify & Create Account"}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setOtp("");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  ← Back to form
                </button>
              </form>
            </>
          )}

          <p className="text-sm text-muted-foreground mt-6 text-center">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
