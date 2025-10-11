import Link from "next/link";
import { Button } from "@/common/components/ui/button";

export default function Navbar() {
  return (
    <nav className="bg-background border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">P</span>
          </div>
          <span className="font-bold text-foreground">Poultry360</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#reviews" className="text-muted-foreground hover:text-foreground transition-colors">
            Reviews
          </Link>
          <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
            Contact
          </Link>
        </div>

        {/* CTA Button */}
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="/dashboard">
            Get Started
          </Link>
        </Button>
      </div>
    </nav>
  );
}
