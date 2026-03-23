import { UserRole } from "@myapp/shared-types";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import prisma from "../utils/prisma";
import { UserOnboardingPaymentState } from "@prisma/client";

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
    return res.status(403).json({ error: "Access denied" });
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

  // Payment-gated onboarding (new signups only)
  // If a user has a UserOnboardingPayment row and it's not approved yet,
  // allow only auth + onboarding payment endpoints.
  try {
    if (req.userId) {
      // SUPER_ADMIN is always allowed through
      if (role !== "SUPER_ADMIN") {
        const onboarding = await prisma.userOnboardingPayment.findUnique({
          where: { userId: req.userId },
          select: { state: true, lockedUntilApproved: true },
        });

        const isLocked =
          onboarding?.lockedUntilApproved &&
          onboarding.state !== UserOnboardingPaymentState.PAYMENT_APPROVED;

        if (isLocked) {
          const url = req.originalUrl || req.url;
          const path = req.path || "";

          // Important: on prod your server is mounted under `/api/v1`,
          // so `originalUrl` can look like `/api/v1/onboarding/payment/history`.
          // Using `includes()` makes the whitelist robust.
          const isAuthEndpoint =
            path.startsWith("/auth") || url.includes("/auth/");

          const isOnboardingPaymentEndpoint =
            path.startsWith("/onboarding/payment") ||
            url.includes("/onboarding/payment");

          // Payment receipt upload (Cloudinary direct upload) needs a signed params call.
          // In prod, the middleware matching can be tricky due to mounts like `/api/v1`,
          // so we allow all `/upload/*` endpoints for locked onboarding users.
          const isUploadEndpoint =
            path.startsWith("/upload") || url.includes("/upload/");

          if (
            !isAuthEndpoint &&
            !isOnboardingPaymentEndpoint &&
            !isUploadEndpoint
          ) {
            return res.status(403).json({
              code: "PAYMENT_APPROVAL_REQUIRED",
              message: "Payment approval required to access this account.",
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
