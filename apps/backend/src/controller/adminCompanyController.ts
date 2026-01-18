import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

// ==================== GET ALL COMPANIES ====================
export const getAllCompanies = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      owner: {
        role: UserRole.COMPANY,
      },
    };

    // Filter by owner status
    if (status) {
      where.owner = {
        ...where.owner,
        status: status as UserStatus,
      };
    }

    // Search by company name, owner name, or owner phone
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search as string, mode: "insensitive" } },
            { owner: { name: { contains: search as string, mode: "insensitive" } } },
            { owner: { phone: { contains: search as string, mode: "insensitive" } } },
          ],
        },
      ];
    }

  const [companies, total] = await Promise.all([
  prisma.company.findMany({
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
      _count: {
        select: {
          dealerCompanies: true,
          companySales: true,
          consignments: true,
          ledgerEntries: true,
        },
      },
    },
  }),
  prisma.company.count({ where }),
]);



    return res.json({
      success: true,
      data: companies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all companies error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY BY ID ====================
export const getCompanyById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({
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
            companySales: true,
            consignments: true,
            ledgerEntries: true,
            paymentRequests: true,
          },
        },
        managedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    return res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    console.error("Get company by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE COMPANY ====================
export const createCompany = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      ownerName,
      ownerPhone,
      ownerPassword,
      companyName,
      companyAddress,
      ownerStatus,
    } = req.body;

    // Validation
    if (!ownerName || !ownerPhone || !ownerPassword || !companyName) {
      return res.status(400).json({
        success: false,
        message: "Owner name, phone, password, and company name are required",
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

    // Hash password
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    // Create user and company in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: ownerName,
          phone: ownerPhone,
          password: hashedPassword,
          role: UserRole.COMPANY,
          status: (ownerStatus as UserStatus) || UserStatus.ACTIVE,
          language: "ENGLISH",
          calendarType: "AD",
        },
      });

      // Create company
      const company = await tx.company.create({
        data: {
          name: companyName,
          address: companyAddress || null,
          ownerId: user.id,
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

      return company;
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: "Company created successfully",
    });
  } catch (error: any) {
    console.error("Create company error:", error);

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

// ==================== UPDATE COMPANY ====================
export const updateCompany = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const {
      ownerName,
      ownerPhone,
      ownerPassword,
      companyName,
      companyAddress,
      ownerStatus,
    } = req.body;

    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: { id },
      include: { owner: true },
    });

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check phone uniqueness if phone is being updated
    if (ownerPhone && ownerPhone !== existingCompany.owner.phone) {
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

    // Update company and owner in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user
      const userUpdateData: any = {};
      if (ownerName) userUpdateData.name = ownerName;
      if (ownerPhone) userUpdateData.phone = ownerPhone;
      if (hashedPassword) userUpdateData.password = hashedPassword;
      if (ownerStatus) userUpdateData.status = ownerStatus as UserStatus;

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: existingCompany.ownerId },
          data: userUpdateData,
        });
      }

      // Update company
      const companyUpdateData: any = {};
      if (companyName) companyUpdateData.name = companyName;
      if (companyAddress !== undefined) companyUpdateData.address = companyAddress || null;

      if (Object.keys(companyUpdateData).length > 0) {
        await tx.company.update({
          where: { id },
          data: companyUpdateData,
        });
      }

      // Fetch updated company with owner
      const updatedCompany = await tx.company.findUnique({
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

      return updatedCompany;
    });

    return res.json({
      success: true,
      data: result,
      message: "Company updated successfully",
    });
  } catch (error: any) {
    console.error("Update company error:", error);

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

// ==================== DELETE COMPANY ====================
export const deleteCompany = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    // Check if company exists
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        owner: true,
        dealerCompanies: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            companySales: true,
            dealerCompanies: true,
            consignments: true,
            ledgerEntries: true,
            paymentRequests: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check for related data
    const hasProducts = await prisma.product.count({
      where: { supplierId: company.ownerId },
    });

    // Check for active consignments
    const dealerIds = (company as any).dealers?.map((d: { id: string }) => d.id) || [];
    const hasActiveConsignments = await prisma.consignmentRequest.count({
      where: {
        OR: [
          { fromCompanyId: id },
          ...(dealerIds.length > 0 ? [{ toDealerId: { in: dealerIds } }] : []),
        ],
        status: {
          notIn: ["SETTLED", "CANCELLED", "REJECTED"],
        },
      },
    });

    if (
      hasProducts > 0 ||
      company._count.companySales > 0 ||
      hasActiveConsignments > 0 ||
      company._count.dealerCompanies > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete company with associated products, sales, active consignments, or dealers. Please remove all related data first.",
      });
    }

    // Delete company and user in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete company (this will cascade delete related data due to onDelete: Cascade)
      await tx.company.delete({
        where: { id },
      });

      // Delete user
      await tx.user.delete({
        where: { id: company.ownerId },
      });
    });

    return res.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete company error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
