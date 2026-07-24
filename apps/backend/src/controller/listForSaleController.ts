import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { ListForSaleCategory, ListForSaleStatus } from "@prisma/client";

const NEPAL_PROVINCES = [
  "Koshi Province",
  "Madhesh Province",
  "Bagmati Province",
  "Gandaki Province",
  "Lumbini Province",
  "Karnali Province",
  "Sudurpashchim Province",
] as const;

const PROVINCE_ALIASES: Record<string, readonly string[]> = {
  "Koshi Province": ["koshi", "koshi province", "province 1", "province no 1", "province no. 1", "pradesh 1"],
  "Madhesh Province": ["madhesh", "madhesh province", "province 2", "province no 2", "province no. 2", "pradesh 2"],
  "Bagmati Province": [
    "bagmati",
    "bagmati province",
    "bagamati",
    "bagamati province",
    "province 3",
    "province no 3",
    "province no. 3",
    "pradesh 3",
  ],
  "Gandaki Province": ["gandaki", "gandaki province", "province 4", "province no 4", "province no. 4", "pradesh 4"],
  "Lumbini Province": ["lumbini", "lumbini province", "province 5", "province no 5", "province no. 5", "pradesh 5"],
  "Karnali Province": ["karnali", "karnali province", "province 6", "province no 6", "province no. 6", "pradesh 6"],
  "Sudurpashchim Province": [
    "sudurpashchim",
    "sudurpaschim",
    "sudur paschim",
    "sudurpashchim province",
    "province 7",
    "province no 7",
    "province no. 7",
    "pradesh 7",
  ],
};

const listForSaleSelectPublic = {
  id: true,
  companyName: true,
  category: true,
  phone: true,
  rate: true,
  quantity: true,
  unit: true,
  availabilityFrom: true,
  availabilityTo: true,
  province: true,
  address: true,
  latitude: true,
  longitude: true,
  avgWeightKg: true,
  eggVariants: true,
  typeVariants: true,
  createdAt: true,
};

// ==================== PUBLIC: GET LISTINGS (NO AUTH) ====================
export const getPublicListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const { category, province, limit = 50, offset = 0 } = req.query;
    const take = Math.min(Number(limit), 100);
    const skip = Number(offset);

    const where: { status: ListForSaleStatus; category?: ListForSaleCategory; province?: string } = {
      status: ListForSaleStatus.ACTIVE,
    };
    if (category && typeof category === "string" && isValidCategory(category)) {
      where.category = category as ListForSaleCategory;
    }
    if (province && typeof province === "string" && province.trim().length > 0) {
      const provinceVariants = getProvinceQueryVariants(province.trim());
      if (provinceVariants.length > 0) {
        // Match canonical and legacy province strings while older rows still exist.
        // This keeps the province filter working even when the saved data varies.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (where as any).OR = [
          { province: { in: provinceVariants } },
          ...provinceVariants.map((variant) => ({
            address: { contains: variant, mode: "insensitive" as const },
          })),
        ];
      } else {
        where.province = province.trim();
      }
    }

    const [listings, total] = await Promise.all([
      prisma.listForSale.findMany({
        where,
        select: listForSaleSelectPublic,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.listForSale.count({ where }),
    ]);

    return res.json({ success: true, data: listings.map(normalizeListForSaleProvince), total });
  } catch (error) {
    console.error("Get public list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const searchPublicLocations = async (req: Request, res: Response): Promise<any> => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = Math.max(1, Math.min(10, parseInt(typeof req.query.limit === "string" ? req.query.limit : "5", 10) || 5));

    if (query.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("countrycodes", "np");
    url.searchParams.set("q", query);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Poultry360/1.0",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: "Location search service unavailable" });
    }

    const items = (await response.json()) as Array<{
      place_id?: number;
      display_name?: string;
      lat?: string;
      lon?: string;
      address?: Record<string, string | undefined>;
    }>;

    const data = items
      .map((item) => {
        const lat = item.lat != null ? Number(item.lat) : NaN;
        const lng = item.lon != null ? Number(item.lon) : NaN;
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const province = normalizeProvince(item.address);
        return {
          id: String(item.place_id ?? `${lat}-${lng}`),
          label: item.display_name ?? "Selected location",
          subtitle: province ?? "Nepal",
          latitude: lat,
          longitude: lng,
          province,
          address: item.display_name ?? null,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, data });
  } catch (error: any) {
    console.error("Search public locations error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to search locations" });
  }
};

export const reversePublicLocation = async (req: Request, res: Response): Promise<any> => {
  try {
    const lat = typeof req.query.lat === "string" ? Number(req.query.lat) : NaN;
    const lng = typeof req.query.lng === "string" ? Number(req.query.lng) : NaN;
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ success: false, message: "Valid latitude and longitude are required" });
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "Poultry360/1.0",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ success: false, message: "Location lookup service unavailable" });
    }

    const item = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string | undefined>;
    };

    return res.json({
      success: true,
      data: {
        latitude: lat,
        longitude: lng,
        label: item.display_name ?? `${lat}, ${lng}`,
        subtitle: normalizeProvince(item.address) ?? "Nepal",
        province: normalizeProvince(item.address),
        address: item.display_name ?? null,
      },
    });
  } catch (error: any) {
    console.error("Reverse public location error:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to resolve location" });
  }
};

