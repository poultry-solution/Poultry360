import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * Admin follow-up for landing page leads (Book a demo + Contact form).
 * Each lead is "new" until a super admin marks it contacted
 * (contactedAt + contactedById); it can be moved back to "new".
 */

export type EnquiryStatus = "new" | "contacted" | "all";

export function parseEnquiryStatus(value: unknown): EnquiryStatus {
  return value === "contacted" || value === "all" ? value : "new";
}

function statusWhere(status: EnquiryStatus) {
  if (status === "new") return { contactedAt: null };
  if (status === "contacted") return { contactedAt: { not: null } };
  return {};
}

function parseLimit(value: unknown, max = 200): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : max;
}

/** The few delegate calls these handlers use; DemoEnquiry and LandingContact both fit. */
type EnquiryDelegate = {
  findMany(args: any): Promise<any[]>;
  findUnique(args: any): Promise<any | null>;
  count(args: any): Promise<number>;
  update(args: any): Promise<any>;
};

function makeEnquiryHandlers(
  delegate: () => EnquiryDelegate,
  select: Record<string, true>,
  label: string,
) {
  const list = async (req: Request, res: Response): Promise<any> => {
    try {
      const status = parseEnquiryStatus(req.query.status);
      const take = parseLimit(req.query.limit);
      const [data, newCount, contactedCount] = await Promise.all([
        delegate().findMany({
          where: statusWhere(status),
          // Contacted list shows the latest follow-ups first.
          orderBy: status === "contacted" ? { contactedAt: "desc" } : { createdAt: "desc" },
          take,
          select: { ...select, contactedAt: true, createdAt: true },
        }),
        delegate().count({ where: statusWhere("new") }),
        delegate().count({ where: statusWhere("contacted") }),
      ]);
      return res.json({ success: true, data, counts: { new: newCount, contacted: contactedCount } });
    } catch (error) {
      console.error(`list ${label} error:`, error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  const setContacted = (contacted: boolean) => async (req: Request, res: Response): Promise<any> => {
    try {
      const { id } = req.params;
      const existing = await delegate().findUnique({ where: { id }, select: { id: true } });
      if (!existing) return res.status(404).json({ success: false, message: `${label} not found` });

      const updated = await delegate().update({
        where: { id },
        data: contacted
          ? { contactedAt: new Date(), contactedById: req.userId ?? null }
          : { contactedAt: null, contactedById: null },
        select: { id: true, contactedAt: true },
      });
      return res.json({
        success: true,
        data: updated,
        message: contacted ? "Marked as contacted" : "Moved to new",
      });
    } catch (error) {
      console.error(`update ${label} error:`, error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };

  return { list, markContacted: setContacted(true), markNew: setContacted(false) };
}

export const demoEnquiryAdmin = makeEnquiryHandlers(
  () => prisma.demoEnquiry,
  { id: true, companyName: true, phoneNumber: true, businessTypes: true, message: true },
  "Demo enquiry",
);

export const landingContactAdmin = makeEnquiryHandlers(
  () => prisma.landingContact,
  { id: true, firstName: true, lastName: true, email: true, phone: true, farmType: true, message: true },
  "Contact message",
);
