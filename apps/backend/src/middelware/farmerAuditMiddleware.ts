import { NextFunction, Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { getAccountBusiness } from "../services/staffAccountService";
import { writeBusinessAudit } from "../services/businessAuditService";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function verb(method: string) {
  if (method === "POST") return "created";
  if (method === "DELETE") return "deleted";
  return "updated";
}

/**
 * Append-only activity for successful Farmer mutations. Broiler and Layer
 * records share this owner scope; their batch type stays in the domain data.
 */
export function auditSuccessfulFarmerMutation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!mutationMethods.has(req.method) || req.role !== UserRole.OWNER) {
    return next();
  }

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.userId) return;
    const route = `${req.baseUrl}${req.route?.path || req.path}`
      .replace(/:[^/]+/g, "record")
      .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, "/record")
      .replace(/\/+/, "/")
      .replace(/^\//, "") || "operation";
    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = targetValues[targetValues.length - 1] || "record";
    const actionRoute = route.replace(/\//g, ".");

    void getAccountBusiness(req.userId!, UserRole.OWNER)
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `farmer.${actionRoute}.${verb(req.method)}`,
          targetType: "Farmer operation",
          targetId,
          description: `${verb(req.method)} Farmer ${route.replace(/\//g, " ")}`,
          businessType: "FARMER",
          businessId: business.id,
          metadata: { method: req.method, route: `/${route}` },
        });
      })
      .catch((error) => console.error("Farmer audit write error:", error));
  });
  return next();
}
