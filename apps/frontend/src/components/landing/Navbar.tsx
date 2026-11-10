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
    <nav className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-gray-200/80 bg-white/85 pl-5 pr-2 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md lg:h-16 lg:pl-7">
        {/* Logo - wordmark only for clear readability in navbar */}
        <Link
          href="/"
          className="shrink-0 text-3xl font-[family-name:var(--font-caveat)] lg:text-4xl"
        >
          Poultry360
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-7 text-[15px] lg:flex">
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

        {/* Desktop: Log in + Sign up */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/auth/login" className="rounded-full px-4 py-2 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900">
            {t("landing.navbar.logIn")}
          </Link>
          <SignupChooserDialog
            trigger={
              <Button className="rounded-full bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90">
                {t("landing.navbar.signUp")}
              </Button>
            }
          />
        </div>

        {/* Mobile: Log in and Sign up always visible, next to the menu button */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Link href="/auth/login" className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
            {t("landing.navbar.logIn")}
          </Link>
          <SignupChooserDialog
            trigger={
              <Button size="sm" className="rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
                {t("landing.navbar.signUp")}
              </Button>
            }
          />
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-gray-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.1)] lg:hidden">
          <div className="space-y-1 px-5 py-4">
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
          </div>
        </div>
      )}
    </nav>
  );
}
