import type { Metadata } from "next";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import { BlogSection } from "@/components/blog/BlogSection";
import {
  BLOG_SITE_URL,
  getPublishedBlogPosts,
  isBlogApiUnavailable,
  type PublicBlogPost,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blogs | Poultry Management & Software Articles | Poultry360",
  description:
    "Empower your poultry farm with our all-encompassing management software blog. Stay informed with expert perspectives on poultry management, technology trends, and industry best practices.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blogs | Poultry Management & Software Articles | Poultry360",
    description:
      "Empower your poultry farm with our all-encompassing management software blog. Stay informed with expert perspectives on poultry management, technology trends, and industry best practices.",
    url: `${BLOG_SITE_URL}/blog`,
    siteName: "Poultry360",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blogs | Poultry Management & Software Articles | Poultry360",
    description:
      "Empower your poultry farm with our all-encompassing management software blog. Stay informed with expert perspectives on poultry management, technology trends, and industry best practices.",
  },
};

export default async function BlogIndexPage() {
  let posts: PublicBlogPost[] = [];
  let isUnavailable = false;

  try {
    posts = await getPublishedBlogPosts();
  } catch (error) {
    if (isBlogApiUnavailable(error)) {
      isUnavailable = true;
    } else {
      throw error;
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      <Navbar />
      <main className="flex-grow">
        {isUnavailable ? (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">Blog content is temporarily unavailable</h1>
              <p className="mt-3 text-slate-600">
                The public blog UI is connected, but the blog API could not be reached right now.
              </p>
            </div>
          </section>
        ) : posts.length === 0 ? (
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <h1 className="text-2xl font-semibold text-slate-900">No published blog posts yet</h1>
              <p className="mt-3 text-slate-600">
                Publish a post from the admin dashboard and it will appear here automatically.
              </p>
            </div>
          </section>
        ) : (
          <BlogSection posts={posts} />
        )}
      </main>
      <Footer />
    </div>
  );
}
