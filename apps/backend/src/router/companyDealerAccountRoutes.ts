import { Router } from "express";
import {
  getDealerAccount,
  getDealerAccountStatement,
  recordDealerPayment,
  setDealerBalanceLimit,
  checkDealerBalanceLimit,
  getAllDealerAccounts,
  getAllDealerPayments,
} from "../controller/companyDealerAccountController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = Router();
const companyOperations = [
  (req: Parameters<typeof authMiddleware>[0], res: Parameters<typeof authMiddleware>[1], next: Parameters<typeof authMiddleware>[2]) =>
    authMiddleware(req, res, next, ["COMPANY"]),
  requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS),
];
const companyMutation = [...companyOperations, auditSuccessfulCompanyMutation];

// ==================== COMPANY SIDE ROUTES ====================
// Get all dealer accounts for company
router.get(
  "/company/dealers/accounts",
  ...companyOperations,
  getAllDealerAccounts
);

// Get specific dealer account
router.get(
  "/company/dealers/:dealerId/account",
  ...companyOperations,
  getDealerAccount
);

// Set dealer balance limit
router.put(
  "/company/dealers/:dealerId/account/balance-limit",
  ...companyMutation,
  setDealerBalanceLimit
);

// Check dealer balance limit
router.post(
  "/company/dealers/:dealerId/account/check-balance-limit",
  ...companyOperations,
  checkDealerBalanceLimit
);

// Get dealer account statement
router.get(
  "/company/dealers/:dealerId/statement",
  ...companyOperations,
  getDealerAccountStatement
);

// Record payment from dealer
router.post(
  "/company/dealers/:dealerId/payments",
  ...companyMutation,
  recordDealerPayment
);




// Get all dealer payments for company
router.get(
  "/company/payments",
  ...companyOperations,
  getAllDealerPayments
);



export default router;
