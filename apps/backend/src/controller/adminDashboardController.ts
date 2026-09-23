import { Request, Response } from "express";
import { getAdminDashboardOverview } from "../services/adminDashboardService";

// GET /api/admin/dashboard/overview
export async function getAdminOverview(
  _req: Request,
  res: Response
): Promise<any> {
  try {
    const overview = await getAdminDashboardOverview();
    return res.json({ success: true, data: overview });
  } catch (error) {
    console.error("Error fetching admin dashboard overview:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard overview",
    });
  }
}
