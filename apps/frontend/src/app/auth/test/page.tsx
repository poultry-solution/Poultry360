"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";

export default function TestSignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    entityType: "DEALER" as "DEALER" | "COMPANY",
    entityName: "",
    entityContact: "",
    entityAddress: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.name) {
      setError("Name is required");
      return false;
    }

    if (!formData.phone) {
      setError("Phone number is required");
      return false;
    }

    if (!formData.password) {
      setError("Password is required");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (!formData.entityName) {
      setError(`${formData.entityType} name is required`);
      return false;
    }

    // Contact is required only for Dealers
    if (formData.entityType === "DEALER" && !formData.entityContact) {
      setError("Dealer contact is required");
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
      const response = await fetch(`${API_BASE_URL}/auth/register-entity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          entityType: formData.entityType,
          entityName: formData.entityName,
          entityContact: formData.entityContact,
          entityAddress: formData.entityAddress || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Success - redirect to login or dashboard
      alert(
        `Successfully created ${formData.entityType} account! You can now login.`
      );
      router.push("/auth/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Test Signup - Create {formData.entityType}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create a new user account and {formData.entityType.toLowerCase()}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Entity Type Selection */}
            <div>
              <Label htmlFor="entityType">Account Type</Label>
              <select
                id="entityType"
                name="entityType"
                value={formData.entityType}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="DEALER">Dealer</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>

            {/* User Information */}
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+977 98XXXXXXXX"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password (min 6 characters)"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
              />
            </div>

            {/* Entity Information */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-4">
                {formData.entityType} Information
              </h3>

              <div>
                <Label htmlFor="entityName">
                  {formData.entityType} Name
                </Label>
                <Input
                  id="entityName"
                  name="entityName"
                  type="text"
                  required
                  value={formData.entityName}
                  onChange={handleInputChange}
                  placeholder={`Enter ${formData.entityType.toLowerCase()} name`}
                />
              </div>

              {formData.entityType === "DEALER" && (
                <div className="mt-4">
                  <Label htmlFor="entityContact">
                    {formData.entityType} Contact
                  </Label>
                  <Input
                    id="entityContact"
                    name="entityContact"
                    type="tel"
                    required
                    value={formData.entityContact}
                    onChange={handleInputChange}
                    placeholder="Contact phone number"
                  />
                </div>
              )}

              <div className="mt-4">
                <Label htmlFor="entityAddress">
                  {formData.entityType} Address (Optional)
                </Label>
                <Input
                  id="entityAddress"
                  name="entityAddress"
                  type="text"
                  value={formData.entityAddress}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                />
              </div>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : `Create ${formData.entityType} Account`}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Already have an account? Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

