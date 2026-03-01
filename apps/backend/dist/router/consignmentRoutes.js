"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const consignmentController_1 = require("../controller/consignmentController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// ==================== COMPANY CONSIGNMENT ROUTES ====================
const companyRouter = express_1.default.Router();
companyRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
companyRouter.post("/", consignmentController_1.createCompanyConsignment);
companyRouter.get("/", consignmentController_1.getCompanyConsignments);
companyRouter.get("/:id", consignmentController_1.getCompanyConsignmentById);
companyRouter.post("/:id/approve", consignmentController_1.approveCompanyConsignment);
companyRouter.post("/:id/dispatch", consignmentController_1.dispatchCompanyConsignment);
companyRouter.post("/:id/reject", consignmentController_1.rejectCompanyConsignment);
companyRouter.post("/:id/cancel", consignmentController_1.cancelCompanyConsignment);
// ==================== DEALER CONSIGNMENT ROUTES ====================
const dealerRouter = express_1.default.Router();
dealerRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
dealerRouter.post("/", consignmentController_1.createDealerConsignment);
dealerRouter.get("/", consignmentController_1.getDealerConsignments);
dealerRouter.get("/:id", consignmentController_1.getDealerConsignmentById);
dealerRouter.post("/:id/accept", consignmentController_1.acceptDealerConsignment);
dealerRouter.post("/:id/confirm-receipt", consignmentController_1.confirmDealerConsignmentReceipt);
dealerRouter.post("/:id/reject", consignmentController_1.rejectDealerConsignment);
dealerRouter.post("/:id/cancel", consignmentController_1.cancelDealerConsignment);
// ==================== SHARED ROUTES ====================
router.get("/:id/audit-logs", consignmentController_1.getConsignmentAuditLogs);
// Mount routers
router.use("/company", companyRouter);
router.use("/dealer", dealerRouter);
exports.default = router;
