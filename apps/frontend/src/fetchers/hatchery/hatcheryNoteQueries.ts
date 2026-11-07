import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

/** Notes on a hatchery parent batch or an incubation. */
export type HatcheryNoteKind = "batch" | "incubation";

export interface HatcheryNote {
  id: string;
  text: string;
  createdAt: string;
  editedAt: string | null;
  /** true = owner, false = staff. */
  createdByOwner: boolean;
  createdByStaffId: string | null;
  createdByStaff?: { id: string; name: string } | null;
  canChange: boolean;
}

interface NotesResponse {
  data: HatcheryNote[];
  /** The single note typed when the batch / incubation was made. */
  legacyNote: string | null;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const basePath = (kind: HatcheryNoteKind, id: string) =>
  kind === "batch" ? `/hatchery/batches/${id}/notes` : `/hatchery/incubations/${id}/notes`;

export const hatcheryNoteKeys = {
  all: (kind: HatcheryNoteKind, id: string) => ["hatchery-notes", kind, id] as const,
  page: (kind: HatcheryNoteKind, id: string, page: number) => ["hatchery-notes", kind, id, page] as const,
};

export function useHatcheryNotes(kind: HatcheryNoteKind, id: string, page: number) {
  return useQuery({
    queryKey: hatcheryNoteKeys.page(kind, id, page),
    queryFn: async () => (await axiosInstance.get<NotesResponse>(basePath(kind, id), { params: { page } })).data,
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

function useNoteMutation<V>(kind: HatcheryNoteKind, id: string, run: (vars: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hatcheryNoteKeys.all(kind, id) }),
  });
}

export function useCreateHatcheryNote(kind: HatcheryNoteKind, id: string) {
  return useNoteMutation(kind, id, async (text: string) => (await axiosInstance.post(basePath(kind, id), { text })).data);
}

export function useUpdateHatcheryNote(kind: HatcheryNoteKind, id: string) {
  return useNoteMutation(kind, id, async ({ noteId, text }: { noteId: string; text: string }) =>
    (await axiosInstance.put(`${basePath(kind, id)}/${noteId}`, { text })).data
  );
}

export function useDeleteHatcheryNote(kind: HatcheryNoteKind, id: string) {
  return useNoteMutation(kind, id, async (noteId: string) => (await axiosInstance.delete(`${basePath(kind, id)}/${noteId}`)).data);
}
