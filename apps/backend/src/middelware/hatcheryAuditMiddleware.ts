import { NextFunction, Request, Response } from "express";
import { getAccountBusiness } from "../services/staffAccountService";
import { writeBusinessAudit } from "../services/businessAuditService";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function verb(method: string) {
  if (method === "POST") return "created";
  if (method === "DELETE") return "deleted";
  return "updated";
}

/**
 * Adds append-only, safe audit coverage for every successful Hatchery
 * mutation without duplicating audit code across the lifecycle controllers.
 */
export function auditSuccessfulHatcheryMutation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!mutationMethods.has(req.method)) return next();

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.userId) return;
    const route = `${req.baseUrl}${req.route?.path || req.path}`
      .replace(/^.*\/hatchery\/?/, "")
      .replace(/:[^/]+/g, "record")
      .replace(/\/+/g, "/")
      .replace(/^\//, "") || "operation";
    const resource = route.replace(/\//g, ".");
    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = targetValues[targetValues.length - 1] || "record";
    void getAccountBusiness(req.userId!, "HATCHERY")
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `hatchery.${resource}.${verb(req.method)}`,
          targetType: "Hatchery operation",
          targetId,
          description: `${verb(req.method)} Hatchery ${route.replace(/\//g, " ")}`,
          businessType: "HATCHERY",
          businessId: business.id,
          metadata: { method: req.method, route: `/hatchery/${route}` },
        });
      })
      .catch((error) => console.error("Hatchery audit write error:", error));
  });
  return next();
}
