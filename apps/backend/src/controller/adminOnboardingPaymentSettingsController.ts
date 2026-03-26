import { Request, Response } from "express";
import prisma from "../utils/prisma";

const SETTINGS_ID = "default";

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export const getAdminOnboardingPaymentSettings = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const settings = await prisma.onboardingPaymentSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (!settings) {
      return res.status(404).json({
        message: "Onboarding payment settings not found",
      });
    }

    return res.json({
      success: true,
      data: {
        ownerAmountNpr: Number(settings.ownerAmountNpr),
        managerAmountNpr: Number(settings.managerAmountNpr),
        dealerAmountNpr: Number(settings.dealerAmountNpr),
        companyAmountNpr: Number(settings.companyAmountNpr),
        hatcheryAmountNpr: Number(settings.hatcheryAmountNpr),
        qrImageUrl: settings.qrImageUrl,
        qrText: settings.qrText,
        phoneDisplay: settings.phoneDisplay,
        accountHint: settings.accountHint,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("getAdminOnboardingPaymentSettings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAdminOnboardingPaymentSettings = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const reviewerId = req.userId;
    if (!reviewerId) return res.status(401).json({ message: "Unauthorized" });

    const {
      ownerAmountNpr,
      managerAmountNpr,
      dealerAmountNpr,
      companyAmountNpr,
      hatcheryAmountNpr,
      qrImageUrl,
      qrText,
      phoneDisplay,
      accountHint,
    } = req.body as {
      ownerAmountNpr?: unknown;
      managerAmountNpr?: unknown;
      dealerAmountNpr?: unknown;
      companyAmountNpr?: unknown;
      hatcheryAmountNpr?: unknown;
      qrImageUrl?: unknown;
      qrText?: unknown;
      phoneDisplay?: unknown;
      accountHint?: unknown;
    };

    const ownerAmount = toNumberOrNull(ownerAmountNpr);
    const managerAmount = toNumberOrNull(managerAmountNpr);
    const dealerAmount = toNumberOrNull(dealerAmountNpr);
    const companyAmount = toNumberOrNull(companyAmountNpr);
    const hatcheryAmount = toNumberOrNull(hatcheryAmountNpr);

    if (
      ownerAmount === null ||
      managerAmount === null ||
      dealerAmount === null ||
      companyAmount === null ||
      hatcheryAmount === null
    ) {
      return res.status(400).json({
        message: "All role prices are required and must be valid numbers.",
      });
    }

    if (
      ownerAmount < 0 ||
      managerAmount < 0 ||
      dealerAmount < 0 ||
      companyAmount < 0 ||
      hatcheryAmount < 0
    ) {
      return res.status(400).json({
        message: "Role prices must be zero or positive.",
      });
    }

    if (typeof qrImageUrl !== "string" || !qrImageUrl.trim()) {
      return res.status(400).json({
        message: "qrImageUrl is required.",
      });
    }

    if (typeof phoneDisplay !== "string" || !phoneDisplay.trim()) {
      return res.status(400).json({
        message: "phoneDisplay is required.",
      });
    }

    if (typeof accountHint !== "string" || !accountHint.trim()) {
      return res.status(400).json({
        message: "accountHint is required.",
      });
    }

    const updated = await prisma.onboardingPaymentSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        ownerAmountNpr: ownerAmount,
        managerAmountNpr: managerAmount,
        dealerAmountNpr: dealerAmount,
        companyAmountNpr: companyAmount,
        hatcheryAmountNpr: hatcheryAmount,
        qrImageUrl: qrImageUrl.trim(),
        qrText: typeof qrText === "string" && qrText.trim() ? qrText.trim() : null,
        phoneDisplay: phoneDisplay.trim(),
        accountHint: accountHint.trim(),
        updatedBy: reviewerId,
      },
      update: {
        ownerAmountNpr: ownerAmount,
        managerAmountNpr: managerAmount,
        dealerAmountNpr: dealerAmount,
        companyAmountNpr: companyAmount,
        hatcheryAmountNpr: hatcheryAmount,
        qrImageUrl: qrImageUrl.trim(),
        qrText: typeof qrText === "string" && qrText.trim() ? qrText.trim() : null,
        phoneDisplay: phoneDisplay.trim(),
        accountHint: accountHint.trim(),
        updatedBy: reviewerId,
      },
    });

    return res.json({
      success: true,
      data: {
        ownerAmountNpr: Number(updated.ownerAmountNpr),
        managerAmountNpr: Number(updated.managerAmountNpr),
        dealerAmountNpr: Number(updated.dealerAmountNpr),
        companyAmountNpr: Number(updated.companyAmountNpr),
        hatcheryAmountNpr: Number(updated.hatcheryAmountNpr),
        qrImageUrl: updated.qrImageUrl,
        qrText: updated.qrText,
        phoneDisplay: updated.phoneDisplay,
        accountHint: updated.accountHint,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("updateAdminOnboardingPaymentSettings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
