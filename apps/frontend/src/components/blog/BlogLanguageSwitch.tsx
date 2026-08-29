"use client";

import Link from "next/link";
import { cn } from "@/common/lib/utils";
import { getBlogLocaleLabel, type BlogLocale } from "@/lib/blog";

interface BlogLanguageSwitchProps {
  locale: BlogLocale;
  englishHref: string;
  nepaliHref: string;
  showNepali: boolean;
  className?: string;
}

export function BlogLanguageSwitch({
  locale,
  englishHref,
  nepaliHref,
  showNepali,
  className,
}: BlogLanguageSwitchProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm",
        className
      )}
    >
      <Link
        href={englishHref}
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
          locale === "en"
            ? "bg-primary text-white"
            : "text-slate-600 hover:text-slate-900"
        )}
      >
        {getBlogLocaleLabel("en")}
      </Link>

      {showNepali ? (
        <Link
          href={nepaliHref}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
            locale === "ne"
              ? "bg-primary text-white"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          {getBlogLocaleLabel("ne")}
        </Link>
      ) : null}
    </div>
  );
}
