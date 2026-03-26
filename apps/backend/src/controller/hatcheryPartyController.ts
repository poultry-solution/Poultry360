import { Request, Response } from "express";
import { HatcheryPartyService } from "../services/hatcheryPartyService";

function getOwnerId(req: Request): string {
  return (req as any).user?.id;
}

// ─── Party list + create ────────────────────────────────────────────────────

export async function listParties(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { search, page, limit } = req.query;
    const result = await HatcheryPartyService.listParties(ownerId, {
      search: search as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createParty(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { name, phone, address, openingBalance } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone are required" });
    }

    const party = await HatcheryPartyService.createParty(ownerId, {
      name,
      phone,
      address,
      openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
    });
    return res.status(201).json(party);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "A party with this phone number already exists" });
    }
    return res.status(400).json({ error: err.message });
  }
}

// ─── Party detail ────────────────────────────────────────────────────────────

export async function getParty(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const party = await HatcheryPartyService.getPartyDetail(ownerId, id);
    return res.json(party);
  } catch (err: any) {
    if (err.message === "Party not found") return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}

// ─── Txns ────────────────────────────────────────────────────────────────────

export async function listPartyTxns(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const { page, limit } = req.query;
    const result = await HatcheryPartyService.listTxns(ownerId, id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    if (err.message === "Party not found") return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function listPartyPayments(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const { page, limit } = req.query;
    const result = await HatcheryPartyService.listPayments(ownerId, id, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    return res.json(result);
  } catch (err: any) {
    if (err.message === "Party not found") return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}

export async function addPartyPayment(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: partyId } = req.params;
    const { date, amount, method, note } = req.body;

    if (!date || !amount) {
      return res.status(400).json({ error: "date and amount are required" });
    }

    const payment = await HatcheryPartyService.addPayment(ownerId, partyId, {
      date: new Date(date),
      amount: parseFloat(amount),
      method,
      note,
    });
    return res.status(201).json(payment);
  } catch (err: any) {
    if (err.message === "Party not found") return res.status(404).json({ error: err.message });
    return res.status(400).json({ error: err.message });
  }
}

export async function deletePartyPayment(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { paymentId } = req.params;
    await HatcheryPartyService.deletePayment(ownerId, paymentId);
    return res.json({ success: true });
  } catch (err: any) {
    if (err.message === "Payment not found") return res.status(404).json({ error: err.message });
    if (err.message === "Not authorized") return res.status(403).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}
