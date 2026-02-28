import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import farmRoutes from "./farmRoutes";
import batchRoutes from "./batchRoutes";
import dealerRoutes from "./dealerRoutes";
import dealerProductRoutes from "./dealerProductRoutes";
import dealerSaleRoutes from "./dealerSaleRoutes";
import dealerCartRoutes from "./dealerCartRoutes";
import dealerCompanyRoutes from "./dealerCompanyRoutes";
import companyDealerAccountRoutes from "./companyDealerAccountRoutes";
import consignmentRoutes from "./consignmentRoutes";
import dealerLedgerRoutes from "./dealerLedgerRoutes";
import companyProductRoutes from "./companyProductRoutes";
import companySaleRoutes from "./companySaleRoutes";
import companyLedgerRoutes from "./companyLedgerRoutes";
import companyAnalyticsRoutes from "./companyAnalyticsRoutes";
import businessInsightsRoutes from "./businessInsightsRoutes";
import paymentRequestRoutes from "./paymentRequestRoutes";
import medicalSupplierRoutes from "./medicalSupplierRoutes";
import hatcheryRoutes from "./hatcheryRoutes";
import inventoryRoutes from "./inventoryRoutes";
import eggInventoryRoutes from "./eggInventoryRoutes";
import expenseRoutes from "./expenseRoutes";
import salesRoutes from "./salesRoutes";
import reminderRoutes from "./reminderRoutes";
import reminderNotificationRoutes from "./reminderNotificationRoutes";
import notificationActionRoutes from "./notificationActionRoutes";
import dashboardRoutes from "./dashboardRoutes";
import conversationRoutes from "./conversationRoutes";
import messageRoutes from "./messageRoutes";
import doctorRoutes from "./doctorRoutes";
import mortalityRoutes from "./mortalityRoutes";
import batchShareRoutes from "./batchShareRoutes";
import weightRoutes from "./weightRoutes";
import s3Routes from "./s3Routes";
import notificationRoutes from "./notificationRoutes";
import mortalityNotificationRoutes from "./mortalityNotificationRoutes";
import feedNotificationRoutes from "./feedNotificationRoutes";
import expenseNotificationRoutes from "./expenseNotificationRoutes";
import inventoryNotificationRoutes from "./inventoryNotificationRoutes";
import accountRoutes from "./accountRoutes";
import adminCompanyRoutes from "./adminCompanyRoutes";
import adminDealerRoutes from "./adminDealerRoutes";
import publicRoutes from "./publicRoutes";
import dealerVerificationRoutes from "./dealerVerificationRoutes";
import farmerVerificationRoutes from "./farmerVerificationRoutes";
import farmerSaleRequestRoutes from "./farmerSaleRequestRoutes";
import dealerPaymentRequestRoutes from "./dealerPaymentRequestRoutes";
import farmerPaymentRequestRoutes from "./farmerPaymentRequestRoutes";
import dealerFarmerAccountRoutes from "./dealerFarmerAccountRoutes";
import dealerManualCompanyRoutes from "./dealerManualCompanyRoutes";
import farmerCartRoutes from "./farmerCartRoutes";
import farmerPurchaseRequestRoutes from "./farmerPurchaseRequestRoutes";
import dealerPurchaseRequestRoutes from "./dealerPurchaseRequestRoutes";
import uploadRoutes from "./uploadRoutes";

// Test routes (only in test environment)
let testRoutes: express.Router | null = null;
if (process.env.NODE_ENV === 'test') {
  testRoutes = require('../routes/test.routes').default;
}

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/farms", farmRoutes);
router.use("/batches", batchRoutes);
router.use("/dealers", dealerRoutes);
router.use("/dealer/products", dealerProductRoutes);
router.use("/dealer/sales", dealerSaleRoutes);
router.use("/dealer/cart", dealerCartRoutes);
router.use("/dealer/companies", dealerCompanyRoutes);
router.use("/", companyDealerAccountRoutes); // Account routes for both company and dealer
router.use("/consignments", consignmentRoutes);
router.use("/verification", dealerVerificationRoutes);
router.use("/verification", farmerVerificationRoutes);
router.use("/farmer/sale-requests", farmerSaleRequestRoutes);
router.use("/dealer/payment-requests", dealerPaymentRequestRoutes);
router.use("/farmer/payment-requests", farmerPaymentRequestRoutes);
router.use("/dealer/farmer-accounts", dealerFarmerAccountRoutes);
router.use("/dealer/ledger", dealerLedgerRoutes);
router.use("/dealer/manual-companies", dealerManualCompanyRoutes);
router.use("/farmer/cart", farmerCartRoutes);
router.use("/farmer/purchase-requests", farmerPurchaseRequestRoutes);
router.use("/dealer/purchase-requests", dealerPurchaseRequestRoutes);
router.use("/company/products", companyProductRoutes);
router.use("/company/sales", companySaleRoutes);
router.use("/company/ledger", companyLedgerRoutes);
router.use("/company/analytics", companyAnalyticsRoutes);
router.use("/company/insights", businessInsightsRoutes);
router.use("/payment-requests", paymentRequestRoutes);
router.use("/medical-suppliers", medicalSupplierRoutes);
router.use("/hatcheries", hatcheryRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/egg-inventory", eggInventoryRoutes);
router.use("/expenses", expenseRoutes);
router.use("/sales", salesRoutes);
router.use("/reminders", reminderRoutes);
router.use("/reminder-notifications", reminderNotificationRoutes);
router.use("/notification-actions", notificationActionRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);
router.use("/doctors", doctorRoutes);
router.use("/mortalities", mortalityRoutes);
router.use("/batch-share", batchShareRoutes);
router.use("/batches", weightRoutes); // Weight routes for batches
router.use("/s3", s3Routes);
router.use("/notifications", notificationRoutes);
router.use("/mortality-notifications", mortalityNotificationRoutes);
router.use("/feed-notifications", feedNotificationRoutes);
router.use("/expense-notifications", expenseNotificationRoutes);
router.use("/inventory-notifications", inventoryNotificationRoutes);
router.use("/account", accountRoutes);
router.use("/admin/companies", adminCompanyRoutes);
router.use("/admin/dealers", adminDealerRoutes);
router.use("/public", publicRoutes);
router.use("/upload", uploadRoutes);

// Test routes (only in test environment)
if (testRoutes) {
  router.use("/test", testRoutes);
}

export default router;
