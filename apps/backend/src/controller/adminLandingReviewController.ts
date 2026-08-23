import { LandingReviewStatus, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../utils/prisma";

const statuses = new Set(Object.values(LandingReviewStatus));

export const getLandingReviewsForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const statusValue =
      typeof req.query.status === "string" ? req.query.status : "PENDING";
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page || "1"), 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20),
    );

    if (!statuses.has(statusValue as LandingReviewStatus)) {
      return res.status(400).json({ message: "Invalid review status" });
    }

    const where: Prisma.LandingReviewWhereInput = {
      status: statusValue as LandingReviewStatus,
    };

    if (search.length >= 2) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { business: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const [total, reviews] = await prisma.$transaction([
      prisma.landingReview.count({ where }),
      prisma.landingReview.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getLandingReviewsForAdmin error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const approveLandingReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    if (!reviewId)
      return res.status(400).json({ message: "reviewId is required" });
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });

    const review = await prisma.landingReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) return res.status(404).json({ message: "Review not found" });

    const updated = await prisma.landingReview.update({
      where: { id: reviewId },
      data: {
        status: LandingReviewStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: req.userId,
        rejectionReason: null,
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Review approved",
    });
  } catch (error) {
    console.error("approveLandingReview error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectLandingReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const reason =
      typeof req.body?.rejectionReason === "string"
        ? req.body.rejectionReason.trim()
        : "";
    if (!reviewId)
      return res.status(400).json({ message: "reviewId is required" });
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    if (!reason || reason.length > 500) {
      return res
        .status(400)
        .json({
          message: "Rejection reason must be between 1 and 500 characters",
        });
    }

    const review = await prisma.landingReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) return res.status(404).json({ message: "Review not found" });

    const updated = await prisma.landingReview.update({
      where: { id: reviewId },
      data: {
        status: LandingReviewStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: req.userId,
        rejectionReason: reason,
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Review rejected",
    });
  } catch (error) {
    console.error("rejectLandingReview error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const returnLandingReviewToPending = async (
  req: Request,
  res: Response,
) => {
  try {
    const { reviewId } = req.params;
    if (!reviewId)
      return res.status(400).json({ message: "reviewId is required" });

    const review = await prisma.landingReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) return res.status(404).json({ message: "Review not found" });

    const updated = await prisma.landingReview.update({
      where: { id: reviewId },
      data: {
        status: LandingReviewStatus.PENDING,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Review returned to pending",
    });
  } catch (error) {
    console.error("returnLandingReviewToPending error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
