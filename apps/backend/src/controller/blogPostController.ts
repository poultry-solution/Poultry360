import { Request, Response } from "express";
import { BlogPostStatus } from "@prisma/client";
import { z } from "zod";
import prisma from "../utils/prisma";

const blogLocaleSchema = z.enum(["en", "ne"]);

const blogPostSchema = z.object({
  title: z.string().trim().min(5).max(160),
  titleNe: z.string().trim().max(160).optional().or(z.literal("")),
  slug: z.string().trim().max(180).optional().or(z.literal("")),
  excerpt: z.string().trim().min(20).max(320),
  excerptNe: z.string().trim().max(320).optional().or(z.literal("")),
  contentMarkdown: z.string().trim().min(120),
  contentMarkdownNe: z.string().trim().optional().or(z.literal("")),
  bannerImageUrl: z.string().trim().url().max(2048).optional().or(z.literal("")),
  isFeatured: z.boolean().optional().default(false),
  authorName: z.string().trim().min(2).max(80),
  seoTitle: z.string().trim().max(160).optional().or(z.literal("")),
  seoTitleNe: z.string().trim().max(160).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
  seoDescriptionNe: z.string().trim().max(320).optional().or(z.literal("")),
  status: z.nativeEnum(BlogPostStatus).default(BlogPostStatus.DRAFT),
});

const publicBlogPostSelect = {
  id: true,
  title: true,
  titleNe: true,
  slug: true,
  excerpt: true,
  excerptNe: true,
  contentMarkdown: true,
  contentMarkdownNe: true,
  bannerImageUrl: true,
  isFeatured: true,
  authorName: true,
  seoTitle: true,
  seoTitleNe: true,
  seoDescription: true,
  seoDescriptionNe: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

const adminBlogPostSelect = {
  id: true,
  title: true,
  titleNe: true,
  slug: true,
  excerpt: true,
  excerptNe: true,
  contentMarkdown: true,
  contentMarkdownNe: true,
  bannerImageUrl: true,
  isFeatured: true,
  authorName: true,
  seoTitle: true,
  seoTitleNe: true,
  seoDescription: true,
  seoDescriptionNe: true,
  status: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180);
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getRequestedBlogLocale(input: unknown): z.infer<typeof blogLocaleSchema> {
  const parsed = blogLocaleSchema.safeParse(input);
  return parsed.success ? parsed.data : "en";
}

function hasNepaliTranslation(post: {
  titleNe?: string | null;
  excerptNe?: string | null;
  contentMarkdownNe?: string | null;
}) {
  return Boolean(
    post.titleNe?.trim() &&
      post.excerptNe?.trim() &&
      post.contentMarkdownNe?.trim()
  );
}

function buildAdminBlogPost<T extends {
  titleNe?: string | null;
  excerptNe?: string | null;
  contentMarkdownNe?: string | null;
}>(post: T) {
  return {
    ...post,
    hasNepaliTranslation: hasNepaliTranslation(post),
  };
}

function localizePublicBlogPost<T extends {
  id: string;
  title: string;
  titleNe?: string | null;
  slug: string;
  excerpt: string;
  excerptNe?: string | null;
  contentMarkdown: string;
  contentMarkdownNe?: string | null;
  bannerImageUrl: string | null;
  isFeatured: boolean;
  authorName: string;
  seoTitle?: string | null;
  seoTitleNe?: string | null;
  seoDescription?: string | null;
  seoDescriptionNe?: string | null;
  publishedAt: Date | string | null;
  viewCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}>(
  post: T,
  locale: z.infer<typeof blogLocaleSchema>
) {
  const translated = hasNepaliTranslation(post);
  const useNepali = locale === "ne" && translated;

  return {
    id: post.id,
    title: useNepali ? post.titleNe?.trim() || post.title : post.title,
    slug: post.slug,
    excerpt: useNepali ? post.excerptNe?.trim() || post.excerpt : post.excerpt,
    contentMarkdown: useNepali
      ? post.contentMarkdownNe?.trim() || post.contentMarkdown
      : post.contentMarkdown,
    bannerImageUrl: post.bannerImageUrl,
    isFeatured: post.isFeatured,
    authorName: post.authorName,
    seoTitle: useNepali
      ? normalizeOptionalText(post.seoTitleNe || undefined)
      : normalizeOptionalText(post.seoTitle || undefined),
    seoDescription: useNepali
      ? normalizeOptionalText(post.seoDescriptionNe || undefined)
      : normalizeOptionalText(post.seoDescription || undefined),
    publishedAt: post.publishedAt,
    viewCount: post.viewCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    hasNepaliTranslation: translated,
    locale,
  };
}

function canRemainPublishedWithoutBanner(options: {
  currentStatus?: BlogPostStatus;
  currentBannerImageUrl?: string | null;
  nextStatus: BlogPostStatus;
  nextBannerImageUrl: string | null;
}) {
  const { currentStatus, currentBannerImageUrl, nextStatus, nextBannerImageUrl } = options;

  if (nextStatus !== BlogPostStatus.PUBLISHED) {
    return true;
  }

  if (nextBannerImageUrl) {
    return true;
  }

  return currentStatus === BlogPostStatus.PUBLISHED && !currentBannerImageUrl;
}

async function ensureUniqueSlug(slug: string, excludeId?: string) {
  const existing = await prisma.blogPost.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && existing.id !== excludeId) {
    return false;
  }

  return true;
}

