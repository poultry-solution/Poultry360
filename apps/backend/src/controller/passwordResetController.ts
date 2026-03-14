import { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==================== GENERATE OTP ====================
// User requests an OTP — it's stored in DB, admin can see it
export const generateResetOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    // Find user by phone
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this phone number" });
    }

    // Block SUPER_ADMIN from resetting
    if (user.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: "Password reset is not available for this account" });
    }

    // Invalidate any existing unused OTPs for this phone
    await prisma.passwordResetOtp.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    // Generate new OTP (expires in 30 minutes)
    const otp = generateOtp();
    await prisma.passwordResetOtp.create({
      data: {
        phone,
        otp,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    return res.json({
      success: true,
      message: "OTP generated. Please contact admin to get your OTP.",
    });
  } catch (error) {
    console.error("Generate OTP error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== VERIFY OTP ONLY ====================
export const verifyOtp = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        phone,
        otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    return res.json({ success: true, message: "OTP verified" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== VERIFY OTP + RESET PASSWORD ====================
export const verifyOtpAndResetPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { phone, otp, newPassword } = req.body;

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Phone, OTP, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Find valid OTP
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        phone,
        otp,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Find the user
    const user = await prisma.user.findFirst({ where: { phone } });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Hash new password and update + mark OTP as used
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      }),
    ]);

    return res.json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== ADMIN: GET PENDING OTPs ====================
// So admin can tell the user their OTP when they call
export const getPendingOtps = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const otps = await prisma.passwordResetOtp.findMany({
      where: {
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: otps });
  } catch (error) {
    console.error("Get pending OTPs error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
