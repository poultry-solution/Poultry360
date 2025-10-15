"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider as RQProvider,
} from "@tanstack/react-query";

// ==================== QUERY CLIENT CONFIG ====================

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false; // no retry on client errors
          }
          return failureCount < 3; // retry up to 3 times
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: (failureCount, error: any) => {
          if (error?.response?.status >= 400 && error?.response?.status < 500) {
            return false;
          }
          return failureCount < 2; // retry up to 2 times
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        onError: (error: any) => {
          console.error("Query error:", error);
        },
      },
    },
  });
}

// ==================== PROVIDER ====================

interface Props {
  children: React.ReactNode;
}

export default function QueryClientProvider({ children }: Props) {
  const [queryClient] = useState(createQueryClient);

  return <RQProvider client={queryClient}>{children}</RQProvider>;
}
