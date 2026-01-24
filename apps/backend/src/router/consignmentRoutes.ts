import express from "express";
import {
  createCompanyConsignment,
  getCompanyConsignments,
  getCompanyConsignmentById,
  approveCompanyConsignment,
  dispatchCompanyConsignment,
  rejectCompanyConsignment,
  cancelCompanyConsignment,
  createDealerConsignment,
  getDealerConsignments,
  getDealerConsignmentById,
  acceptDealerConsignment,
  confirmDealerConsignmentReceipt,
  rejectDealerConsignment,
  cancelDealerConsignment,
  getConsignmentAuditLogs,
} from "../controller/consignmentController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// ==================== COMPANY CONSIGNMENT ROUTES ====================
const companyRouter = express.Router();
companyRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

companyRouter.post("/", createCompanyConsignment);
companyRouter.get("/", getCompanyConsignments);
companyRouter.get("/:id", getCompanyConsignmentById);
companyRouter.post("/:id/approve", approveCompanyConsignment);
companyRouter.post("/:id/dispatch", dispatchCompanyConsignment);
companyRouter.post("/:id/reject", rejectCompanyConsignment);
companyRouter.post("/:id/cancel", cancelCompanyConsignment);

// ==================== DEALER CONSIGNMENT ROUTES ====================
const dealerRouter = express.Router();
dealerRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

dealerRouter.post("/", createDealerConsignment);
dealerRouter.get("/", getDealerConsignments);
dealerRouter.get("/:id", getDealerConsignmentById);
dealerRouter.post("/:id/accept", acceptDealerConsignment);
dealerRouter.post("/:id/confirm-receipt", confirmDealerConsignmentReceipt);
dealerRouter.post("/:id/reject", rejectDealerConsignment);
dealerRouter.post("/:id/cancel", cancelDealerConsignment);

// ==================== SHARED ROUTES ====================
router.get("/:id/audit-logs", getConsignmentAuditLogs);

// Mount routers
router.use("/company", companyRouter);
router.use("/dealer", dealerRouter);

export default router;
