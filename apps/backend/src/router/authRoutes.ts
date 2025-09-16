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
} from "../controller/auth";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/logout", logout);
authRouter.post("/refresh-token", refreshToken);
authRouter.get("/@me", getUserInfo);
authRouter.get("/validate", validateToken);
authRouter.post("/store-cross-port", storeCrossPortAuth);
authRouter.get("/get-cross-port", getCrossPortAuth);
authRouter.post("/verify-password", verifyPassword);

export default authRouter;
