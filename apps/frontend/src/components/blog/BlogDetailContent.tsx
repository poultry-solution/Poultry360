"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { PublicBlogPost } from "@/lib/blog";

interface BlogDetailContentProps {
  post: PublicBlogPost;
}

export function BlogDetailContent({ post }: BlogDetailContentProps) {
  return (
    <div className="w-full text-slate-700">
      <article className="prose prose-slate max-w-none space-y-6 break-words overflow-hidden">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h2 className="break-words pt-6 pb-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="break-words pt-4 pb-1 text-xl font-semibold text-slate-900 sm:text-2xl">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-6 break-words text-base leading-relaxed text-slate-700 sm:text-lg">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-6 list-disc break-words pl-6 text-base text-slate-700 sm:text-lg">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-6 list-decimal break-words pl-6 text-base text-slate-700 sm:text-lg">{children}</ol>
            ),
            li: ({ children }) => <li className="mb-2 break-words leading-relaxed">{children}</li>,
            a: ({ href, children }) => {
              const isExternal = href?.startsWith("http");

              return (
                <a
                  href={href}
                  className="break-all font-medium text-primary underline underline-offset-4"
                  {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {children}
                </a>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="my-6 break-words rounded-r-lg border-l-4 border-primary/40 bg-slate-50/60 py-3 pl-4 pr-3 italic text-slate-700">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-900">{children}</code>
            ),
          }}
        >
          {post.contentMarkdown}
        </ReactMarkdown>
      </article>

      {/* View All Blogs Action */}
      <div className="pt-10 pb-6 border-t border-slate-200 mt-12">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-base sm:text-lg transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          View All Blogs
        </Link>
      </div>
    </div>
  );
}
