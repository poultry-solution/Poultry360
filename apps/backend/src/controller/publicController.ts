import { Request, Response } from "express";
import prisma from "../utils/prisma";

// ==================== LANDING REVIEWS (PUBLIC, NO AUTH) ====================

/** GET /public/reviews - List reviews for landing page (phone not included) */
export const getLandingReviews = async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const reviews = await prisma.landingReview.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        business: true,
        address: true,
        stars: true,
        review: true,
        createdAt: true,
      },
    });
    return res.json({ success: true, data: reviews });
  } catch (error) {
    console.error("Get landing reviews error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** POST /public/reviews - Submit a review (no auth) */
export const createLandingReview = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, business, address, phoneNumber, stars, review } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!business || typeof business !== "string" || business.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Business is required" });
    }
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Address is required" });
    }
    if (!phoneNumber || typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    const starsNum = Number(stars);
    if (!Number.isInteger(starsNum) || starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ success: false, message: "Stars must be 1 to 5" });
    }
    if (!review || typeof review !== "string" || review.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Review text is required" });
    }

    const created = await prisma.landingReview.create({
      data: {
        name: name.trim(),
        business: business.trim(),
        address: address.trim(),
        phoneNumber: phoneNumber.trim(),
        stars: starsNum,
        review: review.trim(),
      },
      select: {
        id: true,
        name: true,
        business: true,
        address: true,
        stars: true,
        review: true,
        createdAt: true,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("Create landing review error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== LANDING CONTACT SUBMISSIONS (PUBLIC, NO AUTH) ====================

/** GET /public/contacts - List all contact form submissions */
export const getLandingContacts = async (req: Request, res: Response): Promise<any> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const contacts = await prisma.landingContact.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return res.json({ success: true, data: contacts });
  } catch (error) {
    console.error("Get landing contacts error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/** POST /public/contacts - Submit contact form (no auth) */
export const createLandingContact = async (req: Request, res: Response): Promise<any> => {
  try {
    const { firstName, lastName, email, phone, farmType, message } = req.body;

    if (!firstName || typeof firstName !== "string" || firstName.trim().length === 0) {
      return res.status(400).json({ success: false, message: "First name is required" });
    }
    if (!lastName || typeof lastName !== "string" || lastName.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Last name is required" });
    }
    if (!email || typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const created = await prisma.landingContact.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone != null && typeof phone === "string" ? phone.trim() || null : null,
        farmType: farmType != null && typeof farmType === "string" ? farmType.trim() || null : null,
        message: message.trim(),
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("Create landing contact error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
