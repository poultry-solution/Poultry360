import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import farmRoutes from "./farmRoutes";
import batchRoutes from "./batchRoutes";
import dealerRoutes from "./dealerRoutes";
import medicalSupplierRoutes from "./medicalSupplierRoutes";
import hatcheryRoutes from "./hatcheryRoutes";
import inventoryRoutes from "./inventoryRoutes";
import expenseRoutes from "./expenseRoutes";
import salesRoutes from "./salesRoutes";
import remainderRoutes from "./remainderRoutes";
import dashboardRoutes from "./dashboardRoutes";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/farms", farmRoutes);
router.use("/batches", batchRoutes);
router.use("/dealers", dealerRoutes);
router.use("/medical-suppliers", medicalSupplierRoutes);
router.use("/hatcheries", hatcheryRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/expenses", expenseRoutes);
router.use("/sales", salesRoutes);
router.use("/reminders", remainderRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
