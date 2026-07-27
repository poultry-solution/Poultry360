"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/ui/dialog";
import { useI18n } from "@/i18n/useI18n";

type SignupChooserDialogProps = {
  trigger: ReactElement;
};

const signupOptions = [
  {
    href: "/auth/signup",
    icon: "👨‍🌾",
    labelKey: "landing.navbar.farmer",
  },
  {
    href: "/auth/signup/dealer",
    icon: "🏪",
    labelKey: "landing.navbar.dealer",
  },
  {
    href: "/auth/signup/company",
    icon: "🏢",
    labelKey: "landing.navbar.company",
  },
  {
    href: "/auth/signup/hatchery",
    icon: "🥚",
    labelKey: "landing.navbar.hatchery",
  },
  {
    href: "/auth/signup/doctor",
    icon: "🩺",
    labelKey: "landing.navbar.veterinary",
  },
] as const;

export function SignupChooserDialog({ trigger }: SignupChooserDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            {t("landing.navbar.signUpAs")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("landing.navbar.signUpDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-4">
          {signupOptions.map((option) => (
            <Button
              key={option.href}
              asChild
              variant="outline"
              className="h-14 justify-start px-6 text-base font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer"
            >
              <Link href={option.href}>
                <span className="w-8 text-xl">{option.icon}</span>{" "}
                {t(option.labelKey)}
              </Link>
            </Button>
          ))}
        </div>
        <div className="text-center mt-1 text-sm text-muted-foreground">
          {t("landing.navbar.alreadyHaveAccount")}{" "}
          <Link href="/auth/login" className="text-primary hover:underline font-semibold">
            {t("landing.navbar.login")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
