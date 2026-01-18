import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";

// ==================== PUBLIC COMPANY SEARCH ====================
// This endpoint allows unauthenticated users to search for companies
// Used during dealer signup to link dealer with a company
export const searchCompanies = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { search, limit = 20 } = req.query;

    // Require at least 2 characters for search (privacy/security)
    if (!search || (search as string).length < 2) {
      return res.json({
        success: true,
        data: [],
        message: "Please enter at least 2 characters to search",
      });
    }

    // Search for active companies only
    const companies = await prisma.company.findMany({
      where: {
        owner: {
          role: UserRole.COMPANY,
          status: UserStatus.ACTIVE, // Only show active companies
        },
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { address: { contains: search as string, mode: "insensitive" } },
        ],
      },
      take: Math.min(Number(limit), 50), // Max 50 results
      select: {
        id: true,
        name: true,
        address: true,
        owner: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.json({
      success: true,
      data: companies,
    });
  } catch (error) {
    console.error("Public company search error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};
