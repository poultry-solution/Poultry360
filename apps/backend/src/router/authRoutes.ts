import { Router } from "express";
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
import { loginLimiter, otpLimiter } from "../middelware/rateLimiters";

const authRouter = Router();

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
