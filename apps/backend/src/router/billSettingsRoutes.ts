import { NextFunction, Request, Response, Router } from "express";
import { getBillSettings, updateBillSettings } from "../controller/billSettingsController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use(authMiddleware);

const ownerOnly = (req: Request, res: Response, next: NextFunction) => {
  if (req.actorType === "STAFF") {
    return res.status(403).json({
      code: "OWNER_ONLY",
      message: "Only the account owner can change bill details.",
    });
  }
  return next();
};

// Staff can read the details so the bills they print show the business.
router.get("/", getBillSettings);

// Only the account owner can change them.
router.put("/", ownerOnly, updateBillSettings);

export default router;
