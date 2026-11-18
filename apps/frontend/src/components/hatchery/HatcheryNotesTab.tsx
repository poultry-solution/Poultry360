"use client";

import { useState } from "react";
import { NotesPanel } from "@/components/notes/NotesPanel";
import {
  useCreateHatcheryNote,
  useDeleteHatcheryNote,
  useHatcheryNotes,
  useUpdateHatcheryNote,
  type HatcheryNoteKind,
} from "@/fetchers/hatchery/hatcheryNoteQueries";

/** Notes on a parent batch or an incubation: who wrote each one and when. */
export function HatcheryNotesTab({ kind, id }: { kind: HatcheryNoteKind; id: string }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useHatcheryNotes(kind, id, page);
  const createNote = useCreateHatcheryNote(kind, id);
  const updateNote = useUpdateHatcheryNote(kind, id);
  const deleteNote = useDeleteHatcheryNote(kind, id);

  return (
    <NotesPanel
      notes={data?.data ?? []}
      pagination={data?.pagination}
      isLoading={isLoading}
      error={error}
      refetch={() => void refetch()}
      page={page}
      setPage={setPage}
      description={
        kind === "batch"
          ? "Anything the team should know about this batch. Owner and staff can write."
          : "Anything the team should know about this incubation. Owner and staff can write."
      }
      placeholder={
        kind === "batch"
          ? "e.g. Eggs from house 2 look dirty, clean trays before setting"
          : "e.g. Setter temperature went down at night, checked and fixed"
      }
      emptyHint="Write anything the team should know. Each note shows who wrote it and when."
      legacyNote={data?.legacyNote}
      legacyLabel={kind === "batch" ? "Note added when the batch was made" : "Note added when the incubation was made"}
      onCreate={({ text }) => createNote.mutateAsync(text)}
      onUpdate={(noteId, { text }) => updateNote.mutateAsync({ noteId, text })}
      onDelete={(noteId) => deleteNote.mutateAsync(noteId)}
      creating={createNote.isPending}
      updating={updateNote.isPending}
      deleting={deleteNote.isPending}
    />
  );
}
