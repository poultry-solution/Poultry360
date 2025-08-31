import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Download, Check, Mail, Phone, MapPin, Send } from "lucide-react";

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
              so you can focus on growing your poultry business. 
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

      {/* Contact Section */}
      <section id="contact" className="bg-gray-50 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ready to transform your poultry business? Contact us today and let&apos;s discuss how Poultry360 can help you succeed.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h3>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                      placeholder="Enter your first name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                      placeholder="Enter your last name"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label htmlFor="farmType" className="block text-sm font-medium text-gray-700 mb-2">
                    Farm Type
                  </label>
                  <select
                    id="farmType"
                    name="farmType"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent"
                  >
                    <option value="">Select your farm type</option>
                    <option value="broiler">Broiler Farming</option>
                    <option value="layer">Layer Farming</option>
                    <option value="hatchery">Hatchery</option>
                    <option value="feed-dealer">Feed Dealer</option>
                    <option value="mixed">Mixed Farming</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4CAF50] focus:border-transparent resize-none"
                    placeholder="Tell us about your poultry farming needs..."
                    required
                  ></textarea>
                </div>

                <Button type="submit" className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white py-3 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact Information */}
            <div className="space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
                <p className="text-gray-600 mb-8">
                  Have questions about Poultry360? We&apos;re here to help you get started with smart poultry management.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Email</h4>
                    <p className="text-gray-600">info@poultry360.com</p>
                    <p className="text-gray-600">support@poultry360.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Phone</h4>
                    <p className="text-gray-600">+91 98765 43210</p>
                    <p className="text-gray-600">+91 98765 43211</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Office</h4>
                    <p className="text-gray-600">Poultry360 Solutions Pvt. Ltd.</p>
                    <p className="text-gray-600">123 Farm Tech Park, Sector 15</p>
                    <p className="text-gray-600">Gurgaon, Haryana 122001</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <h4 className="font-semibold text-gray-900 mb-3">Business Hours</h4>
                <div className="space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>Monday - Friday</span>
                    <span>9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span>9:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span>Closed</span>
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