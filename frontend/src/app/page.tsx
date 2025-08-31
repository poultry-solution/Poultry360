import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Download, Check, Mail, Phone, MapPin, Send, BarChart3, Users, Shield, Zap, TrendingUp, Calendar, Database, Smartphone, Star, Quote } from "lucide-react";

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

      {/* Features Section */}
      <section id="features" className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Poultry Farming
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Everything you need to run a successful poultry business, from bird health monitoring to financial management.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 - Bird Health Monitoring */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Bird Health Monitoring</h3>
              <p className="text-gray-600">
                Track vaccination schedules, monitor mortality rates, and maintain health records for every bird in your flock.
              </p>
            </div>

            {/* Feature 2 - Feed Management */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Feed Management</h3>
              <p className="text-gray-600">
                Monitor feed consumption, track inventory levels, and optimize feeding schedules for maximum growth efficiency.
              </p>
            </div>

            {/* Feature 3 - Financial Tracking */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Tracking</h3>
              <p className="text-gray-600">
                Calculate profits, track expenses, manage invoices, and get real-time insights into your farm&apos;s financial health.
              </p>
            </div>

            {/* Feature 4 - Production Planning */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Production Planning</h3>
              <p className="text-gray-600">
                Plan production cycles, schedule vaccinations, and optimize breeding programs for maximum yield.
              </p>
            </div>

            {/* Feature 5 - Mobile Access */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Mobile Access</h3>
              <p className="text-gray-600">
                Access your farm data anywhere, anytime. Monitor your poultry operations on the go with our mobile app.
              </p>
            </div>

            {/* Feature 6 - Team Management */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Team Management</h3>
              <p className="text-gray-600">
                Manage farm workers, assign tasks, track performance, and ensure smooth operations across your team.
              </p>
            </div>
          </div>

          {/* Additional Features Row */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-time Alerts</h4>
              <p className="text-sm text-gray-600">Get instant notifications for critical events</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Data Security</h4>
              <p className="text-sm text-gray-600">Your farm data is protected with enterprise-grade security</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Analytics Dashboard</h4>
              <p className="text-sm text-gray-600">Comprehensive reports and insights for better decisions</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Multi-platform</h4>
              <p className="text-sm text-gray-600">Access from web, mobile, and tablet devices</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <Badge className="bg-[#4CAF50] text-white px-4 py-2 rounded-full mb-4">
              <Star className="w-4 h-4 mr-2" />
              Trusted by 500+ Farmers
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              What Our Farmers Say
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real stories from poultry farmers who transformed their business with Poultry360
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {/* Review Card 1 */}
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-8">
                <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">R</span>
                </div>
              </div>
              
              <div className="flex items-center mb-4 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <Quote className="w-8 h-8 text-[#4CAF50] mb-4 opacity-50" />
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                &ldquo;Poultry360 transformed my broiler farm completely. The health monitoring feature helped me reduce mortality by 40%. 
                Now I can track everything from my phone - feed consumption, vaccinations, profits. It&apos;s like having a farm manager in my pocket!&rdquo;
              </p>
              
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-900">Rajesh Kumar</h4>
                <p className="text-sm text-gray-600">Broiler Farmer, Haryana</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Verified User</span>
                </div>
              </div>
            </div>

            {/* Review Card 2 */}
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-8">
                <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">P</span>
                </div>
              </div>
              
              <div className="flex items-center mb-4 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <Quote className="w-8 h-8 text-[#4CAF50] mb-4 opacity-50" />
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                &ldquo;The financial tracking feature is a game-changer! I can now see exactly where my money is going and calculate real profits. 
                The mobile app is so easy to use - even my farm workers can update data. My production has increased by 25% since using Poultry360.&rdquo;
              </p>
              
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-900">Priya Sharma</h4>
                <p className="text-sm text-gray-600">Layer Farmer, Punjab</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Verified User</span>
                </div>
              </div>
            </div>

            {/* Review Card 3 */}
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="absolute -top-4 left-8">
                <div className="w-16 h-16 bg-[#4CAF50] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">A</span>
                </div>
              </div>
              
              <div className="flex items-center mb-4 mt-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              
              <Quote className="w-8 h-8 text-[#4CAF50] mb-4 opacity-50" />
              
              <p className="text-gray-700 mb-6 leading-relaxed">
                &ldquo;As a feed dealer, Poultry360 helps me manage inventory and track customer orders efficiently. 
                The analytics dashboard gives me insights I never had before. My business has grown 30% since implementing this system.&rdquo;
              </p>
              
              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-900">Amit Patel</h4>
                <p className="text-sm text-gray-600">Feed Dealer, Gujarat</p>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-500">Verified User</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-4 gap-8 bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-[#4CAF50] mb-2">500+</div>
              <p className="text-gray-600">Active Farmers</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#4CAF50] mb-2">4.9/5</div>
              <p className="text-gray-600">Average Rating</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#4CAF50] mb-2">25%</div>
              <p className="text-gray-600">Avg. Production Increase</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-[#4CAF50] mb-2">24/7</div>
              <p className="text-gray-600">Customer Support</p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Join Our Success Stories?
            </h3>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Start your journey with Poultry360 today and transform your poultry farming business like hundreds of other farmers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-[#4CAF50] hover:bg-[#45a049] text-white px-8 py-3 rounded-lg">
                Start Free Trial
              </Button>
              <Button variant="outline" className="border-[#4CAF50] text-[#4CAF50] hover:bg-[#4CAF50] hover:text-white px-8 py-3 rounded-lg">
                View More Reviews
              </Button>
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

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">P</span>
                </div>
                <span className="text-xl font-bold">Poultry360</span>
              </div>
              <p className="text-gray-300 mb-6 max-w-md">
                Transforming poultry farming with smart technology. From broiler management to comprehensive farm solutions, 
                we help farmers succeed in the modern agricultural landscape.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#4CAF50] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#4CAF50] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-[#4CAF50] transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
              <ul className="space-y-3">
                <li><a href="#home" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Home</a></li>
                <li><a href="#features" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Features</a></li>
                <li><a href="#contact" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Contact</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">About Us</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h3 className="text-lg font-semibold mb-6">Solutions</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Broiler Management</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Layer Farming</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Hatchery Operations</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Feed Distribution</a></li>
                <li><a href="#" className="text-gray-300 hover:text-[#4CAF50] transition-colors">Farm Analytics</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2024 Poultry360. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-[#4CAF50] text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-[#4CAF50] text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-[#4CAF50] text-sm transition-colors">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}   