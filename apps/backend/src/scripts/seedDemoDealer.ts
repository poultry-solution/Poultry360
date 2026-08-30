import "dotenv/config";
import {
  CashDayCloseSource,
  CashMovementDirection,
  DealerManualCompanyAdjustmentType,
  DiscountScope,
  DiscountType,
  InventoryItemType,
  LedgerEntryType,
  NotificationStatus,
  StaffStatus,
  TransactionType,
} from "@prisma/client";
import prisma from "../utils/prisma";
import {
  bsDates,
  daysAgo,
  decimal,
  DEMO_ACCOUNTS,
  hashDemoPassword,
  printDemoCredentials,
  upsertById,
  upsertDemoUser,
} from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.dealer;
const id = (suffix: string) => `p360-demo-dealer-${suffix}-v1`;

async function seedDemoDealer(): Promise<void> {
  console.log("Seeding production-safe dealer demo data...");
  const passwordHash = await hashDemoPassword(account);
  const cashDates = bsDates(8);

  await prisma.$transaction(
    async (tx) => {
      const user = await upsertDemoUser(tx, account, passwordHash);
      const dealer = await upsertById<{ id: string }>(
        tx.dealer,
        id("business"),
        {
          name: account.businessName,
          contact: account.phone,
          address: account.location,
          classification: "REGISTERED",
          balance: decimal(0),
          totalPurchases: decimal(0),
          totalPayments: decimal(0),
          userId: null,
          ownerId: user.id,
        },
      );

      const companies = [
        [
          "company-pragati",
          "Pragati Feed Industries",
          "+9779855013001",
          "Hetauda Industrial Area",
          350000,
          1300000,
          1000000,
        ],
        [
          "company-everest",
          "Everest Poultry Pharma",
          "+9779855013002",
          "Birgunj, Parsa",
          40000,
          220000,
          180000,
        ],
        [
          "company-agro",
          "Agro Equipment Nepal",
          "+9779855013003",
          "Bharatpur-4, Chitwan",
          0,
          150000,
          150000,
        ],
      ] as const;
      for (const [
        key,
        name,
        phone,
        address,
        balance,
        totalPurchases,
        totalPayments,
      ] of companies) {
        await upsertById(tx.dealerManualCompany, id(key), {
          name,
          phone,
          address,
          dealerId: dealer.id,
          archivedAt: null,
          archivedById: null,
          balance: decimal(balance),
          totalPurchases: decimal(totalPurchases),
          totalPayments: decimal(totalPayments),
        });
      }

      const productSeeds = [
        [
          "product-starter",
          "Pragati Broiler Starter",
          "High-protein starter crumble",
          InventoryItemType.FEED,
          "Bag",
          3350,
          3800,
          148,
          30,
          "PFS-START-50",
          id("company-pragati"),
        ],
        [
          "product-grower",
          "Pragati Broiler Grower",
          "Balanced grower pellet",
          InventoryItemType.FEED,
          "Bag",
          3475,
          3975,
          176,
          35,
          "PFG-GROW-50",
          id("company-pragati"),
        ],
        [
          "product-finisher",
          "Pragati Broiler Finisher",
          "Energy-dense finisher pellet",
          InventoryItemType.FEED,
          "Bag",
          3590,
          4100,
          92,
          25,
          "PFF-FIN-50",
          id("company-pragati"),
        ],
        [
          "product-layer",
          "Pragati Layer Mash",
          "Layer feed with calcium and minerals",
          InventoryItemType.FEED,
          "Bag",
          3420,
          3900,
          121,
          30,
          "PFL-LAY-50",
          id("company-pragati"),
        ],
        [
          "product-calcium",
          "Layer Calcium Plus",
          "Shell-strength mineral supplement",
          InventoryItemType.MEDICINE,
          "Packet",
          640,
          900,
          54,
          15,
          "EPP-CAL-1",
          id("company-everest"),
        ],
        [
          "product-vitamin",
          "Poultry Vitamin AD3E",
          "Water-soluble vitamin supplement",
          InventoryItemType.MEDICINE,
          "Bottle",
          310,
          480,
          68,
          18,
          "EPP-AD3E",
          id("company-everest"),
        ],
        [
          "product-disinfectant",
          "BioSafe Disinfectant",
          "Farm biosecurity concentrate",
          InventoryItemType.MEDICINE,
          "Bottle",
          520,
          760,
          16,
          12,
          "EPP-BIO",
          id("company-everest"),
        ],
        [
          "product-feeder",
          "Automatic Pan Feeder",
          "Durable 14 kg poultry feeder",
          InventoryItemType.EQUIPMENT,
          "PCS",
          1150,
          1550,
          24,
          8,
          "AEN-PF14",
          id("company-agro"),
        ],
      ] as const;
      for (const [
        key,
        name,
        description,
        type,
        unit,
        costPrice,
        sellingPrice,
        currentStock,
        minStock,
        sku,
        manualCompanyId,
      ] of productSeeds) {
        await upsertById(tx.dealerProduct, id(key), {
          name,
          description,
          type,
          unit,
          costPrice: decimal(costPrice),
          sellingPrice: decimal(sellingPrice),
          currentStock: decimal(currentStock),
          hiddenAt: null,
          minStock: decimal(minStock),
          sku,
          dealerId: dealer.id,
          manualCompanyId,
          supplierCompanyId: null,
          companyProductId: null,
        });
      }

      for (const productKey of ["starter", "grower", "finisher", "layer"]) {
        await upsertById(
          tx.dealerProductUnitConversion,
          id(`conversion-${productKey}-kg`),
          {
            dealerProductId: id(`product-${productKey}`),
            unitName: "KG",
            conversionFactor: decimal(0.02),
          },
        );
      }

      const purchases = [
        [
          "purchase-pragati-1",
          id("company-pragati"),
          daysAgo(52),
          670000,
          20000,
          "PFI-2083-018",
          "Opening seasonal stock order",
        ],
        [
          "purchase-pragati-2",
          id("company-pragati"),
          daysAgo(18),
          630000,
          15000,
          "PFI-2083-067",
          "Broiler and layer feed replenishment",
        ],
        [
          "purchase-everest",
          id("company-everest"),
          daysAgo(24),
          220000,
          null,
          "EPP-2083-104",
          "Medicine and supplements purchase",
        ],
        [
          "purchase-agro",
          id("company-agro"),
          daysAgo(88),
          150000,
          null,
          "AEN-2082-441",
          "Farm equipment stock",
        ],
      ] as const;
      for (const [
        key,
        manualCompanyId,
        date,
        totalAmount,
        tradeDiscountAmount,
        reference,
        notes,
      ] of purchases) {
        await upsertById(tx.dealerManualPurchase, id(key), {
          manualCompanyId,
          date,
          totalAmount: decimal(totalAmount),
          tradeDiscountAmount:
            tradeDiscountAmount === null ? null : decimal(tradeDiscountAmount),
          notes,
          reference,
          voidedAt: null,
          voidedReason: null,
        });
      }

      const purchaseItems = [
        [
          "purchase-item-p1-starter",
          id("purchase-pragati-1"),
          "Pragati Broiler Starter",
          InventoryItemType.FEED,
          "Bag",
          100,
          3350,
          3800,
          335000,
          id("product-starter"),
        ],
        [
          "purchase-item-p1-grower",
          id("purchase-pragati-1"),
          "Pragati Broiler Grower",
          InventoryItemType.FEED,
          "Bag",
          100,
          3350,
          3975,
          335000,
          id("product-grower"),
        ],
        [
          "purchase-item-p2-grower",
          id("purchase-pragati-2"),
          "Pragati Broiler Grower",
          InventoryItemType.FEED,
          "Bag",
          100,
          3475,
          3975,
          347500,
          id("product-grower"),
        ],
        [
          "purchase-item-p2-finisher",
          id("purchase-pragati-2"),
          "Pragati Broiler Finisher",
          InventoryItemType.FEED,
          "Bag",
          50,
          3590,
          4100,
          179500,
          id("product-finisher"),
        ],
        [
          "purchase-item-p2-layer",
          id("purchase-pragati-2"),
          "Pragati Layer Mash",
          InventoryItemType.FEED,
          "Bag",
          30,
          3433.33,
          3900,
          103000,
          id("product-layer"),
        ],
        [
          "purchase-item-e-calcium",
          id("purchase-everest"),
          "Layer Calcium Plus",
          InventoryItemType.MEDICINE,
          "Packet",
          150,
          640,
          900,
          96000,
          id("product-calcium"),
        ],
        [
          "purchase-item-e-vitamin",
          id("purchase-everest"),
          "Poultry Vitamin AD3E",
          InventoryItemType.MEDICINE,
          "Bottle",
          200,
          310,
          480,
          62000,
          id("product-vitamin"),
        ],
        [
          "purchase-item-e-disinfectant",
          id("purchase-everest"),
          "BioSafe Disinfectant",
          InventoryItemType.MEDICINE,
          "Bottle",
          100,
          620,
          760,
          62000,
          id("product-disinfectant"),
        ],
        [
          "purchase-item-a-feeder",
          id("purchase-agro"),
          "Automatic Pan Feeder",
          InventoryItemType.EQUIPMENT,
          "PCS",
          100,
          1500,
          1550,
          150000,
          id("product-feeder"),
        ],
      ] as const;
      for (const [
        key,
        purchaseId,
        productName,
        type,
        unit,
        quantity,
        costPrice,
        sellingPrice,
        totalAmount,
        dealerProductId,
      ] of purchaseItems) {
        await upsertById(tx.dealerManualPurchaseItem, id(key), {
          purchaseId,
          productName,
          type,
          unit,
          quantity: decimal(quantity),
          baseQuantity: decimal(quantity),
          costPrice: decimal(costPrice),
          sellingPrice: decimal(sellingPrice),
          totalAmount: decimal(totalAmount),
          dealerProductId,
        });
      }

      const companyPayments = [
        [
          "company-payment-pragati-1",
          id("company-pragati"),
          500000,
          daysAgo(38),
          "BANK",
          "Initial bank payment",
          "NBL-83391",
          850000,
        ],
        [
          "company-payment-pragati-2",
          id("company-pragati"),
          500000,
          daysAgo(8),
          "BANK",
          "Second bank payment",
          "NBL-87442",
          350000,
        ],
        [
          "company-payment-everest",
          id("company-everest"),
          180000,
          daysAgo(10),
          "CHEQUE",
          "Medicine supplier settlement",
          "CHQ-2083-317",
          40000,
        ],
        [
          "company-payment-agro",
          id("company-agro"),
          150000,
          daysAgo(70),
          "CASH",
          "Equipment invoice settled",
          "CASH-770",
          0,
        ],
      ] as const;
      for (const [
        key,
        manualCompanyId,
        amount,
        paymentDate,
        paymentMethod,
        notes,
        reference,
        balanceAfter,
      ] of companyPayments) {
        await upsertById(tx.dealerManualCompanyPayment, id(key), {
          manualCompanyId,
          amount: decimal(amount),
          paymentMethod,
          paymentDate,
          notes,
          reference,
          receiptUrl: null,
          voidedAt: null,
          voidedReason: null,
          balanceAfter: decimal(balanceAfter),
        });
      }
      await upsertById(
        tx.dealerManualCompanyAdjustment,
        id("company-adjustment-pragati"),
        {
          manualCompanyId: id("company-pragati"),
          type: DealerManualCompanyAdjustmentType.OPENING_BALANCE,
          amount: decimal(50000),
          date: daysAgo(120),
          notes: "Agreed opening balance at the start of Poultry360 use",
          balanceAfter: decimal(50000),
        },
      );

      const purchaseProductTxns = [
        [
          "product-txn-purchase-starter",
          id("product-starter"),
          100,
          3350,
          335000,
          daysAgo(52),
          "Purchase from Pragati Feed Industries",
          "PFI-2083-018",
        ],
        [
          "product-txn-purchase-grower",
          id("product-grower"),
          200,
          3412.5,
          682500,
          daysAgo(18),
          "Feed stock received",
          "PFI-2083-067",
        ],
        [
          "product-txn-purchase-finisher",
          id("product-finisher"),
          50,
          3590,
          179500,
          daysAgo(18),
          "Feed stock received",
          "PFI-2083-067",
        ],
        [
          "product-txn-purchase-layer",
          id("product-layer"),
          80,
          3420,
          273600,
          daysAgo(18),
          "Layer feed received",
          "PFI-2083-067",
        ],
        [
          "product-txn-purchase-calcium",
          id("product-calcium"),
          150,
          640,
          96000,
          daysAgo(24),
          "Supplement stock received",
          "EPP-2083-104",
        ],
        [
          "product-txn-purchase-vitamin",
          id("product-vitamin"),
          200,
          310,
          62000,
          daysAgo(24),
          "Vitamin stock received",
          "EPP-2083-104",
        ],
        [
          "product-txn-purchase-disinfectant",
          id("product-disinfectant"),
          100,
          620,
          62000,
          daysAgo(24),
          "Disinfectant stock received",
          "EPP-2083-104",
        ],
        [
          "product-txn-purchase-feeder",
          id("product-feeder"),
          100,
          1500,
          150000,
          daysAgo(88),
          "Equipment stock received",
          "AEN-2082-441",
        ],
      ] as const;
      for (const [
        key,
        productId,
        quantity,
        unitPrice,
        totalAmount,
        date,
        description,
        reference,
      ] of purchaseProductTxns) {
        await upsertById(tx.dealerProductTransaction, id(key), {
          productId,
          type: TransactionType.PURCHASE,
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
          totalAmount: decimal(totalAmount),
          date,
          description,
          reference,
          unit: "Bag",
          dealerSaleId: null,
        });
      }

      const customers = [
        [
          "customer-shree",
          "Shree Ram Poultry Farm",
          "+9779845152001",
          "Broiler farm",
          "Gaidakot-5, Nawalpur",
          40000,
          190000,
          150000,
        ],
        [
          "customer-newhope",
          "New Hope Layer Farm",
          "+9779845152002",
          "Layer farm",
          "Ratnanagar-8, Chitwan",
          24700,
          220200,
          195500,
        ],
        [
          "customer-chitwan",
          "Chitwan Integrated Farm",
          "+9779845152003",
          "Mixed farm",
          "Khairahani-3, Chitwan",
          64920,
          164920,
          100000,
        ],
        [
          "customer-everest",
          "Everest Poultry House",
          "+9779845152004",
          "Broiler farm",
          "Madi-2, Chitwan",
          0,
          194375,
          194375,
        ],
        [
          "customer-retail",
          "Walk-in Retail Customers",
          null,
          "Retail",
          "Bharatpur, Chitwan",
          0,
          20000,
          20000,
        ],
      ] as const;
      for (const [
        key,
        name,
        phone,
        category,
        address,
        balance,
        totalSales,
        totalPayments,
      ] of customers) {
        await upsertById(tx.customer, id(key), {
          name,
          phone,
          category,
          address,
          balance: decimal(balance),
          totalSales: decimal(totalSales),
          totalPayments: decimal(totalPayments),
          source: "MANUAL",
          farmerId: null,
          userId: user.id,
          archivedAt: null,
          archivedById: null,
        });
      }

      const sales = [
        [
          "sale-1001",
          "DEMO-D-1001",
          daysAgo(45),
          193500,
          190000,
          150000,
          40000,
          true,
          "Feed supplied for a new broiler batch",
          id("customer-shree"),
          DiscountType.FLAT,
          3500,
        ],
        [
          "sale-1002",
          "DEMO-D-1002",
          daysAgo(28),
          145500,
          145500,
          145500,
          0,
          false,
          "Layer feed and calcium, paid in full",
          id("customer-newhope"),
          null,
          null,
        ],
        [
          "sale-1003",
          "DEMO-D-1003",
          daysAgo(14),
          173600,
          164920,
          100000,
          64920,
          true,
          "Finisher and vitamins on partial credit",
          id("customer-chitwan"),
          DiscountType.PERCENT,
          5,
        ],
        [
          "sale-1004",
          "DEMO-D-1004",
          daysAgo(5),
          194375,
          194375,
          194375,
          0,
          false,
          "Feed replenishment, bank payment",
          id("customer-everest"),
          null,
          null,
        ],
        [
          "sale-1005",
          "DEMO-D-1005",
          daysAgo(0),
          74700,
          74700,
          50000,
          24700,
          true,
          "Layer supplies with balance due",
          id("customer-newhope"),
          null,
          null,
        ],
        [
          "sale-1006",
          "DEMO-D-1006",
          daysAgo(75),
          20000,
          20000,
          20000,
          0,
          false,
          "Retail equipment sales",
          id("customer-retail"),
          null,
          null,
        ],
      ] as const;
      for (const [
        key,
        invoiceNumber,
        date,
        subtotalAmount,
        totalAmount,
        paidAmount,
        dueAmount,
        isCredit,
        notes,
        customerId,
      ] of sales) {
        await upsertById(tx.dealerSale, id(key), {
          invoiceNumber,
          date,
          subtotalAmount:
            subtotalAmount === totalAmount ? null : decimal(subtotalAmount),
          totalAmount: decimal(totalAmount),
          paidAmount: decimal(paidAmount),
          dueAmount: decimal(dueAmount),
          isCredit,
          notes,
          customerId,
          farmerId: null,
          dealerId: dealer.id,
          accountId: null,
        });
      }

      const saleItems = [
        [
          "sale-item-1001-starter",
          "sale-1001",
          "product-starter",
          30,
          3800,
          112000,
        ],
        [
          "sale-item-1001-grower",
          "sale-1001",
          "product-grower",
          20,
          3975,
          78000,
        ],
        [
          "sale-item-1002-layer",
          "sale-1002",
          "product-layer",
          35,
          3900,
          136500,
        ],
        [
          "sale-item-1002-calcium",
          "sale-1002",
          "product-calcium",
          10,
          900,
          9000,
        ],
        [
          "sale-item-1003-finisher",
          "sale-1003",
          "product-finisher",
          40,
          4100,
          155800,
        ],
        [
          "sale-item-1003-vitamin",
          "sale-1003",
          "product-vitamin",
          20,
          480,
          9120,
        ],
        [
          "sale-item-1004-starter",
          "sale-1004",
          "product-starter",
          25,
          3800,
          95000,
        ],
        [
          "sale-item-1004-grower",
          "sale-1004",
          "product-grower",
          25,
          3975,
          99375,
        ],
        ["sale-item-1005-layer", "sale-1005", "product-layer", 18, 3900, 70200],
        [
          "sale-item-1005-calcium",
          "sale-1005",
          "product-calcium",
          5,
          900,
          4500,
        ],
        [
          "sale-item-1006-feeder",
          "sale-1006",
          "product-feeder",
          10,
          2000,
          20000,
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
        await upsertById(tx.dealerSaleItem, id(key), {
          saleId: id(saleKey),
          productId: id(productKey),
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
          totalAmount: decimal(totalAmount),
          unit: productKey.includes("feeder")
            ? "PCS"
            : productKey.includes("calcium")
              ? "Packet"
              : productKey.includes("vitamin")
                ? "Bottle"
                : "Bag",
          baseQuantity: decimal(quantity),
        });
      }

      const salePayments = [
        [
          "payment-1001",
          "sale-1001",
          150000,
          daysAgo(45),
          "Advance received",
          "BANK",
        ],
        [
          "payment-1002",
          "sale-1002",
          145500,
          daysAgo(28),
          "Full cash payment",
          "CASH",
        ],
        [
          "payment-1003",
          "sale-1003",
          100000,
          daysAgo(14),
          "Partial cheque payment",
          "CHEQUE",
        ],
        [
          "payment-1004",
          "sale-1004",
          194375,
          daysAgo(5),
          "Full bank payment",
          "BANK",
        ],
        [
          "payment-1005",
          "sale-1005",
          50000,
          daysAgo(0),
          "Payment at delivery",
          "CASH",
        ],
        [
          "payment-1006",
          "sale-1006",
          20000,
          daysAgo(75),
          "Retail cash sale",
          "CASH",
        ],
      ] as const;
      for (const [
        key,
        saleKey,
        amount,
        date,
        description,
        paymentMethod,
      ] of salePayments) {
        await upsertById(tx.dealerSalePayment, id(key), {
          saleId: id(saleKey),
          amount: decimal(amount),
          date,
          description,
          paymentMethod,
          linkedLedgerEntryId: null,
        });
      }

      await upsertById(tx.saleDiscount, id("discount-1001"), {
        type: DiscountType.FLAT,
        value: decimal(3500),
        scope: DiscountScope.SALE,
        dealerSaleId: id("sale-1001"),
        companySaleId: null,
      });
      await upsertById(tx.saleDiscount, id("discount-1003"), {
        type: DiscountType.PERCENT,
        value: decimal(5),
        scope: DiscountScope.SALE,
        dealerSaleId: id("sale-1003"),
        companySaleId: null,
      });

      const saleProductTxns = saleItems.map((item, index) => {
        const [, saleKey, productKey, quantity, unitPrice, totalAmount] = item;
        const sale = sales.find((candidate) => candidate[0] === saleKey)!;
        return [
          `product-txn-sale-${index + 1}`,
          productKey,
          saleKey,
          quantity,
          unitPrice,
          totalAmount,
          sale[2],
          sale[1],
        ] as const;
      });
      for (const [
        key,
        productKey,
        saleKey,
        quantity,
        unitPrice,
        totalAmount,
        date,
        reference,
      ] of saleProductTxns) {
        await upsertById(tx.dealerProductTransaction, id(key), {
          productId: id(productKey),
          type: TransactionType.SALE,
          quantity: decimal(quantity),
          unitPrice: decimal(unitPrice),
          totalAmount: decimal(totalAmount),
          date,
          description: `Sale - Invoice ${reference}`,
          reference,
          unit: "Bag",
          dealerSaleId: id(saleKey),
        });
      }

      let runningBalance = 0;
      const chronologicalSales = [...sales].sort(
        (a, b) => a[2].getTime() - b[2].getTime(),
      );
      for (const sale of chronologicalSales) {
        const [
          saleKey,
          invoiceNumber,
          date,
          ,
          totalAmount,
          paidAmount,
          ,
          ,
          ,
          customerId,
        ] = sale;
        runningBalance += totalAmount;
        await upsertById(tx.dealerLedgerEntry, id(`ledger-${saleKey}-sale`), {
          type: LedgerEntryType.SALE,
          amount: decimal(totalAmount),
          balance: decimal(runningBalance),
          date,
          description: `Sale - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          imageUrl: null,
          dealerId: dealer.id,
          saleId: id(saleKey),
          partyId: customerId,
          partyType: "CUSTOMER",
          createdAt: date,
        });
        runningBalance -= paidAmount;
        await upsertById(
          tx.dealerLedgerEntry,
          id(`ledger-${saleKey}-payment`),
          {
            type: LedgerEntryType.PAYMENT_RECEIVED,
            amount: decimal(paidAmount),
            balance: decimal(runningBalance),
            date,
            description: `Payment received - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            imageUrl: null,
            dealerId: dealer.id,
            saleId: id(saleKey),
            partyId: customerId,
            partyType: "CUSTOMER",
            createdAt: new Date(date.getTime() + 60_000),
          },
        );
      }

      const customerTxns = sales.flatMap((sale) => {
        const [
          saleKey,
          invoiceNumber,
          date,
          ,
          totalAmount,
          paidAmount,
          ,
          ,
          notes,
          customerId,
        ] = sale;
        return [
          [
            `customer-txn-${saleKey}-sale`,
            customerId,
            TransactionType.SALE,
            totalAmount,
            date,
            notes,
            invoiceNumber,
          ],
          [
            `customer-txn-${saleKey}-payment`,
            customerId,
            TransactionType.PAYMENT,
            paidAmount,
            date,
            `Payment for ${invoiceNumber}`,
            invoiceNumber,
          ],
        ] as const;
      });
      for (const [
        key,
        customerId,
        type,
        amount,
        date,
        description,
        reference,
      ] of customerTxns) {
        await upsertById(tx.customerTransaction, id(key), {
          customerId,
          type,
          amount: decimal(amount),
          date,
          description,
          reference,
          imageUrl: null,
          deletedAt: null,
        });
      }

      await upsertById(tx.dealerCashSettings, id("cash-settings"), {
        dealerId: dealer.id,
        initialOpening: decimal(125000),
        startBsDate: cashDates[7],
      });
      const cashMovements = [
        [
          "cash-today-in-1",
          cashDates[0],
          CashMovementDirection.IN,
          50000,
          "New Hope Layer Farm",
          "Payment received with today's delivery",
        ],
        [
          "cash-today-in-2",
          cashDates[0],
          CashMovementDirection.IN,
          18500,
          "Walk-in customers",
          "Counter sales collection",
        ],
        [
          "cash-today-out",
          cashDates[0],
          CashMovementDirection.OUT,
          32000,
          "Local transport and handling",
          "Delivery vehicle and unloading",
        ],
        [
          "cash-yesterday-in",
          cashDates[1],
          CashMovementDirection.IN,
          42000,
          "Shree Ram Poultry Farm",
          "Account collection",
        ],
        [
          "cash-yesterday-out",
          cashDates[1],
          CashMovementDirection.OUT,
          28000,
          "Everest Poultry Pharma",
          "Supplier cash payment",
        ],
        [
          "cash-2day-in",
          cashDates[2],
          CashMovementDirection.IN,
          65000,
          "Chitwan Integrated Farm",
          "Part payment",
        ],
        [
          "cash-2day-out",
          cashDates[2],
          CashMovementDirection.OUT,
          15500,
          "Shop operating expenses",
          "Rent allocation and utilities",
        ],
      ] as const;
      for (const [
        key,
        bsDate,
        direction,
        amount,
        partyName,
        notes,
      ] of cashMovements) {
        await upsertById(tx.dealerCashMovement, id(key), {
          dealerId: dealer.id,
          bsDate,
          direction,
          amount: decimal(amount),
          partyName,
          notes,
          recordedById: user.id,
        });
      }
      const closes = [
        ["cash-close-1", cashDates[1], 171500, 185500, daysAgo(1, 20)],
        ["cash-close-2", cashDates[2], 137000, 171500, daysAgo(2, 20)],
        ["cash-close-3", cashDates[3], 152000, 137000, daysAgo(3, 20)],
        ["cash-close-4", cashDates[4], 143500, 152000, daysAgo(4, 20)],
      ] as const;
      for (const [
        key,
        bsDate,
        openingSnapshot,
        closingSnapshot,
        closedAt,
      ] of closes) {
        await upsertById(tx.dealerCashDayClose, id(key), {
          dealerId: dealer.id,
          bsDate,
          openingSnapshot: decimal(openingSnapshot),
          closingSnapshot: decimal(closingSnapshot),
          source: CashDayCloseSource.USER,
          closedAt,
        });
      }

      const staff = [
        [
          "staff-anil",
          "Anil Mahato",
          daysAgo(520),
          null,
          StaffStatus.ACTIVE,
          30000,
          60000,
          daysAgo(10),
          "Two months salary",
        ],
        [
          "staff-maya",
          "Maya Karki",
          daysAgo(350),
          null,
          StaffStatus.ACTIVE,
          27000,
          27000,
          daysAgo(16),
          "Monthly salary",
        ],
        [
          "staff-rabin",
          "Rabin Gurung",
          daysAgo(180),
          daysAgo(28),
          StaffStatus.STOPPED,
          25000,
          20000,
          daysAgo(30),
          "Final settlement installment",
        ],
      ] as const;
      for (const [
        key,
        name,
        startDate,
        endDate,
        status,
        monthlyAmount,
        paymentAmount,
        paidAt,
        note,
      ] of staff) {
        const staffId = id(key);
        await upsertById(tx.staff, staffId, {
          ownerId: user.id,
          name,
          startDate,
          endDate,
          status,
        });
        await upsertById(tx.staffSalary, id(`${key}-salary`), {
          staffId,
          monthlyAmount: decimal(monthlyAmount),
          effectiveFrom: startDate,
        });
        await upsertById(tx.staffPayment, id(`${key}-payment`), {
          staffId,
          amount: decimal(paymentAmount),
          paidAt,
          note,
          receiptImageUrl: null,
        });
      }

      const notifications = [
        [
          "notification-stock",
          "LOW_INVENTORY",
          "BioSafe Disinfectant stock is low",
          "16 bottles remain; reorder before the next delivery cycle.",
          NotificationStatus.UNREAD,
          daysAgo(0),
          { url: "/dealer/dashboard/inventory" },
        ],
        [
          "notification-credit",
          "PAYMENT_DUE",
          "Customer balances need follow-up",
          "Three customers currently have outstanding balances.",
          NotificationStatus.UNREAD,
          daysAgo(1),
          { url: "/dealer/dashboard/customers" },
        ],
        [
          "notification-company",
          "SUPPLIER_PAYMENT",
          "Pragati Feeds payment recorded",
          "The latest NPR 500,000 bank payment is reflected in the company ledger.",
          NotificationStatus.READ,
          daysAgo(8),
          { url: "/dealer/dashboard/company" },
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
          readAt: status === NotificationStatus.READ ? daysAgo(7) : null,
        });
      }
    },
    { maxWait: 10_000, timeout: 120_000 },
  );

  printDemoCredentials("Dealer", account);
}

seedDemoDealer()
  .catch((error) => {
    console.error("Dealer demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
