import { Request, Response } from "express";
import { saveSubscription, removeSubscription } from "../services/pushService";

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { subscription, userAgent } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      res.status(400).json({ success: false, message: "Invalid push subscription" });
      return;
    }
    await saveSubscription(userId, subscription, userAgent);
    res.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ success: false, message: "Endpoint is required" });
      return;
    }
    await removeSubscription(userId, endpoint);
    res.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
