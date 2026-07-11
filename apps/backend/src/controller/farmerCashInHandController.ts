import { Request, Response } from "express";
import * as CashService from "../services/farmerCashInHandService";

export const getToday = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const data = await CashService.getTodayData(userId);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("Farmer cash getToday error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const setup = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const { initialOpening } = req.body;
    const opening = Number(initialOpening);
    if (initialOpening === undefined || isNaN(opening)) {
      return res.status(400).json({ message: "initialOpening (number) is required" });
    }

    await CashService.setupCashBook(userId, opening);
    return res.status(201).json({ success: true, message: "Cash book set up" });
  } catch (err: any) {
    if (err.message === "Cash book already set up") {
      return res.status(409).json({ message: err.message });
    }
    console.error("Farmer cash setup error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const addMovement = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
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
      userId,
      userId,
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
    console.error("Farmer cash addMovement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteMovement = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const movementId = String(req.params.id || "");
    if (!movementId) {
      return res.status(400).json({ message: "Movement id is required" });
    }

    await CashService.deleteMovement(userId, movementId);
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
    console.error("Farmer cash deleteMovement error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const closeDay = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const result = await CashService.closeToday(userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === "Cash book not set up yet") {
      return res.status(400).json({ message: err.message });
    }
    console.error("Farmer cash closeDay error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getHistory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const limit = Math.min(Number(req.query.limit) || 30, 90);
    const data = await CashService.getHistory(userId, limit);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    console.error("Farmer cash getHistory error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getClosedDayDetail = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId!;
    const bsDate = decodeURIComponent(String(req.params.bsDate || ""));
    const data = await CashService.getClosedDayDetail(userId, bsDate);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    if (err.message === "Invalid bsDate" || err.message === "Day not found or not closed") {
      return res.status(404).json({ message: err.message });
    }
    console.error("Farmer cash getClosedDayDetail error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
