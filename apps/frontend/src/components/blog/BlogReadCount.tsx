"use client";

import { useEffect, useRef, useState } from "react";
import { publicApi } from "@/common/lib/axios";
import { getReadCountLabel } from "@/lib/blog";

interface BlogReadCountProps {
  slug: string;
  initialCount: number;
}

export default function BlogReadCount({ slug, initialCount }: BlogReadCountProps) {
  const [count, setCount] = useState(initialCount);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const trackView = async () => {
      try {
        const { data } = await publicApi.post<{ success: boolean; data: { viewCount: number } }>(
          `/public/blog-posts/${slug}/view`
        );

        if (typeof data?.data?.viewCount === "number") {
          setCount(data.data.viewCount);
        }
      } catch {
        // Keep the initial count if tracking fails.
      }
    };

    void trackView();
  }, [slug]);

  return <span>{getReadCountLabel(count)}</span>;
}
