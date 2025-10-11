import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserSchema,
  UserResponseSchema,
} from "@myapp/shared-types";

// ==================== GET ALL USERS ====================
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role as UserRole;
    }

    if (status) {
      where.status = status as UserStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          phone: true,
          role: true,
          status: true,
          companyName: true,
          CompanyFarmLocation: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedFarms: true,
              managedFarms: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
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
    console.error("Get all users error:", error);
    return res.status(500).json({ message: "Internal server error" });
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
      include: {
        ownedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
          },
        },
        managedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
        _count: {
          select: {
            customers: true,
            dealers: true,
            hatcheries: true,
            medicineSuppliers: true,
            inventoryItems: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET CURRENT USER PROFILE ====================
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // From auth middleware

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        ownedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                batches: true,
                expenses: true,
                sales: true,
              },
            },
          },
        },
        managedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                batches: true,
                expenses: true,
                sales: true,
              },
            },
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE USER ====================
export const updateUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validate request body
    const { success, data, error } = UpdateUserSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Role-based access control
    if (currentUserRole !== UserRole.OWNER && currentUserId !== id) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only OWNER can change roles and status
    if (currentUserRole !== UserRole.OWNER) {
      delete data.role;
      delete data.status;
    }

    // Build update payload with only fields that exist in Prisma User model
    const updateData: any = {};
    if (typeof data.name !== "undefined") updateData.name = data.name;
    if (typeof data.phone !== "undefined") updateData.phone = data.phone;
    if (typeof data.role !== "undefined") updateData.role = data.role;
    if (typeof data.status !== "undefined") updateData.status = data.status;
    if (typeof data.companyName !== "undefined")
      updateData.companyName = data.companyName;
    if (typeof data.CompanyFarmLocation !== "undefined")
      updateData.CompanyFarmLocation = data.CompanyFarmLocation;
    // Ignore fields not in Prisma model (email, gender, ownerId, CompanyFarmNumber, CompanyFarmCapacity)

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        companyName: true,
        CompanyFarmLocation: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE USER ====================
export const deleteUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only OWNER can delete users, and cannot delete themselves
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (currentUserId === id) {
      return res
        .status(400)
        .json({ message: "Cannot delete your own account" });
    }

    // Check if user has any farms
    const userFarms = await prisma.farm.count({
      where: {
        OR: [{ ownerId: id }, { managers: { some: { id } } }],
      },
    });

    if (userFarms > 0) {
      return res.status(400).json({
        message:
          "Cannot delete user with associated farms. Please reassign farms first.",
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE USER PREFERENCES ====================
export const updateUserPreferences = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { language, calendarType } = req.body;
    
    // Validate input
    if (language && !['ENGLISH', 'NEPALI'].includes(language)) {
      return res.status(400).json({ message: 'Invalid language value' });
    }
    
    if (calendarType && !['AD', 'BS'].includes(calendarType)) {
      return res.status(400).json({ message: 'Invalid calendar type value' });
    }
    
    // Build update data
    const updateData: any = {};
    if (language) updateData.language = language;
    if (calendarType) updateData.calendarType = calendarType;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid preferences to update' });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        language: true,
        calendarType: true,
        companyName: true,
        CompanyFarmLocation: true,
        updatedAt: true,
      },
    });
    
    return res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user preferences error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ==================== GET OWNER USERS ====================
export const getOwnerUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      role: UserRole.OWNER,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [owners, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          companyName: true,
          CompanyFarmLocation: true,
          createdAt: true,
          _count: {
            select: {
              ownedFarms: true,
              managedFarms: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: owners,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get owner users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MANAGER USERS ====================
export const getManagerUsers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      role: UserRole.MANAGER,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [managers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          companyName: true,
          CompanyFarmLocation: true,
          createdAt: true,
          _count: {
            select: {
              ownedFarms: true,
              managedFarms: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      success: true,
      data: managers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get manager users error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE USER STATUS ====================
export const updateUserStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const currentUserRole = req.role;

    // Only OWNER can update user status
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Validate status
    if (!Object.values(UserStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      data: updatedUser,
      message: "User status updated successfully",
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET USER STATISTICS ====================
export const getUserStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserRole = req.role;

    // Only OWNER can view statistics
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [
      totalUsers,
      totalOwners,
      totalManagers,
      activeUsers,
      pendingUsers,
      inactiveUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.OWNER } }),
      prisma.user.count({ where: { role: UserRole.MANAGER } }),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.PENDING_VERIFICATION } }),
      prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalOwners,
        totalManagers,
        activeUsers,
        pendingUsers,
        inactiveUsers,
      },
    });
  } catch (error) {
    console.error("Get user statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
