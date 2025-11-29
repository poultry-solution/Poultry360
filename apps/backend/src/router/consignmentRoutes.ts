import express from "express";
import {
  createConsignmentRequest,
  proposeConsignment,
  getConsignments,
  getConsignmentById,
  acceptConsignment,
  rejectConsignment,
  approveConsignmentRequest,
  dispatchConsignment,
} from "../controller/consignmentController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// ==================== CONSIGNMENT ROUTES ====================

// Dealer routes
router.post(
  "/dealer/request",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  createConsignmentRequest
);

router.get(
  "/dealer",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  getConsignments
);

router.put(
  "/dealer/:id/accept",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  acceptConsignment
);

router.put(
  "/dealer/:id/reject",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  rejectConsignment
);

// Company routes
router.post(
  "/company/propose",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  proposeConsignment
);

router.get(
  "/company",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getConsignments
);

router.put(
  "/company/:id/approve",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  approveConsignmentRequest
);

router.put(
  "/company/:id/dispatch",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  dispatchConsignment
);

// Shared routes (both dealer and company can access)
router.get(
  "/:id",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER", "COMPANY"]),
  getConsignmentById
);

export default router;

