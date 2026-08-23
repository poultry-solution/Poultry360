"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { BlogCard } from "./BlogCard";
import type { PublicBlogPost } from "@/lib/blog";

interface BlogDetailSidebarProps {
  featuredPost?: PublicBlogPost | null;
  relatedPosts: PublicBlogPost[];
}

export function BlogDetailSidebar({ featuredPost, relatedPosts }: BlogDetailSidebarProps) {
  if (!featuredPost && relatedPosts.length === 0) {
    return null;
  }

  return (
    <aside className="w-full space-y-12 lg:pl-4">
      {featuredPost ? (
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-5 tracking-tight">
            Featured Blog
          </h3>
          
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group block space-y-3"
          >
            <div className="relative w-full aspect-[16/10] overflow-hidden rounded-md bg-slate-100">
              <Image
                src={featuredPost.bannerImageUrl || "/blog.webp"}
                alt={featuredPost.title}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
              />
            </div>

            <div className="flex items-start justify-between gap-3 pt-1">
              <h4 className="text-lg font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight line-clamp-2">
                {featuredPost.title}
              </h4>
              <ArrowUpRight className="w-5 h-5 text-slate-900 group-hover:text-primary shrink-0 mt-0.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>

            <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
              {featuredPost.excerpt}
            </p>
          </Link>
        </div>
      ) : null}

      {/* Related Blogs Section */}
      {relatedPosts.length > 0 ? (
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">
            Related Blogs
          </h3>

          <div className="space-y-8">
            {relatedPosts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
