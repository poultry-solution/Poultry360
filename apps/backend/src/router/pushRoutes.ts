import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { subscribe, unsubscribe } from "../controller/pushController";

const router = express.Router();
router.use(authMiddleware);
// A push subscription is tied to the owner User. Do not let a staff browser
// subscribe to or remove the owner's private notification stream.
router.use((req, res, next) => {
  if (req.actorType === "STAFF") {
    return res.status(403).json({
      code: "STAFF_NOTIFICATIONS_UNAVAILABLE",
      message: "Push notifications are only available to the account owner.",
    });
  }
  return next();
});

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
