import type { Metadata } from "next";
import { getBlogArticleMetadata, renderBlogArticlePage } from "@/lib/blog-page";

export const dynamic = "force-dynamic";

type NepaliBlogArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: NepaliBlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  return getBlogArticleMetadata("ne", slug);
}

export default async function NepaliBlogArticlePage({
  params,
}: NepaliBlogArticlePageProps) {
  const { slug } = await params;
  return renderBlogArticlePage("ne", slug);
}
