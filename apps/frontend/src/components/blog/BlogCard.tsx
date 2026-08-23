"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { PublicBlogPost } from "@/lib/blog";

interface BlogCardProps {
  post: PublicBlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block h-full">
      <div className="flex flex-col h-full space-y-4">
        {/* Card Image Container - rounded-md / rounded-lg matching Livine */}
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-md bg-slate-100">
          <Image
            src={post.bannerImageUrl || "/blog.webp"}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover w-full h-full transition-transform duration-300 ease-out group-hover:scale-105"
            priority={false}
          />
        </div>

        {/* Card Content */}
        <div className="flex flex-col flex-grow">
          {/* Title & Arrow Row */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="line-clamp-2 break-words text-xl font-bold leading-tight text-slate-900 transition-colors group-hover:text-primary sm:text-2xl">
              {post.title}
            </h2>
            <div className="shrink-0 pt-1">
              <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900 group-hover:text-primary transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>

          {/* Excerpt Subtext */}
          <p className="mt-2.5 line-clamp-2 break-words text-sm leading-relaxed text-slate-500 sm:text-base">
            {post.excerpt}
          </p>
        </div>
      </div>
    </Link>
  );
}
