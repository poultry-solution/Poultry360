import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { publicApi } from "@/common/lib/axios";

// ==================== TYPES ====================

export interface LandingContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  farmType: string | null;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactBody {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  farmType?: string;
  message: string;
}

interface ContactsResponse {
  success: boolean;
  data: LandingContact[];
}

interface CreateContactResponse {
  success: boolean;
  data: LandingContact;
  message?: string;
}

// ==================== QUERY KEYS ====================

export const landingContactKeys = {
  all: ["landing-contacts"] as const,
  list: (limit?: number) => [...landingContactKeys.all, "list", limit] as const,
};

// ==================== QUERIES ====================

export function useLandingContacts(limit = 100) {
  return useQuery<ContactsResponse>({
    queryKey: landingContactKeys.list(limit),
    queryFn: async () => {
      const { data } = await publicApi.get<ContactsResponse>(
        `/public/contacts?limit=${limit}`
      );
      return data;
    },
  });
}

// ==================== MUTATIONS ====================

export function useCreateLandingContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateContactBody) => {
      const { data } = await publicApi.post<CreateContactResponse>(
        "/public/contacts",
        body
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: landingContactKeys.all });
    },
  });
}
