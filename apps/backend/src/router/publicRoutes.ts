import { Router } from "express";
import {
  getLandingReviews,
  createLandingReview,
  getLandingContacts,
  createLandingContact,
} from "../controller/publicController";
import { authMiddleware } from "../middelware/middelware";
import {
  getPublicBlogPostBySlug,
  getPublicBlogPosts,
  incrementPublicBlogPostView,
} from "../controller/blogPostController";
import { createDemoEnquiry } from "../controller/demoEnquiryController";
import {
  getPublicListForSale,
  searchPublicLocations,
  reversePublicLocation,
} from "../controller/listForSaleController";
import { getPublicBatchShare } from "../controller/batchShareController";

const router = Router();

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Landing page reviews (list + submit)
router.get("/reviews", getLandingReviews);
router.post("/reviews", createLandingReview);

// Landing page contact form (list + submit)
router.get("/contacts", (req, res, next) => authMiddleware(req, res, next), getLandingContacts);
router.post("/contacts", createLandingContact);

// Landing hero "Book a demo" form (no auth required)
router.post("/demo-enquiries", createDemoEnquiry);

// SEO blog
router.get("/blog-posts", getPublicBlogPosts);
router.get("/blog-posts/:slug", getPublicBlogPostBySlug);
router.post("/blog-posts/:slug/view", incrementPublicBlogPostView);

// List for sale (public marketplace - no auth)
router.get("/list-for-sale", getPublicListForSale);

// Free location lookup for listing forms
router.get("/locations/search", searchPublicLocations);
router.get("/locations/reverse", reversePublicLocation);

// Batch share link (read-only health report, no money)
router.get("/batch-share/:token", getPublicBatchShare);

export default router;
