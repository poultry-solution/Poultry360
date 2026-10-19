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

type FarmerActivityCopy = { description: string; targetType: string };

// Owner-facing copy for every farmer mutation route. Keys are
// `${METHOD} ${normalized-route}` where `:id`-style params are rewritten
// to `record` (matching the normalization applied below).
//
// The action code remains route-derived so queries stay consistent across
// deployments; only the human-readable description/targetType changes here.
const farmerActivityCopy: Record<string, FarmerActivityCopy> = {
  // Farms
  "POST farms": { description: "Added a farm", targetType: "Farm" },
  "PUT farms/record": { description: "Updated a farm", targetType: "Farm" },
  "DELETE farms/record": { description: "Deleted a farm", targetType: "Farm" },

  // Batches
  "POST batches": { description: "Added a batch", targetType: "Batch" },
  "PUT batches/record": { description: "Updated a batch", targetType: "Batch" },
  "DELETE batches/record": { description: "Deleted a batch", targetType: "Batch" },
  "POST batches/record/close": { description: "Closed a batch", targetType: "Batch" },
  "POST batches/record/reopen": { description: "Reopened a batch", targetType: "Batch" },

  // Weights (attached under /batches via weightRoutes)
  "POST batches/record/weights": { description: "Recorded a bird weight", targetType: "Bird weight" },
  "PUT batches/record/weights/record": { description: "Updated a bird weight", targetType: "Bird weight" },
  "DELETE batches/record/weights/record": { description: "Deleted a bird weight", targetType: "Bird weight" },

  // Mortality
  "POST mortalities": { description: "Recorded mortality", targetType: "Mortality" },
  "PUT mortalities/record": { description: "Updated mortality", targetType: "Mortality" },
  "DELETE mortalities/record": { description: "Deleted mortality", targetType: "Mortality" },

  // Expenses
  "POST expenses": { description: "Recorded an expense", targetType: "Expense" },
  "PUT expenses/record": { description: "Updated an expense", targetType: "Expense" },
  "DELETE expenses/record": { description: "Deleted an expense", targetType: "Expense" },
  "POST expenses/categories": { description: "Added an expense category", targetType: "Expense category" },
  "PUT expenses/categories/record": { description: "Updated an expense category", targetType: "Expense category" },
  "DELETE expenses/categories/record": { description: "Deleted an expense category", targetType: "Expense category" },

  // Sales + customers
  "POST sales": { description: "Recorded a sale", targetType: "Sale" },
  "PUT sales/record": { description: "Updated a sale", targetType: "Sale" },
  "DELETE sales/record": { description: "Deleted a sale", targetType: "Sale" },
  "POST sales/record/payments": { description: "Recorded a sale payment", targetType: "Sale payment" },
  "POST sales/categories": { description: "Added a sales category", targetType: "Sales category" },
  "POST sales/customers": { description: "Added a customer", targetType: "Customer" },
  "PUT sales/customers/record": { description: "Updated a customer", targetType: "Customer" },
  "DELETE sales/customers/record": { description: "Deleted a customer", targetType: "Customer" },
  "POST sales/customers/record/opening-balance": { description: "Set a customer opening balance", targetType: "Customer" },
  "POST sales/customers/record/payments": { description: "Recorded a customer payment", targetType: "Customer payment" },
  "DELETE sales/customers/record/payments/record": { description: "Deleted a customer payment", targetType: "Customer payment" },

  // Inventory
  "POST inventory": { description: "Added an inventory item", targetType: "Inventory item" },
  "PUT inventory/record": { description: "Updated an inventory item", targetType: "Inventory item" },
  "DELETE inventory/record": { description: "Deleted an inventory item", targetType: "Inventory item" },
  "POST inventory/record/transactions": { description: "Recorded an inventory transaction", targetType: "Inventory transaction" },
  "POST inventory/record/usage": { description: "Recorded inventory usage", targetType: "Inventory usage" },

  // Suppliers (mounted at /dealers for historical reasons)
  "POST dealers": { description: "Added a supplier", targetType: "Supplier" },
  "PUT dealers/record": { description: "Updated a supplier", targetType: "Supplier" },
  "DELETE dealers/record": { description: "Deleted a supplier", targetType: "Supplier" },
  "POST dealers/record/opening-balance": { description: "Set supplier opening balance", targetType: "Supplier" },
  "POST dealers/record/transactions": { description: "Recorded a supplier transaction", targetType: "Supplier transaction" },
  "DELETE dealers/record/transactions/record": { description: "Deleted a supplier transaction", targetType: "Supplier transaction" },

  // Self-made products
  "POST farmer/products": { description: "Added a self-made product", targetType: "Farmer product" },
  "PUT farmer/products/record": { description: "Updated a self-made product", targetType: "Farmer product" },
  "DELETE farmer/products/record": { description: "Archived a self-made product", targetType: "Farmer product" },

  // Self-feed production runs
  "POST farmer/production": { description: "Recorded a production run", targetType: "Production run" },
  "DELETE farmer/production/record": { description: "Reversed a production run", targetType: "Production run" },

  // Cash in hand
  "POST farmer/cash-in-hand/setup": { description: "Set up cash in hand", targetType: "Cash settings" },
  "POST farmer/cash-in-hand/movements": { description: "Recorded a cash movement", targetType: "Cash movement" },
  "DELETE farmer/cash-in-hand/movements/record": { description: "Deleted a cash movement", targetType: "Cash movement" },
  "POST farmer/cash-in-hand/close-day": { description: "Closed the cash day", targetType: "Cash day close" },

  // Egg types
  "POST egg-types": { description: "Added an egg type", targetType: "Egg type" },
  "PUT egg-types/record": { description: "Updated an egg type", targetType: "Egg type" },
  "DELETE egg-types/record": { description: "Deleted an egg type", targetType: "Egg type" },

  // Reminders
  "POST reminders": { description: "Added a reminder", targetType: "Reminder" },
  "DELETE reminders/record": { description: "Deleted a reminder", targetType: "Reminder" },

  // List for sale
  "POST list-for-sale": { description: "Listed an item for sale", targetType: "Sale listing" },
  "PUT list-for-sale/record": { description: "Updated a sale listing", targetType: "Sale listing" },
  "DELETE list-for-sale/record": { description: "Deleted a sale listing", targetType: "Sale listing" },
  "PATCH list-for-sale/record/archive": { description: "Archived a sale listing", targetType: "Sale listing" },
  "PATCH list-for-sale/record/unarchive": { description: "Restored a sale listing", targetType: "Sale listing" },
};

