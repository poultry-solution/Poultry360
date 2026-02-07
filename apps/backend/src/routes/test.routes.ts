import express from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';

const router = express.Router();

// Only enable in test environment
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Test routes should only be loaded in test environment');
}

interface TestUserSetup {
  dealerPhone: string;
  dealerPassword: string;
  dealerName: string;
  farmerPhone: string;
  farmerPassword: string;
  farmerName: string;
}

/**
 * POST /api/v1/test/setup-users
 * Create test users if they don't exist, connect them, and clean their data
 */
router.post('/setup-users', async (req, res) => {
  try {
    const {
      dealerPhone,
      dealerPassword,
      dealerName,
      farmerPhone,
      farmerPassword,
      farmerName,
    } = req.body as TestUserSetup;

    console.log('🔧 Setting up test users...');

    // 1. Create or get dealer user
    let dealerUser = await prisma.user.findUnique({
      where: { phone: dealerPhone },
      include: { dealer: true },
    });

    if (!dealerUser) {
      console.log('📝 Creating dealer user...');
      const hashedPassword = await bcrypt.hash(dealerPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          phone: dealerPhone,
          password: hashedPassword,
          name: dealerName,
          role: 'DEALER',
        },
      });

      // Create dealer profile
      await prisma.dealer.create({
        data: {
          name: dealerName,
          contact: dealerPhone,
          address: 'Test Location',
          ownerId: newUser.id,
        },
      });

      // Reload with dealer relation
      dealerUser = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: { dealer: true },
      });

      console.log('✅ Dealer created');
    }

    if (!dealerUser?.dealer) {
      throw new Error('Dealer profile not found');
    }

    // 2. Create or get farmer user
    let farmerUser = await prisma.user.findUnique({
      where: { phone: farmerPhone },
    });

    if (!farmerUser) {
      console.log('📝 Creating farmer user...');
      const hashedPassword = await bcrypt.hash(farmerPassword, 10);

      farmerUser = await prisma.user.create({
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

    await prisma.$transaction([
      // ==================== DEALER TABLES ====================
      prisma.dealerSalePaymentRequest.deleteMany({}),
      prisma.dealerSalePayment.deleteMany({}),
      prisma.dealerSaleRequestItem.deleteMany({}),
      prisma.dealerSaleRequest.deleteMany({}),
      prisma.dealerSaleItem.deleteMany({}),
      prisma.dealerSale.deleteMany({}),
      prisma.dealerLedgerEntry.deleteMany({}),
      prisma.dealerProductTransaction.deleteMany({}),
      prisma.dealerProduct.deleteMany({}),
      prisma.dealerVerificationRequest.deleteMany({}),
      prisma.dealerFarmer.deleteMany({}),

      // ==================== FARMER TABLES ====================
      prisma.farmerVerificationRequest.deleteMany({}),

      // ==================== COMPANY TABLES ====================
      prisma.companyDealerPayment.deleteMany({}),
      prisma.companySaleItem.deleteMany({}),
      prisma.companySale.deleteMany({}),
      prisma.companyLedgerEntry.deleteMany({}),
      prisma.dealerCompany.deleteMany({}),

      // ==================== CONSIGNMENT TABLES ====================
      prisma.consignmentAuditLog.deleteMany({}),
      prisma.consignmentItem.deleteMany({}),
      prisma.consignmentRequest.deleteMany({}),

      // ==================== PAYMENT REQUESTS ====================
      prisma.paymentRequest.deleteMany({}),

      // ==================== AUDIT LOGS ====================
      prisma.auditLog.deleteMany({}),

      // ==================== INVENTORY & TRANSACTIONS ====================
      prisma.entityTransaction.deleteMany({}),
      prisma.inventoryUsage.deleteMany({}),
      prisma.inventoryTransaction.deleteMany({}),
      prisma.inventoryItem.deleteMany({}),

      // ==================== EXPENSES ====================
      prisma.expense.deleteMany({}),

      // ==================== SALES ====================
      prisma.salePayment.deleteMany({}),
      prisma.sale.deleteMany({}),

      // ==================== BATCH RELATED ====================
      prisma.vaccination.deleteMany({}),
      prisma.mortality.deleteMany({}),
      prisma.birdWeight.deleteMany({}),
      prisma.feedConsumption.deleteMany({}),
      prisma.batchShareView.deleteMany({}),
      prisma.batchShare.deleteMany({}),
      prisma.batch.deleteMany({}),

      // ==================== FARMS ====================
      prisma.farm.deleteMany({}),

      // ==================== CONVERSATIONS & MESSAGES ====================
      prisma.message.deleteMany({}),
      prisma.conversation.deleteMany({}),

      // ==================== NOTIFICATIONS & REMINDERS ====================
      prisma.notification.deleteMany({}),
      prisma.reminder.deleteMany({}),

      // ==================== CUSTOMERS ====================
      prisma.customerTransaction.deleteMany({}),
      prisma.customer.deleteMany({}),

      // Note: NOT deleting users, dealers, companies, hatcheries, suppliers
      // because we want to keep the test accounts
    ]);

    console.log('✅ Test database cleaned');

    // 5. Recreate dealer-farmer connection (was deleted in cleanup)
    console.log('🔗 Reconnecting dealer and farmer...');

    await prisma.customer.create({
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
    const existingProduct = await prisma.dealerProduct.findFirst({
      where: {
        dealerId: dealerUser.dealer.id,
        name: 'Test Product',
      },
    });

    if (!existingProduct) {
      console.log('📦 Creating default test product...');
      await prisma.dealerProduct.create({
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
  } catch (error: any) {
    console.error('❌ Error setting up test users:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
