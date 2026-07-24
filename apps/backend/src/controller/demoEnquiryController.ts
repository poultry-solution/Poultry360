import { Request, Response } from "express";
import prisma from "../utils/prisma";

const ALLOWED_BUSINESS_TYPES = new Set([
  "Layer Farm",
  "Broiler Farm",
  "Hatchery",
  "Feed Mill",
  "Feed Dealer",
]);

function normalizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Keep only digits for the local portion.
  // Accept either "+977XXXXXXXXXX", "977XXXXXXXXXX", or just "XXXXXXXXXX".
  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const normalized =
    digitsOnly.startsWith("+977")
      ? digitsOnly.slice(4)
      : digitsOnly.startsWith("977")
        ? digitsOnly.slice(3)
        : digitsOnly;

  const localDigits = normalized.replace(/[^\d]/g, "");
  if (!localDigits) return null;

  // Minimal sanity bounds to reduce junk submissions.
  if (localDigits.length < 7 || localDigits.length > 15) return null;

  return `+977${localDigits}`;
}

function normalizeBusinessTypes(raw: unknown): string[] | null {
  if (typeof raw === "undefined" || raw === null) return [];
  if (!Array.isArray(raw)) return null;

  const normalized = raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (normalized.length !== raw.length) return null;

  const unique = Array.from(new Set(normalized));
  if (unique.some((value) => !ALLOWED_BUSINESS_TYPES.has(value))) return null;

  return unique;
}

export const createDemoEnquiry = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { companyName, phoneNumber, businessTypes, message } = req.body as {
      companyName?: string;
      phoneNumber?: string;
      businessTypes?: unknown;
      message?: string;
    };

    if (!companyName || typeof companyName !== "string") {
      return res.status(400).json({ success: false, message: "Company name is required" });
    }

    const normalizedCompanyName = companyName.trim();
    if (normalizedCompanyName.length < 2) {
      return res.status(400).json({ success: false, message: "Company name is too short" });
    }

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const normalizedBusinessTypes = normalizeBusinessTypes(businessTypes);
    if (!normalizedBusinessTypes) {
      return res.status(400).json({ success: false, message: "Invalid business type" });
    }

    const normalizedMessage =
      typeof message === "string" ? message.trim() : undefined;
    if (normalizedMessage && normalizedMessage.length === 0) {
      // Treat empty message as missing.
      return res.status(400).json({ success: false, message: "Message is invalid" });
    }

    if (normalizedMessage && normalizedMessage.length > 1000) {
      return res.status(400).json({ success: false, message: "Message is too long" });
    }

    const created = await prisma.demoEnquiry.create({
      data: {
        companyName: normalizedCompanyName,
        phoneNumber: normalizedPhone,
        businessTypes: normalizedBusinessTypes,
        message: normalizedMessage || undefined,
      },
      select: {
        id: true,
        companyName: true,
        phoneNumber: true,
        businessTypes: true,
        message: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("createDemoEnquiry error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getDemoEnquiries = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const limitRaw = req.query.limit;
    const limitNum = limitRaw ? Number(limitRaw) : 200;
    const take = Number.isFinite(limitNum) ? Math.max(1, Math.min(limitNum, 200)) : 200;

    const enquiries = await prisma.demoEnquiry.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        companyName: true,
        phoneNumber: true,
        businessTypes: true,
        message: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: enquiries });
  } catch (error) {
    console.error("getDemoEnquiries error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
