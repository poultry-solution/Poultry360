"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentRequestController_1 = require("../controller/paymentRequestController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// ==================== COMPANY PAYMENT REQUEST ROUTES ====================
const companyRouter = express_1.default.Router();
companyRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
companyRouter.post("/", paymentRequestController_1.createCompanyPaymentRequest);
companyRouter.get("/", paymentRequestController_1.getCompanyPaymentRequests);
companyRouter.post("/:id/accept", paymentRequestController_1.acceptCompanyPaymentRequest);
companyRouter.post("/:id/verify", paymentRequestController_1.verifyCompanyPaymentRequest);
companyRouter.post("/:id/cancel", paymentRequestController_1.cancelPaymentRequest);
// ==================== DEALER PAYMENT REQUEST ROUTES ====================
const dealerRouter = express_1.default.Router();
dealerRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
dealerRouter.get("/", paymentRequestController_1.getDealerPaymentRequests);
dealerRouter.post("/", paymentRequestController_1.createDealerPaymentRequest);
dealerRouter.post("/:id/accept", paymentRequestController_1.acceptDealerPaymentRequest);
dealerRouter.post("/:id/submit-proof", paymentRequestController_1.submitDealerPaymentProof);
dealerRouter.post("/:id/cancel", paymentRequestController_1.cancelPaymentRequest);
// Mount routers
router.use("/company", companyRouter);
router.use("/dealer", dealerRouter);
exports.default = router;
