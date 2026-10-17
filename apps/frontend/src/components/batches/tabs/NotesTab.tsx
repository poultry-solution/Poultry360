"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { Textarea } from "@/common/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { getTodayLocalDate } from "@/common/lib/utils";
import { toNepalDayAd } from "@/common/lib/nepali-date";
import {
  BatchNote,
  useCreateBatchNote,
  useDeleteBatchNote,
  useGetBatchNotes,
  useUpdateBatchNote,
} from "@/fetchers/batches/batchQueries";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface NotesTabProps {
  batchId: string;
  batchStartDate?: string | Date | null;
}

const NOTES_PAGE_LIMIT = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const TEXTAREA_CLASS =
  "min-h-20 max-w-full resize-y overflow-x-hidden [field-sizing:fixed] [overflow-wrap:anywhere]";

const toDateOnly = (value: string) => {
  return value.includes("T") ? value.split("T")[0] : value;
};

const toApiDate = (value: string) => {
  const dateOnly = toDateOnly(value || getTodayLocalDate());
  return `${dateOnly}T00:00:00.000Z`;
};

/** Day number of the batch on the note's Nepal day (start day = Day 1). Null when unknown or before start. */
function batchDay(noteDate: string, start?: string | Date | null): number | null {
  if (!noteDate || !start) return null;
  const noteDay = Date.parse(`${toNepalDayAd(noteDate)}T00:00:00Z`);
  const startDay = Date.parse(`${toNepalDayAd(start)}T00:00:00Z`);
  if (!Number.isFinite(noteDay) || !Number.isFinite(startDay)) return null;
  const day = Math.round((noteDay - startDay) / DAY_MS) + 1;
  return day >= 1 ? day : null;
}

/** Ctrl/⌘ + Enter saves, Esc cancels (when given). */
function noteKeys(onSave: () => void, onCancel?: () => void) {
  return (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSave();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  };
}

export function NotesTab({ batchId, batchStartDate }: NotesTabProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useGetBatchNotes(batchId, {
    page,
    limit: NOTES_PAGE_LIMIT,
  });
  const createNote = useCreateBatchNote(batchId);
  const updateNote = useUpdateBatchNote(batchId);
  const deleteNote = useDeleteBatchNote(batchId);

  const [date, setDate] = useState(getTodayLocalDate());
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<BatchNote | null>(null);

  const notes = data?.data ?? [];
  const pagination = data?.pagination;
  const totalRows = Number(pagination?.total ?? 0);
  const totalPages = Math.max(1, Number(pagination?.totalPages ?? 1));
  const currentPage = Math.min(Math.max(1, Number(pagination?.page ?? page)), totalPages);
  const showingStart = totalRows > 0 ? (currentPage - 1) * NOTES_PAGE_LIMIT + 1 : 0;
  const showingEnd = totalRows > 0 ? Math.min(currentPage * NOTES_PAGE_LIMIT, totalRows) : 0;
  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetCreateForm = () => {
    setDate(getTodayLocalDate());
    setDescription("");
    setFormError("");
  };

  const submitCreate = async () => {
    if (createNote.isPending) return;
    setFormError("");

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError("Write something first.");
      return;
    }

    try {
      await createNote.mutateAsync({
        date: toApiDate(date),
        description: trimmedDescription,
      });
      resetCreateForm();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || "Failed to save note.");
    }
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    void submitCreate();
  };

  const startEditing = (note: BatchNote) => {
    setEditingId(note.id);
    setEditDate(toDateOnly(note.date));
    setEditDescription(note.description);
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate("");
    setEditDescription("");
    setEditError("");
  };

  const handleUpdate = async (noteId: string) => {
    if (updateNote.isPending) return;
    setEditError("");

    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      setEditError("Write something first.");
      return;
    }

    try {
      await updateNote.mutateAsync({
        noteId,
        data: {
          date: toApiDate(editDate),
          description: trimmedDescription,
        },
      });
      cancelEditing();
    } catch (err: any) {
      setEditError(err?.response?.data?.message || "Failed to update note.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const noteId = deleteTarget.id;
    try {
      await deleteNote.mutateAsync(noteId);
      if (editingId === noteId) {
        cancelEditing();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error("Could not delete the note. Try again.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Notes</CardTitle>
        <CardDescription>What you see in this batch, day by day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add a note */}
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
          <p className="text-sm font-medium">Add a note</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
            <DateInput
              label="Date"
              value={date}
              onChange={(value) => setDate(toDateOnly(value))}
            />
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium">Note</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={noteKeys(() => void submitCreate())}
                rows={3}
                placeholder="What happened today? e.g. Gave Gumboro vaccine, birds eating less"
                className={`${TEXTAREA_CLASS} bg-white`}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={createNote.isPending} className="w-full sm:w-auto">
              {createNote.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add note
            </Button>
          </div>
        </form>

        {/* Notes */}
        {isLoading ? (
          <div className="space-y-2" aria-label="Loading notes">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center">
            <p className="text-sm text-red-600">Could not load notes.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-center">
            <NotebookPen className="h-6 w-6 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">No notes yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Write what you see each day: vaccines, feed changes, sick birds.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {notes.map((note) => {
                const isEditing = editingId === note.id;
                const day = batchDay(note.date, batchStartDate);

                if (isEditing) {
                  return (
                    <li key={note.id} className="space-y-3 bg-gray-50/60 p-3 sm:p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
                        <DateInput
                          label="Date"
                          value={editDate}
                          onChange={(value) => setEditDate(toDateOnly(value))}
                        />
                        <div className="min-w-0">
                          <label className="mb-2 block text-sm font-medium">Note</label>
                          <Textarea
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            onKeyDown={noteKeys(() => void handleUpdate(note.id), cancelEditing)}
                            rows={3}
                            autoFocus
                            className={`${TEXTAREA_CLASS} bg-white`}
                          />
                        </div>
                      </div>
                      {editError && <p className="text-sm text-red-600">{editError}</p>}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditing} disabled={updateNote.isPending}>
                          Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={() => void handleUpdate(note.id)} disabled={updateNote.isPending}>
                          {updateNote.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Save
                        </Button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li
                    key={note.id}
                    className="grid grid-cols-1 gap-2 p-3 sm:p-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:gap-4"
                  >
                    <div className="flex items-baseline gap-2 md:block">
                      <p className="text-sm font-medium text-gray-900">
                        <DateDisplay date={note.date} format="long" />
                      </p>
                      {day != null && (
                        <p className="text-xs text-muted-foreground md:mt-0.5">Day {day} of batch</p>
                      )}
                    </div>
                    <p className="min-w-0 whitespace-pre-wrap break-words text-sm text-gray-700 [overflow-wrap:anywhere]">
                      {note.description}
                    </p>
                    <div className="flex justify-end gap-1 md:items-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-gray-600"
                        onClick={() => startEditing(note)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(note)}
                        disabled={deleteNote.isPending}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {showingStart}–{showingEnd} of {totalRows}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={!canGoPrevious}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={!canGoNext}
                  >
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteNote.isPending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNote.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteNote.isPending}
            >
              {deleteNote.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
