import express from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import farmRoutes from "./farmRoutes";
import batchRoutes from "./batchRoutes";
import dealerRoutes from "./dealerRoutes";
import dealerProductRoutes from "./dealerProductRoutes";
import dealerSaleRoutes from "./dealerSaleRoutes";
import companyDealerAccountRoutes from "./companyDealerAccountRoutes";
import dealerLedgerRoutes from "./dealerLedgerRoutes";
import dealerCashInHandRoutes from "./dealerCashInHandRoutes";
import farmerCashInHandRoutes from "./farmerCashInHandRoutes";
import companyProductRoutes from "./companyProductRoutes";
import companySaleRoutes from "./companySaleRoutes";
import companySupplierRoutes from "./companySupplierRoutes";
import companyRawMaterialRoutes from "./companyRawMaterialRoutes";
import companyPurchaseRoutes from "./companyPurchaseRoutes";
import companyProductionRoutes from "./companyProductionRoutes";
import companyLedgerRoutes from "./companyLedgerRoutes";
import companyAnalyticsRoutes from "./companyAnalyticsRoutes";
import inventoryRoutes from "./inventoryRoutes";
import eggInventoryRoutes from "./eggInventoryRoutes";
import eggTypeRoutes from "./eggTypeRoutes";
import expenseRoutes from "./expenseRoutes";
import salesRoutes from "./salesRoutes";
import dashboardRoutes from "./dashboardRoutes";
import analyticsRoutes from "./analyticsRoutes";
import conversationRoutes from "./conversationRoutes";
import messageRoutes from "./messageRoutes";
import doctorRoutes from "./doctorRoutes";
import mortalityRoutes from "./mortalityRoutes";
import batchShareRoutes from "./batchShareRoutes";
import weightRoutes from "./weightRoutes";
import s3Routes from "./s3Routes";
import accountRoutes from "./accountRoutes";
import adminCompanyRoutes from "./adminCompanyRoutes";
import adminDealerRoutes from "./adminDealerRoutes";
import adminUserRoutes from "./adminUserRoutes";
import adminBlogPostRoutes from "./adminBlogPostRoutes";
import adminPaymentApprovalsRoutes from "./adminPaymentApprovalsRoutes";
import adminDemoEnquiryRoutes from "./adminDemoEnquiryRoutes";
import adminLandingReviewRoutes from "./adminLandingReviewRoutes";
import publicRoutes from "./publicRoutes";
import dealerManualCompanyRoutes from "./dealerManualCompanyRoutes";
import uploadRoutes from "./uploadRoutes";
import reminderRoutes from "./reminderRoutes";
import listForSaleRoutes from "./listForSaleRoutes";
import staffRoutes from "./staffRoutes";
import pushRoutes from "./pushRoutes";
import notificationRoutes from "./notificationRoutes";
import onboardingPaymentRoutes from "./onboardingPaymentRoutes";
import hatcherySupplierRoutes from "./hatcherySupplierRoutes";
import hatcheryInventoryRoutes from "./hatcheryInventoryRoutes";
import hatcheryBatchRoutes from "./hatcheryBatchRoutes";
import hatcheryEggTypeRoutes from "./hatcheryEggTypeRoutes";
import hatcheryIncubationRoutes from "./hatcheryIncubationRoutes";
import hatcheryPartyRoutes from "./hatcheryPartyRoutes";
import hatcheryAnalyticsRoutes from "./hatcheryAnalyticsRoutes";

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
router.use("/", companyDealerAccountRoutes); // Account routes for both company and dealer
router.use("/dealer/ledger", dealerLedgerRoutes);
router.use("/dealer/cash-in-hand", dealerCashInHandRoutes);
router.use("/farmer/cash-in-hand", farmerCashInHandRoutes);
router.use("/dealer/manual-companies", dealerManualCompanyRoutes);
router.use("/company/products", companyProductRoutes);
router.use("/company/sales", companySaleRoutes);
router.use("/company/suppliers", companySupplierRoutes);
router.use("/company/raw-materials", companyRawMaterialRoutes);
router.use("/company/purchases", companyPurchaseRoutes);
router.use("/company/production", companyProductionRoutes);
router.use("/company/ledger", companyLedgerRoutes);
router.use("/company/analytics", companyAnalyticsRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/egg-inventory", eggInventoryRoutes);
router.use("/egg-types", eggTypeRoutes);
router.use("/expenses", expenseRoutes);
router.use("/sales", salesRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);
router.use("/doctors", doctorRoutes);
router.use("/mortalities", mortalityRoutes);
router.use("/batch-share", batchShareRoutes);
router.use("/batches", weightRoutes); // Weight routes for batches
router.use("/s3", s3Routes);
router.use("/account", accountRoutes);
router.use("/admin/companies", adminCompanyRoutes);
router.use("/admin/dealers", adminDealerRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/blog-posts", adminBlogPostRoutes);
router.use("/admin/payment-approvals", adminPaymentApprovalsRoutes);
router.use("/admin/demo-enquiries", adminDemoEnquiryRoutes);
router.use("/admin/landing-reviews", adminLandingReviewRoutes);
router.use("/onboarding/payment", onboardingPaymentRoutes);
router.use("/hatchery/suppliers", hatcherySupplierRoutes);
router.use("/hatchery/inventory", hatcheryInventoryRoutes);
router.use("/hatchery/batches", hatcheryBatchRoutes);
router.use("/hatchery/egg-types", hatcheryEggTypeRoutes);
router.use("/", hatcheryIncubationRoutes);
router.use("/", hatcheryPartyRoutes);
router.use("/hatchery/staff", staffRoutes);
router.use("/hatchery/analytics", hatcheryAnalyticsRoutes);
router.use("/public", publicRoutes);
router.use("/upload", uploadRoutes);
router.use("/reminders", reminderRoutes);
router.use("/farmer/list-for-sale", listForSaleRoutes);
router.use("/farmer/staff", staffRoutes);
router.use("/dealer/staff", staffRoutes);
router.use("/push", pushRoutes);
router.use("/notifications", notificationRoutes);

// Test routes (only in test environment)
if (testRoutes) {
  router.use("/test", testRoutes);
}

export default router;
