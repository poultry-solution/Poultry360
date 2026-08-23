import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogPostById,
  getAdminBlogPosts,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
} from "../controller/blogPostController";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getAdminBlogPosts);
router.get("/:id", getAdminBlogPostById);
router.post("/", createAdminBlogPost);
router.put("/:id", updateAdminBlogPost);
router.post("/:id/publish", publishAdminBlogPost);
router.post("/:id/unpublish", unpublishAdminBlogPost);
router.delete("/:id", deleteAdminBlogPost);

export default router;
