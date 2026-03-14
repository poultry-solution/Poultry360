import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { subscribe, unsubscribe } from "../controller/pushController";

const router = express.Router();
router.use(authMiddleware);

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
