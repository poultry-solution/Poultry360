import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware, requireStaffAccountOwner } from "../middelware/middelware";
import {
  acknowledgeStaffPassword,
  changeStaffPassword,
  createStaffUser,
  getStaffInfo,
  listStaffUsers,
  staffLogin,
  staffLogout,
  staffRefreshToken,
  updateStaffUser,
  validateStaffToken,
} from "../controller/staffAuthController";

const router = Router();
router.post("/login", staffLogin);
router.post("/refresh-token", staffRefreshToken);
router.post("/logout", authMiddleware, (req, res, next) => {
  if (req.actorType !== "STAFF") return res.status(403).json({ error: "Use the account logout route" });
  next();
}, staffLogout);
router.post("/change-password", authMiddleware, changeStaffPassword);
router.post("/acknowledge-password", authMiddleware, acknowledgeStaffPassword);
router.get("/@me", getStaffInfo);
router.get("/validate", validateStaffToken);

router.use("/users", (req, res, next) => authMiddleware(req, res, next, [UserRole.OWNER, UserRole.DEALER, UserRole.HATCHERY, UserRole.COMPANY]));
router.use("/users", requireStaffAccountOwner);
router.get("/users", listStaffUsers);
router.post("/users", createStaffUser);
router.patch("/users/:id", updateStaffUser);

export default router;
