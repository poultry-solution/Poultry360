import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <nav className="bg-background border-b border-gray-100 px-4 lg:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Poultry360</span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <a href="#home" className="text-gray-700 hover:text-primary transition-colors">
            Home
          </a>
          <a href="#features" className="text-gray-700 hover:text-primary transition-colors">
            Features
          </a>
          <a href="#contact" className="text-gray-700 hover:text-primary transition-colors">
            Contact
          </a>
        </div>

        {/* CTA Button */}
        <a href="/auth/signup">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg">
            Get Started &gt;
          </Button>
        </a>
      </div>
    </nav>
  );
}
