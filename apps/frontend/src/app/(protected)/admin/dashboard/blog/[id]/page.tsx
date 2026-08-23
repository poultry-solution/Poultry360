"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import BlogPostEditor from "@/components/admin/blog/BlogPostEditor";
import {
  useDeleteAdminBlogPost,
  useGetAdminBlogPost,
  usePublishAdminBlogPost,
  useUnpublishAdminBlogPost,
  useUpdateAdminBlogPost,
} from "@/fetchers/admin/blogQueries";

export default function AdminBlogPostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const { data, isLoading, isError, refetch } = useGetAdminBlogPost(id);
  const updatePost = useUpdateAdminBlogPost(id);
  const publishPost = usePublishAdminBlogPost(id);
  const unpublishPost = useUnpublishAdminBlogPost(id);
  const deletePost = useDeleteAdminBlogPost(id);

  const post = data?.data;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading blog post...</div>;
  }

  if (isError || !post) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Failed to load blog post.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
          <Button asChild variant="ghost">
            <Link href="/admin/dashboard/blog">Back to blog manager</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {post.status === "DRAFT" ? (
          <Button
            variant="outline"
            disabled={publishPost.isPending}
            onClick={async () => {
              try {
                const response = await publishPost.mutateAsync();
                toast.success(response.message || "Blog post published");
              } catch (error: any) {
                toast.error(error.response?.data?.message || "Failed to publish blog post");
              }
            }}
          >
            Publish Now
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={unpublishPost.isPending}
            onClick={async () => {
              try {
                const response = await unpublishPost.mutateAsync();
                toast.success(response.message || "Blog post moved to draft");
              } catch (error: any) {
                toast.error(error.response?.data?.message || "Failed to move post to draft");
              }
            }}
          >
            Move To Draft
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Post</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this blog post?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the article from the admin dashboard, sitemap, and public blog.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try {
                    const response = await deletePost.mutateAsync();
                    toast.success(response.message || "Blog post deleted");
                    router.push("/admin/dashboard/blog");
                  } catch (error: any) {
                    toast.error(error.response?.data?.message || "Failed to delete blog post");
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <BlogPostEditor
        title="Edit Blog Post"
        description="Update copy, SEO metadata, or publishing state."
        initialValues={{
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          contentMarkdown: post.contentMarkdown,
          authorName: post.authorName,
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          status: post.status,
        }}
        publishedAt={post.publishedAt}
        viewCount={post.viewCount}
        submitLabel={updatePost.isPending ? "Saving..." : "Save Changes"}
        isSubmitting={updatePost.isPending}
        onSubmit={async (values) => {
          try {
            const response = await updatePost.mutateAsync(values);
            toast.success(response.message || "Blog post updated");
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update blog post");
          }
        }}
      />
    </div>
  );
}
