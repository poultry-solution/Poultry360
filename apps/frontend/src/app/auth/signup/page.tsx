"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/store";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    province: "Bagmati",
    location: "",
    countryCode: "+977",
    phone: "",
    farmsCount: "",
    totalCapacity: "",
    password: "",
    confirmPassword: "",
    // Updated fields to match new schema
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    try {
      // Generate email from farm name or phone if not provided
      const email = `${formData.companyName.toLowerCase().replace(/\s+/g, '')}@farm.com` || 
                   `user${formData.phone.slice(-4)}@farm.com`;
      
      // Generate name from farm name
      const name = formData.companyName || 'Farm Owner';
      
      const registerData = {
        name,
        email,
        phone: `${formData.countryCode}${formData.phone}`,
        password: formData.password,
        gender: "OTHER" as const,
        role: "OWNER" as const,
      };

      await register(registerData);
      
      // Registration successful, redirect to dashboard
      router.push("/dashboard");
      
    } catch (err) {
      // Error is already handled by the store
      console.error("Registration failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-foreground">Poultry360</span>
          </Link>
        </div>
      </div>
      
      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-card border rounded-xl p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start managing your farms in minutes.</p>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="farmName"> Company name *</Label>
              <Input 
                id="farmName" 
                name="farmName" 
                value={formData.companyName}
                onChange={handleInputChange}
                placeholder="Poultry360 Farms Pvt. Ltd." 
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
                  <option value="Sudurpashchim">Sudurpashchim Province</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location (city / area)</Label>
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
              <Label htmlFor="phone">Phone *</Label>
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
                  required 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmsCount">Number of farms</Label>
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
              
              <div className="space-y-2">
                <Label htmlFor="totalCapacity">Total capacity (birds)</Label>
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Re-enter Password *</Label>
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </Button>
          </form>
          
          <p className="text-sm text-muted-foreground mt-4 text-center">
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