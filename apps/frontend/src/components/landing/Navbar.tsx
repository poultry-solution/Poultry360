"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { SignupChooserDialog } from "@/common/components/auth/SignupChooserDialog";
import { useI18n } from "@/i18n/useI18n";

const POULTRY_MODULES = [
  { label: "Broiler Farm", href: "/broiler-farm-software" },
  { label: "Layers Farm", href: "/layer-farm-software" },
  { label: "Hatchery", href: "/hatchery-software" },
  { label: "Feed Dealer", href: "/feed-dealer-software" },
];

export default function Navbar() {
  const { t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileModulesOpen, setMobileModulesOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileModulesOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((open) => {
      const nextOpen = !open;
      if (!nextOpen) {
        setMobileModulesOpen(false);
      }
      return nextOpen;
    });
  };

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
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              Poultry Module
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-3 w-64 translate-y-2 rounded-2xl border border-gray-100 bg-white p-2 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {POULTRY_MODULES.map((module) => (
                <Link
                  key={module.href}
                  href={module.href}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  {module.label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.marketplace")}
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/#reviews" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.reviews")}
          </Link>
          <Link href="/#contact" className="text-muted-foreground hover:text-foreground transition-colors">
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
          onClick={toggleMobileMenu}
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
            <button
              type="button"
              onClick={() => setMobileModulesOpen((open) => !open)}
              className="flex w-full items-center justify-between py-2 text-left text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              <span>Poultry Module</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${mobileModulesOpen ? "rotate-180" : ""}`}
              />
            </button>
            {mobileModulesOpen ? (
              <div className="space-y-2 border-l border-gray-200 pl-4">
                {POULTRY_MODULES.map((module) => (
                  <Link
                    key={module.href}
                    href={module.href}
                    onClick={closeMobileMenu}
                    className="block py-2 text-sm font-medium text-slate-700 hover:text-primary transition-colors"
                  >
                    {module.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <Link
              href="/marketplace"
              onClick={closeMobileMenu}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.marketplace")}
            </Link>
            <Link
              href="/blog"
              onClick={closeMobileMenu}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Blog
            </Link>
            <Link
              href="/#reviews"
              onClick={closeMobileMenu}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.reviews")}
            </Link>
            <Link
              href="/#contact"
              onClick={closeMobileMenu}
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
