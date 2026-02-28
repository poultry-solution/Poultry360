import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerFarmerAccountService } from "./dealerFarmerAccountService";
import { InventoryService } from "./inventoryService";
import {
  computeDiscountAmount,
  distributeDiscountToItems,
  type DiscountType,
} from "../utils/discountHelpers";

export class FarmerPurchaseRequestService {
  /**
   * Create a purchase request from farmer to dealer.
   * Items are stored at catalog (selling) price — no discount at creation.
   */
  static async createPurchaseRequest(data: {
    farmerId: string;
    dealerId: string;
    customerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
    date: Date;
  }) {
    const { farmerId, dealerId, customerId, items, notes, date } = data;

    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const requestId = await prisma.$transaction(
      async (tx) => {
        // Validate stock for all items
        for (const item of items) {
          const product = await tx.dealerProduct.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          if (Number(product.currentStock) < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
            );
          }
        }

        const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

        const request = await tx.farmerPurchaseRequest.create({
          data: {
            requestNumber,
            date,
            totalAmount: new Prisma.Decimal(Math.round(totalAmount * 100) / 100),
            notes,
            farmerId,
            dealerId,
            customerId,
            status: "PENDING",
          },
        });

        for (const item of items) {
          const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
          await tx.farmerPurchaseRequestItem.create({
            data: {
              requestId: request.id,
              productId: item.productId,
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalAmount: new Prisma.Decimal(lineTotal),
            },
          });
        }

        return request.id;
      },
      { timeout: 20000 }
    );

