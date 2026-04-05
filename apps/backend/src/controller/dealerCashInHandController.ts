import { Request, Response } from "express";
import prisma from "../utils/prisma";
import * as CashService from "../services/dealerCashInHandService";

// Resolve dealer for the authenticated user
async function getDealer(userId: string) {
  return prisma.dealer.findUnique({ where: { ownerId: userId }, select: { id: true } });
}

// GET /dealer/cash-in-hand/today
export const getToday = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const data = await CashService.getTodayData(dealer.id);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("Cash getToday error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /dealer/cash-in-hand/setup
export const setup = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const { initialOpening } = req.body;
    const opening = Number(initialOpening);
    if (initialOpening === undefined || isNaN(opening)) {
      return res.status(400).json({ message: "initialOpening (number) is required" });
    }

    await CashService.setupCashBook(dealer.id, opening);
    return res.status(201).json({ success: true, message: "Cash book set up" });
  } catch (err: any) {
    if (err.message === "Cash book already set up") {
      return res.status(409).json({ message: err.message });
    }
    console.error("Cash setup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /dealer/cash-in-hand/movements
export const addMovement = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const { direction, amount, partyName, notes } = req.body;

    if (!direction || !["IN", "OUT"].includes(direction)) {
      return res.status(400).json({ message: "direction must be IN or OUT" });
    }
    if (!partyName || String(partyName).trim() === "") {
      return res.status(400).json({ message: "partyName is required" });
    }
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    await CashService.addMovement(
      dealer.id,
      req.userId!,
      direction as "IN" | "OUT",
      amt,
      String(partyName),
      notes ? String(notes) : undefined
    );

    return res.status(201).json({ success: true, message: "Movement recorded" });
  } catch (err: any) {
    if (
      err.message === "Cash book not set up yet" ||
      err.message.startsWith("Today is already closed") ||
      err.message === "Amount must be greater than 0"
    ) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Cash addMovement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMovement = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const movementId = String(req.params.id || "");
    if (!movementId) {
      return res.status(400).json({ message: "Movement id is required" });
    }

    await CashService.deleteMovement(dealer.id, movementId);
    return res.status(200).json({ success: true, message: "Movement deleted" });
  } catch (err: any) {
    if (
      err.message === "Cash book not set up yet" ||
      err.message.startsWith("Today is already closed") ||
      err.message === "Movement not found" ||
      err.message === "Only today's movements can be deleted"
    ) {
      const status = err.message === "Movement not found" ? 404 : 400;
      return res.status(status).json({ message: err.message });
    }
    console.error("Cash deleteMovement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// POST /dealer/cash-in-hand/close-day
export const closeDay = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const result = await CashService.closeToday(dealer.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === "Cash book not set up yet") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Cash closeDay error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// GET /dealer/cash-in-hand/history
export const getHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const limit = Math.min(Number(req.query.limit) || 30, 90);
    const data = await CashService.getHistory(dealer.id, limit);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("Cash getHistory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getClosedDayDetail = async (req: Request, res: Response): Promise<any> => {
  try {
    const dealer = await getDealer(req.userId!);
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const bsDate = decodeURIComponent(String(req.params.bsDate || ""));
    const data = await CashService.getClosedDayDetail(dealer.id, bsDate);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err.message === "Invalid bsDate" || err.message === "Day not found or not closed") {
      return res.status(404).json({ message: err.message });
    }
    console.error("Cash getClosedDayDetail error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
