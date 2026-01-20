import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { InventoryService } from "./inventoryService";

export class DealerSaleRequestService {
  /**
   * Create a sale request for a connected farmer
   * Validates stock but does not deduct it yet
   */
  static async createSaleRequest(data: {
    dealerId: string;
    customerId: string;
    farmerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    paidAmount: number;
    paymentMethod?: string;
    notes?: string;
    date: Date;
  }) {
    const {
      dealerId,
      customerId,
      farmerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate stock availability for all items (but don't deduct yet)
      for (const item of items) {
        const product = await tx.dealerProduct.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (Number(product.currentStock) < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
          );
        }
      }

      // 2. Calculate totals
      const totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      // 3. Generate request number
      const requestNumber = `SR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 4. Create the sale request
      const request = await tx.dealerSaleRequest.create({
        data: {
          requestNumber,
          date,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          paymentMethod,
          notes,
          dealerId,
          farmerId,
          customerId,
          status: "PENDING",
        },
      });

      // 5. Create request items
      for (const item of items) {
        await tx.dealerSaleRequestItem.create({
          data: {
            requestId: request.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
          },
        });
      }

      // 6. Return request with items
      return await tx.dealerSaleRequest.findUnique({
        where: { id: request.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          dealer: true,
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: true,
        },
      });
    });
  }

  /**
   * Approve a sale request and create the actual sale
   * This creates the DealerSale and all related records
   */
  static async approveSaleRequest(data: {
    requestId: string;
    farmerId: string;
  }) {
    const { requestId, farmerId } = data;

    // 1. Fetch the request BEFORE transaction (to use data after transaction)
    const request = await prisma.dealerSaleRequest.findUnique({
      where: { id: requestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        dealer: true,
        customer: true,
      },
    });

    if (!request) {
      throw new Error("Sale request not found");
    }

    // 2. Verify this request belongs to the farmer
    if (request.farmerId !== farmerId) {
      throw new Error("You can only approve requests sent to you");
    }

    // 3. Check if already processed
    if (request.status !== "PENDING") {
      throw new Error(`Request is already ${request.status.toLowerCase()}`);
    }

    // 4. Calculate totals
    const totalAmount = Number(request.totalAmount);
    const paidAmount = Number(request.paidAmount);
    const dueAmount = totalAmount - paidAmount;
    const isCredit = dueAmount > 0;

    // 5. Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 6. Execute dealer-side transaction
    const saleId = await prisma.$transaction(async (tx) => {
      // Re-validate stock availability
      for (const item of request.items) {
        const product = await tx.dealerProduct.findUnique({
          where: { id: item.productId },
        });
        
        if (!product || Number(product.currentStock) < Number(item.quantity)) {
          throw new Error(
            `Insufficient stock for product ${item.product.name}`
          );
        }
      }

      // Create the actual DealerSale
      const sale = await tx.dealerSale.create({
        data: {
          invoiceNumber,
          date: request.date,
          totalAmount: request.totalAmount,
          paidAmount: request.paidAmount,
          dueAmount: dueAmount > 0 ? new Prisma.Decimal(dueAmount) : null,
          isCredit,
          notes: request.notes,
          dealerId: request.dealerId,
          customerId: request.customerId,
        },
      });

      // Create sale items and update product stock
      for (const requestItem of request.items) {
        await tx.dealerSaleItem.create({
          data: {
            saleId: sale.id,
            productId: requestItem.productId,
            quantity: requestItem.quantity,
            unitPrice: requestItem.unitPrice,
            totalAmount: requestItem.totalAmount,
          },
        });

        // Update product stock
        await tx.dealerProduct.update({
          where: { id: requestItem.productId },
          data: {
            currentStock: {
              decrement: requestItem.quantity,
            },
          },
        });

        // Create product transaction
        await tx.dealerProductTransaction.create({
          data: {
            type: "SALE",
            quantity: requestItem.quantity,
            unitPrice: requestItem.unitPrice,
            totalAmount: requestItem.totalAmount,
            date: request.date,
            description: `Sale - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            productId: requestItem.productId,
            dealerSaleId: sale.id,
          },
        });
      }

      // Create payment record if paidAmount > 0
      if (paidAmount > 0) {
        await tx.dealerSalePayment.create({
          data: {
            amount: request.paidAmount,
            date: request.date,
            description: "Initial payment",
            paymentMethod: request.paymentMethod,
            saleId: sale.id,
          },
        });
      }

      // Get current ledger balance for the dealer
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId: request.dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;

      // Create ledger entry for sale
      const newBalance = currentBalance + totalAmount;
      await tx.dealerLedgerEntry.create({
        data: {
          type: "SALE",
          amount: request.totalAmount,
          balance: new Prisma.Decimal(newBalance),
          date: request.date,
          description: `Sale - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          dealerId: request.dealerId,
          saleId: sale.id,
          partyId: request.customerId,
          partyType: "CUSTOMER",
        },
      });

      // Create ledger entry for payment if paidAmount > 0
      if (paidAmount > 0) {
        const balanceAfterPayment = newBalance - paidAmount;
        await tx.dealerLedgerEntry.create({
          data: {
            type: "PAYMENT_RECEIVED",
            amount: request.paidAmount,
            balance: new Prisma.Decimal(balanceAfterPayment),
            date: request.date,
            description: `Payment received - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            dealerId: request.dealerId,
            saleId: sale.id,
            partyId: request.customerId,
            partyType: "CUSTOMER",
          },
        });
      }

      // Update customer balance (if customer exists)
      if (request.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: request.customerId },
        });

        if (customer) {
          const currentCustomerBalance = Number(customer.balance || 0);
          // Add the due amount to customer balance
          const newCustomerBalance = currentCustomerBalance + dueAmount;

          await tx.customer.update({
            where: { id: request.customerId },
            data: {
              balance: new Prisma.Decimal(newCustomerBalance),
            },
          });
        }
      }

      // Update request status and link to sale
      await tx.dealerSaleRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          dealerSaleId: sale.id,
        },
      });

      return sale.id;
    });

    // 14. Process farmer-side inventory and ledger entries OUTSIDE main transaction
    // This prevents timeout and uses the existing inventory service
    let firstPurchaseTransactionId: string | null = null;

    for (const requestItem of request.items) {
      const result = await InventoryService.processSupplierPurchase({
        dealerId: request.dealerId,
        itemName: requestItem.product.name,
        quantity: Number(requestItem.quantity),
        unitPrice: Number(requestItem.unitPrice),
        totalAmount: Number(requestItem.totalAmount),
        date: request.date,
        description: `Purchase - Invoice ${invoiceNumber}`,
        reference: invoiceNumber,
        userId: request.farmerId,
      });

      // Store the first purchase transaction ID for payment linking
      if (!firstPurchaseTransactionId && result.purchaseTransactionId) {
        firstPurchaseTransactionId = result.purchaseTransactionId;
      }
    }

    // 15. Create PAYMENT transaction for farmer if paidAmount > 0
    // Link it to the first purchase transaction
    if (paidAmount > 0 && firstPurchaseTransactionId) {
      await prisma.entityTransaction.create({
        data: {
          type: "PAYMENT",
          amount: new Prisma.Decimal(paidAmount),
          date: request.date,
          description: `Initial payment - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          dealerId: request.dealerId,
          paymentToPurchaseId: firstPurchaseTransactionId,
        },
      });
    }

    // 16. Fetch the complete sale details
    return await prisma.dealerSale.findUnique({
      where: { id: saleId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        customer: true,
        dealer: true,
        saleRequest: true,
      },
    });
  }

  /**
   * Reject a sale request
   */
  static async rejectSaleRequest(data: {
    requestId: string;
    farmerId: string;
    rejectionReason?: string;
  }) {
    const { requestId, farmerId, rejectionReason } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the request
      const request = await tx.dealerSaleRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Sale request not found");
      }

      // 2. Verify this request belongs to the farmer
      if (request.farmerId !== farmerId) {
        throw new Error("You can only reject requests sent to you");
      }

      // 3. Check if already processed
      if (request.status !== "PENDING") {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      // 4. Update request status
      const updatedRequest = await tx.dealerSaleRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          rejectionReason,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          dealer: true,
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: true,
        },
      });

      return updatedRequest;
    });
  }
}
