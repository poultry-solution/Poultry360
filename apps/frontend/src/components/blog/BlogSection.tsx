"use client";

import { useState } from "react";
import { BlogHeader } from "./BlogHeader";
import { BlogGrid } from "./BlogGrid";
import type { BlogLocale, PublicBlogPost } from "@/lib/blog";

interface BlogSectionProps {
  posts: PublicBlogPost[];
  locale: BlogLocale;
}

export function BlogSection({ posts, locale }: BlogSectionProps) {
  const [sortBy, setSortBy] = useState("most_recent");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <BlogHeader locale={locale} sortBy={sortBy} onSortChange={setSortBy} />
      <BlogGrid posts={posts} locale={locale} sortBy={sortBy} />
    </section>
  );
}
