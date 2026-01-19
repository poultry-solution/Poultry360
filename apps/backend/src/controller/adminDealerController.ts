import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

// ==================== GET ALL DEALERS ====================
export const getAllDealers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause - only get dealers with owners (ownerId is not null)
    const where: any = {
      ownerId: { not: null },
      owner: {
        role: UserRole.DEALER,
      },
    };

    // Filter by owner status
    if (status) {
      where.owner = {
        ...where.owner,
        status: status as UserStatus,
      };
    }

    // Search by dealer name, owner name, owner phone, or contact
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { contact: { contains: search as string, mode: "insensitive" } },
            {
              owner: {
                name: { contains: search as string, mode: "insensitive" },
              },
            },
            {
              owner: {
                phone: { contains: search as string, mode: "insensitive" },
              },
            },
          ],
        },
      ];
    }

    const [dealers, total] = await Promise.all([
      prisma.dealer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
          companies: {
            select: {
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              products: true,
              sales: true,
              consignmentsFrom: true,
              consignmentsTo: true,
              ledgerEntries: true,
              paymentRequests: true,
            },
          },
        },
      }),
      prisma.dealer.count({ where }),
    ]);
    

    return res.json({
      success: true,
      data: dealers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all dealers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER BY ID ====================
export const getDealerById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: {
            products: true,
            sales: true,
            consignmentsFrom: true,
            consignmentsTo: true,
            ledgerEntries: true,
            paymentRequests: true,
            companySales: true,
          },
        },
        managers: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Only return dealers with owners for admin management
    if (!dealer.ownerId) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get companies linked to this dealer via DealerCompany
    const dealerCompanies = await (prisma as any).dealerCompany.findMany({
      where: { dealerId: dealer.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    // Add companies array to dealer response
    const dealerWithCompanies = {
      ...dealer,
      companies: dealerCompanies.map((dc: any) => dc.company),
    };

    return res.json({
      success: true,
      data: dealerWithCompanies,
    });
  } catch (error) {
    console.error("Get dealer by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE DEALER ====================
export const createDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      ownerName,
      ownerPhone,
      ownerPassword,
      dealerName,
      dealerContact,
      dealerAddress,
      companyId,
      ownerStatus,
    } = req.body;

    // Validation
    if (
      !ownerName ||
      !ownerPhone ||
      !ownerPassword ||
      !dealerName ||
      !dealerContact
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Owner name, phone, password, dealer name, and contact are required",
      });
    }

    if (ownerPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: ownerPhone },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // Validate company exists if companyId is provided
    if (companyId) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        return res.status(400).json({
          success: false,
          message: "Company not found",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create user and dealer in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: ownerName,
          phone: ownerPhone,
          password: hashedPassword,
          role: UserRole.DEALER,
          status: (ownerStatus as UserStatus) || UserStatus.ACTIVE,
          language: "ENGLISH",
          calendarType: "AD",
        },
      });

      // Create dealer
      const dealer = await tx.dealer.create({
        data: {
          name: dealerName,
          contact: dealerContact,
          address: dealerAddress || null,
          ownerId: user.id,
          // Don't set companyId - use DealerCompany relationship instead
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      // Create DealerCompany link if companyId provided
      if (companyId) {
        await (tx as any).dealerCompany.create({
          data: {
            dealerId: dealer.id,
            companyId: companyId,
            connectedVia: "MANUAL",
            connectedAt: new Date(),
          },
        });
      }

      return dealer;
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: "Dealer created successfully",
    });
  } catch (error: any) {
    console.error("Create dealer error:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A record with this information already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== UPDATE DEALER ====================
export const updateDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      ownerName,
      ownerPhone,
      ownerPassword,
      dealerName,
      dealerContact,
      dealerAddress,
      companyId,
      ownerStatus,
    } = req.body;

    // Check if dealer exists and has owner
    const existingDealer = await prisma.dealer.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!existingDealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    if (!existingDealer.ownerId) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // Check phone uniqueness if phone is being updated
    if (
      ownerPhone &&
      existingDealer.owner &&
      ownerPhone !== existingDealer.owner.phone
    ) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: ownerPhone },
      });

      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: "Phone number already registered",
        });
      }
    }

    // Validate company exists if companyId is provided
    if (companyId !== undefined && companyId !== null) {
      if (companyId) {
        const company = await prisma.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          return res.status(400).json({
            success: false,
            message: "Company not found",
          });
        }
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (ownerPassword) {
      if (ownerPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }
      hashedPassword = await bcrypt.hash(ownerPassword, 10);
    }

    // Update dealer and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const userUpdateData: any = {};
      if (ownerName) userUpdateData.name = ownerName;
      if (ownerPhone) userUpdateData.phone = ownerPhone;
      if (hashedPassword) userUpdateData.password = hashedPassword;
      if (ownerStatus) userUpdateData.status = ownerStatus as UserStatus;

      if (Object.keys(userUpdateData).length > 0 && existingDealer.ownerId) {
        await tx.user.update({
          where: { id: existingDealer.ownerId ?? undefined },
          data: userUpdateData,
        });
      }

      // Update dealer
      const dealerUpdateData: any = {};
      if (dealerName) dealerUpdateData.name = dealerName;
      if (dealerContact) dealerUpdateData.contact = dealerContact;
      if (dealerAddress !== undefined)
        dealerUpdateData.address = dealerAddress || null;
      // Don't update companyId - use DealerCompany relationship instead

      if (Object.keys(dealerUpdateData).length > 0) {
        await tx.dealer.update({
          where: { id },
          data: dealerUpdateData,
        });
      }

      // Handle company link via DealerCompany relationship
      if (companyId !== undefined) {
        if (companyId) {
          // Create or update DealerCompany link
          const existingLink = await (tx as any).dealerCompany.findUnique({
            where: {
              dealerId_companyId: {
                dealerId: id,
                companyId: companyId,
              },
            },
          });

          if (!existingLink) {
            await (tx as any).dealerCompany.create({
              data: {
                dealerId: id,
                companyId: companyId,
                connectedVia: "MANUAL",
                connectedAt: new Date(),
              },
            });
          }
        }
        // If companyId is null, we leave existing links intact (admin can manually manage)
      }

      // Fetch updated dealer with owner
      const updatedDealer = await tx.dealer.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
      });

      return updatedDealer;
    });

    return res.json({
      success: true,
      data: result,
      message: "Dealer updated successfully",
    });
  } catch (error: any) {
    console.error("Update dealer error:", error);

    // Handle Prisma unique constraint errors
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "A record with this information already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== DELETE DEALER ====================
export const deleteDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if dealer exists and has owner
    const dealer = await prisma.dealer.findUnique({
      where: { id },
      include: {
        owner: true,
        _count: {
          select: {
            products: true,
            sales: true,
            consignmentsFrom: true,
            consignmentsTo: true,
            ledgerEntries: true,
            paymentRequests: true,
            companySales: true,
          },
        },
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    if (!dealer.ownerId) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // Check for active consignments
    const hasActiveConsignments = await prisma.consignmentRequest.count({
      where: {
        OR: [{ fromDealerId: id }, { toDealerId: id }],
        status: {
          notIn: ["SETTLED", "CANCELLED", "REJECTED"],
        },
      },
    });

    if (
      dealer._count.products > 0 ||
      dealer._count.sales > 0 ||
      hasActiveConsignments > 0 ||
      dealer._count.paymentRequests > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete dealer with associated products, sales, active consignments, or payment requests. Please remove all related data first.",
      });
    }

    // Delete dealer and user in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete dealer (this will cascade delete related data due to onDelete: Cascade)
      await tx.dealer.delete({
        where: { id },
      });

      // Delete user
      if (dealer.ownerId) {
        await tx.user.delete({
          where: { id: dealer.ownerId ?? undefined },
        });
      }
    });

    return res.json({
      success: true,
      message: "Dealer deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete dealer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