function activityCopy(method: string, route: string): FarmerActivityCopy {
  const direct = farmerActivityCopy[`${method} ${route}`];
  if (direct) return direct;
  // Generic fallback that still reads naturally. Previously this surfaced
  // raw path fragments like "created Farmer api v1 sales" to owners.
  const head = route.split("/")[0] || "operation";
  return {
    description: `${verb(method)} a Farmer ${head} record`.replace(/\s+/g, " "),
    targetType: "Farmer record",
  };
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

    // Normalize to the shape used as a key in `farmerActivityCopy`.
    // 1. Strip the `/api/v\d+/` mount prefix so entries read as e.g. "sales".
    // 2. Rewrite `:id`-style route params to `record`.
    // 3. Rewrite long id-shaped segments (cuids etc.) to `record` for cases
    //    where express.Router didn't capture a named param.
    const rawRoute = `${req.baseUrl}${req.route?.path || req.path}`;
    const route = rawRoute
      .replace(/^.*\/api(?:\/v\d+)?\//, "")
      .replace(/:[^/]+/g, "record")
      .replace(/\/[A-Za-z0-9_-]{12,}(?=\/|$)/g, "/record")
      .replace(/\/+/g, "/")
      .replace(/^\/+|\/+$/g, "") || "operation";

    const targetValues = Object.values(req.params).filter(Boolean);
    const targetId = targetValues[targetValues.length - 1] || "record";
    const actionRoute = route.replace(/\//g, ".");
    const presentation = activityCopy(req.method, route);

    void getAccountBusiness(req.userId!, UserRole.OWNER)
      .then((business) => {
        if (!business) return;
        return writeBusinessAudit(req, {
          action: `farmer.${actionRoute}.${verb(req.method)}`,
          targetType: presentation.targetType,
          targetId,
          description: presentation.description,
          businessType: "FARMER",
          businessId: business.id,
        });
      })
      .catch((error) => console.error("Farmer audit write error:", error));
  });
  return next();
}
