import { UserRole } from "@myapp/shared-types";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { isOnboardingApprovalBlocking } from "../config/onboardingGate";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: UserRole;
      isUserAuthenticated?: boolean;
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
  console.log("authMiddleware");
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "mysupersecretkey");
  } catch (err) {
    console.log("error", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }


  const userId = (decoded as any).userId;
  const role = (decoded as any).role;

  //@ts-ignore
  req.userId = userId;
  //@ts-ignore
  req.role = role;

  console.log("authMiddleware", req.userId, req.role, allowedRoles);

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
      // SUPER_ADMIN and DOCTOR are not approval-gated
      if (role !== "SUPER_ADMIN" && role !== "DOCTOR") {
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
