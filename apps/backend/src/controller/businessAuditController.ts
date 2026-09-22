import { Prisma, UserRole } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../utils/prisma";

function parsePage(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : fallback;
}

function buildWhere(query: Request["query"], accountOwnerId?: string, includeAuthentication = true): Prisma.BusinessAuditLogWhereInput {
  const where: Prisma.BusinessAuditLogWhereInput = accountOwnerId ? { accountOwnerId } : {};
  if (!includeAuthentication) where.NOT = { action: { startsWith: "auth." } };
  const archived = query.archived === "true" ? true : query.archived === "all" ? "all" : false;
  if (archived !== "all") where.archivedAt = archived ? { not: null } : null;
  if (typeof query.actorType === "string") where.actorType = query.actorType as any;
  if (typeof query.action === "string" && query.action.trim()) where.action = { contains: query.action.trim(), mode: "insensitive" };
  if (typeof query.targetType === "string" && query.targetType.trim()) where.targetType = { contains: query.targetType.trim(), mode: "insensitive" };
  if (typeof query.accountOwnerId === "string" && query.accountOwnerId.trim()) where.accountOwnerId = query.accountOwnerId.trim();
  if (typeof query.startDate === "string" || typeof query.endDate === "string") {
    const createdAt: Prisma.DateTimeFilter = {};
    if (typeof query.startDate === "string" && !Number.isNaN(Date.parse(query.startDate))) createdAt.gte = new Date(query.startDate);
    if (typeof query.endDate === "string" && !Number.isNaN(Date.parse(query.endDate))) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    if (Object.keys(createdAt).length) where.createdAt = createdAt;
  }
  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim();
    where.OR = [
      { actorName: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { targetId: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
}

async function sendLogs(req: Request, res: Response, accountOwnerId?: string, includeAuthentication = true) {
  const page = parsePage(req.query.page, 1);
  const limit = Math.min(parsePage(req.query.limit, 25), 100);
  const where = buildWhere(req.query, accountOwnerId, includeAuthentication);
  const [total, rows] = await Promise.all([
    prisma.businessAuditLog.count({ where }),
    prisma.businessAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ]);
  return res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

export async function getDealerBusinessAuditLogs(req: Request, res: Response): Promise<any> {
  if (req.actorType === "STAFF") return res.status(403).json({ message: "Staff accounts cannot view activity history." });
  return sendLogs(req, res, req.userId!, false);
}

export async function getAdminBusinessAuditLogs(req: Request, res: Response): Promise<any> {
  if (req.role !== UserRole.SUPER_ADMIN) return res.status(403).json({ message: "Super Admin access required" });
  return sendLogs(req, res);
}

export async function exportDealerBusinessAuditLogs(req: Request, res: Response): Promise<any> {
  if (req.actorType === "STAFF") return res.status(403).json({ message: "Staff accounts cannot export activity history." });
  const rows = await prisma.businessAuditLog.findMany({ where: buildWhere(req.query, req.userId!, false), orderBy: { createdAt: "desc" }, take: 10000 });
  return res.json({ success: true, data: rows });
}

export async function exportAdminBusinessAuditLogs(req: Request, res: Response): Promise<any> {
  if (req.role !== UserRole.SUPER_ADMIN) return res.status(403).json({ message: "Super Admin access required" });
  const rows = await prisma.businessAuditLog.findMany({ where: buildWhere(req.query), orderBy: { createdAt: "desc" }, take: 10000 });
  return res.json({ success: true, data: rows });
}
