import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Download, Check } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-100 px-4 lg:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#4CAF50] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Poultry360</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#home" className="text-gray-700 hover:text-[#4CAF50] transition-colors">
              Home
            </a>
            <a href="#features" className="text-gray-700 hover:text-[#4CAF50] transition-colors">
              Features
            </a>
            <div className="relative group">
              <a href="#resources" className="text-gray-700 hover:text-[#4CAF50] transition-colors flex items-center">
                Resources
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </a>
            </div>
            <a href="#contact" className="text-gray-700 hover:text-[#4CAF50] transition-colors">
              Contact
            </a>
          </div>

          {/* CTA Button */}
          <Button className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-6 py-2 rounded-lg">
            Get Started &gt;
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-6 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            {/* Trust Badge */}
            <Badge className="bg-[#4CAF50] text-white px-3 py-1 rounded-full flex items-center w-fit">
              <Check className="w-4 h-4 mr-2" />
              Trusted by 500+ Poultry Farmers
            </Badge>

            {/* Main Heading */}
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Manage Your Poultry Farm
              <span className="text-[#4CAF50]"> Anytime, Anywhere</span>
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed">
              Poultry360 makes your poultry business simple, smart, and stress-free. 
              Easily track sales, manage expenses, maintain ledgers, control inventory & more 
              so you can focus on growing your poultry business. Start with Broiler farming, 
              then scale to Layers, Hatchery & Feed dealers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-8 py-3 rounded-lg flex items-center">
                <Monitor className="w-5 h-5 mr-2" />
                Use Web Version
              </Button>
              <Button variant="outline" className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white px-8 py-3 rounded-lg flex items-center">
                <Download className="w-5 h-5 mr-2" />
                Download Poultry360
              </Button>
            </div>
          </div>

          {/* Right Column - Visual Illustration */}
          <div className="relative">
            {/* Background Shape */}
            <div className="absolute inset-0 bg-[#4CAF50] rounded-[3rem] transform rotate-3 scale-105 opacity-10"></div>
            
            {/* Main Illustration Container */}
            <div className="relative bg-white rounded-[2rem] p-8 shadow-2xl border border-gray-100">
              {/* Central Figure - Poultry Farmer */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-4xl">👨‍🌾</span>
                </div>
              </div>

              {/* Floating UI Elements */}
              <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-lg border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-xs font-medium">Notifications</span>
                </div>
              </div>

              <div className="absolute top-16 left-4 bg-white rounded-lg p-3 shadow-lg border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-xs font-medium">Payment Due</span>
                </div>
              </div>

              <div className="absolute bottom-16 right-8 bg-white rounded-lg p-3 shadow-lg border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-xs font-medium">Low Stock Alert</span>
                </div>
              </div>

              {/* App Interface Mockup */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="space-y-2">
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="flex justify-between mt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#4CAF50]">1,250</div>
                    <div className="text-xs text-gray-500">Birds</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#4CAF50]">₹45,000</div>
                    <div className="text-xs text-gray-500">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-[#4CAF50]">85%</div>
                    <div className="text-xs text-gray-500">Health</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}   