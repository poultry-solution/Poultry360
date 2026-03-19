import express from "express";
import {
  listRawMaterials,
  createRawMaterial,
  getRawMaterialById,
  updateRawMaterial,
  deleteRawMaterial,
} from "../controller/companyRawMaterialController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

router.get("/", listRawMaterials);
router.post("/", createRawMaterial);
router.get("/:id", getRawMaterialById);
router.put("/:id", updateRawMaterial);
router.delete("/:id", deleteRawMaterial);

export default router;
