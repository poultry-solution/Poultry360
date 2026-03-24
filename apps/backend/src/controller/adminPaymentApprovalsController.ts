import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  UserOnboardingPaymentState,
  UserPaymentSubmissionStatus,
} from "@prisma/client";

export const getPaymentApprovals = async (req: Request, res: Response) => {
  try {
    const {
      status = "PENDING_REVIEW",
      role,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const searchStr =
      typeof search === "string" ? search.trim() : undefined;

    const submissionStatus = status as UserPaymentSubmissionStatus;

    const where: any = {
      status: submissionStatus,
    };

    if (role && typeof role === "string") {
      where.user = { role: role };
    }

    if (searchStr && searchStr.length >= 2) {
      where.AND = [
        ...(where.AND ? where.AND : []),
        {
          OR: [
            { user: { phone: { contains: searchStr, mode: "insensitive" } } },
            { user: { name: { contains: searchStr, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const total = await prisma.userPaymentSubmission.count({ where });
    const submissions = await prisma.userPaymentSubmission.findMany({
      where,
      include: {
        user: {
          include: {
            onboarding: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return res.json({
      success: true,
      data: submissions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.user.name,
        phone: s.user.phone,
        roleAtSubmission: s.roleAtSubmission,
        amountNpr: Number(s.amountNpr),
        receiptUrl: s.receiptUrl,
        notes: s.notes,
        status: s.status,
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt,
        reviewerId: s.reviewerId,
        rejectionReason:
          s.reviewRejectionReason ||
          s.user.onboarding?.rejectionReason ||
          null,
        onboardingState: s.user.onboarding?.state || null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getPaymentApprovals error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const approvePaymentSubmission = async (
  req: Request,
  res: Response
) => {
  try {
    const { submissionId } = req.params;
    const reviewerId = req.userId;

    if (!submissionId) {
      return res.status(400).json({ message: "submissionId is required" });
    }
    if (!reviewerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const submission = await prisma.userPaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { include: { onboarding: true } } },
    });

    if (!submission) return res.status(404).json({ message: "Not found" });
    if (submission.status !== UserPaymentSubmissionStatus.PENDING_REVIEW) {
      return res.status(400).json({
        message: "Only pending submissions can be approved.",
      });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.userPaymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: UserPaymentSubmissionStatus.APPROVED,
          reviewedAt: now,
          reviewerId,
          reviewRejectionReason: null,
        },
      });

      // Activate onboarding + unlock account
      await tx.userOnboardingPayment.update({
        where: { userId: submission.userId },
        data: {
          state: UserOnboardingPaymentState.PAYMENT_APPROVED,
          lockedUntilApproved: false,
          approvedAt: now,
          approvedBy: reviewerId,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
      });

      // Ensure account is active (keep existing behavior safe)
      await tx.user.update({
        where: { id: submission.userId },
        data: { status: "ACTIVE" },
      });
    });

    return res.json({ success: true, message: "Payment approved" });
  } catch (error) {
    console.error("approvePaymentSubmission error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectPaymentSubmission = async (
  req: Request,
  res: Response
) => {
  try {
    const { submissionId } = req.params;
    const reviewerId = req.userId;
    const { rejectionReason } = req.body as { rejectionReason?: string };

    if (!submissionId) {
      return res.status(400).json({ message: "submissionId is required" });
    }
    if (!reviewerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (!rejectionReason || typeof rejectionReason !== "string") {
      return res.status(400).json({ message: "rejectionReason is required" });
    }

    const submission = await prisma.userPaymentSubmission.findUnique({
      where: { id: submissionId },
      include: { user: { include: { onboarding: true } } },
    });

    if (!submission) return res.status(404).json({ message: "Not found" });
    if (submission.status !== UserPaymentSubmissionStatus.PENDING_REVIEW) {
      return res.status(400).json({
        message: "Only pending submissions can be rejected.",
      });
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.userPaymentSubmission.update({
        where: { id: submissionId },
        data: {
          status: UserPaymentSubmissionStatus.REJECTED,
          reviewedAt: now,
          reviewerId,
          reviewRejectionReason: rejectionReason,
        },
      });

      await tx.userOnboardingPayment.update({
        where: { userId: submission.userId },
        data: {
          state: UserOnboardingPaymentState.PAYMENT_REJECTED,
          lockedUntilApproved: true,
          rejectedAt: now,
          rejectedBy: reviewerId,
          rejectionReason,
          approvedAt: null,
          approvedBy: null,
        },
      });

      await tx.user.update({
        where: { id: submission.userId },
        data: { status: "ACTIVE" },
      });
    });

    return res.json({ success: true, message: "Payment rejected" });
  } catch (error) {
    console.error("rejectPaymentSubmission error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

