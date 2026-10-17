import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  register,
  logout,
  refreshToken,
  getUserInfo,
  validateToken,
  storeCrossPortAuth,
  getCrossPortAuth,
  verifyPassword,
  changePassword,
  registerEntity,
} from "../controller/auth";
import {
  generateResetOtp,
  verifyOtp,
  verifyOtpAndResetPassword,
} from "../controller/passwordResetController";
import { authMiddleware } from "../middelware/middelware";

const authRouter = Router();

// 10 attempts per 15 minutes per IP — stops brute force while allowing a few mistyped passwords.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again later" },
});

// 5 OTP requests per hour per IP — password reset is rare; 6-digit OTP has 1M combinations.
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests, please try again later" },
});

authRouter.post("/login", loginLimiter, login);
authRouter.post("/register", loginLimiter, register);
authRouter.post("/register-entity", registerEntity);
authRouter.post("/logout", authMiddleware, (req, res, next) => {
  if (req.actorType !== "USER") return res.status(403).json({ error: "Use the staff logout route" });
  next();
}, logout);
authRouter.post("/refresh-token", refreshToken);
authRouter.get("/@me", getUserInfo);
authRouter.get("/validate", validateToken);
authRouter.post("/store-cross-port", storeCrossPortAuth);
authRouter.get("/get-cross-port", getCrossPortAuth);
authRouter.post("/verify-password", authMiddleware, verifyPassword);
authRouter.post("/change-password", authMiddleware, changePassword);

// Password reset (public - no auth required)
authRouter.post("/forgot-password/generate-otp", otpLimiter, generateResetOtp);
authRouter.post("/forgot-password/verify-otp", otpLimiter, verifyOtp);
authRouter.post("/forgot-password/reset", otpLimiter, verifyOtpAndResetPassword);

export default authRouter;
