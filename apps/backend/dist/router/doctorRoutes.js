"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const doctorController_1 = require("../controller/doctorController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, []); // Only allow DOCTOR role
});
// Doctor status operations
router.put("/online-status", doctorController_1.updateOnlineStatus);
router.get("/status", doctorController_1.getDoctorStatus);
// Get online doctors (for farmer dashboard)
router.get("/online", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const prisma = require("../utils/prisma").default;
        const onlineDoctors = yield prisma.user.findMany({
            where: {
                role: 'DOCTOR',
                isOnline: true,
                status: 'ACTIVE'
            },
            select: {
                id: true,
                name: true,
                isOnline: true,
                lastSeen: true
            },
            orderBy: {
                lastSeen: 'desc'
            }
        });
        return res.status(200).json({
            success: true,
            doctors: onlineDoctors,
            total: onlineDoctors.length
        });
    }
    catch (error) {
        console.error("Error getting online doctors:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
}));
exports.default = router;
