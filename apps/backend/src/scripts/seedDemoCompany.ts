import "dotenv/config";
import {
  CompanyDealerAccountAdjustmentCreatedByRole,
  CompanyDealerAccountAdjustmentStatus,
  CompanyDealerAccountAdjustmentType,
  DiscountScope,
  DiscountType,
  InventoryItemType,
  LedgerEntryType,
  NotificationStatus,
  TransactionType,
} from "@prisma/client";
import prisma from "../utils/prisma";
import {
  daysAgo,
  decimal,
  DEMO_ACCOUNTS,
  hashDemoPassword,
  printDemoCredentials,
  upsertById,
  upsertDemoUser,
} from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.company;
const id = (suffix: string) => `p360-demo-company-${suffix}-v1`;

async function seedDemoCompany(): Promise<void> {
  console.log("Seeding production-safe company demo data...");
  const passwordHash = await hashDemoPassword(account);

  await prisma.$transaction(
    async (tx) => {
      const user = await upsertDemoUser(tx, account, passwordHash);
      const company = await upsertById<{ id: string }>(
        tx.company,
        id("business"),
        {
          name: account.businessName,
          address: account.location,
          ownerId: user.id,
        },
      );

      const productSeeds = [
        [
          "product-starter",
          "Pragati Broiler Starter",
          "High-protein starter crumble for the first 14 days",
          InventoryItemType.FEED,
          "Bag",
          3350,
          2940,
          156,
          "PFS-50",
        ],
        [
          "product-grower",
          "Pragati Broiler Grower",
          "Balanced grower pellet for uniform weight gain",
          InventoryItemType.FEED,
          "Bag",
          3475,
          3050,
          184,
          "PFG-50",
        ],
        [
          "product-finisher",
          "Pragati Broiler Finisher",
          "Energy-dense finisher pellet",
          InventoryItemType.FEED,
          "Bag",
          3590,
          3150,
          172,
          "PFF-50",
        ],
        [
          "product-layer",
          "Pragati Layer Mash",
          "Complete feed for commercial laying flocks",
          InventoryItemType.FEED,
          "Bag",
          3420,
          3010,
          126,
          "PFL-50",
        ],
        [
          "product-concentrate",
          "Pragati 10% Concentrate",
          "Protein and mineral concentrate for on-farm mixing",
          InventoryItemType.FEED,
          "Bag",
          5250,
          4620,
          74,
          "PFC-25",
        ],
      ] as const;
      for (const [
        key,
        name,
        description,
        type,
        unit,
        unitSellingPrice,
        unitCostPrice,
        currentStock,
        sku,
      ] of productSeeds) {
        await upsertById(tx.product, id(key), {
          name,
          description,
          type,
          unit,
          unitSellingPrice: decimal(unitSellingPrice),
          unitCostPrice: decimal(unitCostPrice),
          quantity: decimal(currentStock),
          currentStock: decimal(currentStock),
          totalPrice: decimal(currentStock * unitSellingPrice),
          imageUrl: null,
          supplierId: user.id,
        });
        await upsertById(tx.productUnitConversion, id(`${key}-conversion-kg`), {
          productId: id(key),
          unitName: "KG",
          conversionFactor: decimal(0.02),
        });
      }

      const suppliers = [
        [
          "supplier-hilltop",
          "Hilltop Grain Traders",
          "+9779855074001",
          "Birgunj, Parsa",
        ],
        [
          "supplier-terai",
          "Terai Agro Commodities",
          "+9779855074002",
          "Itahari, Sunsari",
        ],
        [
          "supplier-bionutrition",
          "BioNutrition Nepal",
          "+9779855074003",
          "Bhairahawa, Rupandehi",
        ],
        [
          "supplier-packaging",
          "Reliable Packaging Works",
          "+9779855074004",
          "Hetauda, Makwanpur",
        ],
      ] as const;
      for (const [key, name, contact, address] of suppliers) {
        await upsertById(tx.supplier, id(key), {
          name,
          contact,
          address,
          companyId: company.id,
        });
      }

      const rawMaterials = [
        ["raw-maize", "Yellow Maize", "KG", 15000],
        ["raw-soy", "Soybean Meal", "KG", 0],
        ["raw-rice", "Rice Bran", "KG", 8500],
        ["raw-limestone", "Feed-grade Limestone", "KG", 2700],
        ["raw-premix", "Vitamin Mineral Premix", "KG", 150],
        ["raw-oil", "Vegetable Oil", "Liters", 1400],
        ["raw-bags", "Printed Feed Bags", "PCS", 5000],
      ] as const;
      for (const [key, name, unit, currentStock] of rawMaterials) {
        await upsertById(tx.rawMaterial, id(key), {
          name,
          unit,
          currentStock: decimal(currentStock),
          companyId: company.id,
        });
      }

      const purchases = [
        [
          "purchase-grain-old",
          daysAgo(80),
          "HGT-2082-771",
          "Monthly maize and rice bran supply",
          1620000,
          "supplier-hilltop",
        ],
        [
          "purchase-protein",
          daysAgo(70),
          "TAC-2082-889",
          "Soy meal and limestone stock",
          1240000,
          "supplier-terai",
        ],
        [
          "purchase-additives",
          daysAgo(65),
          "BNN-2082-401",
          "Premix and vegetable oil",
          815000,
          "supplier-bionutrition",
        ],
        [
          "purchase-grain-new",
          daysAgo(12),
          "HGT-2083-094",
          "Current-month grain replenishment",
          1184000,
          "supplier-hilltop",
        ],
        [
          "purchase-packaging",
          daysAgo(25),
          "RPW-2083-118",
          "Printed 50 kg feed bags",
          160000,
          "supplier-packaging",
        ],
      ] as const;
      for (const [
        key,
        date,
        referenceNumber,
        notes,
        totalAmount,
        supplierKey,
      ] of purchases) {
        await upsertById(tx.companyPurchase, id(key), {
          date,
          referenceNumber,
          notes,
          totalAmount: decimal(totalAmount),
          companyId: company.id,
          supplierId: id(supplierKey),
          createdById: user.id,
        });
      }

      const purchaseItems = [
        [
          "purchase-item-maize-old",
          "purchase-grain-old",
          "raw-maize",
          30000,
          42,
          1260000,
        ],
        [
          "purchase-item-rice-old",
          "purchase-grain-old",
          "raw-rice",
          10000,
          36,
          360000,
        ],
        [
          "purchase-item-soy",
          "purchase-protein",
          "raw-soy",
          15000,
          78,
          1170000,
        ],
        [
          "purchase-item-limestone",
          "purchase-protein",
          "raw-limestone",
          5000,
          14,
          70000,
        ],
        [
          "purchase-item-premix",
          "purchase-additives",
          "raw-premix",
          1000,
          260,
          260000,
        ],
        [
          "purchase-item-oil",
          "purchase-additives",
          "raw-oil",
          3000,
          185,
          555000,
        ],
        [
          "purchase-item-maize-new",
          "purchase-grain-new",
          "raw-maize",
          20000,
          44,
          880000,
        ],
        [
          "purchase-item-rice-new",
          "purchase-grain-new",
          "raw-rice",
          8000,
          38,
          304000,
        ],
        [
          "purchase-item-bags",
          "purchase-packaging",
          "raw-bags",
          5000,
          32,
          160000,
        ],
      ] as const;
      for (const [
        key,
        purchaseKey,
        rawKey,
        quantity,
        unitPrice,
        totalAmount,
      ] of purchaseItems) {
        await upsertById(tx.companyPurchaseItem, id(key), {
          purchaseId: id(purchaseKey),
          rawMaterialId: id(rawKey),
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
          totalAmount: decimal(totalAmount),
        });
      }

      const supplierPayments = [
        [
          "supplier-payment-hilltop-1",
          1200000,
          "BANK",
          daysAgo(72),
          "First grain payment",
          "NBL-42091",
          "supplier-hilltop",
        ],
        [
          "supplier-payment-hilltop-2",
          900000,
          "BANK",
          daysAgo(5),
          "Current-month grain payment",
          "NBL-49182",
          "supplier-hilltop",
        ],
        [
          "supplier-payment-terai",
          1000000,
          "CHEQUE",
          daysAgo(48),
          "Soy meal supplier payment",
          "CHQ-77110",
          "supplier-terai",
        ],
        [
          "supplier-payment-bio",
          700000,
          "BANK",
          daysAgo(36),
          "Additives supplier payment",
          "NBL-45507",
          "supplier-bionutrition",
        ],
        [
          "supplier-payment-packaging",
          160000,
          "CASH",
          daysAgo(20),
          "Packaging invoice settled",
          "CASH-2083-118",
          "supplier-packaging",
        ],
      ] as const;
      for (const [
        key,
        amount,
        paymentMethod,
        paymentDate,
        notes,
        reference,
        supplierKey,
      ] of supplierPayments) {
        await upsertById(tx.companySupplierPayment, id(key), {
          amount: decimal(amount),
          paymentMethod,
          paymentDate,
          notes,
          reference,
          companyId: company.id,
          supplierId: id(supplierKey),
          recordedById: user.id,
        });
      }

      const productionRuns = [
        [
          "production-starter",
          daysAgo(50),
          "PR-2082-121",
          "Broiler starter production; quality test passed",
        ],
        [
          "production-grower",
          daysAgo(32),
          "PR-2083-014",
          "Broiler grower production",
        ],
        [
          "production-finisher",
          daysAgo(16),
          "PR-2083-039",
          "Broiler finisher production",
        ],
        [
          "production-layer",
          daysAgo(6),
          "PR-2083-058",
          "Layer mash production with improved mineral profile",
        ],
      ] as const;
      for (const [key, date, referenceNumber, notes] of productionRuns) {
        await upsertById(tx.productionRun, id(key), {
          date,
          referenceNumber,
          notes,
          companyId: company.id,
          createdById: user.id,
        });
      }

      const productionInputs = [
        [
          "input-starter-maize",
          "production-starter",
          "raw-maize",
          "supplier-hilltop",
          8000,
          42,
        ],
        [
          "input-starter-rice",
          "production-starter",
          "raw-rice",
          "supplier-hilltop",
          2000,
          36,
        ],
        [
          "input-starter-soy",
          "production-starter",
          "raw-soy",
          "supplier-terai",
          4000,
          78,
        ],
        [
          "input-starter-limestone",
          "production-starter",
          "raw-limestone",
          "supplier-terai",
          400,
          14,
        ],
        [
          "input-starter-premix",
          "production-starter",
          "raw-premix",
          "supplier-bionutrition",
          200,
          260,
        ],
        [
          "input-starter-oil",
          "production-starter",
          "raw-oil",
          "supplier-bionutrition",
          300,
          185,
        ],
        [
          "input-grower-maize",
          "production-grower",
          "raw-maize",
          "supplier-hilltop",
          10000,
          42,
        ],
        [
          "input-grower-rice",
          "production-grower",
          "raw-rice",
          "supplier-hilltop",
          3000,
          36,
        ],
        [
          "input-grower-soy",
          "production-grower",
          "raw-soy",
          "supplier-terai",
          4000,
          78,
        ],
        [
          "input-grower-limestone",
          "production-grower",
          "raw-limestone",
          "supplier-terai",
          500,
          14,
        ],
        [
          "input-grower-premix",
          "production-grower",
          "raw-premix",
          "supplier-bionutrition",
          200,
          260,
        ],
        [
          "input-grower-oil",
          "production-grower",
          "raw-oil",
          "supplier-bionutrition",
          350,
          185,
        ],
        [
          "input-finisher-maize",
          "production-finisher",
          "raw-maize",
          "supplier-hilltop",
          9000,
          42,
        ],
        [
          "input-finisher-rice",
          "production-finisher",
          "raw-rice",
          "supplier-hilltop",
          2000,
          36,
        ],
        [
          "input-finisher-soy",
          "production-finisher",
          "raw-soy",
          "supplier-terai",
          5000,
          78,
        ],
        [
          "input-finisher-limestone",
          "production-finisher",
          "raw-limestone",
          "supplier-terai",
          600,
          14,
        ],
        [
          "input-finisher-premix",
          "production-finisher",
          "raw-premix",
          "supplier-bionutrition",
          250,
          260,
        ],
        [
          "input-finisher-oil",
          "production-finisher",
          "raw-oil",
          "supplier-bionutrition",
          450,
          185,
        ],
        [
          "input-layer-maize",
          "production-layer",
          "raw-maize",
          "supplier-hilltop",
          8000,
          44,
        ],
        [
          "input-layer-rice",
          "production-layer",
          "raw-rice",
          "supplier-hilltop",
          2500,
          38,
        ],
        [
          "input-layer-soy",
          "production-layer",
          "raw-soy",
          "supplier-terai",
          2000,
          78,
        ],
        [
          "input-layer-limestone",
          "production-layer",
          "raw-limestone",
          "supplier-terai",
          800,
          14,
        ],
        [
          "input-layer-premix",
          "production-layer",
          "raw-premix",
          "supplier-bionutrition",
          200,
          260,
        ],
        [
          "input-layer-oil",
          "production-layer",
          "raw-oil",
          "supplier-bionutrition",
          500,
          185,
        ],
      ] as const;
      for (const [
        key,
        productionKey,
        rawKey,
        supplierKey,
        quantity,
        unitPrice,
      ] of productionInputs) {
        await upsertById(tx.productionInput, id(key), {
          productionId: id(productionKey),
          rawMaterialId: id(rawKey),
          supplierId: id(supplierKey),
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
        });
      }

      const outputs = [
        [
          "output-starter",
          "production-starter",
          "product-starter",
          "Pragati Broiler Starter",
          285,
          "Bag",
        ],
        [
          "output-grower",
          "production-grower",
          "product-grower",
          "Pragati Broiler Grower",
          340,
          "Bag",
        ],
        [
          "output-finisher",
          "production-finisher",
          "product-finisher",
          "Pragati Broiler Finisher",
          330,
          "Bag",
        ],
        [
          "output-layer",
          "production-layer",
          "product-layer",
          "Pragati Layer Mash",
          265,
          "Bag",
        ],
        [
          "output-concentrate",
          "production-layer",
          "product-concentrate",
          "Pragati 10% Concentrate",
          90,
          "Bag",
        ],
      ] as const;
      for (const [
        key,
        productionKey,
        productKey,
        productName,
        quantity,
        unit,
      ] of outputs) {
        await upsertById(tx.productionOutput, id(key), {
          productionId: id(productionKey),
          productId: id(productKey),
          productName,
          quantity: decimal(quantity),
          unit,
        });
      }

      const dealers = [
        [
          "dealer-narayani",
          "Narayani Poultry Suppliers",
          "+9779855115001",
          "Bharatpur-10, Chitwan",
        ],
        [
          "dealer-lumbini",
          "Lumbini Agro Feed Centre",
          "+9779855115002",
          "Butwal-8, Rupandehi",
        ],
        [
          "dealer-koshi",
          "Koshi Poultry Trade Link",
          "+9779855115003",
          "Itahari-6, Sunsari",
        ],
      ] as const;
      for (const [key, name, contact, address] of dealers) {
        await upsertById(tx.dealer, id(key), {
          name,
          contact,
          address,
          classification: "COMPANY_CREATED",
          balance: decimal(0),
          totalPurchases: decimal(0),
          totalPayments: decimal(0),
          userId: user.id,
          ownerId: null,
        });
      }

      const accounts = [
        [
          "account-narayani",
          "dealer-narayani",
          483190,
          100000,
          1083190,
          700000,
          750000,
          daysAgo(5),
          daysAgo(2),
        ],
        [
          "account-lumbini",
          "dealer-lumbini",
          196700,
          null,
          896700,
          700000,
          600000,
          daysAgo(22),
          daysAgo(18),
        ],
        [
          "account-koshi",
          "dealer-koshi",
          144250,
          null,
          444250,
          300000,
          400000,
          daysAgo(10),
          daysAgo(7),
        ],
      ] as const;
      for (const [
        key,
        dealerKey,
        balance,
        openingBalanceCurrent,
        totalSales,
        totalPayments,
        balanceLimit,
        lastSaleDate,
        lastPaymentDate,
      ] of accounts) {
        await upsertById(tx.companyDealerAccount, id(key), {
          companyId: company.id,
          dealerId: id(dealerKey),
          balance: decimal(balance),
          openingBalanceCurrent:
            openingBalanceCurrent === null
              ? null
              : decimal(openingBalanceCurrent),
          openingBalanceProposed: null,
          openingBalanceStatus:
            openingBalanceCurrent === null
              ? null
              : CompanyDealerAccountAdjustmentStatus.ACKNOWLEDGED,
          totalSales: decimal(totalSales),
          totalPayments: decimal(totalPayments),
          lastSaleDate,
          lastPaymentDate,
          balanceLimit: decimal(balanceLimit),
          balanceLimitSetAt: daysAgo(60),
          balanceLimitSetBy: user.id,
        });
      }
      await upsertById(
        tx.companyDealerAccountAdjustment,
        id("adjustment-narayani-opening"),
        {
          accountId: id("account-narayani"),
          type: CompanyDealerAccountAdjustmentType.OPENING_BALANCE,
          amount: decimal(100000),
          notes: "Opening balance mutually confirmed during account setup",
          createdByRole: CompanyDealerAccountAdjustmentCreatedByRole.COMPANY,
          createdById: user.id,
          status: CompanyDealerAccountAdjustmentStatus.ACKNOWLEDGED,
          dealerResponseNote: "Balance confirmed",
          respondedAt: daysAgo(89),
          createdAt: daysAgo(90),
        },
      );

      const sales = [
        [
          "sale-lumbini-old",
          "DEMO-C-1001",
          daysAgo(55),
          300000,
          300000,
          false,
          "BANK",
          "Previous-month dealer replenishment",
          "dealer-lumbini",
          "account-lumbini",
          null,
          null,
        ],
        [
          "sale-narayani-1",
          "DEMO-C-1002",
          daysAgo(34),
          615500,
          603190,
          true,
          "CREDIT",
          "Starter and grower feed dispatch",
          "dealer-narayani",
          "account-narayani",
          DiscountType.PERCENT,
          2,
        ],
        [
          "sale-lumbini-2",
          "DEMO-C-1003",
          daysAgo(22),
          596700,
          596700,
          true,
          "CREDIT",
          "Finisher and layer feed dispatch",
          "dealer-lumbini",
          "account-lumbini",
          null,
          null,
        ],
        [
          "sale-koshi",
          "DEMO-C-1004",
          daysAgo(10),
          444250,
          444250,
          true,
          "CREDIT",
          "Eastern region dealer dispatch",
          "dealer-koshi",
          "account-koshi",
          null,
          null,
        ],
        [
          "sale-narayani-2",
          "DEMO-C-1005",
          daysAgo(5),
          491550,
          480000,
          true,
          "CREDIT",
          "Finisher and layer stock replenishment",
          "dealer-narayani",
          "account-narayani",
          DiscountType.FLAT,
          11550,
        ],
      ] as const;
      for (const [
        key,
        invoiceNumber,
        date,
        subtotalAmount,
        totalAmount,
        isCredit,
        paymentMethod,
        notes,
        dealerKey,
        accountKey,
      ] of sales) {
        await upsertById(tx.companySale, id(key), {
          invoiceNumber,
          date,
          subtotalAmount:
            subtotalAmount === totalAmount ? null : decimal(subtotalAmount),
          totalAmount: decimal(totalAmount),
          isCredit,
          paymentMethod,
          notes,
          companyId: company.id,
          dealerId: id(dealerKey),
          soldById: user.id,
          accountId: id(accountKey),
          invoiceImageUrl: null,
        });
      }

      const saleItems = [
        [
          "sale-item-old-starter",
          "sale-lumbini-old",
          "product-starter",
          50,
          3350,
          167500,
        ],
        [
          "sale-item-old-concentrate",
          "sale-lumbini-old",
          "product-concentrate",
          25,
          5300,
          132500,
        ],
        [
          "sale-item-n1-starter",
          "sale-narayani-1",
          "product-starter",
          80,
          3350,
          262640,
        ],
        [
          "sale-item-n1-grower",
          "sale-narayani-1",
          "product-grower",
          100,
          3475,
          340550,
        ],
        [
          "sale-item-l2-finisher",
          "sale-lumbini-2",
          "product-finisher",
          90,
          3590,
          323100,
        ],
        [
          "sale-item-l2-layer",
          "sale-lumbini-2",
          "product-layer",
          80,
          3420,
          273600,
        ],
        [
          "sale-item-k-starter",
          "sale-koshi",
          "product-starter",
          60,
          3350,
          201000,
        ],
        [
          "sale-item-k-grower",
          "sale-koshi",
          "product-grower",
          70,
          3475,
          243250,
        ],
        [
          "sale-item-n2-finisher",
          "sale-narayani-2",
          "product-finisher",
          75,
          3590,
          262920,
        ],
        [
          "sale-item-n2-layer",
          "sale-narayani-2",
          "product-layer",
          65,
          3420,
          217080,
        ],
      ] as const;
      for (const [
        key,
        saleKey,
        productKey,
        quantity,
        unitPrice,
        totalAmount,
      ] of saleItems) {
        await upsertById(tx.companySaleItem, id(key), {
          saleId: id(saleKey),
          productId: id(productKey),
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
          totalAmount: decimal(totalAmount),
          unit: "Bag",
          baseQuantity: decimal(quantity),
        });
      }

      await upsertById(tx.saleDiscount, id("discount-narayani-1"), {
        type: DiscountType.PERCENT,
        value: decimal(2),
        scope: DiscountScope.SALE,
        dealerSaleId: null,
        companySaleId: id("sale-narayani-1"),
      });
      await upsertById(tx.saleDiscount, id("discount-narayani-2"), {
        type: DiscountType.FLAT,
        value: decimal(11550),
        scope: DiscountScope.SALE,
        dealerSaleId: null,
        companySaleId: id("sale-narayani-2"),
      });

      const payments = [
        [
          "payment-lumbini-1",
          "account-lumbini",
          250000,
          "BANK",
          daysAgo(50),
          "Payment against DEMO-C-1001",
          "NBL-D-7781",
          50000,
        ],
        [
          "payment-narayani-1",
          "account-narayani",
          400000,
          "BANK",
          daysAgo(30),
          "First collection",
          "NBL-D-8027",
          303190,
        ],
        [
          "payment-lumbini-2",
          "account-lumbini",
          450000,
          "CHEQUE",
          daysAgo(18),
          "Dealer account settlement",
          "CHQ-D-3812",
          196700,
        ],
        [
          "payment-koshi",
          "account-koshi",
          300000,
          "BANK",
          daysAgo(7),
          "Eastern dealer collection",
          "NBL-D-8449",
          144250,
        ],
        [
          "payment-narayani-2",
          "account-narayani",
          300000,
          "CHEQUE",
          daysAgo(2),
          "Second collection",
          "CHQ-D-4190",
          483190,
        ],
      ] as const;
      for (const [
        key,
        accountKey,
        amount,
        paymentMethod,
        paymentDate,
        notes,
        reference,
        balanceAfter,
      ] of payments) {
        await upsertById(tx.companyDealerPayment, id(key), {
          accountId: id(accountKey),
          amount: decimal(amount),
          paymentMethod,
          paymentDate,
          notes,
          reference,
          receiptImageUrl: null,
          proofImageUrl: null,
          balanceAfter: decimal(balanceAfter),
          recordedById: user.id,
        });
      }

      const ledgerEntries = [
        [
          "ledger-opening",
          LedgerEntryType.OPENING_BALANCE,
          100000,
          100000,
          daysAgo(90),
          "Opening balance - Narayani Poultry Suppliers",
          null,
          "dealer-narayani",
          TransactionType.OPENING_BALANCE,
          null,
        ],
        [
          "ledger-sale-old",
          LedgerEntryType.SALE,
          300000,
          400000,
          daysAgo(55),
          "Sale DEMO-C-1001",
          "sale-lumbini-old",
          "dealer-lumbini",
          TransactionType.SALE,
          null,
        ],
        [
          "ledger-pay-l1",
          LedgerEntryType.PAYMENT_RECEIVED,
          250000,
          150000,
          daysAgo(50),
          "Payment from Lumbini Agro Feed Centre",
          null,
          "dealer-lumbini",
          TransactionType.PAYMENT,
          "payment-lumbini-1",
        ],
        [
          "ledger-sale-n1",
          LedgerEntryType.SALE,
          603190,
          753190,
          daysAgo(34),
          "Sale DEMO-C-1002",
          "sale-narayani-1",
          "dealer-narayani",
          TransactionType.SALE,
          null,
        ],
        [
          "ledger-pay-n1",
          LedgerEntryType.PAYMENT_RECEIVED,
          400000,
          353190,
          daysAgo(30),
          "Payment from Narayani Poultry Suppliers",
          null,
          "dealer-narayani",
          TransactionType.PAYMENT,
          "payment-narayani-1",
        ],
        [
          "ledger-sale-l2",
          LedgerEntryType.SALE,
          596700,
          949890,
          daysAgo(22),
          "Sale DEMO-C-1003",
          "sale-lumbini-2",
          "dealer-lumbini",
          TransactionType.SALE,
          null,
        ],
        [
          "ledger-pay-l2",
          LedgerEntryType.PAYMENT_RECEIVED,
          450000,
          499890,
          daysAgo(18),
          "Payment from Lumbini Agro Feed Centre",
          null,
          "dealer-lumbini",
          TransactionType.PAYMENT,
          "payment-lumbini-2",
        ],
        [
          "ledger-sale-k",
          LedgerEntryType.SALE,
          444250,
          944140,
          daysAgo(10),
          "Sale DEMO-C-1004",
          "sale-koshi",
          "dealer-koshi",
          TransactionType.SALE,
          null,
        ],
        [
          "ledger-pay-k",
          LedgerEntryType.PAYMENT_RECEIVED,
          300000,
          644140,
          daysAgo(7),
          "Payment from Koshi Poultry Trade Link",
          null,
          "dealer-koshi",
          TransactionType.PAYMENT,
          "payment-koshi",
        ],
        [
          "ledger-sale-n2",
          LedgerEntryType.SALE,
          480000,
          1124140,
          daysAgo(5),
          "Sale DEMO-C-1005",
          "sale-narayani-2",
          "dealer-narayani",
          TransactionType.SALE,
          null,
        ],
        [
          "ledger-pay-n2",
          LedgerEntryType.PAYMENT_RECEIVED,
          300000,
          824140,
          daysAgo(2),
          "Payment from Narayani Poultry Suppliers",
          null,
          "dealer-narayani",
          TransactionType.PAYMENT,
          "payment-narayani-2",
        ],
      ] as const;
      for (const [
        key,
        entryType,
        amount,
        runningBalance,
        date,
        description,
        saleKey,
        dealerKey,
        transactionType,
        paymentKey,
      ] of ledgerEntries) {
        await upsertById(tx.companyLedgerEntry, id(key), {
          type: entryType,
          amount: decimal(amount),
          runningBalance: decimal(runningBalance),
          date,
          description,
          companyId: company.id,
          companySaleId: saleKey === null ? null : id(saleKey),
          partyId: id(dealerKey),
          partyType: "DEALER",
          transactionId:
            paymentKey === null
              ? saleKey === null
                ? id("adjustment-narayani-opening")
                : id(saleKey)
              : id(paymentKey),
          transactionType,
          entryType,
          createdAt: date,
        });
      }

      const dealerProducts = [
        [
          "dealer-product-narayani-starter",
          "dealer-narayani",
          "product-starter",
          "Pragati Broiler Starter",
          InventoryItemType.FEED,
          3350,
          3800,
          44,
        ],
        [
          "dealer-product-narayani-grower",
          "dealer-narayani",
          "product-grower",
          "Pragati Broiler Grower",
          InventoryItemType.FEED,
          3475,
          3975,
          58,
        ],
        [
          "dealer-product-lumbini-finisher",
          "dealer-lumbini",
          "product-finisher",
          "Pragati Broiler Finisher",
          InventoryItemType.FEED,
          3590,
          4100,
          37,
        ],
        [
          "dealer-product-koshi-layer",
          "dealer-koshi",
          "product-layer",
          "Pragati Layer Mash",
          InventoryItemType.FEED,
          3420,
          3900,
          52,
        ],
      ] as const;
      for (const [
        key,
        dealerKey,
        productKey,
        name,
        type,
        costPrice,
        sellingPrice,
        currentStock,
      ] of dealerProducts) {
        await upsertById(tx.dealerProduct, id(key), {
          name,
          description: `Inventory supplied by ${account.businessName}`,
          type,
          unit: "Bag",
          costPrice: decimal(costPrice),
          sellingPrice: decimal(sellingPrice),
          currentStock: decimal(currentStock),
          hiddenAt: null,
          minStock: decimal(15),
          sku: `DEMO-${key.toUpperCase()}`,
          dealerId: id(dealerKey),
          manualCompanyId: null,
          supplierCompanyId: company.id,
          companyProductId: id(productKey),
        });
      }

      const notifications = [
        [
          "notification-soy",
          "LOW_RAW_MATERIAL",
          "Soybean meal stock is fully allocated",
          "Create a soybean meal purchase before the next production run.",
          NotificationStatus.UNREAD,
          daysAgo(0),
          { url: "/company/dashboard/purchases" },
        ],
        [
          "notification-payment",
          "PAYMENT_RECEIVED",
          "Narayani dealer payment received",
          "NPR 300,000 cheque payment was recorded.",
          NotificationStatus.UNREAD,
          daysAgo(2),
          { url: "/company/dashboard/payments" },
        ],
        [
          "notification-production",
          "PRODUCTION_COMPLETE",
          "Layer mash run completed",
          "PR-2083-058 added 265 bags of layer mash.",
          NotificationStatus.READ,
          daysAgo(6),
          { url: "/company/dashboard/production" },
        ],
      ] as const;
      for (const [
        key,
        type,
        title,
        body,
        status,
        createdAt,
        data,
      ] of notifications) {
        await upsertById(tx.notification, id(key), {
          userId: user.id,
          type,
          title,
          body,
          data,
          status,
          createdAt,
          readAt: status === NotificationStatus.READ ? daysAgo(5) : null,
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  printDemoCredentials("Company", account);
}

seedDemoCompany()
  .catch((error) => {
    console.error("Company demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
