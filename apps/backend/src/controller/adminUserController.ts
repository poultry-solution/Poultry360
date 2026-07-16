import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";
import bcrypt from "bcrypt";

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
              doctorConversations: true,
            },
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

    const normalizedUsers = users.map((user: any) => ({
      ...user,
      _count: {
        ownedFarms: user._count.ownedFarms,
        managedFarms: user._count.managedFarms,
        doctorConversations: user._count.doctorConversations,
      },
    }));

    return res.json({
      success: true,
      data: normalizedUsers,
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
        // Dealer account links (for farmers)
        farmerAccounts: {
          select: {
            createdAt: true,
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
          },
        },
        // Company entity (for company users)
        company: {
          select: {
            id: true,
            name: true,
            address: true,
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

    const normalizedUser = {
      ...user,
      dealerConnections: user.farmerAccounts.map((account: any) => ({
        connectedAt: account.createdAt,
        dealer: account.dealer,
      })),
    };

    return res.json({
      success: true,
      data: normalizedUser,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

async function hardDeleteUserData(userId: string) {
  await prisma.$transaction(async (tx) => {
    const conversations = await tx.conversation.findMany({
      where: {
        OR: [{ farmerId: userId }, { doctorId: userId }],
      },
      select: { id: true },
    });
    const conversationIds = conversations.map((conversation) => conversation.id);

    const batchShares = await tx.batchShare.findMany({
      where: {
        OR: [
          { farmerId: userId },
          { sharedWithId: userId },
          ...(conversationIds.length > 0
            ? [{ conversationId: { in: conversationIds } }]
            : []),
        ],
      },
      select: { id: true },
    });
    const batchShareIds = batchShares.map((share) => share.id);

    if (batchShareIds.length > 0) {
      await tx.message.updateMany({
        where: {
          batchShareId: { in: batchShareIds },
        },
        data: {
          batchShareId: null,
        },
      });

      await tx.batchShare.deleteMany({
        where: {
          id: { in: batchShareIds },
        },
      });
    }

    await tx.batchShareView.deleteMany({
      where: {
        viewerId: userId,
      },
    });

    if (conversationIds.length > 0) {
      await tx.conversation.deleteMany({
        where: {
          id: { in: conversationIds },
        },
      });
    }

    await tx.message.deleteMany({
      where: {
        senderId: userId,
      },
    });

    await tx.auditLog.deleteMany({
      where: {
        userId,
      },
    });

    await tx.companyDealerPayment.deleteMany({
      where: {
        recordedById: userId,
      },
    });

    await tx.dealerFarmerPayment.deleteMany({
      where: {
        recordedById: userId,
      },
    });

    await tx.companyDealerAccount.updateMany({
      where: {
        balanceLimitSetBy: userId,
      },
      data: {
        balanceLimitSetBy: null,
      },
    });

    await tx.dealerFarmerAccount.updateMany({
      where: {
        balanceLimitSetBy: userId,
      },
      data: {
        balanceLimitSetBy: null,
      },
    });

    await tx.dealerCashMovement.updateMany({
      where: {
        recordedById: userId,
      },
      data: {
        recordedById: null,
      },
    });

    await tx.farmerCashMovement.updateMany({
      where: {
        recordedById: userId,
      },
      data: {
        recordedById: null,
      },
    });

    const categoryIds = (
      await tx.category.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((category) => category.id);

    const inventoryItemIds = (
      await tx.inventoryItem.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((item) => item.id);

    if (categoryIds.length > 0) {
      await tx.sale.deleteMany({
        where: {
          categoryId: { in: categoryIds },
        },
      });

      await tx.expense.deleteMany({
        where: {
          categoryId: { in: categoryIds },
        },
      });
    }

    if (inventoryItemIds.length > 0) {
      await tx.inventoryUsage.deleteMany({
        where: {
          itemId: { in: inventoryItemIds },
        },
      });

      await tx.inventoryTransaction.deleteMany({
        where: {
          itemId: { in: inventoryItemIds },
        },
      });

      await tx.inventoryItem.deleteMany({
        where: {
          id: { in: inventoryItemIds },
        },
      });
    }

    if (categoryIds.length > 0) {
      await tx.category.deleteMany({
        where: {
          id: { in: categoryIds },
        },
      });
    }

    await tx.hatcheryIncubationBatch.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    await tx.hatcheryBatch.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    await tx.hatcheryInventoryItem.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    await tx.hatcheryEggType.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    await tx.hatcheryParty.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    await tx.hatcherySupplier.deleteMany({
      where: {
        hatcheryOwnerId: userId,
      },
    });

    const dealerIds = (
      await tx.dealer.findMany({
        where: {
          OR: [{ userId }, { ownerId: userId }],
        },
        select: { id: true },
      })
    ).map((dealer) => dealer.id);

    if (dealerIds.length > 0) {
      await tx.dealerSale.deleteMany({
        where: {
          dealerId: { in: dealerIds },
        },
      });

      const dealerProductIds = (
        await tx.dealerProduct.findMany({
          where: {
            dealerId: { in: dealerIds },
          },
          select: { id: true },
        })
      ).map((product) => product.id);

      if (dealerProductIds.length > 0) {
        await tx.dealerSaleItem.deleteMany({
          where: {
            productId: { in: dealerProductIds },
          },
        });

        await tx.dealerProductTransaction.deleteMany({
          where: {
            productId: { in: dealerProductIds },
          },
        });

        await tx.dealerProduct.deleteMany({
          where: {
            id: { in: dealerProductIds },
          },
        });
      }

      await tx.dealer.deleteMany({
        where: {
          id: { in: dealerIds },
        },
      });
    }

    await tx.user.delete({
      where: {
        id: userId,
      },
    });
  });
}

// ==================== HARD DELETE USER (SUPER ADMIN) ====================
export const hardDeleteUser = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const adminUserId = req.userId;

    if (!adminUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Admin password is required",
      });
    }

    if (adminUserId === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own super admin account",
      });
    }

    const [adminUser, targetUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: adminUserId },
        select: {
          id: true,
          password: true,
          role: true,
        },
      }),
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          role: true,
        },
      }),
    ]);

    if (!adminUser || adminUser.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (targetUser.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({
        success: false,
        message: "Super admin accounts cannot be deleted from this screen",
      });
    }

    const passwordMatches = await bcrypt.compare(password, adminUser.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin password",
      });
    }

    await hardDeleteUserData(id);

    return res.json({
      success: true,
      message: `User ${targetUser.name} and related data were permanently deleted`,
    });
  } catch (error: any) {
    console.error("Hard delete user error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to hard delete user",
    });
  }
};