// ==================== ADMIN BLOG POSTS ====================

export const getAdminBlogPosts = async (req: Request, res: Response): Promise<any> => {
  try {
    const { status, search } = req.query;

    const where: any = {};

    if (status && Object.values(BlogPostStatus).includes(status as BlogPostStatus)) {
      where.status = status;
    }

    if (typeof search === "string" && search.trim().length > 0) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { titleNe: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
        { excerpt: { contains: search.trim(), mode: "insensitive" } },
        { excerptNe: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: adminBlogPostSelect,
    });

    return res.json({ success: true, data: posts.map(buildAdminBlogPost) });
  } catch (error) {
    console.error("Error fetching admin blog posts:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch blog posts" });
  }
};

export const getAdminBlogPostById = async (req: Request, res: Response): Promise<any> => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      select: adminBlogPostSelect,
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    return res.json({ success: true, data: buildAdminBlogPost(post) });
  } catch (error) {
    console.error("Error fetching admin blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch blog post" });
  }
};

export const createAdminBlogPost = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = blogPostSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid blog post payload",
      });
    }

    const normalizedSlug = slugify(parsed.data.slug || parsed.data.title);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: "A valid slug is required" });
    }

    const isUnique = await ensureUniqueSlug(normalizedSlug);
    if (!isUnique) {
      return res.status(409).json({ success: false, message: "Slug already exists" });
    }

    const nextBannerImageUrl = normalizeOptionalText(parsed.data.bannerImageUrl);

    if (
      !canRemainPublishedWithoutBanner({
        nextStatus: parsed.data.status,
        nextBannerImageUrl,
      })
    ) {
      return res.status(400).json({
        success: false,
        message: "A banner image is required before publishing this blog post",
      });
    }

    const created = await prisma.blogPost.create({
      data: {
        title: parsed.data.title.trim(),
        titleNe: normalizeOptionalText(parsed.data.titleNe),
        slug: normalizedSlug,
        excerpt: parsed.data.excerpt.trim(),
        excerptNe: normalizeOptionalText(parsed.data.excerptNe),
        contentMarkdown: parsed.data.contentMarkdown.trim(),
        contentMarkdownNe: normalizeOptionalText(parsed.data.contentMarkdownNe),
        bannerImageUrl: nextBannerImageUrl,
        isFeatured: parsed.data.isFeatured,
        authorName: parsed.data.authorName.trim(),
        seoTitle: normalizeOptionalText(parsed.data.seoTitle),
        seoTitleNe: normalizeOptionalText(parsed.data.seoTitleNe),
        seoDescription: normalizeOptionalText(parsed.data.seoDescription),
        seoDescriptionNe: normalizeOptionalText(parsed.data.seoDescriptionNe),
        status: parsed.data.status,
        publishedAt:
          parsed.data.status === BlogPostStatus.PUBLISHED ? new Date() : null,
      },
      select: adminBlogPostSelect,
    });

    return res.status(201).json({
      success: true,
      data: buildAdminBlogPost(created),
      message: created.status === BlogPostStatus.PUBLISHED ? "Blog post published" : "Draft saved",
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to create blog post" });
  }
};

