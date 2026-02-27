import { Router } from "express";
import {
  getDealerPurchaseRequests,
  getDealerPurchaseRequestById,
  getDealerPurchaseRequestStats,
  approvePurchaseRequest,
  rejectPurchaseRequest,
} from "../controller/farmerPurchaseRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

router.get("/statistics", getDealerPurchaseRequestStats);
router.get("/", getDealerPurchaseRequests);
router.get("/:id", getDealerPurchaseRequestById);
router.post("/:id/approve", approvePurchaseRequest);
router.post("/:id/reject", rejectPurchaseRequest);

export default router;
