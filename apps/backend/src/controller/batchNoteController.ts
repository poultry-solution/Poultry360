import { Request, Response } from "express";
import prisma from "../utils/prisma";

class BatchNoteError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const normalizeDate = (value: unknown): Date => {
  if (!value || typeof value !== "string") {
    throw new BatchNoteError("Date is required");
  }

  const dateOnly = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new BatchNoteError("Invalid date");
  }

  return parsed;
};

const normalizeDescription = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new BatchNoteError("Description is required");
  }

  const description = value.trim();
  if (!description) {
    throw new BatchNoteError("Description is required");
  }

  return description;
};

const ensureBatchAccess = async (batchId: string, userId?: string) => {
  if (!batchId) {
    throw new BatchNoteError("Batch ID is required");
  }

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      farm: {
        select: {
          ownerId: true,
          managers: { select: { id: true } },
        },
      },
    },
  });

  if (!batch) {
    throw new BatchNoteError("Batch not found", 404);
  }

  const hasAccess =
    !!userId &&
    (batch.farm.ownerId === userId ||
      batch.farm.managers.some((manager) => manager.id === userId));

  if (!hasAccess) {
    throw new BatchNoteError("You do not have access to this batch", 403);
  }

  return batch;
};

const handleError = (res: Response, error: unknown, fallback: string) => {
  console.error(fallback, error);

  if (error instanceof BatchNoteError) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  const message = (error as any)?.message || fallback;
  return res.status(500).json({ success: false, message });
};

export const getBatchNotes = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    await ensureBatchAccess(id, req.userId);

    const notes = await prisma.batchNote.findMany({
      where: { batchId: id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return res.json({ success: true, data: notes });
  } catch (error) {
    return handleError(res, error, "Get batch notes error");
  }
};

export const createBatchNote = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const date = normalizeDate(req.body?.date);
    const description = normalizeDescription(req.body?.description);

    await ensureBatchAccess(id, req.userId);

    const note = await prisma.batchNote.create({
      data: {
        batchId: id,
        date,
        description,
      },
    });

    return res.status(201).json({ success: true, data: note });
  } catch (error) {
    return handleError(res, error, "Create batch note error");
  }
};

export const updateBatchNote = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id, noteId } = req.params;
    const date = normalizeDate(req.body?.date);
    const description = normalizeDescription(req.body?.description);

    await ensureBatchAccess(id, req.userId);

    const existing = await prisma.batchNote.findFirst({
      where: { id: noteId, batchId: id },
      select: { id: true },
    });

    if (!existing) {
      throw new BatchNoteError("Note not found", 404);
    }

    const note = await prisma.batchNote.update({
      where: { id: noteId },
      data: { date, description },
    });

    return res.json({ success: true, data: note });
  } catch (error) {
    return handleError(res, error, "Update batch note error");
  }
};

export const deleteBatchNote = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id, noteId } = req.params;

    await ensureBatchAccess(id, req.userId);

    const existing = await prisma.batchNote.findFirst({
      where: { id: noteId, batchId: id },
      select: { id: true },
    });

    if (!existing) {
      throw new BatchNoteError("Note not found", 404);
    }

    await prisma.batchNote.delete({ where: { id: noteId } });

    return res.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    return handleError(res, error, "Delete batch note error");
  }
};
