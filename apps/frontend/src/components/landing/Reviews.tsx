import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Star, Quote } from "lucide-react";

export default function Reviews() {
  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-primary text-primary-foreground px-4 py-2 rounded-full mb-4">
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
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">R</span>
              </div>
            </div>
            
            <div className="flex items-center mb-4 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
            
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
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">P</span>
              </div>
            </div>
            
            <div className="flex items-center mb-4 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
            
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
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">A</span>
              </div>
            </div>
            
            <div className="flex items-center mb-4 mt-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
              ))}
            </div>
            
            <Quote className="w-8 h-8 text-primary mb-4 opacity-50" />
            
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
            <div className="text-3xl font-bold text-primary mb-2">500+</div>
            <p className="text-gray-600">Active Farmers</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
            <p className="text-gray-600">Average Rating</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">25%</div>
            <p className="text-gray-600">Avg. Production Increase</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
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
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg">
              Start Free Trial
            </Button>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-lg">
              View More Reviews
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
