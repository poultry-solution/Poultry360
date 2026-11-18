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
import { apiErrorText, getTodayLocalDate } from "@/common/lib/utils";
import { formatBSLong, toNepalDayAd } from "@/common/lib/nepali-date";
import { ChevronLeft, ChevronRight, Loader2, NotebookPen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** One note, as both the farmer and hatchery APIs return it. */
export interface NoteItem {
  id: string;
  text: string;
  /** Farmer only: the day the note is about. */
  date?: string;
  createdAt: string;
  editedAt?: string | null;
  /** true = owner, false = staff, null = old note (writer unknown). */
  createdByOwner: boolean | null;
  createdByStaff?: { id: string; name: string } | null;
  canChange?: boolean;
}

export interface NotesPanelProps {
  notes: NoteItem[];
  pagination?: { page: number; total: number; totalPages: number } | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  page: number;
  setPage: (page: number) => void;
  onCreate: (input: { date?: string; text: string }) => Promise<unknown>;
  onUpdate: (id: string, input: { date?: string; text: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  creating?: boolean;
  updating?: boolean;
  deleting?: boolean;
  /** Farmer: pick the day the note is about, and show "Day N of batch". */
  withDate?: boolean;
  startDate?: string | Date | null;
  description?: string;
  placeholder?: string;
  emptyHint?: string;
  /** The single note typed when the batch / incubation was made (read-only). */
  legacyNote?: string | null;
  legacyLabel?: string;
}

const NOTES_PAGE_LIMIT = 10;
const MAX_LENGTH = 2000;

/** "Owner", "Bikram (staff)", "Removed staff", or null for old notes. */
function authorOf(note: NoteItem): string | null {
  if (note.createdByOwner === true) return "Owner";
  if (note.createdByStaff?.name) return `${note.createdByStaff.name} (staff)`;
  if (note.createdByOwner === false) return "Removed staff";
  return null;
}

/** "Kartik 21, 2083 · 2:15 PM" in Nepal time. */
function writtenAt(iso: string): string {
  try {
    const time = new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kathmandu" });
    return `${formatBSLong(iso)} · ${time}`;
  } catch {
    return "";
  }
}
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

/** Notes list with add / edit / delete, who wrote each note and when. */
export function NotesPanel({
  notes,
  pagination,
  isLoading,
  error,
  refetch,
  page,
  setPage,
  onCreate,
  onUpdate,
  onDelete,
  creating = false,
  updating = false,
  deleting = false,
  withDate = false,
  startDate,
  description: cardDescription = "What the team should know, with who wrote it and when.",
  placeholder = "Write a note for the team",
  emptyHint = "Write anything the team should know.",
  legacyNote,
  legacyLabel = "Note added when this was made",
}: NotesPanelProps) {
  const batchStartDate = startDate;

  const [date, setDate] = useState(getTodayLocalDate());
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<NoteItem | null>(null);

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
    if (creating) return;
    setFormError("");

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError("Write something first.");
      return;
    }
    if (trimmedDescription.length > MAX_LENGTH) {
      setFormError(`Keep the note under ${MAX_LENGTH} letters.`);
      return;
    }

    try {
      await onCreate({ ...(withDate ? { date: toApiDate(date) } : {}), text: trimmedDescription });
      resetCreateForm();
    } catch (err) {
      setFormError(apiErrorText(err, "Could not save the note."));
    }
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    void submitCreate();
  };

  const startEditing = (note: NoteItem) => {
    setEditingId(note.id);
    setEditDate(note.date ? toDateOnly(note.date) : "");
    setEditDescription(note.text);
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDate("");
    setEditDescription("");
    setEditError("");
  };

  const handleUpdate = async (noteId: string) => {
    if (updating) return;
    setEditError("");

    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      setEditError("Write something first.");
      return;
    }
    if (trimmedDescription.length > MAX_LENGTH) {
      setEditError(`Keep the note under ${MAX_LENGTH} letters.`);
      return;
    }

    try {
      await onUpdate(noteId, { ...(withDate ? { date: toApiDate(editDate) } : {}), text: trimmedDescription });
      cancelEditing();
    } catch (err) {
      setEditError(apiErrorText(err, "Could not change the note."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const noteId = deleteTarget.id;
    try {
      await onDelete(noteId);
      if (editingId === noteId) {
        cancelEditing();
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete note:", err);
      toast.error(apiErrorText(err, "Could not delete the note. Try again."));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle>Notes</CardTitle>
        <CardDescription>{cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Add a note */}
        <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 sm:p-4">
          <p className="text-sm font-medium">Add a note</p>
          <div className={`grid grid-cols-1 gap-3 ${withDate ? "md:grid-cols-[200px_minmax(0,1fr)]" : ""}`}>
            {withDate ? (
              <DateInput
                label="Date"
                value={date}
                onChange={(value) => setDate(toDateOnly(value))}
              />
            ) : null}
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium">Note</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={noteKeys(() => void submitCreate())}
                rows={3}
                maxLength={MAX_LENGTH}
                placeholder={placeholder}
                className={`${TEXTAREA_CLASS} bg-white`}
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={creating} className="w-full sm:w-auto">
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add note
            </Button>
          </div>
        </form>

        {/* The single note typed when the batch / incubation was made */}
        {legacyNote ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
            <p className="text-xs font-medium text-gray-500">{legacyLabel}</p>
            <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-gray-700 [overflow-wrap:anywhere]">{legacyNote}</p>
          </div>
        ) : null}

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
              {emptyHint}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
              {notes.map((note) => {
                const isEditing = editingId === note.id;
                const day = withDate && note.date ? batchDay(note.date, batchStartDate) : null;
                const author = authorOf(note);
                const canChange = note.canChange !== false;

                if (isEditing) {
                  return (
                    <li key={note.id} className="space-y-3 bg-gray-50/60 p-3 sm:p-4">
                      <div className={`grid grid-cols-1 gap-3 ${withDate ? "md:grid-cols-[200px_minmax(0,1fr)]" : ""}`}>
                        {withDate ? (
                          <DateInput
                            label="Date"
                            value={editDate}
                            onChange={(value) => setEditDate(toDateOnly(value))}
                          />
                        ) : null}
                        <div className="min-w-0">
                          <label className="mb-2 block text-sm font-medium">Note</label>
                          <Textarea
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                            onKeyDown={noteKeys(() => void handleUpdate(note.id), cancelEditing)}
                            rows={3}
                            maxLength={MAX_LENGTH}
                            autoFocus
                            className={`${TEXTAREA_CLASS} bg-white`}
                          />
                        </div>
                      </div>
                      {editError && <p className="text-sm text-red-600">{editError}</p>}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditing} disabled={updating}>
                          Cancel
                        </Button>
                        <Button type="button" size="sm" onClick={() => void handleUpdate(note.id)} disabled={updating}>
                          {updating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                          Save
                        </Button>
                      </div>
                    </li>
                  );
                }

                const actions = canChange ? (
                  <div className="flex shrink-0 justify-end gap-1 md:items-start">
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
                      disabled={deleting}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                ) : null;
                // Who wrote it and when (Nepal time), plus "edited" when changed later.
                const byLine = (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {author ? <span className="font-medium text-gray-600">{author}</span> : null}
                    {author ? " · " : ""}
                    {withDate ? "written " : ""}
                    {writtenAt(note.createdAt)}
                    {note.editedAt ? " · (edited)" : ""}
                  </p>
                );

                return withDate ? (
                  <li
                    key={note.id}
                    className="grid grid-cols-1 gap-2 p-3 sm:p-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:gap-4"
                  >
                    <div className="flex items-baseline gap-2 md:block">
                      <p className="text-sm font-medium text-gray-900">
                        <DateDisplay date={note.date!} format="long" />
                      </p>
                      {day != null && (
                        <p className="text-xs text-muted-foreground md:mt-0.5">Day {day} of batch</p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap break-words text-sm text-gray-700 [overflow-wrap:anywhere]">{note.text}</p>
                      {byLine}
                    </div>
                    {actions}
                  </li>
                ) : (
                  <li key={note.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm text-gray-800 [overflow-wrap:anywhere]">{note.text}</p>
                      {byLine}
                    </div>
                    {actions}
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
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
