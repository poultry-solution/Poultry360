"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companyProductController_1 = require("../controller/companyProductController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
// ==================== COMPANY PRODUCT ROUTES ====================
// Create company product
router.post("/", companyProductController_1.createCompanyProduct);
// Get all company products with pagination and filters
router.get("/", companyProductController_1.getCompanyProducts);
// Get company product summary
router.get("/summary", companyProductController_1.getCompanyProductSummary);
// Get company product by ID
router.get("/:id", companyProductController_1.getCompanyProductById);
// Update company product
router.put("/:id", companyProductController_1.updateCompanyProduct);
// Delete company product
router.delete("/:id", companyProductController_1.deleteCompanyProduct);
// Adjust product stock
router.post("/:id/adjust-stock", companyProductController_1.adjustCompanyProductStock);
exports.default = router;
