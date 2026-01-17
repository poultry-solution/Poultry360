import prisma from "../utils/prisma";
import {
  ConsignmentStatus,
  ConsignmentDirection,
  LedgerEntryType,
  Prisma,
} from "@prisma/client";

export class ConsignmentService {
  /**
   * Generate unique consignment number
   */
  private static generateConsignmentNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `CN-${timestamp}-${random}`;
  }

  /**
   * Create audit log entry
   */
  private static async createAuditLog(
    tx: Prisma.TransactionClient,
    data: {
      consignmentId: string;
      action: string;
      statusFrom?: ConsignmentStatus;
      statusTo: ConsignmentStatus;
      actorId: string;
      quantityChange?: number;
      documentRef?: string;
      notes?: string;
    }
  ) {
    return await tx.consignmentAuditLog.create({
      data: {
        consignmentId: data.consignmentId,
        action: data.action,
        statusFrom: data.statusFrom,
        statusTo: data.statusTo,
        actorId: data.actorId,
        quantityChange: data.quantityChange
          ? new Prisma.Decimal(data.quantityChange)
          : null,
        documentRef: data.documentRef,
        notes: data.notes,
      },
    });
  }

  /**
   * Validate state transition
   */
  private static validateStateTransition(
    from: ConsignmentStatus,
    to: ConsignmentStatus
  ): void {
    const validTransitions: Record<ConsignmentStatus, ConsignmentStatus[]> = {
      CREATED: [ConsignmentStatus.ACCEPTED_PENDING_DISPATCH, ConsignmentStatus.REJECTED, ConsignmentStatus.CANCELLED],
      ACCEPTED_PENDING_DISPATCH: [ConsignmentStatus.DISPATCHED, ConsignmentStatus.REJECTED, ConsignmentStatus.CANCELLED],
      DISPATCHED: [ConsignmentStatus.RECEIVED],
      RECEIVED: [ConsignmentStatus.SETTLED],
      SETTLED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new Error(
        `Invalid state transition from ${from} to ${to}`
      );
    }
  }

  /**
   * Create consignment (Company or Dealer initiates)
   */
  static async createConsignment(data: {
    direction: ConsignmentDirection;
    fromCompanyId?: string;
    fromDealerId?: string;
    toDealerId?: string;
    toFarmerId?: string;
    requestedById: string;
    items: Array<{
      companyProductId?: string;
      dealerProductId?: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Calculate total amount
      const totalAmount = data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      const requestedQuantity = data.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // Create consignment request
      const consignment = await tx.consignmentRequest.create({
        data: {
          requestNumber: this.generateConsignmentNumber(),
          direction: data.direction,
          status: ConsignmentStatus.CREATED,
          totalAmount: new Prisma.Decimal(totalAmount),
          requestedQuantity: new Prisma.Decimal(requestedQuantity),
          notes: data.notes,
          fromCompanyId: data.fromCompanyId,
          fromDealerId: data.fromDealerId,
          toDealerId: data.toDealerId,
          toFarmerId: data.toFarmerId,
          items: {
            create: data.items.map((item) => ({
              quantity: new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
              companyProductId: item.companyProductId,
              dealerProductId: item.dealerProductId,
            })),
          },
        },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
          toFarmer: true,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: consignment.id,
        action: "CREATED",
        statusTo: ConsignmentStatus.CREATED,
        actorId: data.requestedById,
        quantityChange: requestedQuantity,
        notes: data.notes,
      });

      return consignment;
    });
  }

  /**
   * Accept consignment (supports partial acceptance)
   */
  static async acceptConsignment(data: {
    consignmentId: string;
    acceptedById: string;
    items: Array<{
      itemId: string;
      acceptedQuantity: number;
    }>;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
        include: { items: true },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.status !== ConsignmentStatus.CREATED) {
        throw new Error(
          `Cannot accept consignment in ${consignment.status} status`
        );
      }

      // Update items with accepted quantities
      let totalApprovedQty = 0;
      for (const item of data.items) {
        const originalItem = consignment.items.find((i) => i.id === item.itemId);
        if (!originalItem) continue;

        await tx.consignmentItem.update({
          where: { id: item.itemId },
          data: {
            acceptedQuantity: new Prisma.Decimal(item.acceptedQuantity),
            isAccepted: item.acceptedQuantity > 0,
          },
        });

        totalApprovedQty += item.acceptedQuantity;
      }

      // Update consignment status
      const updated = await tx.consignmentRequest.update({
        where: { id: data.consignmentId },
        data: {
          status: ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
          approvedQuantity: new Prisma.Decimal(totalApprovedQty),
        },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "ACCEPTED",
        statusFrom: ConsignmentStatus.CREATED,
        statusTo: ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
        actorId: data.acceptedById,
        quantityChange: totalApprovedQty,
        notes: data.notes,
      });

      return updated;
    });
  }

  /**
   * Reject consignment (before dispatch)
   */
  static async rejectConsignment(data: {
    consignmentId: string;
    rejectedById: string;
    reason?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      const rejectableStatuses: ConsignmentStatus[] = [
        ConsignmentStatus.CREATED,
        ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
      ];
      if (!rejectableStatuses.includes(consignment.status)) {
        throw new Error("Cannot reject consignment after dispatch");
      }

      const updated = await tx.consignmentRequest.update({
        where: { id: data.consignmentId },
        data: {
          status: ConsignmentStatus.REJECTED,
        },
        include: {
          items: true,
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "REJECTED",
        statusFrom: consignment.status,
        statusTo: ConsignmentStatus.REJECTED,
        actorId: data.rejectedById,
        notes: data.reason,
      });

      return updated;
    });
  }

  /**
   * Dispatch consignment (Company dispatches)
   */
  static async dispatchConsignment(data: {
    consignmentId: string;
    dispatchedById: string;
    dispatchRef?: string;
    trackingInfo?: string;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
        include: { items: true },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.status !== ConsignmentStatus.ACCEPTED_PENDING_DISPATCH) {
        throw new Error(
          `Cannot dispatch consignment in ${consignment.status} status`
        );
      }

      // Calculate dispatched quantity from approved quantities
      const dispatchedQty = consignment.items.reduce(
        (sum, item) => sum + Number(item.acceptedQuantity || 0),
        0
      );

      const updated = await tx.consignmentRequest.update({
        where: { id: data.consignmentId },
        data: {
          status: ConsignmentStatus.DISPATCHED,
          dispatchedQuantity: new Prisma.Decimal(dispatchedQty),
          dispatchRef: data.dispatchRef,
          trackingInfo: data.trackingInfo,
          dispatchedAt: new Date(),
          dispatchedById: data.dispatchedById,
        },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "DISPATCHED",
        statusFrom: ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
        statusTo: ConsignmentStatus.DISPATCHED,
        actorId: data.dispatchedById,
        quantityChange: dispatchedQty,
        documentRef: data.dispatchRef,
        notes: data.notes,
      });

      return updated;
    });
  }

  /**
   * Payment allocation helper - apply prepayment to sale
   */
  private static async allocatePrepaymentToSale(
    tx: Prisma.TransactionClient,
    companyId: string,
    dealerId: string,
    sale: { id: string; dueAmount: Prisma.Decimal | null; paidAmount: Prisma.Decimal; totalAmount: Prisma.Decimal }
  ): Promise<number> {
    // Get all ADVANCE_RECEIVED entries for this dealer
    const advanceEntries = await tx.companyLedgerEntry.findMany({
      where: {
        companyId,
        partyId: dealerId,
        partyType: "DEALER",
        type: LedgerEntryType.ADVANCE_RECEIVED,
      },
      orderBy: { createdAt: "asc" }, // FIFO
    });

    // Calculate available prepayment balance
    const totalAdvances = advanceEntries.reduce(
      (sum, entry) => sum + Number(entry.amount),
      0
    );

    // Get already allocated amounts (payments linked to sales)
    const allocatedPayments = await tx.companySalePayment.findMany({
      where: {
        companySale: {
          companyId,
          dealerId,
        },
      },
    });

    const totalAllocated = allocatedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0
    );

    const availablePrepayment = totalAdvances - totalAllocated;

    if (availablePrepayment <= 0) {
      return 0;
    }

    // Use sale due amount from passed object
    if (!sale.dueAmount) {
      return 0;
    }

    const saleDue = Number(sale.dueAmount);
    const amountToApply = Math.min(availablePrepayment, saleDue);

    if (amountToApply <= 0) {
      return 0;
    }

    // Create payment record
    await tx.companySalePayment.create({
      data: {
        companySaleId: sale.id,
        amount: new Prisma.Decimal(amountToApply),
        method: "ADVANCE",
        paymentDate: new Date(),
        notes: "Auto-applied from advance payment",
      },
    });

    // Update sale
    const newPaidAmount = Number(sale.paidAmount) + amountToApply;
    const newDueAmount = Number(sale.totalAmount) - newPaidAmount;

    await tx.companySale.update({
      where: { id: sale.id },
      data: {
        paidAmount: new Prisma.Decimal(newPaidAmount),
        dueAmount: newDueAmount > 0 ? new Prisma.Decimal(newDueAmount) : null,
      },
    });

    // Create ledger entry for the allocation
    const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
      where: {
        companyId,
        partyId: dealerId,
        partyType: "DEALER",
      },
      orderBy: { createdAt: "desc" },
    });

    const currentBalance = lastLedgerEntry
      ? Number(lastLedgerEntry.runningBalance)
      : 0;
    const newBalance = currentBalance - amountToApply;

        await tx.companyLedgerEntry.create({
          data: {
            companyId,
            companySaleId: sale.id,
            type: LedgerEntryType.PAYMENT_RECEIVED,
            entryType: LedgerEntryType.PAYMENT_RECEIVED,
            amount: new Prisma.Decimal(amountToApply),
            runningBalance: new Prisma.Decimal(newBalance),
            date: new Date(),
            description: "Advance payment applied to consignment sale",
            partyId: dealerId,
            partyType: "DEALER",
            transactionId: sale.id,
            transactionType: "SALE",
          },
        });

    return amountToApply;
  }

  /**
   * Confirm receipt (Dealer confirms - CRITICAL S3 transition)
   * - Transfers inventory
   * - Creates CompanySale
   * - Applies prepayments
   * - Creates ledger entries
   */
  static async confirmReceipt(data: {
    consignmentId: string;
    receivedById: string;
    grnRef?: string;
    notes?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
        include: {
          items: {
            include: {
              companyProduct: true,
            },
          },
          fromCompany: true,
          toDealer: true,
        },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.status !== ConsignmentStatus.DISPATCHED) {
        throw new Error(
          `Cannot confirm receipt for consignment in ${consignment.status} status`
        );
      }

      if (!consignment.fromCompany || !consignment.toDealer) {
        throw new Error("Invalid consignment: missing company or dealer");
      }

      const receivedQty = Number(consignment.dispatchedQuantity || 0);

      // 1. Update inventory - reduce company stock, increase dealer stock
      for (const item of consignment.items) {
        const acceptedQty = Number(item.acceptedQuantity || 0);
        if (acceptedQty <= 0 || !item.companyProduct) continue;

        // Reduce company stock
        await tx.product.update({
          where: { id: item.companyProductId! },
          data: {
            currentStock: {
              decrement: acceptedQty,
            },
          },
        });

        // Check if dealer has this product in their inventory
        const dealerProduct = await tx.dealerProduct.findFirst({
          where: {
            dealerId: consignment.toDealerId!,
            name: item.companyProduct.name,
          },
        });

        if (dealerProduct) {
          // Increase existing dealer product stock
          await tx.dealerProduct.update({
            where: { id: dealerProduct.id },
            data: {
              currentStock: {
                increment: acceptedQty,
              },
            },
          });
        } else {
          // Create new dealer product
          await tx.dealerProduct.create({
            data: {
              name: item.companyProduct.name,
              type: item.companyProduct.type || "OTHER",
              unit: item.companyProduct.unit || "UNITS",
              costPrice: item.unitPrice,
              sellingPrice: new Prisma.Decimal(Number(item.unitPrice) * 1.2), // 20% markup default
              currentStock: acceptedQty,
              dealerId: consignment.toDealerId!,
            },
          });
        }

        // Update item received quantity
        await tx.consignmentItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: item.acceptedQuantity,
          },
        });
      }

      // 2. Create CompanySale record
      const invoiceNumber = `CINV-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      const sale = await tx.companySale.create({
        data: {
          invoiceNumber,
          companyId: consignment.fromCompanyId!,
          dealerId: consignment.toDealerId!,
          soldById: data.receivedById,
          totalAmount: consignment.totalAmount,
          paidAmount: 0,
          dueAmount: consignment.totalAmount,
          isCredit: true,
          paymentMethod: "CREDIT",
          notes: `Consignment sale from ${consignment.requestNumber}`,
          consignmentId: consignment.id,
          items: {
            create: consignment.items
              .filter((item) => Number(item.acceptedQuantity || 0) > 0)
              .map((item) => ({
                productId: item.companyProductId!,
                quantity: item.acceptedQuantity!,
                unitPrice: item.unitPrice,
                totalAmount: new Prisma.Decimal(
                  Number(item.acceptedQuantity) * Number(item.unitPrice)
                ),
              })),
          },
        },
      });

      // 3. Apply prepayments from ledger
      const appliedAmount = await this.allocatePrepaymentToSale(
        tx,
        consignment.fromCompanyId!,
        consignment.toDealerId!,
        {
          id: sale.id,
          dueAmount: sale.dueAmount,
          paidAmount: sale.paidAmount,
          totalAmount: sale.totalAmount,
        }
      );

      // 4. Create CONSIGNMENT_INVOICE ledger entry
      const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: {
          companyId: consignment.fromCompanyId!,
          partyId: consignment.toDealerId!,
          partyType: "DEALER",
        },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.runningBalance)
        : 0;

      // If no prepayment was applied, add the full amount to balance
      if (appliedAmount === 0) {
        const newBalance = currentBalance + Number(consignment.totalAmount);

        await tx.companyLedgerEntry.create({
          data: {
            companyId: consignment.fromCompanyId!,
            companySaleId: sale.id,
            type: LedgerEntryType.CONSIGNMENT_INVOICE,
            entryType: LedgerEntryType.CONSIGNMENT_INVOICE,
            amount: consignment.totalAmount,
            runningBalance: new Prisma.Decimal(newBalance),
            date: new Date(),
            description: `Consignment invoice ${invoiceNumber}`,
            partyId: consignment.toDealerId,
            partyType: "DEALER",
            transactionId: sale.id,
            transactionType: "SALE",
          },
        });
      }

      // 5. Update consignment status to RECEIVED
      const updated = await tx.consignmentRequest.update({
        where: { id: data.consignmentId },
        data: {
          status: ConsignmentStatus.RECEIVED,
          receivedQuantity: new Prisma.Decimal(receivedQty),
          receivedAt: new Date(),
          receivedById: data.receivedById,
          grnRef: data.grnRef,
          companySaleId: sale.id,
        },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          toDealer: true,
          companySale: {
            include: {
              items: true,
              payments: true,
            },
          },
        },
      });

      // 6. Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "RECEIVED",
        statusFrom: ConsignmentStatus.DISPATCHED,
        statusTo: ConsignmentStatus.RECEIVED,
        actorId: data.receivedById,
        quantityChange: receivedQty,
        documentRef: data.grnRef,
        notes: data.notes,
      });

      return updated;
    }, { timeout: 30000 }); // 30 seconds timeout for complex operations
  }

  /**
   * Record advance payment (before S3)
   */
  static async recordAdvancePayment(data: {
    consignmentId: string;
    dealerId: string;
    companyId: string;
    amount: number;
    paymentMethod: string;
    paymentReference?: string;
    paymentDate?: Date;
    notes?: string;
    recordedById: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      const advancePaymentStatuses: ConsignmentStatus[] = [
        ConsignmentStatus.CREATED,
        ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
        ConsignmentStatus.DISPATCHED,
      ];
      if (!advancePaymentStatuses.includes(consignment.status)) {
        throw new Error(
          "Advance payment can only be recorded before receipt confirmation"
        );
      }

      // Get current ledger balance
      const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: {
          companyId: data.companyId,
          partyId: data.dealerId,
          partyType: "DEALER",
        },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.runningBalance)
        : 0;

      // Advance reduces the dealer's payable (negative balance)
      const newBalance = currentBalance - data.amount;

      // Create ADVANCE_RECEIVED ledger entry
      const ledgerEntry = await tx.companyLedgerEntry.create({
        data: {
          companyId: data.companyId,
          type: LedgerEntryType.ADVANCE_RECEIVED,
          entryType: LedgerEntryType.ADVANCE_RECEIVED,
          amount: new Prisma.Decimal(data.amount),
          runningBalance: new Prisma.Decimal(newBalance),
          date: data.paymentDate || new Date(),
          description: `Advance payment for consignment ${consignment.requestNumber}`,
          partyId: data.dealerId,
          partyType: "DEALER",
          transactionId: data.consignmentId,
          transactionType: "RECEIPT",
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "ADVANCE_PAYMENT",
        statusFrom: consignment.status,
        statusTo: consignment.status,
        actorId: data.recordedById,
        quantityChange: data.amount,
        documentRef: data.paymentReference,
        notes: data.notes,
      });

      return ledgerEntry;
    });
  }

  /**
   * Cancel consignment (before dispatch only)
   */
  static async cancelConsignment(data: {
    consignmentId: string;
    cancelledById: string;
    reason?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: data.consignmentId },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      const cancellableStatuses: ConsignmentStatus[] = [
        ConsignmentStatus.CREATED,
        ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
      ];
      if (!cancellableStatuses.includes(consignment.status)) {
        throw new Error("Cannot cancel consignment after dispatch");
      }

      const updated = await tx.consignmentRequest.update({
        where: { id: data.consignmentId },
        data: {
          status: ConsignmentStatus.CANCELLED,
        },
        include: {
          items: true,
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
        },
      });

      // Create audit log
      await this.createAuditLog(tx, {
        consignmentId: data.consignmentId,
        action: "CANCELLED",
        statusFrom: consignment.status,
        statusTo: ConsignmentStatus.CANCELLED,
        actorId: data.cancelledById,
        notes: data.reason,
      });

      return updated;
    });
  }

  /**
   * Get consignment by ID with full details
   */
  static async getConsignmentById(consignmentId: string) {
    return await prisma.consignmentRequest.findUnique({
      where: { id: consignmentId },
      include: {
        items: {
          include: {
            companyProduct: true,
            dealerProduct: true,
          },
        },
        fromCompany: true,
        fromDealer: true,
        toDealer: true,
        toFarmer: true,
        companySale: {
          include: {
            items: true,
            payments: true,
          },
        },
        dispatchedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        receivedBy: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get audit logs for a consignment
   */
  static async getAuditLogs(consignmentId: string) {
    return await prisma.consignmentAuditLog.findMany({
      where: { consignmentId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * List consignments with filters
   */
  static async listConsignments(params: {
    fromCompanyId?: string;
    fromDealerId?: string;
    toDealerId?: string;
    status?: ConsignmentStatus;
    direction?: ConsignmentDirection;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const {
      fromCompanyId,
      fromDealerId,
      toDealerId,
      status,
      direction,
      page = 1,
      limit = 50,
      search,
    } = params;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (fromCompanyId) where.fromCompanyId = fromCompanyId;
    if (fromDealerId) where.fromDealerId = fromDealerId;
    if (toDealerId) where.toDealerId = toDealerId;
    if (status) where.status = status;
    if (direction) where.direction = direction;

    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    const [consignments, total] = await Promise.all([
      prisma.consignmentRequest.findMany({
        where,
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
          toFarmer: true,
          companySale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              dueAmount: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.consignmentRequest.count({ where }),
    ]);

    return {
      consignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

