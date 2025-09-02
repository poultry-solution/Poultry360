import { Router } from "express";
import {
  login,
  register,
  logout,
  refreshToken,
  getUserInfo,
  validateToken,
} from "../controller/auth";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.post("/register", register);
authRouter.post("/logout", logout);
authRouter.post("/refresh-token", refreshToken);
authRouter.get("/@me", getUserInfo);
authRouter.get("/validate", validateToken);

export default authRouter;