// ==================== FARMER: LIST OWN LISTINGS ====================
export const getFarmerListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { status, category } = req.query;
    const where: { userId: string; status?: ListForSaleStatus; category?: ListForSaleCategory } = { userId };
    if (status && (status === "ACTIVE" || status === "ARCHIVED")) where.status = status as ListForSaleStatus;
    if (category && typeof category === "string" && isValidCategory(category)) where.category = category as ListForSaleCategory;

    const listings = await prisma.listForSale.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: listings.map(normalizeListForSaleProvince) });
  } catch (error) {
    console.error("Get farmer list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: GET ONE (for edit) ====================
export const getFarmerListForSaleById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const listing = await prisma.listForSale.findFirst({
      where: { id, userId },
    });
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    return res.json({ success: true, data: normalizeListForSaleProvince(listing) });
  } catch (error) {
    console.error("Get farmer list for sale by id error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: CREATE ====================
export const createListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyName: true } });
    const companyName = (user?.companyName ?? "").trim() || "N/A";

    const body = req.body;
    const {
      category,
      phone,
      rate,
      quantity,
      unit,
      availabilityFrom,
      availabilityTo,
      latitude,
      longitude,
      avgWeightKg,
      eggVariants,
      typeVariants,
      province,
      address,
    } = body;

    if (!category || !isValidCategory(category)) {
      return res.status(400).json({ success: false, message: "Valid category is required (CHICKEN, EGGS, LAYERS, FISH, OTHER)" });
    }
    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    const qty = parseDecimal(quantity);
    if (qty === null || qty < 0) {
      return res.status(400).json({ success: false, message: "Valid quantity is required" });
    }
    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Unit is required" });
    }
    const from = parseDate(availabilityFrom);
    const to = parseDate(availabilityTo);
    if (!from || !to || from > to) {
      return res.status(400).json({ success: false, message: "Valid availability dates (from <= to) are required" });
    }
    const coords = parseCoordinates(latitude, longitude);
    if (coords.error) {
      return res.status(400).json({ success: false, message: coords.error });
    }

    if (category === "CHICKEN") {
      const avg = parseDecimal(avgWeightKg);
      if (avg === null || avg <= 0) {
        return res.status(400).json({ success: false, message: "Chicken requires average weight (avgWeightKg)" });
      }
    }
    let eggVariantsJson: unknown = null;
    let typeVariantsJson: unknown = null;
    if (category === "EGGS") {
      const variants = parseEggVariants(eggVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Eggs requires at least one size with quantity and rate" });
      }
      eggVariantsJson = variants;
    }
    if (category === "FISH" || category === "OTHER") {
      const variants = parseTypeVariants(typeVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Fish/Other requires at least one type with quantity and rate" });
      }
      typeVariantsJson = variants;
    }

    const rateVal = rate != null && rate !== "" ? parseDecimal(rate) : null;
    const resolvedProvince = resolveProvinceForStorage({ province, address });

    const created = await prisma.listForSale.create({
      data: {
        userId,
        companyName,
        category: category as ListForSaleCategory,
        phone: phone.trim(),
        rate: rateVal,
        quantity: qty,
        unit: unit.trim(),
        availabilityFrom: from,
        availabilityTo: to,
        latitude: coords.latitude ?? undefined,
        longitude: coords.longitude ?? undefined,
        avgWeightKg: category === "CHICKEN" && avgWeightKg != null ? (parseDecimal(avgWeightKg) ?? undefined) : undefined,
        eggVariants: eggVariantsJson as any,
        typeVariants: typeVariantsJson as any,
        ...(resolvedProvince !== undefined && {
          province: resolvedProvince,
        }),
        ...(typeof address === "string" && address.trim().length > 0 && {
          address: address.trim(),
        }),
      },
    });
    return res.status(201).json({ success: true, data: normalizeListForSaleProvince(created) });
  } catch (error) {
    console.error("Create list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: UPDATE (EDIT) ====================
export const updateListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const body = req.body;
    const {
      category,
      phone,
      rate,
      quantity,
      unit,
      availabilityFrom,
      availabilityTo,
      latitude,
      longitude,
      avgWeightKg,
      eggVariants,
      typeVariants,
      province,
      address,
    } = body;

    const categoryVal = (category ?? existing.category) as ListForSaleCategory;
    if (category && !isValidCategory(category)) {
      return res.status(400).json({ success: false, message: "Valid category is required" });
    }
    const phoneVal = phone != null ? (typeof phone === "string" ? phone.trim() : "") : existing.phone;
    if (phoneVal.length === 0) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    const qty = quantity != null ? parseDecimal(quantity) : Number(existing.quantity);
    if (qty === null || qty < 0) {
      return res.status(400).json({ success: false, message: "Valid quantity is required" });
    }
    const unitVal = unit != null ? (typeof unit === "string" ? unit.trim() : "") : existing.unit;
    if (unitVal.length === 0) {
      return res.status(400).json({ success: false, message: "Unit is required" });
    }
    const from = availabilityFrom != null ? parseDate(availabilityFrom) : existing.availabilityFrom;
    const to = availabilityTo != null ? parseDate(availabilityTo) : existing.availabilityTo;
    if (!from || !to || from > to) {
      return res.status(400).json({ success: false, message: "Valid availability dates (from <= to) are required" });
    }
    const coords = parseCoordinates(latitude, longitude, existing.latitude, existing.longitude);
    if (coords.error) {
      return res.status(400).json({ success: false, message: coords.error });
    }

    if (categoryVal === "CHICKEN") {
      const avg = avgWeightKg != null ? parseDecimal(avgWeightKg) : Number(existing.avgWeightKg ?? 0);
      if (avg === null || avg <= 0) {
        return res.status(400).json({ success: false, message: "Chicken requires average weight (avgWeightKg)" });
      }
    }
    let eggVariantsJson: unknown = existing.eggVariants;
    let typeVariantsJson: unknown = existing.typeVariants;
    if (categoryVal === "EGGS") {
      const variants = parseEggVariants(eggVariants ?? existing.eggVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Eggs requires at least one size with quantity and rate" });
      }
      eggVariantsJson = variants;
    } else {
      eggVariantsJson = null;
    }
    if (categoryVal === "FISH" || categoryVal === "OTHER") {
      const variants = parseTypeVariants(typeVariants ?? existing.typeVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Fish/Other requires at least one type with quantity and rate" });
      }
      typeVariantsJson = variants;
    } else {
      typeVariantsJson = null;
    }

    const rateVal = rate !== undefined ? (rate == null || rate === "" ? null : parseDecimal(rate)) : (existing.rate != null ? Number(existing.rate) : null);
    const resolvedProvince = resolveProvinceForStorage({ province, address, existingProvince: existing.province });

    const updated = await prisma.listForSale.update({
      where: { id },
      data: {
        category: categoryVal,
        phone: phoneVal,
        rate: rateVal,
        quantity: qty,
        unit: unitVal,
        availabilityFrom: from,
        availabilityTo: to,
        ...(coords.latitude !== undefined && { latitude: coords.latitude }),
        ...(coords.longitude !== undefined && { longitude: coords.longitude }),
        ...(province !== undefined || address !== undefined
          ? {
              province: resolvedProvince,
            }
          : {}),
        ...(address !== undefined && {
          address: typeof address === "string" && address.trim().length > 0 ? address.trim() : null,
        }),
        avgWeightKg: categoryVal === "CHICKEN"
          ? (avgWeightKg != null ? parseDecimal(avgWeightKg) : existing.avgWeightKg != null ? Number(existing.avgWeightKg) : null)
          : null,
        eggVariants: eggVariantsJson as any,
        typeVariants: typeVariantsJson as any,
      },
    });
    return res.json({ success: true, data: normalizeListForSaleProvince(updated) });
  } catch (error) {
    console.error("Update list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: DELETE ====================
export const deleteListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    await prisma.listForSale.delete({ where: { id } });
    return res.json({ success: true, message: "Listing deleted" });
  } catch (error) {
    console.error("Delete list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: ARCHIVE ====================
export const archiveListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const updated = await prisma.listForSale.update({
      where: { id },
      data: { status: ListForSaleStatus.ARCHIVED },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Archive list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: UNARCHIVE ====================
export const unarchiveListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const updated = await prisma.listForSale.update({
      where: { id },
      data: { status: ListForSaleStatus.ACTIVE },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Unarchive list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== HELPERS ====================
function isValidCategory(c: string): boolean {
  return ["CHICKEN", "EGGS", "LAYERS", "FISH", "OTHER"].includes(c);
}

function parseDecimal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseCoordinate(value: any): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseCoordinates(
  latitude: any,
  longitude: any,
  fallbackLatitude?: number | null,
  fallbackLongitude?: number | null
): { latitude?: number | null; longitude?: number | null; error?: string } {
  const hasLatitude = latitude !== undefined;
  const hasLongitude = longitude !== undefined;

  if (!hasLatitude && !hasLongitude) {
    return {};
  }

  if (latitude == null && longitude == null) {
    if (fallbackLatitude !== undefined || fallbackLongitude !== undefined) {
      return { latitude: null, longitude: null };
    }
    return {};
  }

  const parsedLat = parseCoordinate(latitude);
  const parsedLng = parseCoordinate(longitude);

  if ((latitude != null || longitude != null) && (parsedLat == null || parsedLng == null)) {
    return { error: "Valid latitude and longitude are required together" };
  }

  if (parsedLat != null && (parsedLat < -90 || parsedLat > 90)) {
    return { error: "Latitude must be between -90 and 90" };
  }
  if (parsedLng != null && (parsedLng < -180 || parsedLng > 180)) {
    return { error: "Longitude must be between -180 and 180" };
  }

  return {
    latitude: latitude === undefined ? fallbackLatitude ?? undefined : parsedLat ?? undefined,
    longitude: longitude === undefined ? fallbackLongitude ?? undefined : parsedLng ?? undefined,
  };
}

function normalizeProvince(address?: Record<string, string | undefined> | null): string | null {
  if (!address) return null;
  return resolveProvinceCanonical(
    address.state ||
      address.province ||
      address.region ||
      address.county ||
      address.municipality ||
      address.state_district ||
      address.city ||
      address.suburb ||
      null
  );
}

function normalizeProvinceText(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

function resolveProvinceCanonical(value?: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeProvinceText(value);
  for (const province of NEPAL_PROVINCES) {
    const provinceNormalized = normalizeProvinceText(province);
    if (normalized === provinceNormalized || normalized.includes(provinceNormalized)) {
      return province;
    }
    const aliases = PROVINCE_ALIASES[province];
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return province;
    }
  }
  return null;
}

function getProvinceQueryVariants(input: string): string[] {
  const canonical = resolveProvinceCanonical(input);
  if (!canonical) return [];
  return [canonical, ...(PROVINCE_ALIASES[canonical] ?? [])];
}

function deriveProvinceFromText(text?: string | null): string | null {
  if (!text) return null;
  return resolveProvinceCanonical(text);
}

function resolveProvinceForStorage(input: {
  province?: unknown;
  address?: unknown;
  existingProvince?: string | null;
}): string | null | undefined {
  if (input.province !== undefined) {
    if (input.province == null) return null;
    return resolveProvinceCanonical(String(input.province)) ?? null;
  }

  if (input.address !== undefined) {
    const derived = deriveProvinceFromText(typeof input.address === "string" ? input.address : String(input.address ?? ""));
    return derived ?? null;
  }

  if (input.existingProvince !== undefined) {
    return input.existingProvince;
  }

  return undefined;
}

function normalizeListForSaleProvince<T extends { province?: string | null; address?: string | null }>(item: T): T {
  return {
    ...item,
    province: resolveProvinceCanonical(item.province) ?? deriveProvinceFromText(item.address),
  };
}

function parseEggVariants(v: any): Array<{ size: string; quantity: number; rate: number }> | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: Array<{ size: string; quantity: number; rate: number }> = [];
  for (const row of v) {
    const size = row?.size != null ? String(row.size).trim() : "";
    const q = parseDecimal(row?.quantity);
    const r = parseDecimal(row?.rate);
    if (size && q !== null && q >= 0 && r !== null && r >= 0) out.push({ size, quantity: q, rate: r });
  }
  return out.length > 0 ? out : null;
}

function parseTypeVariants(v: any): Array<{ type: string; quantity: number; rate: number }> | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: Array<{ type: string; quantity: number; rate: number }> = [];
  for (const row of v) {
    const type = row?.type != null ? String(row.type).trim() : "";
    const q = parseDecimal(row?.quantity);
    const r = parseDecimal(row?.rate);
    if (type && q !== null && q >= 0 && r !== null && r >= 0) out.push({ type, quantity: q, rate: r });
  }
  return out.length > 0 ? out : null;
}
