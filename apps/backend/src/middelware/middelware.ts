import { UserRole } from "@myapp/shared-types";
import { StaffPermission } from "@prisma/client";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { isOnboardingApprovalBlocking } from "../config/onboardingGate";
import { writeBusinessAudit } from "../services/businessAuditService";
import {
  getAccountBusiness,
  getStaffAccountModule,
  isStaffAccountFeatureEnabled,
} from "../services/staffAccountService";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: UserRole;
      isUserAuthenticated?: boolean;
      actorType?: "USER" | "STAFF";
      staffUserId?: string;
      businessId?: string;
      staffPermissions?: StaffPermission[];
    }
  }
}

// make it dynamic to accept rotes  as paramters to allow any user to access the route
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
  allowedRoles: UserRole[] = []
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "mysupersecretkey");
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }


  const userId = (decoded as any).userId;
  const role = (decoded as any).role;

  if ((decoded as any).actorType === "STAFF") {
    const staffId = (decoded as any).staffId;
    const sessionVersion = (decoded as any).sessionVersion;
    const staff = await prisma.staffUser.findUnique({
      where: { id: staffId },
      select: { id: true, ownerId: true, accountRole: true, isActive: true, permissions: true, sessionVersion: true },
    });
    if (!staff || !staff.isActive || staff.sessionVersion !== sessionVersion) {
      return res.status(401).json({ code: "STAFF_SESSION_INVALID", message: "Staff session is no longer active" });
    }

    const module = getStaffAccountModule(staff.accountRole);
    if (!module) {
      return res.status(403).json({ error: "Staff access is not enabled for this account type" });
    }
    const owner = await prisma.user.findUnique({ where: { id: staff.ownerId }, select: { role: true } });
    if (!owner || owner.role !== staff.accountRole) {
      return res.status(401).json({ code: "STAFF_ACCOUNT_INVALID", message: "Staff account no longer matches its owner account" });
    }
    if (!(await isStaffAccountFeatureEnabled(staff.ownerId, staff.accountRole))) {
      return res.status(403).json({
        code: "STAFF_OPERATIONS_DISABLED",
        message: "Staff access is currently disabled by the account owner.",
      });
    }
    const business = await getAccountBusiness(staff.ownerId, staff.accountRole);

    // Operational controllers use the owner as their data scope. The actor
    // fields retain the staff identity for authorization and audit attribution.
    req.userId = staff.ownerId;
    req.role = staff.accountRole as UserRole;
    req.actorType = "STAFF";
    req.staffUserId = staff.id;
    req.businessId = business?.id;
    req.staffPermissions = staff.permissions;

    if (allowedRoles.length > 0 && !allowedRoles.includes(staff.accountRole as UserRole)) {
      return res.status(403).json({ error: "Access denied for this role" });
    }
    return next();
  }

  //@ts-ignore
  req.userId = userId;
  //@ts-ignore
  req.role = role;
  req.actorType = "USER";

  // if nothing is passed then allow all roles
  if (allowedRoles.length === 0) {
    return next();
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return res.status(403).json({ error: "Access denied for this role" });
  }

  // Admin-gated onboarding (new signups only).
  // If a user has a UserOnboardingPayment row that isn't approved yet,
  // allow only auth + onboarding status endpoints until an admin approves.
  try {
    if (req.userId) {
      // SUPER_ADMIN is not approval-gated
      if (role !== "SUPER_ADMIN") {
        const onboarding = await prisma.userOnboardingPayment.findUnique({
          where: { userId: req.userId },
          select: { state: true, lockedUntilApproved: true },
        });

        const isLocked = onboarding
          ? isOnboardingApprovalBlocking({
              state: onboarding.state,
              lockedUntilApproved: onboarding.lockedUntilApproved,
            })
          : false;

        if (isLocked) {
          const url = req.originalUrl || req.url;
          const path = req.path || "";

          // Prod mounts the API under `/api/v1`, so `originalUrl` can look like
          // `/api/v1/onboarding/payment/status`. Using `includes()` keeps the
          // whitelist robust regardless of mount prefix.
          const isAuthEndpoint =
            path.startsWith("/auth") || url.includes("/auth/");

          const isOnboardingEndpoint =
            path.startsWith("/onboarding/payment") ||
            url.includes("/onboarding/payment");

          if (!isAuthEndpoint && !isOnboardingEndpoint) {
            return res.status(403).json({
              code: "ACCOUNT_APPROVAL_REQUIRED",
              message: "Your account is pending admin approval.",
            });
          }
        }
      }
    }
  } catch (e) {
    // Don't hard-fail auth if onboarding check errors
  }

  next();
};