export const updateAdminBlogPost = async (req: Request, res: Response): Promise<any> => {
  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      select: { id: true, publishedAt: true, status: true, bannerImageUrl: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    const parsed = blogPostSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0]?.message || "Invalid blog post payload",
      });
    }

    const normalizedSlug = slugify(parsed.data.slug || parsed.data.title);

    if (!normalizedSlug) {
      return res.status(400).json({ success: false, message: "A valid slug is required" });
    }

    const isUnique = await ensureUniqueSlug(normalizedSlug, existing.id);
    if (!isUnique) {
      return res.status(409).json({ success: false, message: "Slug already exists" });
    }

    const nextStatus = parsed.data.status;
    const nextBannerImageUrl = normalizeOptionalText(parsed.data.bannerImageUrl);

    if (
      !canRemainPublishedWithoutBanner({
        currentStatus: existing.status,
        currentBannerImageUrl: existing.bannerImageUrl,
        nextStatus,
        nextBannerImageUrl,
      })
    ) {
      return res.status(400).json({
        success: false,
        message: "A banner image is required before publishing this blog post",
      });
    }

    const updated = await prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.title.trim(),
        titleNe: normalizeOptionalText(parsed.data.titleNe),
        slug: normalizedSlug,
        excerpt: parsed.data.excerpt.trim(),
        excerptNe: normalizeOptionalText(parsed.data.excerptNe),
        contentMarkdown: parsed.data.contentMarkdown.trim(),
        contentMarkdownNe: normalizeOptionalText(parsed.data.contentMarkdownNe),
        bannerImageUrl: nextBannerImageUrl,
        isFeatured: parsed.data.isFeatured,
        authorName: parsed.data.authorName.trim(),
        seoTitle: normalizeOptionalText(parsed.data.seoTitle),
        seoTitleNe: normalizeOptionalText(parsed.data.seoTitleNe),
        seoDescription: normalizeOptionalText(parsed.data.seoDescription),
        seoDescriptionNe: normalizeOptionalText(parsed.data.seoDescriptionNe),
        status: nextStatus,
        publishedAt:
          nextStatus === BlogPostStatus.PUBLISHED
            ? existing.publishedAt || new Date()
            : existing.publishedAt,
      },
      select: adminBlogPostSelect,
    });

    return res.json({
      success: true,
      data: buildAdminBlogPost(updated),
      message: updated.status === BlogPostStatus.PUBLISHED ? "Blog post updated" : "Draft updated",
    });
  } catch (error) {
    console.error("Error updating blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to update blog post" });
  }
};

export const publishAdminBlogPost = async (req: Request, res: Response): Promise<any> => {
  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      select: { id: true, publishedAt: true, bannerImageUrl: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    if (!existing.bannerImageUrl) {
      return res.status(400).json({
        success: false,
        message: "A banner image is required before publishing this blog post",
      });
    }

    const updated = await prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        status: BlogPostStatus.PUBLISHED,
        publishedAt: existing.publishedAt || new Date(),
      },
      select: adminBlogPostSelect,
    });

    return res.json({
      success: true,
      data: buildAdminBlogPost(updated),
      message: "Blog post published",
    });
  } catch (error) {
    console.error("Error publishing blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to publish blog post" });
  }
};

export const unpublishAdminBlogPost = async (req: Request, res: Response): Promise<any> => {
  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    const updated = await prisma.blogPost.update({
      where: { id: existing.id },
      data: { status: BlogPostStatus.DRAFT },
      select: adminBlogPostSelect,
    });

    return res.json({
      success: true,
      data: buildAdminBlogPost(updated),
      message: "Blog post moved to draft",
    });
  } catch (error) {
    console.error("Error unpublishing blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to unpublish blog post" });
  }
};

export const deleteAdminBlogPost = async (req: Request, res: Response): Promise<any> => {
  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    await prisma.blogPost.delete({ where: { id: existing.id } });

    return res.json({ success: true, message: "Blog post deleted" });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to delete blog post" });
  }
};

// ==================== PUBLIC BLOG POSTS ====================

export const getPublicBlogPosts = async (req: Request, res: Response): Promise<any> => {
  try {
    const locale = getRequestedBlogLocale(req.query.locale);
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const posts = await prisma.blogPost.findMany({
      where: { status: BlogPostStatus.PUBLISHED },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      select: publicBlogPostSelect,
    });

    const localizedPosts = posts
      .filter((post) => (locale === "ne" ? hasNepaliTranslation(post) : true))
      .slice(0, limit)
      .map((post) => localizePublicBlogPost(post, locale));

    return res.json({ success: true, data: localizedPosts });
  } catch (error) {
    console.error("Error fetching public blog posts:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch blog posts" });
  }
};

export const getPublicBlogPostBySlug = async (req: Request, res: Response): Promise<any> => {
  try {
    const locale = getRequestedBlogLocale(req.query.locale);
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: req.params.slug,
        status: BlogPostStatus.PUBLISHED,
      },
      select: publicBlogPostSelect,
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    if (locale === "ne" && !hasNepaliTranslation(post)) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    return res.json({
      success: true,
      data: localizePublicBlogPost(post, locale),
    });
  } catch (error) {
    console.error("Error fetching public blog post:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch blog post" });
  }
};

export const incrementPublicBlogPostView = async (req: Request, res: Response): Promise<any> => {
  try {
    const post = await prisma.blogPost.findFirst({
      where: {
        slug: req.params.slug,
        status: BlogPostStatus.PUBLISHED,
      },
      select: { id: true },
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error incrementing blog post view:", error);
    return res.status(500).json({ success: false, message: "Failed to update read count" });
  }
};
