"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { SignupChooserDialog } from "@/common/components/auth/SignupChooserDialog";
import { useI18n } from "@/i18n/useI18n";

export default function Navbar() {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
        {/* Logo - wordmark only for clear readability in navbar */}
        <Link
          href="/"
          className="text-4xl   shrink-0 font-[family-name:var(--font-caveat)]"
        >
          Poultry360
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.features")}
          </Link>
          <Link href="#modules" className="text-muted-foreground hover:text-foreground transition-colors">
            Modules
          </Link>
          <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.marketplace")}
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="#reviews" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.reviews")}
          </Link>
          <Link href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.contact")}
          </Link>
        </div>

        {/* Desktop: Language Toggle + Get Started */}
        <div className="hidden md:flex items-center gap-3">
          <SignupChooserDialog
            trigger={
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                {t("landing.navbar.getStarted")}
              </Button>
            }
          />
        </div>

        {/* Mobile: Hamburger Menu Button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="px-4 py-4 space-y-3">
            {/* Nav Links */}
            <Link
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.features")}
            </Link>
            <Link
              href="#modules"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Modules
            </Link>
            <Link
              href="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.marketplace")}
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Blog
            </Link>
            <Link
              href="#reviews"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.reviews")}
            </Link>
            <Link
              href="#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.contact")}
            </Link>

            <div className="border-t pt-3 space-y-3">
              {/* Get Started */}
              <SignupChooserDialog
                trigger={
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {t("landing.navbar.getStarted")}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
