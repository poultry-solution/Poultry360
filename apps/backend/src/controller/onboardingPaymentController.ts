import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  UserOnboardingPaymentState,
  UserPaymentSubmissionStatus,
  UserRole,
} from "@prisma/client";
import {
  getOnboardingAmountForRole,
  getOnboardingPaymentSettings,
} from "../config/onboardingPayment";
import {
  addDays,
  getOnboardingTrialDurationDays,
  isTrialAccessActive,
} from "../config/onboardingTrial";

export const getOnboardingPaymentContext = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const settings = await getOnboardingPaymentSettings();
    if (!settings) {
      console.error("Onboarding payment settings row not found");
      return res.status(500).json({ message: "Onboarding payment settings not configured" });
    }

    const trialDurationDays = getOnboardingTrialDurationDays();

    const [user, onboarding, latestSubmission] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      }),
      prisma.userOnboardingPayment.findUnique({
        where: { userId },
      }),
      prisma.userPaymentSubmission.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!onboarding)
      return res
        .status(404)
        .json({ message: "Onboarding payment record not found" });

    return res.json({
      success: true,
      data: {
        userRole: user.role,
        state: onboarding.state,
        lockedUntilApproved: onboarding.lockedUntilApproved,
        trialEndsAt: onboarding.trialEndsAt
          ? onboarding.trialEndsAt.toISOString()
          : null,
        trialDurationDays,
        trialActive: isTrialAccessActive(onboarding.trialEndsAt),
        amountNpr: getOnboardingAmountForRole(
          user.role as UserRole,
          settings.rolePricing
        ),
        qr: settings.qr,
        rejectionReason:
          onboarding.rejectionReason ||
          latestSubmission?.reviewRejectionReason ||
          null,
      },
    });
  } catch (error) {
    console.error("getOnboardingPaymentContext error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const startOnboardingTrial = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const trialDurationDays = getOnboardingTrialDurationDays();

    const [user, onboarding] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      }),
      prisma.userOnboardingPayment.findUnique({
        where: { userId },
      }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!onboarding)
      return res
        .status(404)
        .json({ message: "Onboarding payment record not found" });

    if (onboarding.state === UserOnboardingPaymentState.PAYMENT_APPROVED) {
      return res.status(400).json({ message: "Account is already active" });
    }

    const allowedRoles: UserRole[] = ["OWNER", "MANAGER", "DEALER", "COMPANY"];
    if (!allowedRoles.includes(user.role as UserRole)) {
      return res.status(400).json({
        message: "Trial is not available for your role",
      });
    }

    // One trial total per account: trialEndsAt non-null means trial used (active or expired).
    if (onboarding.trialEndsAt) {
      return res.status(400).json({ message: "Trial already used" });
    }

    // Trial can only be started from the unpaid/resubmission path.
    if (
      onboarding.state !== UserOnboardingPaymentState.PENDING_PAYMENT &&
      onboarding.state !== UserOnboardingPaymentState.PAYMENT_REJECTED
    ) {
      return res.status(400).json({
        message: "Trial is not available for your current status",
      });
    }

    const trialEndsAt = addDays(new Date(), trialDurationDays);

    await prisma.userOnboardingPayment.update({
      where: { userId },
      data: {
        trialEndsAt,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        trialEndsAt: trialEndsAt.toISOString(),
        trialDurationDays,
      },
      message: "Trial started successfully",
    });
  } catch (error) {
    console.error("startOnboardingTrial error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const submitOnboardingPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const settings = await getOnboardingPaymentSettings();
    if (!settings) {
      console.error("Onboarding payment settings row not found");
      return res.status(500).json({ message: "Onboarding payment settings not configured" });
    }

    const { receiptUrl, notes } = req.body as {
      receiptUrl?: string;
      notes?: string;
    };

    if (!receiptUrl || typeof receiptUrl !== "string") {
      return res.status(400).json({
        message: "receiptUrl is required",
      });
    }

    const [user, onboarding] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      }),
      prisma.userOnboardingPayment.findUnique({
        where: { userId },
      }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!onboarding)
      return res
        .status(404)
        .json({ message: "Onboarding payment record not found" });

    if (onboarding.state === UserOnboardingPaymentState.PAYMENT_APPROVED) {
      return res.status(400).json({
        message: "Account is already active",
      });
    }

    // Throttle: don't allow multiple active reviews
    if (onboarding.state === UserOnboardingPaymentState.PENDING_REVIEW) {
      return res.status(400).json({
        message: "Payment already submitted for review",
      });
    }

    // Create submission + move onboarding into review
    const amountNpr = getOnboardingAmountForRole(
      user.role as UserRole,
      settings.rolePricing
    );

    await prisma.$transaction(async (tx) => {
      await tx.userPaymentSubmission.create({
        data: {
          userId,
          amountNpr,
          roleAtSubmission: user.role,
          receiptUrl,
          notes: notes || undefined,
          status: UserPaymentSubmissionStatus.PENDING_REVIEW,
        },
      });

      await tx.userOnboardingPayment.update({
        where: { userId },
        data: {
          state: UserOnboardingPaymentState.PENDING_REVIEW,
          rejectedAt: null,
          rejectedBy: null,
          rejectionReason: null,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message:
        "Receipt submitted successfully. Your account will be reviewed shortly.",
    });
  } catch (error) {
    console.error("submitOnboardingPayment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOnboardingPaymentHistory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [user, onboarding, submissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      }),
      prisma.userOnboardingPayment.findUnique({
        where: { userId },
      }),
      prisma.userPaymentSubmission.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (!onboarding)
      return res
        .status(404)
        .json({ message: "Onboarding payment record not found" });

    return res.json({
      success: true,
      data: {
        userRole: user.role,
        state: onboarding.state,
        submissions: submissions.map((s) => ({
          id: s.id,
          amountNpr: Number(s.amountNpr),
          receiptUrl: s.receiptUrl,
          notes: s.notes,
          status: s.status,
          createdAt: s.createdAt,
          reviewedAt: s.reviewedAt,
          reviewerId: s.reviewerId,
          rejectionReason:
            s.reviewRejectionReason || onboarding.rejectionReason || null,
        })),
      },
    });
  } catch (error) {
    console.error("getOnboardingPaymentHistory error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

