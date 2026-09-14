import { Request, Response } from "express";
import { HatcheryProductionService, ProductionRequestError } from "../services/hatcheryProductionService";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof ProductionRequestError) return res.status(error.status).json({ message: error.message });
  console.error("hatchery production:", error);
  return res.status(500).json({ message: "Internal server error" });
};

export const createHatcheryProduction = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await HatcheryProductionService.create({ hatcheryOwnerId: req.userId!, ...req.body });
    return res.status(201).json({ success: true, data, message: "Production recorded successfully" });
  } catch (error) { return handleError(res, error); }
};

export const listHatcheryProduction = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { runs, total } = await HatcheryProductionService.list(req.userId!, {
      page, limit, search: String(req.query.search ?? "").trim() || undefined,
    });
    return res.json({ success: true, data: runs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { return handleError(res, error); }
};

export const getHatcheryProduction = async (req: Request, res: Response): Promise<any> => {
  try {
    return res.json({ success: true, data: await HatcheryProductionService.getById(req.userId!, req.params.id) });
  } catch (error) { return handleError(res, error); }
};

export const deleteHatcheryProduction = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await HatcheryProductionService.remove(req.userId!, req.params.id);
    return res.json({ success: true, data, message: "Production reversed successfully" });
  } catch (error) { return handleError(res, error); }
};
