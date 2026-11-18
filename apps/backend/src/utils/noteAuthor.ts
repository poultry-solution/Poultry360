/** Shared rules for batch / incubation notes (farmer and hatchery). */

export const NOTE_MAX_LENGTH = 2000;

/** Trimmed note text, or a plain error message when it can't be saved. */
export function checkNoteText(value: unknown): { text: string } | { error: string } {
  if (typeof value !== "string" || !value.trim()) return { error: "Write a note first" };
  const text = value.trim();
  if (text.length > NOTE_MAX_LENGTH) return { error: `Keep the note under ${NOTE_MAX_LENGTH} letters` };
  return { text };
}

/**
 * Only the person who wrote a note, or the owner, may change it.
 * `createdByOwner` null = an old note whose writer is unknown: owner only.
 */
export function canChangeNote(
  note: { createdByStaffId: string | null; createdByOwner: boolean | null },
  staffUserId: string | null | undefined
): boolean {
  if (!staffUserId) return true; // the owner
  return note.createdByOwner === false && note.createdByStaffId === staffUserId;
}

export const NOT_YOUR_NOTE = "Only the person who wrote this note or the owner can change it.";

/** Who wrote it, for the list. */
export const noteAuthorSelect = { createdByStaff: { select: { id: true, name: true } } } as const;
