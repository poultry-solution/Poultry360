import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
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
  );
}
