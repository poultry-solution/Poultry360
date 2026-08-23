"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { estimateReadingTime, formatBlogDate, type PublicBlogPost } from "@/lib/blog";
import BlogReadCount from "./BlogReadCount";

interface BlogDetailHeaderProps {
  post: PublicBlogPost;
}

export function BlogDetailHeader({ post }: BlogDetailHeaderProps) {
  return (
    <div className="w-full">
      {/* Breadcrumb Navigation */}
      <nav className="flex flex-wrap items-center space-x-2 text-sm text-slate-500 mb-6 font-medium">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          Home
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        <Link href="/blog" className="hover:text-slate-900 transition-colors">
          Blogs
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
        <span className="max-w-xs break-all text-slate-700 font-medium line-clamp-1 sm:max-w-md">
          {post.title}
        </span>
      </nav>

      {/* Published Date */}
      <div className="text-primary font-semibold text-sm sm:text-base mb-3">
        Published {formatBlogDate(post.publishedAt)}
      </div>

      {/* Main Title */}
      <h1 className="mb-6 break-words text-3xl font-bold leading-[1.18] tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
        {post.title}
      </h1>

      {/* Excerpt Lead Paragraph */}
      <p className="mb-8 break-words text-base leading-relaxed text-slate-600 sm:text-lg">
        {post.excerpt}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-500 mb-8">
        <span>By {post.authorName}</span>
        <span>•</span>
        <span>{estimateReadingTime(post.contentMarkdown)} min read</span>
        <span>•</span>
        <BlogReadCount slug={post.slug} initialCount={post.viewCount} />
      </div>

      {/* Main Feature Banner Image - rounded-md matching Livine */}
      <div className="relative w-full aspect-[16/9] overflow-hidden rounded-md bg-slate-100 mb-10 shadow-xs">
        <Image
          src={post.bannerImageUrl || "/blog.webp"}
          alt={post.title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  );
}
