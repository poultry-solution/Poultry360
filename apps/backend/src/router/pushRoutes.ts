import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { subscribe, unsubscribe } from "../controller/pushController";

const router = express.Router();
router.use(authMiddleware);
// Staff requests are scoped to their business owner by authMiddleware, so a
// staff device can receive that business account's notification stream too.

router.post("/subscribe", subscribe);
router.post("/unsubscribe", unsubscribe);

export default router;
