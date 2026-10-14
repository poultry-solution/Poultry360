import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { BillSettingsInputSchema, type BillDetails } from "@myapp/shared-types";
import prisma from "../utils/prisma";

const EMPTY: BillDetails = { businessName: null, address: null, panNumber: null, phone: null, footerNote: null };

const clean = (value: string | null | undefined) => {
  const text = value?.trim();
  return text ? text : null;
};

/**
 * Business details from the account's own records, used when a bill field is
 * left empty. Staff requests already carry the owner's id in req.userId.
 */
async function getBillDefaults(accountId: string): Promise<BillDetails> {
  const user = await prisma.user.findUnique({
    where: { id: accountId },
    select: {
      role: true,
      name: true,
      phone: true,
      companyName: true,
      CompanyFarmLocation: true,
      dealer: { select: { name: true, address: true, contact: true } },
      company: { select: { name: true, address: true } },
      hatcheryBusiness: { select: { name: true, address: true, contact: true } },
    },
  });
  if (!user) return { ...EMPTY };

  if (user.role === UserRole.DEALER && user.dealer) {
    return {
      ...EMPTY,
      businessName: clean(user.dealer.name) ?? clean(user.name),
      address: clean(user.dealer.address),
      phone: clean(user.dealer.contact) ?? clean(user.phone),
    };
  }
  if (user.role === UserRole.COMPANY && user.company) {
    return {
      ...EMPTY,
      businessName: clean(user.company.name) ?? clean(user.name),
      address: clean(user.company.address),
      phone: clean(user.phone),
    };
  }
  if (user.role === UserRole.HATCHERY && user.hatcheryBusiness) {
    return {
      ...EMPTY,
      businessName: clean(user.hatcheryBusiness.name) ?? clean(user.name),
      address: clean(user.hatcheryBusiness.address),
      phone: clean(user.hatcheryBusiness.contact) ?? clean(user.phone),
    };
  }
  return {
    ...EMPTY,
    businessName: clean(user.companyName) ?? clean(user.name),
    address: clean(user.CompanyFarmLocation),
    phone: clean(user.phone),
  };
}

async function buildResponse(accountId: string) {
  const [row, defaults] = await Promise.all([
    prisma.billSettings.findUnique({ where: { accountId } }),
    getBillDefaults(accountId),
  ]);
  const saved: BillDetails = {
    businessName: row?.businessName ?? null,
    address: row?.address ?? null,
    panNumber: row?.panNumber ?? null,
    phone: row?.phone ?? null,
    footerNote: row?.footerNote ?? null,
  };
  const effective: BillDetails = {
    businessName: saved.businessName ?? defaults.businessName,
    address: saved.address ?? defaults.address,
    panNumber: saved.panNumber ?? defaults.panNumber,
    phone: saved.phone ?? defaults.phone,
    footerNote: saved.footerNote ?? defaults.footerNote,
  };
  return { saved, defaults, effective };
}

/** GET /bill-settings — owner and staff (staff see the owner's details). */
export const getBillSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const accountId = req.userId;
    if (!accountId) return res.status(401).json({ message: "Unauthorized" });
    return res.json({ success: true, data: await buildResponse(accountId) });
  } catch (error) {
    console.error("Get bill settings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/** PUT /bill-settings — owner only (route guard). Empty values are saved as null. */
export const updateBillSettings = async (req: Request, res: Response): Promise<any> => {
  try {
    const accountId = req.userId;
    if (!accountId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = BillSettingsInputSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues[0]?.message || "Check the bill details" });
    }
    const data = {
      businessName: parsed.data.businessName ?? null,
      address: parsed.data.address ?? null,
      panNumber: parsed.data.panNumber ?? null,
      phone: parsed.data.phone ?? null,
      footerNote: parsed.data.footerNote ?? null,
    };
    await prisma.billSettings.upsert({
      where: { accountId },
      create: { accountId, ...data },
      update: data,
    });
    return res.json({ success: true, data: await buildResponse(accountId) });
  } catch (error) {
    console.error("Update bill settings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