    return await prisma.farmerPurchaseRequest.findUnique({
      where: { id: requestId },
      include: {
        items: { include: { product: true } },
        dealer: { select: { id: true, name: true, contact: true, address: true } },
        farmer: { select: { id: true, name: true, phone: true } },
        customer: true,
      },
    });
  }

  /**
   * Dealer approves a farmer's purchase request, optionally with discount.
   * Creates DealerSale, updates accounts, decrements stock, processes farmer inventory.
   */
  static async approvePurchaseRequest(data: {
    requestId: string;
    dealerId: string;
    discount?: { type: DiscountType; value: number };
  }) {
    const { requestId, dealerId, discount } = data;

    const request = await prisma.farmerPurchaseRequest.findUnique({
      where: { id: requestId },
      include: {
        items: { include: { product: true } },
        dealer: { select: { id: true, ownerId: true } },
        customer: true,
      },
    });

    if (!request) {
      throw new Error("Purchase request not found");
    }

    if (request.dealerId !== dealerId) {
      throw new Error("You can only approve requests sent to you");
    }

    if (request.status !== "PENDING") {
      throw new Error(`Request is already ${request.status.toLowerCase()}`);
    }

    // Calculate amounts with optional discount
    const subtotal = request.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );

    const hasDiscount =
      discount &&
      discount.value > 0 &&
      (discount.type !== "PERCENT" || discount.value <= 100) &&
      (discount.type !== "FLAT" || discount.value < subtotal);

    let finalTotal: number;
    let itemTotals: number[];
    if (hasDiscount && discount) {
      const discountAmount = computeDiscountAmount(
        subtotal,
        discount.type,
        discount.value
      );
      finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
      itemTotals = distributeDiscountToItems(
        subtotal,
        discountAmount,
        request.items.map((i) => ({
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        }))
      );
    } else {
      finalTotal = Math.round(subtotal * 100) / 100;
      itemTotals = request.items.map(
        (i) => Math.round(Number(i.quantity) * Number(i.unitPrice) * 100) / 100
      );
    }

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const saleId = await prisma.$transaction(
      async (tx) => {
        // Re-validate stock
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

        // Create DealerSale
        const saleData: any = {
          invoiceNumber,
          date: request.date,
          totalAmount: new Prisma.Decimal(finalTotal),
          paidAmount: new Prisma.Decimal(0),
          dueAmount: new Prisma.Decimal(finalTotal),
          isCredit: true,
          notes: request.notes,
          dealerId: request.dealerId,
          customerId: request.customerId,
          farmerId: request.farmerId,
        };
        if (hasDiscount) {
          saleData.subtotalAmount = new Prisma.Decimal(subtotal);
        }

        const sale = await tx.dealerSale.create({ data: saleData });

        // Create SaleDiscount if applicable
        if (hasDiscount && discount) {
          await tx.saleDiscount.create({
            data: {
              type: discount.type as "PERCENT" | "FLAT",
              value: new Prisma.Decimal(discount.value),
              dealerSaleId: sale.id,
            },
          });
        }

        // Record in DealerFarmerAccount (full amount as credit)
        await DealerFarmerAccountService.recordSale(
          request.dealerId,
          request.farmerId,
          finalTotal,
          sale.id,
          tx
        );

        // Create sale items, decrement stock, create product transactions
        for (let i = 0; i < request.items.length; i++) {
          const requestItem = request.items[i];
          const lineTotal = itemTotals[i] ?? Number(requestItem.quantity) * Number(requestItem.unitPrice);
          const qty = Number(requestItem.quantity);
          const unitPriceAfterDiscount = qty > 0 ? lineTotal / qty : Number(requestItem.unitPrice);

          await tx.dealerSaleItem.create({
            data: {
              saleId: sale.id,
              productId: requestItem.productId,
              quantity: requestItem.quantity,
              unitPrice: new Prisma.Decimal(Math.round(unitPriceAfterDiscount * 100) / 100),
              totalAmount: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
            },
          });

          await tx.dealerProduct.update({
            where: { id: requestItem.productId },
            data: {
              currentStock: { decrement: requestItem.quantity },
            },
          });

          await tx.dealerProductTransaction.create({
            data: {
              type: "SALE",
              quantity: requestItem.quantity,
              unitPrice: new Prisma.Decimal(Math.round(unitPriceAfterDiscount * 100) / 100),
              totalAmount: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
              date: request.date,
              description: `Sale - Invoice ${invoiceNumber}`,
              reference: invoiceNumber,
              productId: requestItem.productId,
              dealerSaleId: sale.id,
            },
          });
        }

        // Dealer ledger entry
        const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
          where: { dealerId: request.dealerId },
          orderBy: { createdAt: "desc" },
        });
        const currentBalance = lastLedgerEntry
          ? Number(lastLedgerEntry.balance)
          : 0;
        const newBalance = currentBalance + finalTotal;

        await tx.dealerLedgerEntry.create({
          data: {
            type: "SALE",
            amount: new Prisma.Decimal(finalTotal),
            balance: new Prisma.Decimal(newBalance),
            date: request.date,
            description: `Sale (purchase request) - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            dealerId: request.dealerId,
            saleId: sale.id,
            partyId: request.customerId,
            partyType: "CUSTOMER",
          },
        });

        // Update customer balance
        if (request.customerId) {
          const customer = await tx.customer.findUnique({
            where: { id: request.customerId },
          });
          if (customer) {
            await tx.customer.update({
              where: { id: request.customerId },
              data: {
                balance: new Prisma.Decimal(Number(customer.balance || 0) + finalTotal),
              },
            });
          }
        }

        // Update purchase request
        const updateData: any = {
          status: "APPROVED",
          reviewedAt: new Date(),
          dealerSaleId: sale.id,
          totalAmount: new Prisma.Decimal(finalTotal),
        };
        if (hasDiscount && discount) {
          updateData.subtotalAmount = new Prisma.Decimal(subtotal);
          updateData.discountType = discount.type;
          updateData.discountValue = new Prisma.Decimal(discount.value);
        }

        await tx.farmerPurchaseRequest.update({
          where: { id: requestId },
          data: updateData,
        });

        return sale.id;
      },
      { timeout: 20000 }
    );

    // Process farmer-side inventory OUTSIDE transaction
    for (let i = 0; i < request.items.length; i++) {
      const requestItem = request.items[i];
      const lineTotal = itemTotals[i] ?? Number(requestItem.quantity) * Number(requestItem.unitPrice);
      const qty = Number(requestItem.quantity);
      const unitPriceAfterDiscount = qty > 0 ? lineTotal / qty : Number(requestItem.unitPrice);

      await InventoryService.processSupplierPurchase({
        dealerId: request.dealerId,
        itemName: requestItem.product.name,
        quantity: qty,
        unitPrice: unitPriceAfterDiscount,
        totalAmount: lineTotal,
        date: request.date,
        description: `Purchase - Invoice ${invoiceNumber}`,
        reference: invoiceNumber,
        purchaseCategory: requestItem.product.type as any,
        userId: request.farmerId,
      });
    }

    return await prisma.dealerSale.findUnique({
      where: { id: saleId },
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: true,
        dealer: true,
        purchaseRequest: true,
      },
    });
  }

  /**
   * Dealer rejects a farmer's purchase request.
   */
  static async rejectPurchaseRequest(data: {
    requestId: string;
    dealerId: string;
    rejectionReason?: string;
  }) {
    const { requestId, dealerId, rejectionReason } = data;

    return await prisma.$transaction(async (tx) => {
      const request = await tx.farmerPurchaseRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Purchase request not found");
      }

      if (request.dealerId !== dealerId) {
        throw new Error("You can only reject requests sent to you");
      }

      if (request.status !== "PENDING") {
        throw new Error(`Request is already ${request.status.toLowerCase()}`);
      }

      return await tx.farmerPurchaseRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          rejectionReason,
        },
        include: {
          items: { include: { product: true } },
          dealer: { select: { id: true, name: true, contact: true, address: true } },
          farmer: { select: { id: true, name: true, phone: true } },
          customer: true,
        },
      });
    });
  }
}
