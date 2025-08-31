import { Badge } from "@/components/ui/badge";

export default function Features() {
  return (
    <section id="features" className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-6">
        <div className="text-center mb-16">
          <Badge className="bg-[#4CAF50] text-white px-3 py-1 rounded-full mb-4">
            Key Features
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            All in One Poultry Management App
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Manage your poultry farm, finances, inventory, and operations effortlessly with Poultry360, everything your farm needs, all in one place.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 - Record Transactions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex space-x-2">
                  <div className="w-16 h-20 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-6 h-6 bg-[#4CAF50] rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">₹2,500</div>
                  </div>
                  <div className="w-16 h-20 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-6 h-6 bg-red-500 rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">₹1,200</div>
                  </div>
                  <div className="w-16 h-20 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-6 h-6 bg-[#4CAF50] rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">₹3,800</div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Record Transactions</h3>
            <p className="text-gray-600 text-sm">Add sales, purchases & expenses</p>
          </div>

          {/* Feature 2 - Manage Birds */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex space-x-2">
                  <div className="w-12 h-16 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-4 h-4 bg-[#4CAF50] rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">1,250↑</div>
                  </div>
                  <div className="w-12 h-16 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">45↓</div>
                  </div>
                  <div className="w-12 h-16 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-4 h-4 bg-[#4CAF50] rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">85%</div>
                  </div>
                  <div className="w-12 h-16 bg-white rounded shadow-sm border flex flex-col items-center justify-center">
                    <div className="w-4 h-4 bg-[#4CAF50] rounded-full mb-1"></div>
                    <div className="text-xs text-gray-600">32d</div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Manage Birds</h3>
            <p className="text-gray-600 text-sm">Track bird health & production</p>
          </div>

          {/* Feature 3 - Manage Inventory */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-bold">+</span>
                    </div>
                    <div className="text-xs text-gray-600">Add</div>
                  </div>
                  <div className="w-16 h-12 bg-amber-200 rounded border-2 border-amber-300 flex items-center justify-center">
                    <div className="text-xs font-medium text-amber-800">Feed</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mb-2">
                      <span className="text-white text-sm font-bold">-</span>
                    </div>
                    <div className="text-xs text-gray-600">Remove</div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Manage Inventory</h3>
            <p className="text-gray-600 text-sm">Keep track of feed & supplies</p>
          </div>

          {/* Feature 4 - Farm Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="w-full max-w-32">
                  <div className="flex items-end space-x-2 h-20">
                    <div className="w-6 bg-[#4CAF50] rounded-t" style={{height: '60%'}}></div>
                    <div className="w-6 bg-red-500 rounded-t" style={{height: '30%'}}></div>
                    <div className="w-6 bg-[#4CAF50] rounded-t" style={{height: '80%'}}></div>
                    <div className="w-6 bg-[#4CAF50] rounded-t" style={{height: '45%'}}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>₹45K↑</span>
                    <span>₹12K↓</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Farm Insights</h3>
            <p className="text-gray-600 text-sm">View farm performance reports</p>
          </div>

          {/* Feature 5 - Vaccination Schedule */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-20 h-8 bg-blue-100 rounded border border-blue-200 flex items-center justify-center">
                    <div className="text-xs font-medium text-blue-800">Day 1</div>
                  </div>
                  <div className="w-20 h-8 bg-green-100 rounded border border-green-200 flex items-center justify-center">
                    <div className="text-xs font-medium text-green-800">Day 7</div>
                  </div>
                  <div className="w-20 h-8 bg-yellow-100 rounded border border-yellow-200 flex items-center justify-center">
                    <div className="text-xs font-medium text-yellow-800">Day 14</div>
                  </div>
                  <div className="w-20 h-8 bg-red-100 rounded border border-red-200 flex items-center justify-center">
                    <div className="text-xs font-medium text-red-800">Day 21</div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Vaccination Schedule</h3>
            <p className="text-gray-600 text-sm">Track & manage vaccination programs</p>
          </div>

          {/* Feature 6 - Feed Calculator */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-800">50kg</span>
                  </div>
                  <div className="text-2xl text-gray-400">÷</div>
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-800">1000</span>
                  </div>
                  <div className="text-2xl text-gray-400">=</div>
                  <div className="w-12 h-12 bg-[#4CAF50] rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">0.05</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Feed Calculator</h3>
            <p className="text-gray-600 text-sm">Calculate optimal feed requirements</p>
          </div>

          {/* Feature 7 - Mortality Tracking */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✗</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">Mortality Rate: 2.3%</div>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-1/4 h-full bg-red-500"></div>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mortality Tracking</h3>
            <p className="text-gray-600 text-sm">Monitor & analyze bird losses</p>
          </div>

          {/* Feature 8 - Production Planning */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
            <div className="mb-6">
              {/* Visual Illustration */}
              <div className="relative w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">1</span>
                  </div>
                  <div className="w-1 h-4 bg-gray-300"></div>
                  <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                  <div className="w-1 h-4 bg-gray-300"></div>
                  <div className="w-8 h-8 bg-[#4CAF50] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">3</span>
                  </div>
                  <div className="w-1 h-4 bg-gray-300"></div>
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-xs">4</span>
                  </div>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Production Planning</h3>
            <p className="text-gray-600 text-sm">Plan & schedule production cycles</p>
          </div>
        </div>
      </div>
    </section>
  );
}
