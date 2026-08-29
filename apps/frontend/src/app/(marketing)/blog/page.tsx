import { getBlogIndexMetadata, renderBlogIndexPage } from "@/lib/blog-page";

export const dynamic = "force-dynamic";

export const metadata = getBlogIndexMetadata("en");

export default async function BlogIndexPage() {
  return renderBlogIndexPage("en");
}
