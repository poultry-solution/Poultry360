import { Router } from "express";
import {
  searchCompanies,
  searchDealers,
  getLandingReviews,
  createLandingReview,
  getLandingContacts,
  createLandingContact,
} from "../controller/publicController";
import { getPublicListForSale } from "../controller/listForSaleController";

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

// List for sale (public marketplace - no auth)
router.get("/list-for-sale", getPublicListForSale);

export default router;
