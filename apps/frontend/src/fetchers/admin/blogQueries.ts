import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type BlogPostStatus = "DRAFT" | "PUBLISHED";

export interface AdminBlogPost {
  id: string;
  title: string;
  titleNe: string | null;
  slug: string;
  excerpt: string;
  excerptNe: string | null;
  contentMarkdown: string;
  contentMarkdownNe: string | null;
  bannerImageUrl: string | null;
  isFeatured: boolean;
  authorName: string;
  seoTitle: string | null;
  seoTitleNe: string | null;
  seoDescription: string | null;
  seoDescriptionNe: string | null;
  status: BlogPostStatus;
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  hasNepaliTranslation: boolean;
}

export interface AdminBlogPostsResponse {
  success: boolean;
  data: AdminBlogPost[];
}

export interface AdminBlogPostResponse {
  success: boolean;
  data: AdminBlogPost;
}

export interface AdminBlogPostInput {
  title: string;
  titleNe?: string;
  slug?: string;
  excerpt: string;
  excerptNe?: string;
  contentMarkdown: string;
  contentMarkdownNe?: string;
  bannerImageUrl?: string;
  isFeatured?: boolean;
  authorName: string;
  seoTitle?: string;
  seoTitleNe?: string;
  seoDescription?: string;
  seoDescriptionNe?: string;
  status: BlogPostStatus;
}

export interface AdminBlogPostFilters {
  search?: string;
  status?: BlogPostStatus;
}

export const adminBlogPostKeys = {
  all: ["admin-blog-posts"] as const,
  lists: () => [...adminBlogPostKeys.all, "list"] as const,
  list: (filters: string) => [...adminBlogPostKeys.lists(), { filters }] as const,
  details: () => [...adminBlogPostKeys.all, "detail"] as const,
  detail: (id: string) => [...adminBlogPostKeys.details(), id] as const,
};

export function useGetAdminBlogPosts(filters: AdminBlogPostFilters = {}) {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)])
  ).toString();

  return useQuery<AdminBlogPostsResponse>({
    queryKey: adminBlogPostKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminBlogPostsResponse>(
        `/admin/blog-posts${queryString ? `?${queryString}` : ""}`
      );
      return data;
    },
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
}

export function useGetAdminBlogPost(id: string) {
  return useQuery<AdminBlogPostResponse>({
    queryKey: adminBlogPostKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminBlogPostResponse>(`/admin/blog-posts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAdminBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminBlogPostInput) => {
      const { data } = await axiosInstance.post("/admin/blog-posts", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.lists() });
    },
  });
}

export function useUpdateAdminBlogPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AdminBlogPostInput) => {
      const { data } = await axiosInstance.put(`/admin/blog-posts/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.detail(id) });
    },
  });
}

export function usePublishAdminBlogPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/admin/blog-posts/${id}/publish`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.detail(id) });
    },
  });
}

export function useUnpublishAdminBlogPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/admin/blog-posts/${id}/unpublish`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.detail(id) });
    },
  });
}

export function useDeleteAdminBlogPost(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.delete(`/admin/blog-posts/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBlogPostKeys.lists() });
      queryClient.removeQueries({ queryKey: adminBlogPostKeys.detail(id) });
    },
  });
}
