import { NextFunction, Request, Response } from "express";
import {
  ACCOUNT_FEATURE_DEFINITIONS,
  isAccountFeatureEnabled,
  type AccountFeatureKey,
} from "../services/accountFeatureService";

export const requireAccountFeature = (featureKey: AccountFeatureKey) =>
  async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
      const enabled = await isAccountFeatureEnabled(req.userId, featureKey);
      if (!enabled) {
        return res.status(403).json({
          code: "ACCOUNT_FEATURE_DISABLED",
          featureKey,
          message: `${ACCOUNT_FEATURE_DEFINITIONS[featureKey].name} is not enabled for this account`,
        });
      }
      return next();
    } catch (error) {
      console.error("requireAccountFeature:", error);
      return res.status(500).json({ message: "Could not verify feature access" });
    }
  };
