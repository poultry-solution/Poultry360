"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, FileText, PencilLine, Plus, Search } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { useGetAdminBlogPosts } from "@/fetchers/admin/blogQueries";
import { formatBlogDate, getReadCountLabel } from "@/lib/blog";

export default function AdminBlogPostsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useGetAdminBlogPosts({
    search: debouncedSearch || undefined,
    status: status === "ALL" ? undefined : status,
  });

  const posts = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog Manager</h1>
          <p className="text-muted-foreground">
            Create Nepal-focused SEO content and publish it directly on `/blog`.
          </p>
        </div>

        <Button asChild>
          <Link href="/admin/dashboard/blog/new">
            <Plus className="mr-2 size-4" />
            New Post
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Search title, slug, or excerpt"
            />
          </div>

          <Select value={status} onValueChange={(value) => setStatus(value as "ALL" | "DRAFT" | "PUBLISHED")}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PUBLISHED">Published</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Posts</CardTitle>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading blog posts...</p>
          ) : isError ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Failed to load blog posts.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-12 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No blog posts found.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Featured</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Reads</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="min-w-[320px] max-w-[420px] align-top">
                        <div className="space-y-1 overflow-hidden">
                          <p className="font-medium break-words">{post.title}</p>
                          <p className="text-xs text-muted-foreground break-all">/blog/{post.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.bannerImageUrl ? "default" : "outline"}>
                          {post.bannerImageUrl ? "Ready" : "Missing"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.isFeatured ? "default" : "outline"}>
                          {post.isFeatured ? "Featured" : "Standard"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === "PUBLISHED" ? "default" : "outline"}>
                          {post.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBlogDate(post.publishedAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getReadCountLabel(post.viewCount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatBlogDate(post.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/admin/dashboard/blog/${post.id}`}>
                              <PencilLine className="mr-1 size-4" />
                              Edit
                            </Link>
                          </Button>
                          {post.status === "PUBLISHED" && (
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/blog/${post.slug}`} target="_blank">
                                <ExternalLink className="mr-1 size-4" />
                                View
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
