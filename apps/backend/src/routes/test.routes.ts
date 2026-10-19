import express from 'express';
import prisma from '../utils/prisma';
import bcrypt from 'bcrypt';
import { UserOnboardingPaymentState } from '@prisma/client';
import { authMiddleware } from '../middelware/middelware';
import {
  getAccountFeatureDefinition,
  setAccountFeature,
} from '../services/accountFeatureService';

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
      prisma.dealerSalePayment.deleteMany({}),
      prisma.dealerSaleItem.deleteMany({}),
      prisma.dealerSale.deleteMany({}),
      prisma.dealerLedgerEntry.deleteMany({}),
      prisma.dealerProductTransaction.deleteMany({}),
      prisma.dealerProduct.deleteMany({}),

      // ==================== FARMER TABLES ====================
      prisma.companyDealerPayment.deleteMany({}),
      prisma.companySaleItem.deleteMany({}),
      prisma.companySale.deleteMany({}),
      prisma.companyLedgerEntry.deleteMany({}),

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
      prisma.batch.deleteMany({}),

      // ==================== FARMS ====================
      prisma.farm.deleteMany({}),

      // ==================== CUSTOMERS ====================
      prisma.customerTransaction.deleteMany({}),
      prisma.customer.deleteMany({}),

      // Note: NOT deleting users, dealers, companies, hatcheries, suppliers
      // because we want to keep the test accounts
    ]);

    console.log('✅ Test database cleaned');

    // 5. Create a dealer-owned manual customer. Dealer customers and Farmer
    // suppliers are separate modules; tests must not invent a cross-account
    // dealer/farmer connection.
    console.log('👤 Creating manual dealer customer...');

    await prisma.customer.create({
      data: {
        userId: dealerUser.id,
        phone: '+9779800000099',
        name: 'Test Manual Customer',
        balance: 0,
        source: 'MANUAL',
      },
    });

    console.log('✅ Manual dealer customer created');

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

/**
 * Test-only equivalent of an admin approving a newly registered account.
 *
 * API tests can create their own account through /auth/register, then call
 * this route as that same account. This keeps test code on the HTTP boundary
 * and avoids the destructive global reset in /setup-users.
 */
router.post('/approve-current-user', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    await prisma.userOnboardingPayment.upsert({
      where: { userId: req.userId },
      create: {
        userId: req.userId,
        state: UserOnboardingPaymentState.PAYMENT_APPROVED,
        lockedUntilApproved: false,
      },
      update: {
        state: UserOnboardingPaymentState.PAYMENT_APPROVED,
        lockedUntilApproved: false,
      },
    });

    return res.json({ success: true, message: 'Test account approved' });
  } catch (error: any) {
    console.error('Test account approval error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * Test-only account feature switch. Some features are intentionally controlled
 * by an admin in normal use, so API tests need a narrow HTTP-only way to turn
 * them on for the account they created.
 */
router.put('/current-user/features/:featureKey', authMiddleware, async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const definition = getAccountFeatureDefinition(req.params.featureKey);
    if (!definition) {
      return res.status(404).json({ success: false, message: 'Feature not found' });
    }
    if (typeof req.body?.enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'enabled must be a boolean' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });
    if (!user || !definition.applicableRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Feature is not available for this account' });
    }

    const feature = await setAccountFeature({
      accountId: req.userId,
      featureKey: definition.key,
      enabled: req.body.enabled,
      updatedById: req.userId,
    });
    return res.json({ success: true, data: feature });
  } catch (error: any) {
    console.error('Test feature update error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
