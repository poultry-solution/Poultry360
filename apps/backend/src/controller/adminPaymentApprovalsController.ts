import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma, UserOnboardingPaymentState } from "@prisma/client";

/**
 * List account-approval requests. Backed by UserOnboardingPayment rows so the
 * admin sees every gated signup and its current state. Pricing is handled
 * offline; this queue is purely approve/reject.
 */
export const getAccountApprovals = async (req: Request, res: Response) => {
  try {
    const {
      status = "PENDING_PAYMENT",
      role,
      search,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 20);
    const searchStr = typeof search === "string" ? search.trim() : undefined;

    const where: Prisma.UserOnboardingPaymentWhereInput = {
      state: status as UserOnboardingPaymentState,
    };

    const userFilter: Prisma.UserWhereInput = {};
    if (role && typeof role === "string") {
      userFilter.role = role as any;
    }
    if (searchStr && searchStr.length >= 2) {
      userFilter.OR = [
        { phone: { contains: searchStr, mode: "insensitive" } },
        { name: { contains: searchStr, mode: "insensitive" } },
      ];
    }
    if (Object.keys(userFilter).length > 0) {
      where.user = userFilter;
    }

    const total = await prisma.userOnboardingPayment.count({ where });
    const records = await prisma.userOnboardingPayment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            companyName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    });

    return res.json({
      success: true,
      data: records.map((r) => ({
        userId: r.userId,
        userName: r.user.name,
        phone: r.user.phone,
        role: r.user.role,
        companyName: r.user.companyName,
        state: r.state,
        rejectionReason: r.rejectionReason || null,
        approvedAt: r.approvedAt,
        rejectedAt: r.rejectedAt,
        requestedAt: r.user.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getAccountApprovals error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const approveAccount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reviewerId = req.userId;

    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (!reviewerId) return res.status(401).json({ message: "Unauthorized" });

    const onboarding = await prisma.userOnboardingPayment.findUnique({
      where: { userId },
    });
    if (!onboarding) return res.status(404).json({ message: "Not found" });
    if (onboarding.state === UserOnboardingPaymentState.PAYMENT_APPROVED) {
      return res.status(400).json({ message: "Account is already approved." });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.userOnboardingPayment.update({
        where: { userId },
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
      await tx.user.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
      });
    });

    return res.json({ success: true, message: "Account approved" });
  } catch (error) {
    console.error("approveAccount error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const rejectAccount = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reviewerId = req.userId;
    const { rejectionReason } = req.body as { rejectionReason?: string };

    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (!reviewerId) return res.status(401).json({ message: "Unauthorized" });
    if (!rejectionReason || typeof rejectionReason !== "string") {
      return res.status(400).json({ message: "rejectionReason is required" });
    }

    const onboarding = await prisma.userOnboardingPayment.findUnique({
      where: { userId },
    });
    if (!onboarding) return res.status(404).json({ message: "Not found" });

    const now = new Date();
    await prisma.userOnboardingPayment.update({
      where: { userId },
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

    return res.json({ success: true, message: "Account rejected" });
  } catch (error) {
    console.error("rejectAccount error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
