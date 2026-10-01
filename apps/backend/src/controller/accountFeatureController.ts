import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  getAccountFeatureDefinition,
  getResolvedAccountFeatures,
  setAccountFeature,
  type AccountFeatureKey,
} from "../services/accountFeatureService";
import { writeBusinessAudit } from "../services/businessAuditService";

export const getCurrentAccountFeatures = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const accountId = req.userId!;
    const account = await prisma.user.findUnique({
      where: { id: accountId },
      select: { role: true },
    });
    if (!account) return res.status(404).json({ message: "Account not found" });

    const features = await getResolvedAccountFeatures(accountId, account.role);
    return res.json({ success: true, data: features });
  } catch (error) {
    console.error("getCurrentAccountFeatures:", error);
    return res.status(500).json({ message: "Failed to load account features" });
  }
};

export const updateAdminAccountFeature = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id: accountId, featureKey } = req.params;
    const { enabled } = req.body;
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be a boolean" });
    }

    const definition = getAccountFeatureDefinition(featureKey);
    if (!definition) {
      return res.status(400).json({ message: "Unknown account feature" });
    }
    if (definition.adminConfigurable === false) {
      return res.status(403).json({
        message: "This feature is controlled by the account owner",
      });
    }

    const account = await prisma.user.findUnique({
      where: { id: accountId },
      select: { id: true, role: true },
    });
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (!definition.applicableRoles.includes(account.role)) {
      return res.status(400).json({
        message: "This feature is not available for the selected account type",
      });
    }

    const feature = await setAccountFeature({
      accountId,
      featureKey: featureKey as AccountFeatureKey,
      enabled,
      updatedById: req.userId!,
    });
    await writeBusinessAudit(req, {
      action: "admin.account_feature.changed",
      targetType: "AccountFeature",
      targetId: featureKey,
      description: `${feature.name} turned ${enabled ? "on" : "off"}`,
      businessType: "ADMIN",
      metadata: { accountId, featureKey, enabled },
    });
    return res.json({
      success: true,
      data: feature,
      message: `${feature.name} turned ${enabled ? "on" : "off"}`,
    });
  } catch (error) {
    console.error("updateAdminAccountFeature:", error);
    return res.status(500).json({ message: "Failed to update account feature" });
  }
};

export const updateCurrentAccountFeature = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const accountId = req.userId!;
    const { featureKey } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled must be a boolean" });
    }

    const definition = getAccountFeatureDefinition(featureKey);
    if (!definition || definition.selfConfigurable !== true) {
      return res.status(403).json({ message: "This setting cannot be changed here" });
    }

    const account = await prisma.user.findUnique({
      where: { id: accountId },
      select: { role: true },
    });
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (!definition.applicableRoles.includes(account.role)) {
      return res.status(403).json({
        message: "This setting is not available for this account",
      });
    }

    const feature = await setAccountFeature({
      accountId,
      featureKey: featureKey as AccountFeatureKey,
      enabled,
      updatedById: accountId,
    });

    return res.json({
      success: true,
      data: feature,
      message: `${feature.name} turned ${enabled ? "on" : "off"}`,
    });
  } catch (error) {
    console.error("updateCurrentAccountFeature:", error);
    return res.status(500).json({ message: "Failed to update account setting" });
  }
};
