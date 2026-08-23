"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import type { AdminBlogPostInput, BlogPostStatus } from "@/fetchers/admin/blogQueries";
import { BLOG_SITE_URL, formatBlogDate } from "@/lib/blog";

const EMPTY_VALUES: AdminBlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  contentMarkdown: "",
  bannerImageUrl: "",
  isFeatured: false,
  authorName: "Poultry360 Team",
  seoTitle: "",
  seoDescription: "",
  status: "DRAFT",
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180);
}

interface BlogPostEditorProps {
  title: string;
  description: string;
  initialValues?: Partial<AdminBlogPostInput>;
  publishedAt?: string | null;
  viewCount?: number;
  allowPublishedWithoutBanner?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: AdminBlogPostInput) => Promise<void> | void;
}

export default function BlogPostEditor({
  title,
  description,
  initialValues,
  publishedAt,
  viewCount = 0,
  allowPublishedWithoutBanner = false,
  isSubmitting = false,
  submitLabel = "Save post",
  onSubmit,
}: BlogPostEditorProps) {
  const [values, setValues] = useState<AdminBlogPostInput>({
    ...EMPTY_VALUES,
    ...initialValues,
  });
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const publicHref = values.slug ? `${BLOG_SITE_URL}/blog/${values.slug}` : null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bannerImageUrl = values.bannerImageUrl?.trim() || "";
    const isPublishingWithoutBanner = values.status === "PUBLISHED" && !bannerImageUrl;

    if (isPublishingWithoutBanner && !allowPublishedWithoutBanner) {
      setValidationMessage("A banner image is required before publishing this blog post.");
      return;
    }

    setValidationMessage(null);
    await onSubmit(values);
  };

  const applyStatus = (status: BlogPostStatus) => {
    if (status === "PUBLISHED" && !values.bannerImageUrl?.trim() && !allowPublishedWithoutBanner) {
      setValidationMessage("Add a banner image before publishing so the blog card and article hero can render properly.");
    } else {
      setValidationMessage(null);
    }

    setValues((current) => ({ ...current, status }));
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => applyStatus("DRAFT")}>
            Save As Draft
          </Button>
          <Button type="button" variant="secondary" onClick={() => applyStatus("PUBLISHED")}>
            Publish Mode
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Post Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={values.title}
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Example: Broiler feed price tracking in Nepal"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slug">Slug</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setValues((current) => ({ ...current, slug: slugify(current.title) }))
                  }
                >
                  <Sparkles className="mr-1 size-4" />
                  Generate From Title
                </Button>
              </div>
              <Input
                id="slug"
                value={values.slug}
                onChange={(event) =>
                  setValues((current) => ({ ...current, slug: event.target.value }))
                }
                placeholder="broiler-feed-price-nepal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Meta Description / Excerpt</Label>
              <Textarea
                id="excerpt"
                value={values.excerpt}
                onChange={(event) =>
                  setValues((current) => ({ ...current, excerpt: event.target.value }))
                }
                className="min-h-28"
                placeholder="Write a concise summary for search engines and the blog index."
              />
            </div>

            {validationMessage ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {validationMessage}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="contentMarkdown">Markdown Content</Label>
              <Textarea
                id="contentMarkdown"
                value={values.contentMarkdown}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    contentMarkdown: event.target.value,
                  }))
                }
                className="min-h-[460px] font-mono text-sm"
                placeholder="# Heading&#10;&#10;Write the article in markdown..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Banner Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                value={values.bannerImageUrl ?? ""}
                onChange={(url) => {
                  setValidationMessage(null);
                  setValues((current) => ({ ...current, bannerImageUrl: url }));
                }}
                folder="blogs"
                placeholder="Upload the article banner image"
              />

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Used on the blog card, article hero, and social share preview.</p>
                <p>
                  Required for newly published posts. Legacy published posts can stay live until you backfill an image.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={values.status}
                  onValueChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      status: value as BlogPostStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PUBLISHED">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Published date: {formatBlogDate(publishedAt ?? null)}</p>
                <p>Read count: {viewCount}</p>
                <p>Banner image: {values.bannerImageUrl ? "Ready" : "Missing"}</p>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(values.isFeatured)}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      isFeatured: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-slate-300"
                />
                <div>
                  <p className="font-medium text-slate-900">Mark as featured</p>
                  <p className="text-xs text-muted-foreground">
                    Featured posts can appear in the public article sidebar.
                  </p>
                </div>
              </label>

              {publicHref && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={publicHref} target="_blank">
                    Open Public URL
                    <ExternalLink className="ml-2 size-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authorName">Author</Label>
                <Input
                  id="authorName"
                  value={values.authorName}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, authorName: event.target.value }))
                  }
                  placeholder="Poultry360 Team"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  value={values.seoTitle ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({ ...current, seoTitle: event.target.value }))
                  }
                  placeholder="Optional override for the page title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Textarea
                  id="seoDescription"
                  value={values.seoDescription ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      seoDescription: event.target.value,
                    }))
                  }
                  className="min-h-24"
                  placeholder="Optional override for meta description and social cards"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
