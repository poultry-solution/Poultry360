import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { sendPasswordResetOtpSms } from "../services/smsPasalService";

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_RESET_REQUESTS_PER_IP = 10;
const PASSWORD_RESET_SECRET = process.env.PASSWORD_RESET_SECRET;
const resetRequestCounts = new Map<string, { count: number; resetAt: number }>();

function generateOtp(): string {
  return randomInt(100000, 1_000_000).toString();
}

function takeResetRequestSlot(req: Request): number | null {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = resetRequestCounts.get(key);

  if (!current || current.resetAt <= now) {
    resetRequestCounts.set(key, { count: 1, resetAt: now + RESET_REQUEST_WINDOW_MS });
    return null;
  }
  if (current.count >= MAX_RESET_REQUESTS_PER_IP) {
    return Math.ceil((current.resetAt - now) / 1000);
  }
  current.count += 1;
  return null;
}

function normalizeNepalPhone(value: unknown): string | null {
  const raw = String(value || "").replace(/\D/g, "");
  const localNumber = raw.startsWith("977") ? raw.slice(3) : raw;
  return /^9\d{9}$/.test(localNumber) ? `+977${localNumber}` : null;
}

function resetResponse() {
  return {
    success: true,
    message: "If an eligible account exists for this number, a reset code has been sent by SMS.",
  };
}

// Normal User accounts only. StaffUser authentication deliberately has no reset route yet.
export const generateResetOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    const phone = normalizeNepalPhone(req.body?.phone);
    if (!phone) return res.status(400).json({ success: false, message: "Enter a valid 10-digit Nepal phone number" });
    if (!PASSWORD_RESET_SECRET) return res.status(503).json({ success: false, message: "Password reset is not configured" });

    const retryAfterSeconds = takeResetRequestSlot(req);
    if (retryAfterSeconds !== null) {
      return res.status(429).json({
        success: false,
        message: "Too many password-reset requests. Please try again later.",
        retryAfterSeconds,
      });
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, role: true },
    });

    // Keep this response the same for missing/ineligible accounts to avoid exposing account existence.
    if (!user || user.role === UserRole.SUPER_ADMIN) return res.json(resetResponse());

    const latestOtp = await prisma.passwordResetOtp.findFirst({
      where: { phone, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latestOtp && Date.now() - latestOtp.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        message: "Please wait one minute before requesting another code",
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - latestOtp.createdAt.getTime())) / 1000),
      });
    }

    const otp = generateOtp();
    await sendPasswordResetOtpSms(phone, otp);

    await prisma.$transaction([
      prisma.passwordResetOtp.updateMany({
        where: { phone, used: false },
        data: { used: true },
      }),
      prisma.passwordResetOtp.create({
        data: {
          phone,
          // Store a bcrypt hash, never the code delivered to the phone.
          otp: await bcrypt.hash(otp, 10),
          expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        },
      }),
    ]);

    return res.json(resetResponse());
  } catch (error) {
    console.error("Generate password reset OTP error", error);
    const message = error instanceof Error && error.message === "SMS Pasal is not configured"
      ? "Password reset SMS is not configured"
      : "Unable to send a reset code right now. Please try again later.";
    return res.status(503).json({ success: false, message });
  }
};

// Validates an SMS OTP and returns a short-lived proof required by the reset endpoint.
export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!PASSWORD_RESET_SECRET) return res.status(503).json({ success: false, message: "Password reset is not configured" });
    const phone = normalizeNepalPhone(req.body?.phone);
    const otp = typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    if (!phone || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: "A valid phone number and 6-digit code are required" });
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { phone, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    if (!(await bcrypt.compare(otp, otpRecord.otp))) {
      const attempts = otpRecord.attempts + 1;
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attempts, used: attempts >= 5 },
      });
      return res.status(400).json({ success: false, message: "Invalid or expired reset code" });
    }

    const resetToken = jwt.sign(
      { purpose: "PASSWORD_RESET", otpId: otpRecord.id },
      PASSWORD_RESET_SECRET,
      { expiresIn: "10m" }
    );
    return res.json({ success: true, message: "Code verified", resetToken });
  } catch (error) {
    console.error("Verify password reset OTP error", error);
    return res.status(500).json({ success: false, message: "Unable to verify the reset code" });
  }
};

export const verifyOtpAndResetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!PASSWORD_RESET_SECRET) return res.status(503).json({ success: false, message: "Password reset is not configured" });
    const resetToken = typeof req.body?.resetToken === "string" ? req.body.resetToken : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: "Verified reset token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    let proof: { purpose?: string; otpId?: string };
    try {
      proof = jwt.verify(resetToken, PASSWORD_RESET_SECRET) as typeof proof;
    } catch {
      return res.status(400).json({ success: false, message: "Your reset verification has expired. Request a new code." });
    }
    if (proof.purpose !== "PASSWORD_RESET" || !proof.otpId) {
      return res.status(400).json({ success: false, message: "Invalid reset verification" });
    }

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: { id: proof.otpId, used: false, expiresAt: { gt: new Date() } },
      select: { id: true, phone: true },
    });
    if (!otpRecord) return res.status(400).json({ success: false, message: "Your reset code has expired. Request a new code." });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const resetSucceeded = await prisma.$transaction(async (tx) => {
      // Claim the code first. The conditional update makes concurrent reset
      // attempts fail safely after one request has consumed the OTP.
      const claimed = await tx.passwordResetOtp.updateMany({
        where: { id: otpRecord.id, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });
      if (claimed.count !== 1) return false;

      const user = await tx.user.findUnique({
        where: { phone: otpRecord.phone },
        select: { id: true, role: true },
      });
      if (!user || user.role === UserRole.SUPER_ADMIN) {
        throw new Error("RESET_ACCOUNT_UNAVAILABLE");
      }
      await tx.user.update({ where: { id: user.id }, data: { password: passwordHash } });
      return true;
    });
    if (!resetSucceeded) {
      return res.status(400).json({ success: false, message: "Your reset code has expired. Request a new code." });
    }

    return res.json({ success: true, message: "Password reset successful. You can now log in with your new password." });
  } catch (error) {
    if (error instanceof Error && error.message === "RESET_ACCOUNT_UNAVAILABLE") {
      return res.status(400).json({ success: false, message: "Password reset is not available for this account" });
    }
    console.error("Reset password error", error);
    return res.status(500).json({ success: false, message: "Unable to reset password" });
  }
};
