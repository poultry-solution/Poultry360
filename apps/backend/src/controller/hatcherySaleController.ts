import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * Unified "get one hatchery sale by id" endpoint used by the bill UI.
 *
 * The three sale tables (HatcheryEggSale, HatcheryParentSale,
 * HatcheryChickSale) have different shapes, so each branch returns the sale
 * with the fields its bill mapper will need. The `type` discriminator comes
 * from the URL and is echoed back so the response is self-describing.
 *
 * Ownership is enforced via `hatcheryOwnerId` on the sale row itself (added
 * in migration 20261029150000). A sale that belongs to another tenant looks
 * identical to a missing one — same 404.
 */

const SALE_TYPES = ["egg_sale", "parent_sale", "chick_sale"] as const;
type SaleType = (typeof SALE_TYPES)[number];

function getOwnerId(req: Request): string {
  return (req as any).userId as string;
}

const PARTY_SELECT = {
  id: true,
  name: true,
  phone: true,
  address: true,
  balance: true,
} as const;

const BATCH_SELECT = {
  id: true,
  code: true,
  name: true,
} as const;

export async function getHatcherySaleById(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    // Defence in depth: `getOwnerId` casts `req.userId as string`, which would
    // produce `undefined` if the auth middleware ever let a request through
    // without one. Prisma treats `where: { hatcheryOwnerId: null }` as
    // `IS NULL`, so without this guard a null ownerId could, in theory,
    // match pre-migration orphan rows. Fail closed.
    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { type, saleId } = req.params;

    if (!SALE_TYPES.includes(type as SaleType)) {
      return res
        .status(400)
        .json({ error: "type must be egg_sale, parent_sale, or chick_sale" });
    }

    if (type === "egg_sale") {
      const sale = await prisma.hatcheryEggSale.findFirst({
        where: { id: saleId, hatcheryOwnerId: ownerId },
        include: {
          party: { select: PARTY_SELECT },
          batch: { select: BATCH_SELECT },
          eggType: { select: { id: true, name: true } },
        },
      });
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      return res.json({ type: "egg_sale", sale });
    }

    if (type === "parent_sale") {
      const sale = await prisma.hatcheryParentSale.findFirst({
        where: { id: saleId, hatcheryOwnerId: ownerId },
        include: {
          party: { select: PARTY_SELECT },
          batch: { select: BATCH_SELECT },
        },
      });
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      return res.json({ type: "parent_sale", sale });
    }

    // chick_sale
    const sale = await prisma.hatcheryChickSale.findFirst({
      where: { id: saleId, hatcheryOwnerId: ownerId },
      include: {
        party: { select: PARTY_SELECT },
        incubationBatch: { select: BATCH_SELECT },
      },
    });
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    return res.json({ type: "chick_sale", sale });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
