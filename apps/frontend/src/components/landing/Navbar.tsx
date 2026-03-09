"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";

export default function Navbar() {
  const { t, language, setLanguage } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const langLabel = language === "en" ? "Switch to Nepali" : "Switch to English";

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
          <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.marketplace")}
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
          <button
            onClick={() => setLanguage(language === "en" ? "ne" : "en")}
            className="px-3 py-1.5 rounded-md border border-gray-200 hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            {langLabel}
          </button>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6">
                {t("landing.navbar.getStarted")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-2xl font-bold">{t("landing.navbar.signUpAs")}</DialogTitle>
                <DialogDescription className="text-center">
                  {t("landing.navbar.signUpDescription")}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                  <Link href="/auth/signup">
                    <span className="w-8 text-xl">👨‍🌾</span> {t("landing.navbar.farmer")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                  <Link href="/auth/signup/dealer">
                    <span className="w-8 text-xl">🏪</span> {t("landing.navbar.dealer")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                  <Link href="/auth/signup/company">
                    <span className="w-8 text-xl">🏢</span> {t("landing.navbar.company")}
                  </Link>
                </Button>
              </div>
              <div className="text-center mt-1 text-sm text-muted-foreground">
                {t("landing.navbar.alreadyHaveAccount")}{" "}
                <Link href="/auth/login" className="text-primary hover:underline font-semibold">
                  {t("landing.navbar.login")}
                </Link>
              </div>
            </DialogContent>
          </Dialog>
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
              href="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.marketplace")}
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
              {/* Language Toggle */}
              <button
                onClick={() => {
                  setLanguage(language === "en" ? "ne" : "en");
                }}
                className="w-full text-left py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                🌐 {langLabel}
              </button>

              {/* Get Started */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    {t("landing.navbar.getStarted")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold">{t("landing.navbar.signUpAs")}</DialogTitle>
                    <DialogDescription className="text-center">
                      {t("landing.navbar.signUpDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                      <Link href="/auth/signup">
                        <span className="w-8 text-xl">👨‍🌾</span> {t("landing.navbar.farmer")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                      <Link href="/auth/signup/dealer">
                        <span className="w-8 text-xl">🏪</span> {t("landing.navbar.dealer")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                      <Link href="/auth/signup/company">
                        <span className="w-8 text-xl">🏢</span> {t("landing.navbar.company")}
                      </Link>
                    </Button>
                  </div>
                  <div className="text-center mt-1 text-sm text-muted-foreground">
                    {t("landing.navbar.alreadyHaveAccount")}{" "}
                    <Link href="/auth/login" className="text-primary hover:underline font-semibold">
                      {t("landing.navbar.login")}
                    </Link>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
