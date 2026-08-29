import { getBlogIndexMetadata, renderBlogIndexPage } from "@/lib/blog-page";

export const dynamic = "force-dynamic";

export const metadata = getBlogIndexMetadata("ne");

export default async function NepaliBlogIndexPage() {
  return renderBlogIndexPage("ne");
}
