import { Request, Response } from "express";
import { BatchType } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  getFarmerFcrSettings,
  parseFarmerFcrSettings,
  saveFarmerFcrSettings,
} from "../services/farmerFcrSettingsService";
import { refreshFarmerFcrHistorySafely } from "../services/farmerFcrService";

// GET /farmer/fcr-settings: the account's cFCR standard (owner and staff).
export const getFcrSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const settings = await getFarmerFcrSettings(req.userId);
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get cFCR settings error:", error);
    return res.status(500).json({ success: false, message: "Could not load cFCR settings" });
  }
};

// PUT /farmer/fcr-settings: owner only. Every broiler batch (open and closed) uses the new standard.
export const updateFcrSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    const parsed = parseFarmerFcrSettings(req.body);
    if ("error" in parsed) return res.status(400).json({ success: false, message: parsed.error });

    const settings = await saveFarmerFcrSettings(req.userId, parsed, req.staffUserId ?? req.userId);

    // Recalculate saved daily cFCR for all broiler batches so every screen agrees.
    const batches = await prisma.batch.findMany({
      where: { farm: { ownerId: req.userId }, batchType: BatchType.BROILER },
      select: { id: true },
    });
    for (const batch of batches) await refreshFarmerFcrHistorySafely(batch.id);

    res.locals.auditDescription =
      `Changed the cFCR standard to ${settings.targetWeightKg} kg, ${settings.correctionFactorPerKg} per kg`;
    return res.json({ success: true, data: settings, message: "cFCR standard saved" });
  } catch (error) {
    console.error("Update cFCR settings error:", error);
    return res.status(500).json({ success: false, message: "Could not save cFCR settings" });
  }
};
