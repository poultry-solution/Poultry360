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
          <Link href="/tutorials" className="text-muted-foreground hover:text-foreground transition-colors">
            {t("landing.navbar.tutorials")}
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
          <a
            href="https://wa.me/9779705428337"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-green-200 hover:border-green-400 hover:bg-green-50 transition-colors text-sm font-medium text-green-700"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            +977 9705428337
          </a>

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
                <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                  <Link href="/auth/signup/hatchery">
                    <span className="w-8 text-xl">🥚</span> {t("landing.navbar.hatchery")}
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
              href="/tutorials"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              {t("landing.navbar.tutorials")}
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
              {/* WhatsApp Contact */}
              <a
                href="https://wa.me/9779705428337"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-green-500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                +977 9705428337
              </a>

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
                    <Button asChild variant="outline" className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
                      <Link href="/auth/signup/hatchery">
                        <span className="w-8 text-xl">🥚</span> {t("landing.navbar.hatchery")}
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
