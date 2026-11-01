import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import { getHatcherySaleById } from "../controller/hatcherySaleController";

const router = express.Router();

/** Per-route only: this router is mounted at `/`, so a blanket `router.use`
 *  would block /notifications, /push, etc. Mirrors `hatcheryIncubationRoutes`.
 */
const requireHatchery: express.RequestHandler = (req, res, next) => {
  void authMiddleware(
    req,
    res,
    () => {
      requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS)(
        req,
        res,
        () => auditSuccessfulHatcheryMutation(req, res, next)
      );
    },
    [UserRole.HATCHERY] as any
  );
};

// GET /hatchery/sales/:type/:saleId
//   type ∈ { egg_sale, parent_sale, chick_sale }
// Used by the bill UI (modal + print page + party-detail "Bill" button) to
// fetch a single sale by id without knowing which batch/incubation it belongs
// to. See `hatcherySaleController.ts` for the response shape.
router.get("/hatchery/sales/:type/:saleId", requireHatchery, getHatcherySaleById);

export default router;
