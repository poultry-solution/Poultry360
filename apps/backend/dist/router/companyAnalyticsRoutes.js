"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companyAnalyticsController_1 = require("../controller/companyAnalyticsController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
// Get company analytics
router.get("/", companyAnalyticsController_1.getCompanyAnalytics);
exports.default = router;
