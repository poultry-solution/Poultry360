import { Router } from "express";
import {
  getEggTypes,
  createEggType,
  updateEggType,
  deleteEggType,
} from "../controller/eggTypeController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

router.get("/", getEggTypes);
router.post("/", createEggType);
router.put("/:id", updateEggType);
router.delete("/:id", deleteEggType);

export default router;