export const requireStaffPermission = (permission: StaffPermission) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.actorType !== "STAFF" || req.staffPermissions?.includes(permission)) {
    return next();
  }
  return res.status(403).json({
    code: "STAFF_PERMISSION_DENIED",
    permission,
    message: "Your staff account is not allowed to use this part of the account.",
  });
};

/**
 * Lets a shared route opt a staff module into an operation without granting
 * every staff role that route by default. Account owners are never limited by
 * staff permissions.
 */
export const requireStaffPermissionForAccountRole = (
  permissionsByRole: Partial<Record<UserRole, StaffPermission>>
) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.actorType !== "STAFF") return next();

  const permission = req.role ? permissionsByRole[req.role] : undefined;
  if (permission && req.staffPermissions?.includes(permission)) return next();

  return res.status(403).json({
    code: "STAFF_PERMISSION_DENIED",
    ...(permission ? { permission } : {}),
    message: "Your staff account is not allowed to use this part of the account.",
  });
};

export const requireDealerOwner = (req: Request, res: Response, next: NextFunction) => {
  if (req.actorType === "STAFF") {
    return res.status(403).json({
      code: "OWNER_ONLY",
      message: "Only the Feed Dealer owner can manage staff access.",
    });
  }
  return next();
};

/** Owner-only staff-access administration, reusable by every staff module. */
export const requireStaffAccountOwner = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.actorType === "STAFF") {
    return res.status(403).json({
      code: "OWNER_ONLY",
      message: "Only the account owner can manage staff login accounts.",
    });
  }
  return next();
};

// Covers small Super Admin management endpoints that do not have specialised
// audit metadata. It records only the successful mutation and response ID.
export const auditSuccessfulAdminMutation = (targetType: string) => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  // Account approvals and feature changes add richer, account-scoped records
  // directly in their controllers.
  if (req.originalUrl.includes("/payment-approvals/") || req.originalUrl.includes("/features/")) return next();
  let responseBody: any;
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => { responseBody = body; return originalJson(body); }) as typeof res.json;
  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    const targetId = responseBody?.data?.id || Object.values(req.params)[0] || req.originalUrl.split("?")[0].split("/").filter(Boolean).pop() || "record";
    const verb = req.method === "POST" ? "created" : req.method === "DELETE" ? "deleted" : "updated";
    void writeBusinessAudit(req, {
      action: `admin.${targetType.toLowerCase()}.${verb}`,
      targetType,
      targetId,
      description: `Admin ${verb} ${targetType}`,
      businessType: "ADMIN",
    }).catch((error) => console.error("Admin audit write error:", error));
  });
  return next();
};

// A staff member may work a customer's account, but a business-wide ledger
// listing is a financial-history view and is reserved for the owner. The
// dealer ledger endpoint identifies the focused account with `partyId`;
// `customerId` is accepted as a compatibility alias for older callers.
export const requireOperationalLedgerScope = (req: Request, res: Response, next: NextFunction) => {
  if (req.actorType === "STAFF" && !req.staffPermissions?.includes(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES)) {
    const partyId = typeof req.query.partyId === "string" ? req.query.partyId : "";
    const customerId = typeof req.query.customerId === "string" ? req.query.customerId : "";
    if (!partyId && !customerId) {
      return res.status(403).json({
        code: "STAFF_PERMISSION_DENIED",
        permission: StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES,
        message: "Staff can only view a specific customer account.",
      });
    }
  }
  return next();
};
