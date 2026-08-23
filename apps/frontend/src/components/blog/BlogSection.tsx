"use client";

import { useState } from "react";
import { BlogHeader } from "./BlogHeader";
import { BlogGrid } from "./BlogGrid";
import type { PublicBlogPost } from "@/lib/blog";

interface BlogSectionProps {
  posts: PublicBlogPost[];
}

export function BlogSection({ posts }: BlogSectionProps) {
  const [sortBy, setSortBy] = useState("most_recent");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <BlogHeader sortBy={sortBy} onSortChange={setSortBy} />
      <BlogGrid posts={posts} sortBy={sortBy} />
    </section>
  );
}
