import { Router } from "express";
import {
  getFarmerPurchaseRequests,
  getFarmerPurchaseRequestById,
  getFarmerPurchaseRequestStats,
} from "../controller/farmerPurchaseRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

router.get("/statistics", getFarmerPurchaseRequestStats);
router.get("/", getFarmerPurchaseRequests);
router.get("/:id", getFarmerPurchaseRequestById);

export default router;
