import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * Returns the current account-approval status for the logged-in user.
 * Used by the "account under review" screen new users land on after signup.
 */
export const getOnboardingStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
        .json({ message: "Onboarding record not found" });

    return res.json({
      success: true,
      data: {
        userRole: user.role,
        state: onboarding.state,
        lockedUntilApproved: onboarding.lockedUntilApproved,
        rejectionReason: onboarding.rejectionReason || null,
      },
    });
  } catch (error) {
    console.error("getOnboardingStatus error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
