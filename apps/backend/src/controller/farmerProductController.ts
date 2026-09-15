import { Request, Response } from "express";
import {
  FarmerProductRequestError,
  FarmerProductService,
} from "../services/farmerProductService";

const pageNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const handleError = (res: Response, error: unknown) => {
  if (error instanceof FarmerProductRequestError) {
    return res.status(error.status).json({ message: error.message });
  }
  if ((error as { code?: string })?.code === "P2002") {
    return res.status(409).json({
      message: "A Self Feed product with this name, unit, and category already exists",
    });
  }
  console.error("farmer product:", error);
  return res.status(500).json({ message: "Internal server error" });
};

export const listFarmerProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = pageNumber(req.query.page, 1);
    const limit = Math.min(pageNumber(req.query.limit, 25), 100);
    const { products, total } = await FarmerProductService.list(req.userId!, {
      page,
      limit,
      search: String(req.query.search ?? "").trim() || undefined,
      includeArchived: req.query.includeArchived === "true",
    });
    return res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createFarmerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const product = await FarmerProductService.create(req.userId!, req.body);
    return res.status(201).json({
      success: true,
      data: { ...product, currentStock: 0, lotCount: 0 },
      message: "Self Feed product saved",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateFarmerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const product = await FarmerProductService.update(
      req.userId!,
      req.params.id,
      req.body
    );
    return res.json({ success: true, data: product });
  } catch (error) {
    return handleError(res, error);
  }
};

export const archiveFarmerProduct = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const data = await FarmerProductService.archive(req.userId!, req.params.id);
    return res.json({ success: true, data, message: "Self Feed product archived" });
  } catch (error) {
    return handleError(res, error);
  }
};
