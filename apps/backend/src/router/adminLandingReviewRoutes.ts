import { UserRole } from "@prisma/client";
import { Router } from "express";
import {
  approveLandingReview,
  getLandingReviewsForAdmin,
  rejectLandingReview,
  returnLandingReviewToPending,
} from "../controller/adminLandingReviewController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getLandingReviewsForAdmin);
router.post("/:reviewId/approve", approveLandingReview);
router.post("/:reviewId/reject", rejectLandingReview);
router.post("/:reviewId/pending", returnLandingReviewToPending);

export default router;
