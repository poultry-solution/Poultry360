import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";

// ==================== GET ALL USERS ====================
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, status, role } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause - exclude SUPER_ADMIN users
    const where: any = {
      role: { not: UserRole.SUPER_ADMIN },
    };

    // Filter by role
    if (role) {
      where.role = role as UserRole;
    }

    // Filter by status
    if (status) {
      where.status = status as UserStatus;
    }

    // Search by name or phone
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { phone: { contains: search as string, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          companyName: true,
          CompanyFarmLocation: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          _count: {
            select: {
              ownedFarms: true,
              managedFarms: true,
              dealerConnections: true,
              doctorConversations: true,
            },
          },
          // For DEALER users: their dealer entity
          dealer: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  companies: true,
                  farmerConnections: true,
                },
              },
              companies: {
                select: {
                  company: { select: { id: true, name: true } },
                },
                take: 5,
              },
              farmerConnections: {
                select: {
                  farmer: { select: { id: true, name: true } },
                },
                take: 5,
              },
            },
          },
          // For COMPANY users: their company entity
          company: {
            select: {
              id: true,
              name: true,
              _count: {
                select: {
                  dealerCompanies: true,
                },
              },
              dealerCompanies: {
                select: {
                  dealer: { select: { id: true, name: true } },
                },
                take: 5,
              },
            },
          },
          // For OWNER/MANAGER: connected dealers (preview)
          dealerConnections: {
            select: {
              dealer: {
                select: { id: true, name: true },
              },
            },
            take: 3,
          },
          // Owned farms (preview)
          ownedFarms: {
            select: { id: true, name: true },
            take: 5,
          },
          // Managed farms (preview)
          managedFarms: {
            select: { id: true, name: true },
            take: 5,
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

// ==================== GET USER BY ID ====================
export const getUserById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        companyName: true,
        CompanyFarmLocation: true,
        isOnline: true,
        lastSeen: true,
        language: true,
        calendarType: true,
        createdAt: true,
        updatedAt: true,
        // Farms
        ownedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
            _count: { select: { batches: true } },
          },
        },
        managedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
            _count: { select: { batches: true } },
          },
        },
        // Dealer connections (for farmers)
        dealerConnections: {
          select: {
            connectedAt: true,
            connectedVia: true,
            dealer: {
              select: {
                id: true,
                name: true,
                contact: true,
                address: true,
              },
            },
          },
        },
        // Dealer entity (for dealer users)
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
            balance: true,
            totalPurchases: true,
            totalPayments: true,
            companies: {
              select: {
                connectedAt: true,
                connectedVia: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
            farmerConnections: {
              select: {
                connectedAt: true,
                connectedVia: true,
                farmer: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    CompanyFarmLocation: true,
                  },
                },
              },
            },
          },
        },
        // Company entity (for company users)
        company: {
          select: {
            id: true,
            name: true,
            address: true,
            dealerCompanies: {
              select: {
                connectedAt: true,
                connectedVia: true,
                dealer: {
                  select: {
                    id: true,
                    name: true,
                    contact: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
        // Doctor conversations
        doctorConversations: {
          select: {
            id: true,
            subject: true,
            status: true,
            createdAt: true,
            farmer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};
