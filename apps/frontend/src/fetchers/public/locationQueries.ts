import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/common/lib/axios";

export interface PublicLocationSuggestion {
  id: string;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  province: string | null;
  address: string | null;
}

interface PublicLocationResponse {
  success: boolean;
  data: PublicLocationSuggestion[];
}

interface PublicReverseLocationResponse {
  success: boolean;
  data: PublicLocationSuggestion;
}

export const publicLocationKeys = {
  all: ["public", "locations"] as const,
  search: (query: string) => [...publicLocationKeys.all, "search", query] as const,
};

export function usePublicLocationSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: publicLocationKeys.search(trimmed),
    enabled: trimmed.length >= 2,
    queryFn: async () => {
      const { data } = await publicApi.get<PublicLocationResponse>("/public/locations/search", {
        params: { q: trimmed, limit: 6 },
      });
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export async function reversePublicLocation(latitude: number, longitude: number) {
  const { data } = await publicApi.get<PublicReverseLocationResponse>("/public/locations/reverse", {
    params: { lat: latitude, lng: longitude },
  });
  return data.data;
}
