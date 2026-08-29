"use client";

import { BlogCard } from "./BlogCard";
import type { BlogLocale, PublicBlogPost } from "@/lib/blog";

interface BlogGridProps {
  posts: PublicBlogPost[];
  locale: BlogLocale;
  sortBy: string;
}

export function BlogGrid({ posts, locale, sortBy }: BlogGridProps) {
  const sortedPosts = [...posts].sort((left, right) => {
    if (sortBy === "popular") {
      return right.viewCount - left.viewCount;
    }

    const leftTimestamp = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    const rightTimestamp = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;

    if (sortBy === "oldest") {
      return leftTimestamp - rightTimestamp;
    }

    return rightTimestamp - leftTimestamp;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 mt-8 sm:mt-10">
      {sortedPosts.map((post) => (
        <BlogCard key={post.id} post={post} locale={locale} />
      ))}
    </div>
  );
}
