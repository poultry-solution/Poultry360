import { AuditActorType, Prisma } from "@prisma/client";
import { Request } from "express";
import prisma from "../utils/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type BusinessAuditEvent = {
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata?: Prisma.InputJsonValue;
  accountOwnerId?: string;
  businessType?: string;
  businessId?: string;
};

/** Writes only safe, explicitly supplied business activity. */
export async function writeBusinessAudit(
  req: Request,
  event: BusinessAuditEvent,
  db: DbClient = prisma,
) {
  const isStaff = req.actorType === "STAFF";
  const accountOwnerId = event.accountOwnerId || req.userId;
  if (!accountOwnerId) throw new Error("Audit account owner is required");

  let actorId = req.userId || "unknown";
  let actorName = "Unknown user";
  let actorRole: string | undefined = req.role;
  if (isStaff) {
    actorId = req.staffUserId || "unknown";
    actorRole = "DEALER_STAFF";
    const staff = req.staffUserId
      ? await db.staffUser.findUnique({ where: { id: req.staffUserId }, select: { name: true } })
      : null;
    actorName = staff?.name || "Dealer staff";
  } else if (req.userId) {
    const user = await db.user.findUnique({ where: { id: req.userId }, select: { name: true, role: true } });
    actorName = user?.name || "User";
    actorRole = user?.role || actorRole;
  }

  return db.businessAuditLog.create({
    data: {
      accountOwnerId,
      businessType: event.businessType || (req.dealerId ? "DEALER" : req.role === "SUPER_ADMIN" ? "ADMIN" : undefined),
      businessId: event.businessId || req.dealerId,
      actorId,
      actorType: isStaff ? AuditActorType.STAFF : AuditActorType.USER,
      actorName,
      actorRole,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      description: event.description,
      metadata: event.metadata,
    },
  });
}

export async function archiveExpiredBusinessAuditLogs(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 10);
  return prisma.businessAuditLog.updateMany({
    where: { archivedAt: null, createdAt: { lt: cutoff } },
    data: { archivedAt: now },
  });
}

let archiverStarted = false;
export function startBusinessAuditArchiver() {
  if (archiverStarted) return;
  archiverStarted = true;
  void archiveExpiredBusinessAuditLogs().catch((error) => console.error("Audit archive error:", error));
  setInterval(() => {
    void archiveExpiredBusinessAuditLogs().catch((error) => console.error("Audit archive error:", error));
  }, 60 * 60 * 1000);
}
