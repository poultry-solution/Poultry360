import { Request, Response } from "express";
import { AnalyticsRangeError, parseAnalyticsRange, withAllTimeStart } from "../services/farmerAnalytics/period";
import { AnalyticsScopeError, buildAnalyticsScope, findFirstDate, type AnalyticsScope } from "../services/farmerAnalytics/scope";
import type { AnalyticsRange } from "../services/farmerAnalytics/period";
import {
  REPORT_TYPES,
  getBatches,
  getEggs,
  getHealthFeed,
  getMoney,
  getOverview,
  getReport,
  type ReportType,
} from "../services/farmerAnalytics/farmerAnalyticsService";

/**
 * Farmer analytics endpoints. Query: farmId, batchType (BROILER|LAYERS), batchId,
 * startDate/endDate ("YYYY-MM-DD", Nepal days; none = all time), optional groupBy (auto by default).
 */
function handler(
  label: string,
  run: (req: Request, userId: string, scope: AnalyticsScope, range: AnalyticsRange) => Promise<unknown>
) {
  return async (req: Request, res: Response): Promise<any> => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      let range = parseAnalyticsRange(req.query as Record<string, unknown>);
      const scope = await buildAnalyticsScope(userId, req.query as Record<string, unknown>, range);
      if (range.allTime) {
        scope.firstDate = await findFirstDate(scope);
        range = withAllTimeStart(range, scope.firstDate);
      }
      const data = await run(req, userId, scope, range);
      return res.json({ success: true, data });
    } catch (error) {
      if (error instanceof AnalyticsRangeError) return res.status(400).json({ success: false, message: error.message });
      if (error instanceof AnalyticsScopeError) return res.status(error.status).json({ success: false, message: error.message });
      console.error(`Farmer analytics ${label} error:`, error);
      return res.status(500).json({ success: false, message: "Could not load analytics" });
    }
  };
}

export const getFarmerAnalyticsOverview = handler("overview", (_req, userId, scope, range) =>
  getOverview(userId, scope, range)
);
export const getFarmerFinanceAnalytics = handler("money", (_req, _userId, scope, range) => getMoney(scope, range));
export const getFarmerFlockComparisonAnalytics = handler("batches", (_req, _userId, scope, range) =>
  getBatches(scope, range)
);
export const getFarmerOperationsAnalytics = handler("health-feed", (_req, _userId, scope, range) =>
  getHealthFeed(scope, range)
);
export const getFarmerProductionAnalytics = handler("eggs", (_req, _userId, scope, range) => getEggs(scope, range));
export const getFarmerReportAnalytics = handler("report", (req, _userId, scope, range) => {
  const raw = String(req.query.reportType ?? "money");
  const type = (REPORT_TYPES as string[]).includes(raw) ? (raw as ReportType) : "money";
  return getReport(type, scope, range);
});
