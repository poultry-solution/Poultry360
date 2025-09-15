import { Request, Response } from "express";
import prisma from "../utils/prisma";

export const updateOnlineStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { isOnline } = req.body;
    const userId = req.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    if (typeof isOnline !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isOnline must be a boolean value",
      });
    }

    // Update the user's online status
    // Note: You might want to add an onlineStatus field to your User model
    // For now, we'll just return success
    // In a real implementation, you might want to:
    // 1. Add an onlineStatus field to the User model
    // 2. Update the user's online status in the database
    // 3. Emit a socket event to notify other users

    console.log(`Doctor ${userId} is now ${isOnline ? 'online' : 'offline'}`);

    return res.status(200).json({
      success: true,
      message: `Doctor is now ${isOnline ? 'online' : 'offline'}`,
      isOnline,
    });
  } catch (error) {
    console.error("Error updating doctor online status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getDoctorStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Get the user's current status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // For now, we'll assume all doctors are online
    // In a real implementation, you'd check the actual online status
    return res.status(200).json({
      success: true,
      isOnline: true, // This should come from your database or real-time system
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error getting doctor status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
