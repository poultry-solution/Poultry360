import { UserRole } from "@myapp/shared-types";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

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
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
  allowedRoles: UserRole[] = []
): any => {
  console.log("authMiddleware");
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(" ")[1];

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "mysupersecretkey");
    console.log("decoded", decoded);
  } catch (err) {
    console.log("error", err);
    return res.status(403).json({ error: "Access denied" });
  }

  console.log("decoded", decoded);

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

  next();
};
