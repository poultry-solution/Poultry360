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

type CompanyActivityCopy = { description: string; targetType: string };

// The action code remains route-derived for consistent querying, while this
// table gives owners a clear explanation of the business event.
const companyActivityCopy: Record<string, CompanyActivityCopy> = {
  "POST purchases": { description: "Recorded a raw-material purchase", targetType: "Company purchase" },
  "POST raw-materials": { description: "Added a raw material", targetType: "Company raw material" },
  "PUT raw-materials/record": { description: "Updated a raw material", targetType: "Company raw material" },
  "DELETE raw-materials/record": { description: "Deleted a raw material", targetType: "Company raw material" },
  "POST production": { description: "Recorded a production run", targetType: "Company production run" },
  "POST products": { description: "Added a product", targetType: "Company product" },
  "PUT products/record": { description: "Updated a product", targetType: "Company product" },
  "DELETE products/record": { description: "Deleted a product", targetType: "Company product" },
  "POST products/record/adjust-stock": { description: "Adjusted product stock", targetType: "Company product" },
  "POST sales": { description: "Recorded a sale", targetType: "Company sale" },
  "POST sales/record/payments": { description: "Recorded a sale payment", targetType: "Company sale payment" },
  "POST suppliers": { description: "Added a supplier", targetType: "Company supplier" },
  "PUT suppliers/record": { description: "Updated a supplier", targetType: "Company supplier" },
  "DELETE suppliers/record": { description: "Deleted a supplier", targetType: "Company supplier" },
  "POST suppliers/record/payments": { description: "Recorded a supplier payment", targetType: "Company supplier payment" },
  "POST ledger/payments": { description: "Recorded a ledger payment", targetType: "Company ledger payment" },
  "POST dealers": { description: "Added a dealer", targetType: "Company dealer" },
  "PUT dealers/record": { description: "Updated a dealer", targetType: "Company dealer" },
  "DELETE dealers/record": { description: "Deleted a dealer", targetType: "Company dealer" },
  "PUT dealers/record/account/balance-limit": { description: "Updated a dealer credit limit", targetType: "Company dealer account" },
  "POST dealers/record/payments": { description: "Recorded a dealer account payment", targetType: "Company dealer payment" },
  "POST staff": { description: "Added a payroll staff member", targetType: "Company payroll staff" },
  "PUT staff/record": { description: "Updated payroll staff details", targetType: "Company payroll staff" },
  "PATCH staff/record/stop": { description: "Stopped a payroll staff member", targetType: "Company payroll staff" },
  "PATCH staff/record/archive": { description: "Archived a payroll staff member", targetType: "Company payroll staff" },
  "POST staff/record/payments": { description: "Recorded a salary payment", targetType: "Company payroll payment" },
};

function activityCopy(method: string, route: string): CompanyActivityCopy {
  return companyActivityCopy[`${method} ${route}`] || {
    description: `${verb(method)} a Company record`,
    targetType: "Company operation",
  };
}

/**
 * Append-only activity for successful Company mutations. Entries use
 * owner-facing business language and never retain request payloads.
 */
export function auditSuccessfulCompanyMutation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!mutationMethods.has(req.method) || req.role !== UserRole.COMPANY) {
    return next();
  }

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300 || !req.userId) return;

    const rawRoute = `${req.baseUrl}${req.route?.path || req.path}`;
    const route = (rawRoute.includes("/company/")
      ? rawRoute.replace(/^.*\/company\/?/, "")
      : rawRoute.replace(/^.*\/api(?:\/v\d+)?\//, ""))
      .replace(/:[^/]+/g, "record")
      .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, "/record")
      .replace(/\/+/g, "/")
      .replace(/^\/+|\/+$/g, "") || "operation";
    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = targetValues[targetValues.length - 1] || "record";
    const actionRoute = route.replace(/\//g, ".");
    const presentation = activityCopy(req.method, route);

    void getAccountBusiness(req.userId!, UserRole.COMPANY)
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `company.${actionRoute}.${verb(req.method)}`,
          targetType: presentation.targetType,
          targetId,
          description: presentation.description,
          businessType: "COMPANY",
          businessId: business.id,
        });
      })
      .catch((error) => console.error("Company audit write error:", error));
  });
  return next();
}
