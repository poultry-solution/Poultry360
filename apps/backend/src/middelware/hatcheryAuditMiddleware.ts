import { NextFunction, Request, Response } from "express";
import { getAccountBusiness } from "../services/staffAccountService";
import { writeBusinessAudit } from "../services/businessAuditService";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function verb(method: string) {
  if (method === "POST") return "created";
  if (method === "DELETE") return "deleted";
  return "updated";
}

type HatcheryActivityCopy = { description: string; targetType: string };

// Owner-facing copy for each hatchery mutation route. Keys are
// `${METHOD} ${normalized-route}` where the `/hatchery/` prefix has been
// stripped and `:id` params have been rewritten to `record`.
const hatcheryActivityCopy: Record<string, HatcheryActivityCopy> = {
  // Suppliers
  "POST suppliers": { description: "Added a supplier", targetType: "Hatchery supplier" },
  "PUT suppliers/record": { description: "Updated a supplier", targetType: "Hatchery supplier" },
  "DELETE suppliers/record": { description: "Deleted a supplier", targetType: "Hatchery supplier" },
  "POST suppliers/record/opening-balance": { description: "Set supplier opening balance", targetType: "Hatchery supplier" },
  "POST suppliers/record/transactions": { description: "Recorded a supplier transaction", targetType: "Hatchery supplier transaction" },
  "DELETE suppliers/record/transactions/record": { description: "Deleted a supplier transaction", targetType: "Hatchery supplier transaction" },

  // Inventory
  "POST inventory": { description: "Added an inventory item", targetType: "Hatchery inventory item" },
  "PUT inventory/record": { description: "Updated an inventory item", targetType: "Hatchery inventory item" },
  "DELETE inventory/record": { description: "Deleted an inventory item", targetType: "Hatchery inventory item" },
  "POST inventory/record/reorder": { description: "Reordered inventory stock", targetType: "Hatchery inventory" },

  // Batches
  "POST batches": { description: "Added a batch", targetType: "Hatchery batch" },
  "PUT batches/record": { description: "Updated a batch", targetType: "Hatchery batch" },
  "DELETE batches/record": { description: "Deleted a batch", targetType: "Hatchery batch" },
  "POST batches/record/close": { description: "Closed a batch", targetType: "Hatchery batch" },
  "POST batches/record/reopen": { description: "Reopened a batch", targetType: "Hatchery batch" },

  // Batch-scoped activity
  "POST batches/record/mortalities": { description: "Recorded batch mortality", targetType: "Hatchery mortality" },
  "DELETE batches/record/mortalities/record": { description: "Deleted batch mortality", targetType: "Hatchery mortality" },
  "POST batches/record/expenses": { description: "Recorded a batch expense", targetType: "Hatchery expense" },
  "DELETE batches/record/expenses/record": { description: "Deleted a batch expense", targetType: "Hatchery expense" },
  "POST batches/record/egg-productions": { description: "Recorded egg production", targetType: "Hatchery egg production" },
  "DELETE batches/record/egg-productions/record": { description: "Deleted egg production", targetType: "Hatchery egg production" },
  "POST batches/record/egg-sales": { description: "Recorded an egg sale", targetType: "Hatchery egg sale" },
  "DELETE batches/record/egg-sales/record": { description: "Deleted an egg sale", targetType: "Hatchery egg sale" },
  "POST batches/record/parent-sales": { description: "Recorded a parent-stock sale", targetType: "Hatchery parent sale" },
  "DELETE batches/record/parent-sales/record": { description: "Deleted a parent-stock sale", targetType: "Hatchery parent sale" },

  // Incubations
  "POST incubations": { description: "Started an incubation batch", targetType: "Hatchery incubation" },
  "POST incubations/record/candling": { description: "Recorded candling results", targetType: "Hatchery incubation" },
  "POST incubations/record/transfer": { description: "Transferred to hatcher", targetType: "Hatchery incubation" },
  "POST incubations/record/hatch-results": { description: "Recorded hatch results", targetType: "Hatchery incubation" },
  "DELETE incubations/record/hatch-results/record": { description: "Deleted hatch results", targetType: "Hatchery incubation" },
  "POST incubations/record/chick-sales": { description: "Recorded a chick sale", targetType: "Hatchery chick sale" },
  "DELETE incubations/record/chick-sales/record": { description: "Deleted a chick sale", targetType: "Hatchery chick sale" },

  // Production runs
  "POST production": { description: "Recorded a production run", targetType: "Hatchery production run" },
  "DELETE production/record": { description: "Reversed a production run", targetType: "Hatchery production run" },

  // Products
  "POST products": { description: "Added a product", targetType: "Hatchery product" },
  "PUT products/record": { description: "Updated a product", targetType: "Hatchery product" },
  "DELETE products/record": { description: "Archived a product", targetType: "Hatchery product" },

  // Parties
  "POST parties": { description: "Added a party", targetType: "Hatchery party" },
  "POST parties/record/payments": { description: "Recorded a party payment", targetType: "Hatchery party payment" },
  "DELETE parties/record/payments/record": { description: "Deleted a party payment", targetType: "Hatchery party payment" },

  // Egg types
  "POST egg-types": { description: "Added an egg type", targetType: "Hatchery egg type" },
  "PUT egg-types/record": { description: "Updated an egg type", targetType: "Hatchery egg type" },
  "DELETE egg-types/record": { description: "Deleted an egg type", targetType: "Hatchery egg type" },
};

function activityCopy(method: string, route: string): HatcheryActivityCopy {
  const direct = hatcheryActivityCopy[`${method} ${route}`];
  if (direct) return direct;
  // Reasonable fallback for any route not yet in the table.
  const head = route.split("/")[0] || "operation";
  return {
    description: `${verb(method)} a Hatchery ${head} record`.replace(/\s+/g, " "),
    targetType: "Hatchery record",
  };
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

    const rawRoute = `${req.baseUrl}${req.route?.path || req.path}`;
    const route = rawRoute
      .replace(/^.*\/hatchery\/?/, "")
      .replace(/:[^/]+/g, "record")
      .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, "/record")
      .replace(/\/+/g, "/")
      .replace(/^\/+|\/+$/g, "") || "operation";

    const resource = route.replace(/\//g, ".");
    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = res.locals.auditTargetId || targetValues[targetValues.length - 1] || "record";
    const presentation = activityCopy(req.method, route);

    void getAccountBusiness(req.userId!, "HATCHERY")
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `hatchery.${resource}.${verb(req.method)}`,
          targetType: presentation.targetType,
          targetId,
          description: presentation.description,
          businessType: "HATCHERY",
          businessId: business.id,
        });
      })
      .catch((error) => console.error("Hatchery audit write error:", error));
  });
  return next();
}
