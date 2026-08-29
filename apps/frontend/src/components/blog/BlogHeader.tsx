"use client";

import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { BlogLanguageSwitch } from "./BlogLanguageSwitch";
import { getBlogPageCopy, type BlogLocale } from "@/lib/blog";

interface BlogHeaderProps {
  locale: BlogLocale;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function BlogHeader({ locale, sortBy, onSortChange }: BlogHeaderProps) {
  const copy = getBlogPageCopy(locale);

  return (
    <div className="w-full">
      <div className="mb-6 flex justify-end">
        <BlogLanguageSwitch
          locale={locale}
          englishHref="/blog"
          nepaliHref="/ne/blog"
          showNepali
        />
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-slate-500 mb-6 font-normal">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          {copy.home}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-700 font-medium">{copy.blogs}</span>
      </nav>

      {/* Main Title Section */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-semibold tracking-tight text-slate-900 leading-tight">
          {copy.latestBlogsPrefix}{" "}
          <span className="text-primary font-bold">{copy.latestBlogsAccent}</span>
        </h1>
        
        <p className="text-slate-600 text-base sm:text-[15px] leading-relaxed w-full font-normal">
          {copy.intro}
        </p>
      </div>

      {/* Filter / Sort Dropdown */}
      <div className="flex items-center justify-end mt-8 sm:mt-10">
        <div className="relative inline-block w-48 sm:w-52">
          <select
            value={sortBy}
            aria-label={copy.sortLabel}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shadow-xs cursor-pointer transition-all"
          >
            <option value="most_recent">{copy.sortMostRecent}</option>
            <option value="oldest">{copy.sortOldest}</option>
            <option value="popular">{copy.sortPopular}</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
