import { Request, Response } from "express";
import { StaffPermission } from "@prisma/client";
import {
  FarmError,
  createFarm as createFarmRecord,
  deleteFarm as deleteFarmRecord,
  findAccessibleFarm,
  getFarmSummary as loadFarmSummary,
  listFarmOptions,
  listFarms,
  updateFarm as updateFarmRecord,
} from "../services/farmService";
import { AnalyticsScopeError } from "../services/farmerAnalytics/scope";

/** Farmer farms. Every farm call checks the farm belongs to this account (staff act as the owner). */
function handle(label: string, run: (req: Request, res: Response, userId: string) => Promise<unknown>) {
  return async (req: Request, res: Response): Promise<any> => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      return await run(req, res, userId);
    } catch (error) {
      if (error instanceof FarmError) return res.status(error.status).json({ success: false, message: error.message });
      if (error instanceof AnalyticsScopeError) return res.status(404).json({ success: false, message: "Farm not found" });
      console.error(`${label} error:`, error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
}

const canSeeMoney = (req: Request) =>
  req.actorType !== "STAFF" || !!req.staffPermissions?.includes(StaffPermission.FARMER_VIEW_FINANCIAL_SUMMARIES);

// GET /farms/my-farms — with page/limit: farms list with birds alive and batch counts; without: picker list.
export const getUserFarms = handle("Get user farms", async (req, res, userId) => {
  const { page: pageParam, limit: limitParam } = req.query;
  if (pageParam === undefined && limitParam === undefined) {
    return res.json({ success: true, data: await listFarmOptions(userId) });
  }
  const page = Math.max(1, Math.floor(Number(pageParam) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(limitParam) || 10)));
  const result = await listFarms(userId, page, limit);
  return res.json({ success: true, ...result });
});

// GET /farms/:id — basic farm details.
export const getFarmById = handle("Get farm", async (req, res, userId) => {
  const farm = await findAccessibleFarm(req.params.id, userId);
  const { ownerId: _ownerId, ...data } = farm;
  return res.json({ success: true, data });
});

// GET /farms/:id/summary — farm page: tiles and all batches (whole life), same numbers as Analytics.
export const getFarmSummary = handle("Get farm summary", async (req, res, userId) => {
  const data = await loadFarmSummary(userId, req.params.id, canSeeMoney(req));
  return res.json({ success: true, data });
});

export const createFarm = handle("Create farm", async (req, res, userId) => {
  const data = await createFarmRecord(userId, req.body);
  return res.status(201).json({ success: true, data, message: "Farm created successfully" });
});

export const updateFarm = handle("Update farm", async (req, res, userId) => {
  const data = await updateFarmRecord(userId, req.params.id, req.body);
  return res.json({ success: true, data, message: "Farm updated successfully" });
});

// DELETE /farms/:id — body { password }. Only an empty farm can be deleted.
export const deleteFarm = handle("Delete farm", async (req, res, userId) => {
  await deleteFarmRecord(
    { userId, staffUserId: req.actorType === "STAFF" ? req.staffUserId : null },
    req.params.id,
    req.body?.password
  );
  return res.json({ success: true, message: "Farm deleted successfully" });
});
