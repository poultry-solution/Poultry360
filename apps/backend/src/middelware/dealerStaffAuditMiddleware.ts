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

const payrollActivityCopy: Record<string, { description: string; targetType: string }> = {
  "POST staff": { description: "Added a payroll staff member", targetType: "Dealer payroll staff" },
  "PUT staff/record": { description: "Updated payroll staff details", targetType: "Dealer payroll staff" },
  "PATCH staff/record/stop": { description: "Stopped a payroll staff member", targetType: "Dealer payroll staff" },
  "PATCH staff/record/archive": { description: "Archived a payroll staff member", targetType: "Dealer payroll staff" },
  "POST staff/record/payments": { description: "Recorded a salary payment", targetType: "Dealer payroll payment" },
};

/** Records successful Dealer payroll changes, which are not covered by the existing sales and ledger audit writers. */
export function auditSuccessfulDealerStaffMutation(req: Request, res: Response, next: NextFunction) {
  if (!mutationMethods.has(req.method) || req.role !== UserRole.DEALER) return next();

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.userId) return;
    const rawRoute = `${req.baseUrl}${req.route?.path || req.path}`;
    const route = rawRoute
      .replace(/^.*\/dealer\/staff\/?/, "")
      .replace(/:[^/]+/g, "record")
      .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, "/record")
      .replace(/\/+/g, "/")
      .replace(/^\/+|\/+$/g, "") || "staff";
    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = targetValues[targetValues.length - 1] || "record";
    const presentation = payrollActivityCopy[`${req.method} ${route}`] || {
      description: `${verb(req.method)} a payroll staff record`,
      targetType: "Dealer payroll staff",
    };

    void getAccountBusiness(req.userId!, UserRole.DEALER)
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `dealer.payroll.${route.replace(/\//g, ".")}.${verb(req.method)}`,
          targetType: presentation.targetType,
          targetId,
          description: presentation.description,
          businessType: "DEALER",
          businessId: business.id,
        });
      })
      .catch((error) => console.error("Dealer payroll audit write error:", error));
  });
  return next();
}
