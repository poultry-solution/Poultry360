import { Request, Response } from "express";
import {
  HatcheryShareError,
  createShareLink,
  getPublicBatchReport,
  getPublicIncubationReport,
  listActiveShareLinks,
  revokeShareLink,
} from "../services/hatcheryBatchShareService";

const handleError = (res: Response, error: unknown, fallback: string) => {
  if (error instanceof HatcheryShareError) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
};

// ==================== Owner side (login) ====================

export const getHatcheryBatchShareLinks = async (req: Request, res: Response) => {
  try {
    const data = await listActiveShareLinks(req.params.id, req.userId!);
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Could not load share links");
  }
};

export const createHatcheryBatchShareLink = async (req: Request, res: Response) => {
  try {
    const data = await createShareLink({
      batchId: req.params.id,
      userId: req.userId!,
      staffUserId: req.actorType === "STAFF" ? req.staffUserId : null,
      expiresInDays: req.body?.expiresInDays,
      showNotes: req.body?.showNotes,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Could not create share link");
  }
};

export const deleteHatcheryBatchShareLink = async (req: Request, res: Response) => {
  try {
    await revokeShareLink(req.params.id, req.params.linkId, req.userId!);
    return res.json({ success: true });
  } catch (error) {
    return handleError(res, error, "Could not turn off share link");
  }
};

// ==================== Public (no login) ====================

const VIEW_WINDOW_MS = 60 * 1000;
const MAX_VIEWS_PER_IP = 60;
const viewCounts = new Map<string, { count: number; resetAt: number }>();

/** Simple per-IP limit (batch and incubation pages together) so a link can't hammer the server. */
function takeViewSlot(req: Request): number | null {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = viewCounts.get(key);
  if (!current || current.resetAt <= now) {
    if (viewCounts.size > 10_000) {
      for (const [ip, entry] of viewCounts) if (entry.resetAt <= now) viewCounts.delete(ip);
    }
    viewCounts.set(key, { count: 1, resetAt: now + VIEW_WINDOW_MS });
    return null;
  }
  if (current.count >= MAX_VIEWS_PER_IP) return Math.ceil((current.resetAt - now) / 1000);
  current.count += 1;
  return null;
}

async function publicReply(req: Request, res: Response, load: () => Promise<unknown | null>) {
  const retryAfterSeconds = takeViewSlot(req);
  if (retryAfterSeconds) {
    res.setHeader("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({ success: false, message: "Too many requests. Try again soon." });
  }
  try {
    const data = await load();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (!data) return res.status(404).json({ success: false, message: "This link has ended" });
    return res.json({ success: true, data });
  } catch (error) {
    return handleError(res, error, "Could not load this report");
  }
}

export const getPublicHatcheryBatchShare = (req: Request, res: Response) =>
  publicReply(req, res, () => getPublicBatchReport(String(req.params.token || "")));

export const getPublicHatcheryIncubationShare = (req: Request, res: Response) =>
  publicReply(req, res, () =>
    getPublicIncubationReport(String(req.params.token || ""), String(req.params.incubationId || "")),
  );
