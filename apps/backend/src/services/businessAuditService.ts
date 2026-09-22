import { AuditActorType, Prisma } from "@prisma/client";
import { Request } from "express";
import { isIP } from "node:net";
import { auditSecurityRetentionDays, trustedGeoHeaderSource, trustedProxyHops } from "../config/auditSecurity";
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

type AuthenticationAuditAction = "LOGIN" | "LOGOUT";

type AuthenticationAuditInput = {
  accountOwnerId: string;
  actorId: string;
  actorType: AuditActorType;
  action: AuthenticationAuditAction;
  businessId?: string;
};

type SignInSecurityMetadata = {
  ipAddress: string | null;
  browserFamily: string;
  operatingSystem: string;
  deviceType: string;
  countryCode?: string;
  region?: string;
  locationSource?: string;
};

function normalizeIp(value: string | undefined) {
  const candidate = value?.split(",")[0]?.trim().replace(/^::ffff:/, "");
  return candidate && isIP(candidate) ? candidate : null;
}

function browserFamily(userAgent: string) {
  if (/edg(e|a|ios)?\//i.test(userAgent)) return "Edge";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/chrome|crios/i.test(userAgent)) return "Chrome";
  if (/safari/i.test(userAgent)) return "Safari";
  return "Other";
}

function operatingSystem(userAgent: string) {
  if (/android/i.test(userAgent)) return "Android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iOS";
  if (/windows/i.test(userAgent)) return "Windows";
  if (/mac os|macintosh/i.test(userAgent)) return "macOS";
  if (/linux/i.test(userAgent)) return "Linux";
  return "Other";
}

function deviceType(userAgent: string) {
  if (/ipad|tablet|playbook/i.test(userAgent)) return "Tablet";
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return "Phone";
  return userAgent ? "Computer" : "Other";
}

function safeCountryCode(value: string | undefined) {
  const country = value?.trim().toUpperCase();
  return country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : undefined;
}

function safeRegion(value: string | undefined) {
  const region = value?.trim();
  return region && /^[A-Za-z0-9 .-]{1,80}$/.test(region) ? region : undefined;
}

/** Captures only the basic device and trusted-infrastructure location details for a successful sign-in. */
export function getSignInSecurityMetadata(req: Request): SignInSecurityMetadata {
  const userAgent = req.get("user-agent") || "";
  const metadata: SignInSecurityMetadata = {
    ipAddress: normalizeIp(req.ip || req.socket.remoteAddress),
    browserFamily: browserFamily(userAgent),
    operatingSystem: operatingSystem(userAgent),
    deviceType: deviceType(userAgent),
  };

  // Headers from a direct client can be forged. Location is accepted only
  // when Express has been explicitly configured to trust the proxy chain.
  if (trustedProxyHops < 1 || trustedGeoHeaderSource === "none") return metadata;

  const countryHeader = trustedGeoHeaderSource === "cloudflare" ? "cf-ipcountry" : "x-vercel-ip-country";
  const regionHeader = trustedGeoHeaderSource === "cloudflare" ? "cf-region" : "x-vercel-ip-country-region";
  const countryCode = safeCountryCode(req.get(countryHeader) || undefined);
  const region = safeRegion(req.get(regionHeader) || undefined);
  if (countryCode || region) {
    metadata.countryCode = countryCode;
    metadata.region = region;
    metadata.locationSource = "trusted header";
  }
  return metadata;
}

/**
 * Records a completed, authenticated sign-in or sign-out without retaining
 * credentials, tokens, cookies, or session identifiers.
 */
export async function writeAuthenticationAudit({
  accountOwnerId,
  actorId,
  actorType,
  action,
  businessId,
}: AuthenticationAuditInput, signInSecurityMetadata?: SignInSecurityMetadata) {
  const isStaff = actorType === AuditActorType.STAFF;
  let actorName: string;
  let actorRole: string;
  if (isStaff) {
    const staff = await prisma.staffUser.findUnique({ where: { id: actorId }, select: { name: true } });
    if (!staff) throw new Error("Authentication audit actor was not found");
    actorName = staff.name;
    actorRole = "DEALER_STAFF";
  } else {
    const user = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true, role: true } });
    if (!user) throw new Error("Authentication audit actor was not found");
    actorName = user.name;
    actorRole = user.role;
  }

  const isLogin = action === "LOGIN";
  return prisma.$transaction(async (tx) => {
    const auditLog = await tx.businessAuditLog.create({
      data: {
        accountOwnerId,
        businessType: "AUTHENTICATION",
        businessId,
        actorId,
        actorType,
        actorName,
        actorRole,
        action: isLogin ? "auth.login.succeeded" : "auth.logout.succeeded",
        targetType: isStaff ? "StaffUser" : "User",
        targetId: actorId,
        description: isLogin ? "Logged in" : "Logged out",
      },
    });

    if (isLogin && signInSecurityMetadata) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + auditSecurityRetentionDays);
      await tx.auditSecurityMetadata.create({
        data: { auditLogId: auditLog.id, ...signInSecurityMetadata, expiresAt },
      });
    }
    return auditLog;
  });
}

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

export async function pruneExpiredAuditSecurityMetadata(now = new Date()) {
  return prisma.auditSecurityMetadata.deleteMany({ where: { expiresAt: { lte: now } } });
}

let archiverStarted = false;
export function startBusinessAuditArchiver() {
  if (archiverStarted) return;
  archiverStarted = true;
  void archiveExpiredBusinessAuditLogs().catch((error) => console.error("Audit archive error:", error));
  void pruneExpiredAuditSecurityMetadata().catch((error) => console.error("Audit security metadata cleanup error:", error));
  setInterval(() => {
    void archiveExpiredBusinessAuditLogs().catch((error) => console.error("Audit archive error:", error));
    void pruneExpiredAuditSecurityMetadata().catch((error) => console.error("Audit security metadata cleanup error:", error));
  }, 60 * 60 * 1000);
}
