import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerFarmerAccountService } from "./dealerFarmerAccountService";
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

    const requestId = await prisma.$transaction(
      async (tx) => {
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

        return request.id;
      },
      { timeout: 20000 }
    );

    // 6. Return request with items (outside transaction to avoid timeout; read is fast)
    const result = await prisma.dealerSaleRequest.findUnique({
      where: { id: requestId },
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
    if (!result) {
      throw new Error("Sale request not found after create");
    }
    return result;
  }

  /**
   * Approve a sale request and create the actual sale (account-based).
   * Creates DealerSale and links it to DealerFarmerAccount via recordSale();
   * sales increase account balance; payments are recorded separately via
   * DealerFarmerAccountService.recordPayment(). paidAmount/dueAmount on the sale
   * are kept for backward compatibility and reporting but do not drive payment
   * allocation. Farmer-side inventory is still processed via InventoryService;
   * no bill-wise DealerSalePayment or EntityTransaction PAYMENT is created.
   */
  static async approveSaleRequest(data: {
    requestId: string;
    farmerId: string;
  }) {
    const { requestId, farmerId } = data;

    // 1. Fetch the request BEFORE transaction (to use data after transaction).
    // Include dealer.ownerId so upfront payments can use a valid User ID for recordedById.
    const request = await prisma.dealerSaleRequest.findUnique({
      where: { id: requestId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        dealer: { select: { id: true, ownerId: true } },
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

    // 4. Calculate totals (paidAmount stored on sale for reporting only; no bill-wise payment records)
    const totalAmount = Number(request.totalAmount);
    const paidAmount = Number(request.paidAmount);
    const dueAmount = totalAmount - paidAmount;
    const isCredit = dueAmount > 0;

    // Resolve dealer's user/owner ID for recording upfront payments (recordedById must be a valid User id)
    const recordedByUserId =
      paidAmount > 0
        ? request.dealer?.ownerId ?? (() => {
            throw new Error(
              "Dealer has no owner; cannot record upfront payment. Please set the dealer's owner."
            );
          })()
        : null;

    // 5. Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 6. Execute dealer-side transaction (long timeout: many items + ledger + account)
    const saleId = await prisma.$transaction(
      async (tx) => {
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

      // Account-based: record only net due so balance is not overstated for partially-paid sales.
      // When paidAmount exists, record sale for dueAmount then record upfront payment in same tx.
      const accountSaleAmount = paidAmount > 0 ? dueAmount : totalAmount;
      await DealerFarmerAccountService.recordSale(
        request.dealerId,
        request.farmerId,
        accountSaleAmount,
        sale.id,
        tx
      );
      if (paidAmount > 0 && recordedByUserId) {
        await DealerFarmerAccountService.recordPayment(
          {
            dealerId: request.dealerId,
            farmerId: request.farmerId,
            amount: paidAmount,
            paymentDate: request.date,
            reference: invoiceNumber,
            recordedById: recordedByUserId,
          },
          tx
        );
      }

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

      // Payments are no longer created here; they are recorded separately via
      // DealerFarmerAccountService.recordPayment(). paidAmount on the sale is
      // kept for historical/reporting only.

      // Get current ledger balance for the dealer
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId: request.dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;

      // Dealer-side ledger: sale entry only (payments create their own entries via
      // DealerFarmerAccountService.recordPayment())
      const newBalance = currentBalance + totalAmount;
      await tx.dealerLedgerEntry.create({
        data: {
          type: "SALE",
          amount: request.totalAmount,
          balance: new Prisma.Decimal(newBalance),
          date: request.date,
          description: `Sale (account-based) - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          dealerId: request.dealerId,
          saleId: sale.id,
          partyId: request.customerId,
          partyType: "CUSTOMER",
        },
      });

      // Update customer balance (if customer exists). For farmer-linked customers,
      // the authoritative balance is in DealerFarmerAccount; this field can serve
      // as a denormalized cache or for manual customer compatibility.
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
      },
      { timeout: 20000 }
    );

    // Process farmer-side inventory OUTSIDE main transaction (InventoryService).
    // No EntityTransaction PAYMENT is created here; payments are recorded via
    // DealerFarmerAccountService.recordPayment() and are not tied to individual sales.
    for (const requestItem of request.items) {
      await InventoryService.processSupplierPurchase({
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
    }

    // Fetch the complete sale details
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
