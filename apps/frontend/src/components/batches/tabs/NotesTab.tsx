"use client";

import { useState } from "react";
import { NotesPanel } from "@/components/notes/NotesPanel";
import {
  useCreateBatchNote,
  useDeleteBatchNote,
  useGetBatchNotes,
  useUpdateBatchNote,
} from "@/fetchers/batches/batchQueries";

interface NotesTabProps {
  batchId: string;
  batchStartDate?: string | Date | null;
}

const NOTES_PAGE_LIMIT = 10;

/** Farmer batch notes: the day it is about, who wrote it and when. */
export function NotesTab({ batchId, batchStartDate }: NotesTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useGetBatchNotes(batchId, { page, limit: NOTES_PAGE_LIMIT });
  const createNote = useCreateBatchNote(batchId);
  const updateNote = useUpdateBatchNote(batchId);
  const deleteNote = useDeleteBatchNote(batchId);

  const notes = (data?.data ?? []).map((note) => ({ ...note, text: note.description }));

  return (
    <NotesPanel
      notes={notes}
      pagination={data?.pagination}
      isLoading={isLoading}
      error={error}
      refetch={() => void refetch()}
      page={page}
      setPage={setPage}
      withDate
      startDate={batchStartDate}
      description="What you see in this batch, day by day."
      placeholder="What happened today? e.g. Gave Gumboro vaccine, birds eating less"
      emptyHint="Write what you see each day: vaccines, feed changes, sick birds."
      onCreate={({ date, text }) => createNote.mutateAsync({ date: date!, description: text })}
      onUpdate={(noteId, { date, text }) => updateNote.mutateAsync({ noteId, data: { date: date!, description: text } })}
      onDelete={(noteId) => deleteNote.mutateAsync(noteId)}
      creating={createNote.isPending}
      updating={updateNote.isPending}
      deleting={deleteNote.isPending}
    />
  );
}
