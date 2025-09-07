import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import farmRoutes from "./farmRoutes";
import batchRoutes from "./batchRoutes";
import dealerRoutes from "./dealerRoutes";
import medicalSupplierRoutes from "./medicalSupplierRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/farms", farmRoutes);
router.use("/batches", batchRoutes);
router.use("/dealers", dealerRoutes);
router.use("/medical-suppliers", medicalSupplierRoutes);

export default router;
