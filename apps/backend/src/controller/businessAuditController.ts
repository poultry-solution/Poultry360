import { Prisma, UserRole } from "@prisma/client";
import { Request, Response } from "express";
import {
  combineBusinessAuditWhere,
  getAccountOwnerAndStaffAuditScope,
} from "../services/businessAuditScopeService";
import prisma from "../utils/prisma";

function parsePage(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : fallback;
}

type AuditQueryOptions = {
  includeAuthentication?: boolean;
  includeAdminRecords?: boolean;
  allowAccountOwnerFilter?: boolean;
};

/**
 * Builds only user-selected filters. Ownership and actor constraints are added
 * separately, so search OR clauses and request query parameters can never
 * replace an account's access scope.
 */
function buildAuditQueryWhere(
  query: Request["query"],
  {
    includeAuthentication = true,
    includeAdminRecords = true,
    allowAccountOwnerFilter = true,
  }: AuditQueryOptions = {}
): Prisma.BusinessAuditLogWhereInput {
  const directFilters: Prisma.BusinessAuditLogWhereInput = {};
  const conditions: Prisma.BusinessAuditLogWhereInput[] = [];

  const archived =
    query.archived === "true"
      ? true
      : query.archived === "all"
        ? "all"
        : false;
  if (archived !== "all") {
    directFilters.archivedAt = archived ? { not: null } : null;
  }
  if (typeof query.actorType === "string") {
    directFilters.actorType = query.actorType as Prisma.EnumAuditActorTypeFilter;
  }
  if (typeof query.action === "string" && query.action.trim()) {
    directFilters.action = {
      contains: query.action.trim(),
      mode: "insensitive",
    };
  }
  if (typeof query.targetType === "string" && query.targetType.trim()) {
    directFilters.targetType = {
      contains: query.targetType.trim(),
      mode: "insensitive",
    };
  }
  if (
    allowAccountOwnerFilter &&
    typeof query.accountOwnerId === "string" &&
    query.accountOwnerId.trim()
  ) {
    directFilters.accountOwnerId = query.accountOwnerId.trim();
  }
  if (typeof query.startDate === "string" || typeof query.endDate === "string") {
    const createdAt: Prisma.DateTimeFilter = {};
    if (
      typeof query.startDate === "string" &&
      !Number.isNaN(Date.parse(query.startDate))
    ) {
      createdAt.gte = new Date(query.startDate);
    }
    if (
      typeof query.endDate === "string" &&
      !Number.isNaN(Date.parse(query.endDate))
    ) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    if (Object.keys(createdAt).length) directFilters.createdAt = createdAt;
  }
  if (Object.keys(directFilters).length) conditions.push(directFilters);

  if (!includeAuthentication) {
    conditions.push({ NOT: { action: { startsWith: "auth." } } });
  }
  if (!includeAdminRecords) {
    // Include old rows where businessType was not set before excluding Admin.
    conditions.push({
      OR: [{ businessType: { not: "ADMIN" } }, { businessType: null }],
    });
  }
  if (typeof query.search === "string" && query.search.trim()) {
    const search = query.search.trim();
    conditions.push({
      OR: [
        { actorName: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { targetId: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return combineBusinessAuditWhere(...conditions);
}

async function buildDealerAuditWhere(req: Request) {
  const accountScope = await getAccountOwnerAndStaffAuditScope(req.userId!);
  const queryFilters = buildAuditQueryWhere(req.query, {
    includeAuthentication: false,
    includeAdminRecords: false,
    allowAccountOwnerFilter: false,
  });
  return combineBusinessAuditWhere(accountScope, queryFilters);
}

function withoutExpiredSecurityMetadata(rows: any[]) {
  const now = new Date();
  return rows.map(({ securityMetadata, ...row }) =>
    securityMetadata && securityMetadata.expiresAt > now
      ? { ...row, securityMetadata }
      : row
  );
}

async function sendLogs(
  req: Request,
  res: Response,
  where: Prisma.BusinessAuditLogWhereInput,
  includeSecurityMetadata = false
) {
  const page = parsePage(req.query.page, 1);
  const limit = Math.min(parsePage(req.query.limit, 25), 100);
  const [total, rows] = await Promise.all([
    prisma.businessAuditLog.count({ where }),
    includeSecurityMetadata
      ? prisma.businessAuditLog.findMany({
          where,
          include: { securityMetadata: true },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        })
      : prisma.businessAuditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
  ]);
  return res.json({
    success: true,
    data: includeSecurityMetadata ? withoutExpiredSecurityMetadata(rows) : rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getDealerBusinessAuditLogs(
  req: Request,
  res: Response
): Promise<any> {
  if (req.actorType === "STAFF") {
    return res
      .status(403)
      .json({ message: "Staff accounts cannot view activity history." });
  }
  return sendLogs(req, res, await buildDealerAuditWhere(req));
}

export async function getAdminBusinessAuditLogs(
  req: Request,
  res: Response
): Promise<any> {
  if (req.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  return sendLogs(req, res, buildAuditQueryWhere(req.query), true);
}

export async function exportDealerBusinessAuditLogs(
  req: Request,
  res: Response
): Promise<any> {
  if (req.actorType === "STAFF") {
    return res
      .status(403)
      .json({ message: "Staff accounts cannot export activity history." });
  }
  const rows = await prisma.businessAuditLog.findMany({
    where: await buildDealerAuditWhere(req),
    orderBy: { createdAt: "desc" },
    take: 10000,
  });
  return res.json({ success: true, data: rows });
}

export async function exportAdminBusinessAuditLogs(
  req: Request,
  res: Response
): Promise<any> {
  if (req.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  const rows = await prisma.businessAuditLog.findMany({
    where: buildAuditQueryWhere(req.query),
    include: { securityMetadata: true },
    orderBy: { createdAt: "desc" },
    take: 10000,
  });
  return res.json({ success: true, data: withoutExpiredSecurityMetadata(rows) });
}
