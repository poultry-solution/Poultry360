import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { NOT_YOUR_NOTE, canChangeNote, checkNoteText, noteAuthorSelect } from "../utils/noteAuthor";

/**
 * Notes on a hatchery parent batch or an incubation. Owner and staff can add;
 * only the writer or the owner can change or delete. Closed batches and
 * finished incubations still take notes.
 */

type Kind = "batch" | "incubation";
const PAGE_SIZE = 10;

class NoteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Both `message` and `error`, so every frontend error reader shows it. */
function fail(res: Response, label: string, error: unknown) {
  if (error instanceof NoteError) {
    return res.status(error.status).json({ success: false, message: error.message, error: error.message });
  }
  console.error(`${label} error:`, error);
  return res.status(500).json({ success: false, message: "Internal server error", error: "Internal server error" });
}

/** The parent batch / incubation of this hatchery, with its old single note. */
async function findParent(kind: Kind, id: string, ownerId: string) {
  if (kind === "batch") {
    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
      select: { id: true, notes: true },
    });
    if (!batch) throw new NoteError(404, "Batch not found");
    return batch;
  }
  const incubation = await prisma.hatcheryIncubationBatch.findFirst({
    where: { id, hatcheryOwnerId: ownerId },
    select: { id: true, notes: true },
  });
  if (!incubation) throw new NoteError(404, "Incubation batch not found");
  return incubation;
}

const parentWhere = (kind: Kind, id: string) => (kind === "batch" ? { hatcheryBatchId: id } : { incubationId: id });

async function findNote(kind: Kind, parentId: string, noteId: string, ownerId: string) {
  const note = await prisma.hatcheryNote.findFirst({
    where: { id: noteId, hatcheryOwnerId: ownerId, ...parentWhere(kind, parentId) },
    select: { id: true, createdByStaffId: true, createdByOwner: true },
  });
  if (!note) throw new NoteError(404, "Note not found");
  return note;
}

function list(kind: Kind) {
  return async (req: Request, res: Response): Promise<any> => {
    try {
      const ownerId = req.userId!;
      const parent = await findParent(kind, req.params.id, ownerId);
      const page = Math.max(1, Number(req.query.page) || 1);
      const where = { hatcheryOwnerId: ownerId, ...parentWhere(kind, parent.id) };
      const [rows, total] = await Promise.all([
        prisma.hatcheryNote.findMany({
          where,
          include: noteAuthorSelect,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
        prisma.hatcheryNote.count({ where }),
      ]);
      return res.json({
        success: true,
        data: rows.map((note) => ({ ...note, canChange: canChangeNote(note, req.staffUserId) })),
        // The single note typed when the batch / incubation was made.
        legacyNote: parent.notes?.trim() || null,
        pagination: { page, limit: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
      });
    } catch (error) {
      return fail(res, `List hatchery ${kind} notes`, error);
    }
  };
}

function create(kind: Kind) {
  return async (req: Request, res: Response): Promise<any> => {
    try {
      const ownerId = req.userId!;
      const checked = checkNoteText(req.body?.text);
      if ("error" in checked) throw new NoteError(400, checked.error);
      const parent = await findParent(kind, req.params.id, ownerId);
      const note = await prisma.hatcheryNote.create({
        data: {
          hatcheryOwnerId: ownerId,
          ...parentWhere(kind, parent.id),
          text: checked.text,
          createdByOwner: !req.staffUserId,
          createdByStaffId: req.staffUserId ?? null,
        },
        include: noteAuthorSelect,
      });
      res.locals.auditTargetId = note.id;
      return res.status(201).json({ success: true, data: { ...note, canChange: true } });
    } catch (error) {
      return fail(res, `Create hatchery ${kind} note`, error);
    }
  };
}

function update(kind: Kind) {
  return async (req: Request, res: Response): Promise<any> => {
    try {
      const ownerId = req.userId!;
      const checked = checkNoteText(req.body?.text);
      if ("error" in checked) throw new NoteError(400, checked.error);
      await findParent(kind, req.params.id, ownerId);
      const existing = await findNote(kind, req.params.id, req.params.noteId, ownerId);
      if (!canChangeNote(existing, req.staffUserId)) throw new NoteError(403, NOT_YOUR_NOTE);
      const note = await prisma.hatcheryNote.update({
        where: { id: existing.id },
        data: { text: checked.text, editedAt: new Date() },
        include: noteAuthorSelect,
      });
      return res.json({ success: true, data: { ...note, canChange: true } });
    } catch (error) {
      return fail(res, `Update hatchery ${kind} note`, error);
    }
  };
}

function remove(kind: Kind) {
  return async (req: Request, res: Response): Promise<any> => {
    try {
      const ownerId = req.userId!;
      await findParent(kind, req.params.id, ownerId);
      const existing = await findNote(kind, req.params.id, req.params.noteId, ownerId);
      if (!canChangeNote(existing, req.staffUserId)) throw new NoteError(403, NOT_YOUR_NOTE);
      await prisma.hatcheryNote.delete({ where: { id: existing.id } });
      return res.json({ success: true, message: "Note deleted" });
    } catch (error) {
      return fail(res, `Delete hatchery ${kind} note`, error);
    }
  };
}

export const listHatcheryBatchNotes = list("batch");
export const createHatcheryBatchNote = create("batch");
export const updateHatcheryBatchNote = update("batch");
export const deleteHatcheryBatchNote = remove("batch");

export const listIncubationNotes = list("incubation");
export const createIncubationNote = create("incubation");
export const updateIncubationNote = update("incubation");
export const deleteIncubationNote = remove("incubation");
