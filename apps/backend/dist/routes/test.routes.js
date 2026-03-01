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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.default.Router();
// Only enable in test environment
if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test routes should only be loaded in test environment');
}
/**
 * POST /api/v1/test/setup-users
 * Create test users if they don't exist, connect them, and clean their data
 */
router.post('/setup-users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dealerPhone, dealerPassword, dealerName, farmerPhone, farmerPassword, farmerName, } = req.body;
        console.log('🔧 Setting up test users...');
        // 1. Create or get dealer user
        let dealerUser = yield prisma_1.default.user.findUnique({
            where: { phone: dealerPhone },
            include: { dealer: true },
        });
        if (!dealerUser) {
            console.log('📝 Creating dealer user...');
            const hashedPassword = yield bcrypt_1.default.hash(dealerPassword, 10);
            const newUser = yield prisma_1.default.user.create({
                data: {
                    phone: dealerPhone,
                    password: hashedPassword,
                    name: dealerName,
                    role: 'DEALER',
                },
            });
            // Create dealer profile
            yield prisma_1.default.dealer.create({
                data: {
                    name: dealerName,
                    contact: dealerPhone,
                    address: 'Test Location',
                    ownerId: newUser.id,
                },
            });
            // Reload with dealer relation
            dealerUser = yield prisma_1.default.user.findUnique({
                where: { id: newUser.id },
                include: { dealer: true },
            });
            console.log('✅ Dealer created');
        }
        if (!(dealerUser === null || dealerUser === void 0 ? void 0 : dealerUser.dealer)) {
            throw new Error('Dealer profile not found');
        }
        // 2. Create or get farmer user
        let farmerUser = yield prisma_1.default.user.findUnique({
            where: { phone: farmerPhone },
        });
        if (!farmerUser) {
            console.log('📝 Creating farmer user...');
            const hashedPassword = yield bcrypt_1.default.hash(farmerPassword, 10);
            farmerUser = yield prisma_1.default.user.create({
                data: {
                    phone: farmerPhone,
                    password: hashedPassword,
                    name: farmerName,
                    role: 'OWNER',
                },
            });
            console.log('✅ Farmer created');
        }
        // 3. NUCLEAR OPTION - Clear ENTIRE test database (like prisma migrate reset)
        console.log('☢️  RESETTING ENTIRE TEST DATABASE...');
        yield prisma_1.default.$transaction([
            // ==================== DEALER TABLES ====================
            prisma_1.default.dealerSalePaymentRequest.deleteMany({}),
            prisma_1.default.dealerSalePayment.deleteMany({}),
            prisma_1.default.dealerSaleRequestItem.deleteMany({}),
            prisma_1.default.dealerSaleRequest.deleteMany({}),
            prisma_1.default.dealerSaleItem.deleteMany({}),
            prisma_1.default.dealerSale.deleteMany({}),
            prisma_1.default.dealerLedgerEntry.deleteMany({}),
            prisma_1.default.dealerProductTransaction.deleteMany({}),
            prisma_1.default.dealerProduct.deleteMany({}),
            prisma_1.default.dealerVerificationRequest.deleteMany({}),
            prisma_1.default.dealerFarmer.deleteMany({}),
            // ==================== FARMER TABLES ====================
            prisma_1.default.farmerVerificationRequest.deleteMany({}),
            // ==================== COMPANY TABLES ====================
            prisma_1.default.companyDealerPayment.deleteMany({}),
            prisma_1.default.companySaleItem.deleteMany({}),
            prisma_1.default.companySale.deleteMany({}),
            prisma_1.default.companyLedgerEntry.deleteMany({}),
            prisma_1.default.dealerCompany.deleteMany({}),
            // ==================== CONSIGNMENT TABLES ====================
            prisma_1.default.consignmentAuditLog.deleteMany({}),
            prisma_1.default.consignmentItem.deleteMany({}),
            prisma_1.default.consignmentRequest.deleteMany({}),
            // ==================== PAYMENT REQUESTS ====================
            prisma_1.default.paymentRequest.deleteMany({}),
            // ==================== AUDIT LOGS ====================
            prisma_1.default.auditLog.deleteMany({}),
            // ==================== INVENTORY & TRANSACTIONS ====================
            prisma_1.default.entityTransaction.deleteMany({}),
            prisma_1.default.inventoryUsage.deleteMany({}),
            prisma_1.default.inventoryTransaction.deleteMany({}),
            prisma_1.default.inventoryItem.deleteMany({}),
            // ==================== EXPENSES ====================
            prisma_1.default.expense.deleteMany({}),
            // ==================== SALES ====================
            prisma_1.default.salePayment.deleteMany({}),
            prisma_1.default.sale.deleteMany({}),
            // ==================== BATCH RELATED ====================
            prisma_1.default.vaccination.deleteMany({}),
            prisma_1.default.mortality.deleteMany({}),
            prisma_1.default.birdWeight.deleteMany({}),
            prisma_1.default.feedConsumption.deleteMany({}),
            prisma_1.default.batchShareView.deleteMany({}),
            prisma_1.default.batchShare.deleteMany({}),
            prisma_1.default.batch.deleteMany({}),
            // ==================== FARMS ====================
            prisma_1.default.farm.deleteMany({}),
            // ==================== CONVERSATIONS & MESSAGES ====================
            prisma_1.default.message.deleteMany({}),
            prisma_1.default.conversation.deleteMany({}),
            // ==================== CUSTOMERS ====================
            prisma_1.default.customerTransaction.deleteMany({}),
            prisma_1.default.customer.deleteMany({}),
            // Note: NOT deleting users, dealers, companies, hatcheries, suppliers
            // because we want to keep the test accounts
        ]);
        console.log('✅ Test database cleaned');
        // 5. Recreate dealer-farmer connection (was deleted in cleanup)
        console.log('🔗 Reconnecting dealer and farmer...');
        yield prisma_1.default.customer.create({
            data: {
                userId: dealerUser.id,
                farmerId: farmerUser.id,
                phone: farmerUser.phone,
                name: farmerUser.name,
                balance: 0,
                source: 'CONNECTED',
            },
        });
        console.log('✅ Dealer and farmer connected');
        // 6. Create a default product for testing (optional, tests can create their own)
        const existingProduct = yield prisma_1.default.dealerProduct.findFirst({
            where: {
                dealerId: dealerUser.dealer.id,
                name: 'Test Product',
            },
        });
        if (!existingProduct) {
            console.log('📦 Creating default test product...');
            yield prisma_1.default.dealerProduct.create({
                data: {
                    name: 'Test Product',
                    description: 'Default product for testing',
                    type: 'FEED',
                    unit: 'kg',
                    costPrice: 80,
                    sellingPrice: 100,
                    currentStock: 1000,
                    dealerId: dealerUser.dealer.id,
                },
            });
            console.log('✅ Test product created');
        }
        res.status(200).json({
            success: true,
            message: 'Test database reset complete - clean slate ready!',
            data: {
                dealerId: dealerUser.dealer.id,
                farmerId: farmerUser.id,
            },
        });
    }
    catch (error) {
        console.error('❌ Error setting up test users:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}));
exports.default = router;
