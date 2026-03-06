import { Router } from "express";
import {
  searchCompanies,
  searchDealers,
  getLandingReviews,
  createLandingReview,
  getLandingContacts,
  createLandingContact,
} from "../controller/publicController";

const router = Router();

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Search companies - used during dealer signup
router.get("/companies/search", searchCompanies);

// Search dealers - used when farmers want to connect
router.get("/dealers/search", searchDealers);

// Landing page reviews (list + submit)
router.get("/reviews", getLandingReviews);
router.post("/reviews", createLandingReview);

// Landing page contact form (list + submit)
router.get("/contacts", getLandingContacts);
router.post("/contacts", createLandingContact);

export default router;
