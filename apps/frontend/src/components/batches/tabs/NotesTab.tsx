"use client";

import React, { useState } from "react";
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
import { getTodayLocalDate } from "@/common/lib/utils";
import {
  BatchNote,
  useCreateBatchNote,
  useDeleteBatchNote,
  useGetBatchNotes,
  useUpdateBatchNote,
} from "@/fetchers/batches/batchQueries";
import { Edit2, Loader2, Plus, Save, Trash2, X } from "lucide-react";

interface NotesTabProps {
  batchId: string;
}

const toDateOnly = (value: string) => {
  return value.includes("T") ? value.split("T")[0] : value;
};

const toApiDate = (value: string) => {
  const dateOnly = toDateOnly(value || getTodayLocalDate());
  return `${dateOnly}T00:00:00.000Z`;
};

export function NotesTab({ batchId }: NotesTabProps) {
  const { data, isLoading, error } = useGetBatchNotes(batchId);
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

  const notes = data?.data ?? [];

  const resetCreateForm = () => {
    setDate(getTodayLocalDate());
    setDescription("");
    setFormError("");
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      setFormError("Description is required.");
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
    setEditError("");

    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      setEditError("Description is required.");
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

  const handleDelete = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      await deleteNote.mutateAsync(noteId);
      if (editingId === noteId) {
        cancelEditing();
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2">
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Record dated observations for this batch.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreate} className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
            <DateInput
              label="Date"
              value={date}
              onChange={(value) => setDate(toDateOnly(value))}
            />
            <div>
              <label className="mb-2 block text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Write batch note"
                className="min-h-24"
              />
            </div>
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <Button type="submit" disabled={createNote.isPending}>
            {createNote.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add Note
          </Button>
        </form>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading notes...</span>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-red-600">
            Failed to load notes.
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
            No notes added yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-44 px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="w-36 px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {notes.map((note) => {
                  const isEditing = editingId === note.id;

                  return (
                    <tr key={note.id} className="align-top hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <DateInput
                            value={editDate}
                            onChange={(value) => setEditDate(toDateOnly(value))}
                          />
                        ) : (
                          <DateDisplay date={note.date} format="short" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editDescription}
                              onChange={(event) => setEditDescription(event.target.value)}
                              className="min-h-20"
                            />
                            {editError && (
                              <p className="text-sm text-red-600">{editError}</p>
                            )}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            {note.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleUpdate(note.id)}
                                disabled={updateNote.isPending}
                                aria-label="Save note"
                              >
                                {updateNote.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={cancelEditing}
                                aria-label="Cancel editing"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => startEditing(note)}
                                aria-label="Edit note"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(note.id)}
                                disabled={deleteNote.isPending}
                                aria-label="Delete note"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
