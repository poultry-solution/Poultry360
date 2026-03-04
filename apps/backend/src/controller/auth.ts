import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { UserRole, UserStatus } from "@prisma/client";
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

    console.log("emailOrPhone", emailOrPhone);

    // Find user by phone
    const user = await prisma.user.findFirst({
      where: {
        phone: emailOrPhone,
      },
      include: {
        managedFarms: true,
        ownedFarms: true,
        dealer: true,
        company: true,
      },
    });

    console.log("user", user);
    console.log("user.dealer", user?.dealer);
    console.log("user.company", user?.company);

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
      phone: user.phone,
      companyName: user.companyName,
      companyFarmLocation: user.CompanyFarmLocation,
      role: user.role,
      status: user.status,
      language: user.language,
      calendarType: user.calendarType,
      managedFarms: user.managedFarms?.map((farm) => farm.id),
      ownedFarms: user.ownedFarms?.map((farm) => farm.id),
      dealer: user.dealer,
      company: user.company,
    };

    console.log("userWithFarms", userWithFarms);

    // Return access token and user data

    console.log("tokens", tokens);
    console.log("userWithFarms", userWithFarms);

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
      phone,
      password,
      role,
      companyName,
      companyFarmLocation,
      language,
      calendarType,
    } = data;

    // Get optional dealerId from request body (not in schema validation)
    const { dealerId } = req.body;

    // Check if phone number already exists (phone must be unique)
    const existingUser = await prisma.user.findUnique({
      where: {
        phone: phone,
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Phone number already registered" });
    }

    // Validate dealer exists if dealerId is provided
    if (dealerId) {
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
      });

      if (!dealer) {
        return res.status(400).json({
          success: false,
          message: "Dealer not found",
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and verification request in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: name,
          phone: phone,
          password: hashedPassword,
          // if user is owner then marked as verified else pending verification
          status:
            role === UserRole.OWNER
              ? UserStatus.ACTIVE
              : UserStatus.PENDING_VERIFICATION,
          role: role || UserRole.OWNER,
          companyName: companyName,
          CompanyFarmLocation: companyFarmLocation,
          language: language || "ENGLISH",
          calendarType: calendarType || "BS",
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

      // If dealerId provided and user is owner/farmer, create verification request
      if (dealerId && (role === UserRole.OWNER || !role)) {
        await (tx as any).farmerVerificationRequest.create({
          data: {
            farmerId: user.id,
            dealerId: dealerId,
            status: "PENDING",
            rejectedCount: 0,
          },
        });
      }

      return user;
    });

    const user = result;

    // Generate tokens
    const tokens = generateTokens(user.id, user.role);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
      // Remove domain in development to allow cross-port access
    });

    // Return access token and user data
    return res.status(201).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        companyName: user.companyName,
        companyFarmLocation: user.CompanyFarmLocation,
        role: user.role,
        status: user.status,
        language: user.language,
        calendarType: user.calendarType,
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
      // Remove domain in development to allow cross-port access
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
      dealer: true,
      company: true,
    },
  });
  if (!userData) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json({
    id: userData.id,
    name: userData.name,
    phone: userData.phone,
    companyName: userData.companyName,
    companyFarmLocation: userData.CompanyFarmLocation,
    status: userData.status,
    language: userData.language,
    calendarType: userData.calendarType,
    managedFarms: userData.managedFarms,
    ownedFarms: userData.ownedFarms,
    role: userData.role,
    dealer: userData.dealer,
    company: userData.company,
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
        dealer: true,
        company: true,
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
      phone: userData.phone,
      companyName: userData.companyName,
      companyFarmLocation: userData.CompanyFarmLocation,
      role: userData.role,
      status: userData.status,
      language: userData.language,
      calendarType: userData.calendarType,
      managedFarms: userData.managedFarms,
      ownedFarms: userData.ownedFarms,
      dealer: userData.dealer,
      company: userData.company,
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

// In-memory storage for cross-port auth data (in production, use Redis or database)
const crossPortAuthStorage = new Map<string, any>();

export const storeCrossPortAuth = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { authData, timestamp, source } = req.body;

    if (!authData || !authData.accessToken || !authData.user) {
      return res.status(400).json({
        success: false,
        error: "Invalid auth data",
      });
    }

    // Generate a unique session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store the auth data with expiration (5 minutes)
    crossPortAuthStorage.set(sessionId, {
      authData,
      timestamp,
      source,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    // Clean up expired sessions
    for (const [key, value] of crossPortAuthStorage.entries()) {
      if (value.expiresAt < Date.now()) {
        crossPortAuthStorage.delete(key);
      }
    }

    return res.status(200).json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error("Error storing cross-port auth:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getCrossPortAuth = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { session } = req.query;

    if (!session) {
      return res.status(400).json({
        success: false,
        error: "Session ID required",
      });
    }

    const sessionData = crossPortAuthStorage.get(session as string);

    if (!sessionData) {
      return res.status(404).json({
        success: false,
        error: "Session not found or expired",
      });
    }

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      crossPortAuthStorage.delete(session as string);
      return res.status(404).json({
        success: false,
        error: "Session expired",
      });
    }

    // Return the auth data and clean up the session
    crossPortAuthStorage.delete(session as string);

    return res.status(200).json({
      success: true,
      authData: sessionData.authData,
    });
  } catch (error) {
    console.error("Error getting cross-port auth:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

// ==================== VERIFY PASSWORD ====================
export const verifyPassword = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { password } = req.body;
    const currentUserId = req.userId;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    return res.json({
      success: true,
      message: "Password verified successfully",
    });
  } catch (error) {
    console.error("Password verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ==================== REGISTER ENTITY (DEALER/COMPANY) ====================
export const registerEntity = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      name,
      phone,
      password,
      entityType,
      entityName,
      entityContact,
      entityAddress,
      companyId,
    } = req.body;

    // Validation
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and password are required",
      });
    }

    if (!entityType || !["DEALER", "COMPANY", "DOCTOR"].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: "Entity type must be DEALER, COMPANY, or DOCTOR",
      });
    }

    if (entityType !== "DOCTOR" && !entityName) {
      return res.status(400).json({
        success: false,
        message: "Entity name is required",
      });
    }

    // Contact is required only for Dealers
    if (entityType === "DEALER" && !entityContact) {
      return res.status(400).json({
        success: false,
        message: "Dealer contact is required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // Validate company exists if companyId is provided (DEALER only)
    if (entityType === "DEALER" && companyId) {
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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine user role based on entity type
    const userRole =
      entityType === "DEALER"
        ? UserRole.DEALER
        : entityType === "COMPANY"
          ? UserRole.COMPANY
          : UserRole.DOCTOR;

    // Create user and entity in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // For DOCTOR: only create user with clinic info (companyName, CompanyFarmLocation)
      if (entityType === "DOCTOR") {
        const user = await tx.user.create({
          data: {
            name,
            phone,
            password: hashedPassword,
            role: UserRole.DOCTOR,
            status: UserStatus.ACTIVE,
            language: "ENGLISH",
            calendarType: "AD",
            companyName: entityName || null,
            CompanyFarmLocation: entityAddress || null,
          },
        });
        return { user, entity: null, entityType: "DOCTOR" as const };
      }

      // Create user for DEALER/COMPANY
      const user = await tx.user.create({
        data: {
          name,
          phone,
          password: hashedPassword,
          role: userRole,
          status: UserStatus.ACTIVE,
          language: "ENGLISH",
          calendarType: "AD",
        },
      });

      // Create entity (Dealer or Company)
      if (entityType === "DEALER") {
        // Check if owner already has a dealer
        const existingDealer = await tx.dealer.findUnique({
          where: { ownerId: user.id },
        });

        if (existingDealer) {
          throw new Error("User already owns a dealer account");
        }

        const dealer = await tx.dealer.create({
          data: {
            name: entityName,
            contact: entityContact,
            address: entityAddress || null,
            ownerId: user.id,
          },
        });

        // If companyId provided, create verification request instead of direct link
        if (companyId) {
          await (tx as any).dealerVerificationRequest.create({
            data: {
              dealerId: dealer.id,
              companyId: companyId,
              status: "PENDING",
              rejectedCount: 0,
            },
          });
        }

        return { user, entity: dealer, entityType: "DEALER" };
      } else {
        // COMPANY
        // Check if owner already has a company
        const existingCompany = await tx.company.findUnique({
          where: { ownerId: user.id },
        });

        if (existingCompany) {
          throw new Error("User already owns a company account");
        }

        const company = await tx.company.create({
          data: {
            name: entityName,
            address: entityAddress || null,
            ownerId: user.id,
          },
        });

        return { user, entity: company, entityType: "COMPANY" };
      }
    });

    // Generate tokens
    const tokens = generateTokens(result.user.id, result.user.role);

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return access token and user data
    const responsePayload: any = {
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        phone: result.user.phone,
        role: result.user.role,
        status: result.user.status,
      },
      message: `${result.entityType} account created successfully`,
    };

    if (result.entity) {
      responsePayload.entity = {
        id: result.entity.id,
        name: result.entity.name,
        type: result.entityType,
      };
    } else {
      // Doctor: no separate entity; clinic info on user
      responsePayload.entity = null;
      responsePayload.user.companyName = result.user.companyName;
      responsePayload.user.companyFarmLocation = result.user.CompanyFarmLocation;
    }

    return res.status(201).json(responsePayload);
  } catch (error: any) {
    console.error("Entity registration error:", error);

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
