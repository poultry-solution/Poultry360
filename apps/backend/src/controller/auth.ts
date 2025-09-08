import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { Gender, UserRole, UserStatus } from "@prisma/client";
import { LoginSchema, SignupSchema } from "@myapp/shared-types";

const generateTokens = (userId: string, role: UserRole) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET || "mysupersecretkey",
    {
      expiresIn: "1h",
    }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
    {
      expiresIn: "7d",
    }
  );

  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { success, data, error } = LoginSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }
    const { emailOrPhone, password } = data;

    // Find user by phone or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: emailOrPhone }, { email: emailOrPhone }],
      },
      include: {
        managedFarms: true,
        ownedFarms: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate tokens
    const tokens = generateTokens(user.id, user.role);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    let userWithFarms: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName,
      companyFarmLocation: user.CompanyFarmLocation,
      companyFarmNumber: user.CompanyFarmNumber,
      companyFarmCapacity: user.CompanyFarmCapacity,
      role: user.role,
      gender: user.gender,
      status: user.status,
      managedFarms: user.managedFarms?.map((farm) => farm.id),
      ownedFarms: user.ownedFarms?.map((farm) => farm.id),
    };

    console.log("userWithFarms", userWithFarms);

    // Return access token and user data
    return res.json({
      accessToken: tokens.accessToken,
      user: userWithFarms,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { success, data, error } = SignupSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }
    const {
      name,
      email,
      phone,
      password,
      gender,
      role,
      companyName,
      companyFarmLocation,
      companyFarmNumber,
      companyFarmCapacity,
    } = data;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ name }, { phone }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or phone number already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name,        
        phone: phone,
        email: email,
        password: hashedPassword,
        // if user is owner then marked as verified else pending verification
        status:
          role === UserRole.OWNER
            ? UserStatus.ACTIVE
            : UserStatus.PENDING_VERIFICATION,
        gender: gender,
        role: role || UserRole.OWNER,
        companyName: companyName,
        CompanyFarmLocation: companyFarmLocation,
        CompanyFarmNumber: companyFarmNumber ? parseInt(companyFarmNumber) : null,
        CompanyFarmCapacity: companyFarmCapacity,
      },
      include: {
        managedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
          },
        },
        ownedFarms: true,
      },
    });

    // Generate tokens
    const tokens = generateTokens(user.id, user.role);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return access token and user data
    return res.status(201).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        companyName: user.companyName,
        companyFarmLocation: user.CompanyFarmLocation,
        companyFarmNumber: user.CompanyFarmNumber,
        companyFarmCapacity: user.CompanyFarmCapacity,
        role: user.role,
        gender: user.gender,
        status: user.status,
        managedFarms: user.managedFarms,
        ownedFarms: user.ownedFarms,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    console.log("🔄 Refresh token request headers:", req.headers.cookie);
    console.log("🔄 Refresh token parsed cookies:", req.cookies);
    console.log("🔄 Refresh token value:", req.cookies?.refreshToken);

    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not found" });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
    ) as {
      userId: string;
      role: UserRole;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.role);

    // Set new refresh token
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return new access token
    return res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

export const logout = (req: Request, res: Response): any => {
  // Clear refresh token cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  return res.json({ message: "Logged out successfully" });
};

export const getUserInfo = async (
  req: Request,
  res: Response
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return res.status(403).json({ error: "Access denied" });
  }

  const userId = (jwt.decode(token) as { userId: string }).userId || "";
  if (!userId) {
    return res.status(404).json({ error: "User not found" });
  }

  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      managedFarms: {
        select: {
          id: true,
          name: true,
          capacity: true,
          description: true,
        },
      },
      ownedFarms: true,
    },
  });
  if (!userData) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    id: userData.id,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
    companyName: userData.companyName,
    companyFarmLocation: userData.CompanyFarmLocation,
    companyFarmNumber: userData.CompanyFarmNumber,
    companyFarmCapacity: userData.CompanyFarmCapacity,
    gender: userData.gender,
    status: userData.status,
    managedFarms: userData.managedFarms,
    ownedFarms: userData.ownedFarms,
    role: userData.role,
  });
};

export const validateToken = async (
  req: Request,
  res: Response
): Promise<any> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      isValid: false,
      error: "No token provided",
    });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({
      isValid: false,
      error: "No token provided",
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: UserRole;
    };

    // Get fresh user data from database
    const userData = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        managedFarms: {
          select: {
            id: true,
            name: true,
            capacity: true,
            description: true,
          },
        },
        ownedFarms: true,
      },
    });

    if (!userData) {
      return res.status(401).json({
        isValid: false,
        error: "User not found",
      });
    }

    // Check if user is active
    if (userData.status !== UserStatus.ACTIVE) {
      return res.status(401).json({
        isValid: false,
        error: "User account is not active",
      });
    }

    // Prepare user response
    let userResponse: any = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      companyName: userData.companyName,
      companyFarmLocation: userData.CompanyFarmLocation,
      companyFarmNumber: userData.CompanyFarmNumber,
      companyFarmCapacity: userData.CompanyFarmCapacity,
      role: userData.role,
      gender: userData.gender,
      status: userData.status,
      managedFarms: userData.managedFarms,
      ownedFarms: userData.ownedFarms,
    };

    // Add storeId for farm managers
    if (userData.role === UserRole.MANAGER) {
      const farm = await prisma.farm.findMany({
        where: { managers: { some: { id: userData.id } } },
      });
      if (farm) {
        userResponse.managedFarms = farm.map((farm) => farm.id);
      }
    }

    return res.json({
      isValid: true,
      user: userResponse,
    });
  } catch (error) {
    return res.status(401).json({
      isValid: false,
      error: "Invalid token",
    });
  }
};
