import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  CreateHatcherySchema,
  UpdateHatcherySchema,
} from "@myapp/shared-types";




// ==================== CREATE HATCHERY ====================
export const createHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateHatcherySchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if hatchery with same name already exists for this user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
      },
    });

    if (existingHatchery) {
      return res
        .status(400)
        .json({ message: "Hatchery with this name already exists" });
    }

    // Create hatchery
    const hatchery = await prisma.hatchery.create({
      data: {
        name: data.name,
        contact: data.contact,
        address: data.address,
        userId: currentUserId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: hatchery,
      message: "Hatchery created successfully",
    });
  } catch (error) {
    console.error("Create hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE HATCHERY ====================
export const updateHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateHatcherySchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if hatchery exists and belongs to user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingHatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== existingHatchery.name) {
      const nameExists = await prisma.hatchery.findFirst({
        where: {
          userId: currentUserId,
          name: data.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return res
          .status(400)
          .json({ message: "Hatchery with this name already exists" });
      }
    }

    // Update hatchery
    const updatedHatchery = await prisma.hatchery.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: updatedHatchery,
      message: "Hatchery updated successfully",
    });
  } catch (error) {
    console.error("Update hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE HATCHERY ====================
export const deleteHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if hatchery exists and belongs to user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingHatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Check if hatchery has transactions by directly querying entityTransaction table
    const transactionCount = await prisma.entityTransaction.count({
      where: {
        hatcheryId: id,
      },
    });

    console.log("Existing hatchery:", existingHatchery);
    console.log("Transaction count for hatchery:", transactionCount);

    // Let's also check what transactions actually exist
    const actualTransactions = await prisma.entityTransaction.findMany({
      where: {
        hatcheryId: id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        itemName: true,
        date: true,
      },
    });
    console.log("Actual transactions found:", actualTransactions);

    // Check if hatchery has transactions
    if (transactionCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete hatchery with existing transactions. Please remove all transactions first.",
      });
    }

    // Delete hatchery
    await prisma.hatchery.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Hatchery deleted successfully",
    });
  } catch (error) {
    console.error("Delete hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
