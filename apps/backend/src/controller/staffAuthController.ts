import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { StaffPermission } from "@prisma/client";
import prisma from "../utils/prisma";

const STAFF_REFRESH_COOKIE = "staffRefreshToken";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

function normalizePhone(value: unknown): string | null {
  const raw = String(value || "").replace(/\D/g, "");
  const digits = raw.startsWith("977") ? raw.slice(3) : raw;
  return digits.length === 10 ? `+977${digits}` : null;
}

function makeTokens(staff: { id: string; sessionVersion: number }) {
  const payload = { actorType: "STAFF", staffId: staff.id, sessionVersion: staff.sessionVersion };
  return {
    accessToken: jwt.sign(payload, process.env.JWT_SECRET || "mysupersecretkey", { expiresIn: "1h" }),
    refreshToken: jwt.sign(payload, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key", { expiresIn: "7d" }),
  };
}

function publicStaff(staff: any) {
  return {
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    role: "DEALER",
    status: staff.isActive ? "ACTIVE" : "INACTIVE",
    isStaff: true,
    permissions: staff.permissions,
    dealer: staff.dealer,
  };
}

async function activeStaffFromToken(token: string, secret: string) {
  const decoded = jwt.verify(token, secret) as { actorType?: string; staffId: string; sessionVersion: number };
  if (decoded.actorType !== "STAFF") throw new Error("Invalid staff token");
  const staff = await prisma.staffUser.findUnique({
    where: { id: decoded.staffId },
    include: { dealer: true },
  });
  if (!staff || !staff.isActive || staff.sessionVersion !== decoded.sessionVersion) throw new Error("Invalid staff session");
  return staff;
}

export const staffLogin = async (req: Request, res: Response): Promise<any> => {
  const phone = normalizePhone(req.body?.phone ?? req.body?.emailOrPhone);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!phone || password.length < 1) return res.status(400).json({ message: "A valid phone number and password are required" });

  const staff = await prisma.staffUser.findUnique({ where: { phone }, include: { dealer: true } });
  if (!staff || !staff.isActive || !(await bcrypt.compare(password, staff.passwordHash))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const tokens = makeTokens(staff);
  res.cookie(STAFF_REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
  return res.json({ accessToken: tokens.accessToken, user: publicStaff(staff) });
};

export const staffRefreshToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.cookies?.[STAFF_REFRESH_COOKIE];
    if (!token) return res.status(401).json({ message: "Refresh token not found" });
    const staff = await activeStaffFromToken(token, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key");
    const tokens = makeTokens(staff);
    res.cookie(STAFF_REFRESH_COOKIE, tokens.refreshToken, cookieOptions);
    return res.json({ accessToken: tokens.accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const getStaffInfo = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "No token provided" });
    const staff = await activeStaffFromToken(token, process.env.JWT_SECRET || "mysupersecretkey");
    return res.json(publicStaff(staff));
  } catch {
    return res.status(401).json({ error: "Staff session is invalid" });
  }
};

export const validateStaffToken = async (req: Request, res: Response): Promise<any> => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ isValid: false, error: "No token provided" });
    const staff = await activeStaffFromToken(token, process.env.JWT_SECRET || "mysupersecretkey");
    return res.json({ isValid: true, user: publicStaff(staff) });
  } catch {
    return res.status(401).json({ isValid: false, error: "Staff session is invalid" });
  }
};

export const staffLogout = (_req: Request, res: Response) => {
  res.clearCookie(STAFF_REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
  return res.json({ message: "Logged out successfully" });
};

const allowedPermissions = new Set(Object.values(StaffPermission));
function parsePermissions(input: unknown): StaffPermission[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.some((p) => typeof p !== "string" || !allowedPermissions.has(p as StaffPermission))) return null;
  return [...new Set(input as StaffPermission[])];
}

async function ownerDealer(ownerId: string) {
  return prisma.dealer.findUnique({ where: { ownerId }, select: { id: true } });
}

export const listStaffUsers = async (req: Request, res: Response): Promise<any> => {
  const dealer = await ownerDealer(req.userId!);
  if (!dealer) return res.status(404).json({ message: "Dealer business not found" });
  const staff = await prisma.staffUser.findMany({
    where: { ownerId: req.userId!, dealerId: dealer.id },
    select: { id: true, name: true, phone: true, isActive: true, permissions: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ success: true, data: staff });
};

export const createStaffUser = async (req: Request, res: Response): Promise<any> => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const phone = normalizePhone(req.body?.phone);
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const permissions = parsePermissions(req.body?.permissions);
  if (!name || !phone || password.length < 8 || !permissions) {
    return res.status(400).json({ message: "Name, a valid phone, an 8-character password, and valid permissions are required" });
  }
  const dealer = await ownerDealer(req.userId!);
  if (!dealer) return res.status(404).json({ message: "Dealer business not found" });
  const [existingUser, existingStaff] = await Promise.all([
    prisma.user.findUnique({ where: { phone }, select: { id: true } }),
    prisma.staffUser.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (existingUser || existingStaff) return res.status(409).json({ message: "This phone number is already in use" });
  const staff = await prisma.staffUser.create({
    data: { ownerId: req.userId!, dealerId: dealer.id, name, phone, passwordHash: await bcrypt.hash(password, 10), permissions },
    select: { id: true, name: true, phone: true, isActive: true, permissions: true, createdAt: true, updatedAt: true },
  });
  return res.status(201).json({ success: true, data: staff });
};

export const updateStaffUser = async (req: Request, res: Response): Promise<any> => {
  const dealer = await ownerDealer(req.userId!);
  if (!dealer) return res.status(404).json({ message: "Dealer business not found" });
  const existing = await prisma.staffUser.findFirst({ where: { id: req.params.id, ownerId: req.userId!, dealerId: dealer.id } });
  if (!existing) return res.status(404).json({ message: "Staff user not found" });
  const data: any = {};
  if (req.body?.name !== undefined) {
    if (typeof req.body.name !== "string" || !req.body.name.trim()) return res.status(400).json({ message: "Name is required" });
    data.name = req.body.name.trim();
  }
  if (req.body?.phone !== undefined) {
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: "A valid Nepal phone number is required" });
    const [user, staff] = await Promise.all([prisma.user.findUnique({ where: { phone } }), prisma.staffUser.findUnique({ where: { phone } })]);
    if (user || (staff && staff.id !== existing.id)) return res.status(409).json({ message: "This phone number is already in use" });
    data.phone = phone;
  }
  if (req.body?.permissions !== undefined) {
    const permissions = parsePermissions(req.body.permissions);
    if (!permissions) return res.status(400).json({ message: "Invalid permissions" });
    data.permissions = permissions;
  }
  if (req.body?.isActive !== undefined) {
    if (typeof req.body.isActive !== "boolean") return res.status(400).json({ message: "isActive must be a boolean" });
    data.isActive = req.body.isActive;
    if (!req.body.isActive) data.sessionVersion = { increment: 1 };
  }
  if (req.body?.password !== undefined) {
    if (typeof req.body.password !== "string" || req.body.password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
    data.passwordHash = await bcrypt.hash(req.body.password, 10);
    data.sessionVersion = { increment: 1 };
  }
  const staff = await prisma.staffUser.update({ where: { id: existing.id }, data, select: { id: true, name: true, phone: true, isActive: true, permissions: true, createdAt: true, updatedAt: true } });
  return res.json({ success: true, data: staff });
};
