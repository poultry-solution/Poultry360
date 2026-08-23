"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BlogPostEditor from "@/components/admin/blog/BlogPostEditor";
import { useCreateAdminBlogPost } from "@/fetchers/admin/blogQueries";

export default function NewAdminBlogPostPage() {
  const router = useRouter();
  const createPost = useCreateAdminBlogPost();

  return (
    <BlogPostEditor
      title="New Blog Post"
      description="Draft an SEO article for Nepal poultry search queries."
      submitLabel={createPost.isPending ? "Saving..." : "Create Post"}
      isSubmitting={createPost.isPending}
      onSubmit={async (values) => {
        try {
          const response = await createPost.mutateAsync(values);
          toast.success(response.message || "Blog post created");
          router.push(`/admin/dashboard/blog/${response.data.id}`);
        } catch (error: any) {
          toast.error(error.response?.data?.message || "Failed to create blog post");
        }
      }}
    />
  );
}
