import express from "express";
import {
  createProductionRun,
  getProductionRuns,
  getProductionRunById,
} from "../controller/companyProductionController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

router.post("/", createProductionRun);
router.get("/", getProductionRuns);
router.get("/:id", getProductionRunById);

export default router;
