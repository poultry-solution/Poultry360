"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";

const queryClient: QueryClient = new QueryClient({
  // Reminders show live money (what a customer owes, what was paid since), so
  // any saved change refreshes them. Only lists on screen are fetched again.
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders", "active"] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
