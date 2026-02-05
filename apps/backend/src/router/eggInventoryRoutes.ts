import { Router } from "express";
import { getEggInventory } from "../controller/eggInventoryController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

router.get("/", getEggInventory);

export default router;
