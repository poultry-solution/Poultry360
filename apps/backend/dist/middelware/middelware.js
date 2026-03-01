"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// make it dynamic to accept rotes  as paramters to allow any user to access the route
const authMiddleware = (req, res, next, allowedRoles = []) => {
    console.log("authMiddleware");
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "mysupersecretkey");
    }
    catch (err) {
        console.log("error", err);
        return res.status(403).json({ error: "Access denied" });
    }
    const userId = decoded.userId;
    const role = decoded.role;
    //@ts-ignore
    req.userId = userId;
    //@ts-ignore
    req.role = role;
    console.log("authMiddleware", req.userId, req.role, allowedRoles);
    // if nothing is passed then allow all roles
    if (allowedRoles.length === 0) {
        return next();
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "Access denied for this role" });
    }
    next();
};
exports.authMiddleware = authMiddleware;
