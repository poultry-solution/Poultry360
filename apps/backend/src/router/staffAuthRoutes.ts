import { Router } from "express";
import { authMiddleware, requireDealerOwner } from "../middelware/middelware";
import {
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
router.post("/logout", staffLogout);
router.get("/@me", getStaffInfo);
router.get("/validate", validateStaffToken);

router.use("/users", (req, res, next) => authMiddleware(req, res, next, ["DEALER"]));
router.use("/users", requireDealerOwner);
router.get("/users", listStaffUsers);
router.post("/users", createStaffUser);
router.patch("/users/:id", updateStaffUser);

export default router;
