import { Request, Response } from "express";
import {
  FarmerProductionRequestError,
  FarmerProductionService,
} from "../services/farmerProductionService";
import { ProductionValidationError } from "../services/productionDomain";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof FarmerProductionRequestError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof ProductionValidationError) {
    return res.status(400).json({ message: error.message });
  }
  console.error("farmer production:", error);
  return res.status(500).json({ message: "Internal server error" });
};

export const createFarmerProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const data = await FarmerProductionService.create({
      ...req.body,
      farmerId: req.userId!,
      createdById: req.userId!,
    });
    return res.status(201).json({
      success: true,
      data,
      message: "Production recorded successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listFarmerProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { runs, total } = await FarmerProductionService.list(req.userId!, {
      page,
      limit,
      search: String(req.query.search ?? "").trim() || undefined,
    });
    return res.json({
      success: true,
      data: runs,
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

export const getFarmerProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const data = await FarmerProductionService.getById(
      req.userId!,
      req.params.id
    );
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteFarmerProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const data = await FarmerProductionService.remove(req.userId!, req.params.id);
    return res.json({
      success: true,
      data,
      message: "Production reversed successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};
