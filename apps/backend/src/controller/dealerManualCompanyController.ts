import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { writeBusinessAudit } from "../services/businessAuditService";
import { parseDealerExpiryDate } from "../utils/dealerExpiryDate";
import { parseDealerDateRange } from "../utils/dealerSaleDateRange";
import { cleanupUploadedImages } from "../utils/cloudinary";

type ManualCompanyPaymentDirection = "RECEIVED" | "MADE";

const getManualCompanyPaymentDirection = (value: unknown): ManualCompanyPaymentDirection =>
    value === "RECEIVED" ? "RECEIVED" : "MADE";

const parsePositivePaymentAmount = (value: unknown): Prisma.Decimal | null => {
    if (typeof value !== "number" && typeof value !== "string") return null;

    const raw = String(value).trim();
    if (!raw) return null;

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

    try {
        return new Prisma.Decimal(raw);
    } catch {
        return null;
    }
};

// ==================== CREATE MANUAL COMPANY ====================
export const createManualCompany = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { name, phone, address, openingBalance } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        // openingBalance is signed: positive = dealer owes company; negative = advance/credit
        const ob = openingBalance === undefined || openingBalance === null ? 0 : Number(openingBalance);
        if (Number.isNaN(ob)) {
            return res.status(400).json({ message: "Opening balance must be a valid number" });
        }

        const company = await prisma.$transaction(async (tx) => {
            const created = await tx.dealerManualCompany.create({
                data: {
                    name: name.trim(),
                    phone: phone || null,
                    address: address || null,
                    dealerId: dealer.id,
                },
            });

            if (ob !== 0) {
                const newBalance = ob;
                await tx.dealerManualCompanyAdjustment.create({
                    data: {
                        manualCompanyId: created.id,
                        type: "OPENING_BALANCE",
                        amount: new Prisma.Decimal(ob),
                        balanceAfter: new Prisma.Decimal(newBalance),
                        notes: "Opening balance",
                    },
                });
                await tx.dealerManualCompany.update({
                    where: { id: created.id },
                    data: { balance: new Prisma.Decimal(newBalance) },
                });
                return tx.dealerManualCompany.findUnique({ where: { id: created.id } });
            }

            return created;
        });

        return res.status(201).json({
            success: true,
            data: company,
            message: "Manual company created successfully",
        });
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A manual company with this name already exists",
            });
        }
        console.error("Create manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== GET ALL MANUAL COMPANIES ====================
export const getManualCompanies = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { archived } = req.query as any;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const archivedBool =
            archived === undefined
                ? false
                : String(archived).toLowerCase() === "true";

        const companies = await prisma.dealerManualCompany.findMany({
            where: {
                dealerId: dealer.id,
                archivedAt: archivedBool ? { not: null } : null,
            },
            orderBy: { name: "asc" },
            include: {
                _count: {
                    select: {
                        purchases: { where: { voidedAt: null } },
                        payments: { where: { voidedAt: null } },
                        settlementSales: true,
                    },
                },
            },
        });

        const companyIds = companies.map((company) => company.id);
        const openingAdjustments = companyIds.length
            ? await prisma.dealerManualCompanyAdjustment.findMany({
                where: {
                    manualCompanyId: { in: companyIds },
                    type: "OPENING_BALANCE",
                },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                select: { manualCompanyId: true, amount: true },
            }).catch((error) => {
                console.warn("Could not load supplier opening balances for list:", error);
                return [];
            })
            : [];
        const openingBalanceByCompanyId = new Map<string, number>();
        for (const adjustment of openingAdjustments) {
            if (!openingBalanceByCompanyId.has(adjustment.manualCompanyId)) {
                const amount = Number(adjustment.amount);
                openingBalanceByCompanyId.set(
                    adjustment.manualCompanyId,
                    Number.isFinite(amount) ? amount : 0,
                );
            }
        }

        return res.status(200).json({
            success: true,
            data: companies.map((company) => ({
                ...company,
                openingBalance: openingBalanceByCompanyId.get(company.id) ?? 0,
            })),
        });
    } catch (error: any) {
        console.error("Get manual companies error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== ARCHIVE / UNARCHIVE MANUAL COMPANY ====================
export const archiveManualCompany = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) return res.status(404).json({ message: "Dealer not found" });

        const company = await prisma.dealerManualCompany.findUnique({ where: { id } });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const updated = await prisma.dealerManualCompany.update({
            where: { id },
            data: { archivedAt: new Date(), archivedById: userId },
        });

        return res.status(200).json({ success: true, data: updated, message: "Manual company archived" });
    } catch (error: any) {
        console.error("Archive manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const unarchiveManualCompany = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) return res.status(404).json({ message: "Dealer not found" });

        const company = await prisma.dealerManualCompany.findUnique({ where: { id } });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const updated = await prisma.dealerManualCompany.update({
            where: { id },
            data: { archivedAt: null, archivedById: null },
        });

        return res.status(200).json({ success: true, data: updated, message: "Manual company unarchived" });
    } catch (error: any) {
        console.error("Unarchive manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== UPDATE MANUAL COMPANY ====================
export const updateManualCompany = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { name, phone, address } = req.body;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const company = await prisma.dealerManualCompany.findUnique({
            where: { id },
        });

        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const updated = await prisma.dealerManualCompany.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(phone !== undefined && { phone: phone || null }),
                ...(address !== undefined && { address: address || null }),
            },
        });

        return res.status(200).json({
            success: true,
            data: updated,
            message: "Manual company updated successfully",
        });
    } catch (error: any) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A manual company with this name already exists",
            });
        }
        console.error("Update manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== DELETE MANUAL COMPANY ====================
export const deleteManualCompany = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const company = await prisma.dealerManualCompany.findUnique({
            where: { id },
        });

        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const [purchaseCount, paymentCount, settlementSaleCount] = await Promise.all([
            prisma.dealerManualPurchase.count({
                where: { manualCompanyId: id, voidedAt: null },
            }),
            prisma.dealerManualCompanyPayment.count({
                where: { manualCompanyId: id, voidedAt: null },
            }),
            prisma.dealerSale.count({
                where: { manualCompanyId: id, isSupplierSettlementSale: true },
            }),
        ]);

        if (purchaseCount > 0 || paymentCount > 0 || settlementSaleCount > 0) {
            return res.status(400).json({
                message: "Company has transactions; archive instead.",
            });
        }

        // The guard above blocks only live transactions. Voided purchases and
        // payments still exist and will cascade-delete with the company, so
        // their bill/receipt images need to be collected before the DB wipe.
        const [voidedPurchases, voidedPayments] = await Promise.all([
            prisma.dealerManualPurchase.findMany({
                where: { manualCompanyId: id, voidedAt: { not: null } },
                select: { billImageUrl: true },
            }),
            prisma.dealerManualCompanyPayment.findMany({
                where: { manualCompanyId: id, voidedAt: { not: null } },
                select: { receiptUrl: true },
            }),
        ]);

        await prisma.dealerManualCompany.delete({ where: { id } });

        cleanupUploadedImages(
            [
                ...voidedPurchases.map((p) => p.billImageUrl),
                ...voidedPayments.map((p) => p.receiptUrl),
            ],
            userId as string,
        );

        return res.status(200).json({
            success: true,
            message: "Manual company deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== SET/UPDATE OPENING BALANCE (APPEND HISTORY) ====================
export const setManualCompanyOpeningBalance = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { openingBalance, notes, date } = req.body;

        const nextOpening = Number(openingBalance);
        if (openingBalance === undefined || openingBalance === null || Number.isNaN(nextOpening)) {
            return res.status(400).json({ message: "openingBalance (number) is required" });
        }

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const adjDate = date ? new Date(date) : new Date();

        // Reads and writes happen inside a Serializable transaction so that two
        // concurrent edits cannot both read the same stale balance and overwrite
        // each other. One of them will get a serialization error and the client
        // can retry.
        const updated = await prisma.$transaction(async (tx) => {
            const company = await tx.dealerManualCompany.findUnique({ where: { id } });
            if (!company || company.dealerId !== dealer.id) {
                throw new Error("Manual company not found");
            }

            const latest = await tx.dealerManualCompanyAdjustment.findFirst({
                where: { manualCompanyId: id, type: "OPENING_BALANCE" },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                select: { amount: true },
            });
            const prevOpening = latest ? Number(latest.amount) : 0;
            const delta = nextOpening - prevOpening;
            const newBalance = Number(company.balance) + delta;

            await tx.dealerManualCompanyAdjustment.create({
                data: {
                    manualCompanyId: id,
                    type: "OPENING_BALANCE",
                    amount: new Prisma.Decimal(nextOpening),
                    date: adjDate,
                    notes: notes ? String(notes).trim() || null : null,
                    balanceAfter: new Prisma.Decimal(newBalance),
                },
            });
            return tx.dealerManualCompany.update({
                where: { id },
                data: { balance: new Prisma.Decimal(newBalance) },
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return res.status(200).json({
            success: true,
            data: {
                company: {
                    id: updated.id,
                    name: updated.name,
                    phone: updated.phone,
                    address: updated.address,
                    balance: Number(updated.balance),
                    totalPurchases: Number(updated.totalPurchases),
                    totalPayments: Number(updated.totalPayments),
                },
            },
            message: "Opening balance updated",
        });
    } catch (error: any) {
        if (error.message === "Manual company not found") {
            return res.status(404).json({ message: "Manual company not found" });
        }
        console.error("Set opening balance error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== RECORD PURCHASE ====================
// Creates/updates DealerProducts and DealerProductTransactions
export const recordManualPurchase = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { items, notes, reference, date, tradeDiscountAmount, billImageUrl } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "At least one item is required",
            });
        }

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const company = await prisma.dealerManualCompany.findUnique({
            where: { id },
        });

        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

            const result = await prisma.$transaction(async (tx) => {
            let grossTotalAmount = 0;
            const purchaseItems: any[] = [];

            for (const item of items) {
                const {
                    productName,
                    type,
                    unit,
                    quantity,
                    costPrice,
                    sellingPrice,
                    minStock,
                    expiryDate,
                } = item;

                if (!productName || !type || !unit || !quantity || costPrice === undefined || costPrice === null || sellingPrice === undefined || sellingPrice === null) {
                    throw new Error("Each item must have productName, type, unit, quantity, costPrice, and sellingPrice");
                }

                const qty = Number(quantity);
                const cost = Number(costPrice);
                const sell = Number(sellingPrice);
                const minStockValue =
                    minStock === undefined || minStock === null || minStock === ""
                        ? undefined
                        : Number(minStock);

                if (minStockValue !== undefined && (Number.isNaN(minStockValue) || minStockValue < 0)) {
                    throw new Error("Minimum stock must be a valid non-negative number");
                }

                const parsedExpiry = parseDealerExpiryDate(expiryDate);

                const itemTotal = qty * cost;
                grossTotalAmount += itemTotal;

                // Find or create DealerProduct
                let dealerProduct = await tx.dealerProduct.findFirst({
                    where: {
                        dealerId: dealer.id,
                        name: productName,
                        costPrice: new Prisma.Decimal(cost),
                        sellingPrice: new Prisma.Decimal(sell),
                        manualCompanyId: id,
                        supplierCompanyId: null,
                        expiryDateKey: parsedExpiry.expiryDateKey,
                    },
                });

                if (dealerProduct) {
                    // Increment stock
                    dealerProduct = await tx.dealerProduct.update({
                        where: { id: dealerProduct.id },
                        data: {
                            currentStock: { increment: new Prisma.Decimal(qty) },
                            // If this item was previously hidden at zero stock,
                            // restocking should make it visible again.
                            hiddenAt: null,
                            ...(minStockValue !== undefined
                                ? { minStock: new Prisma.Decimal(minStockValue) }
                                : {}),
                            expiryDate: parsedExpiry.expiryDate,
                            expiryDateKey: parsedExpiry.expiryDateKey,
                        },
                    });
                } else {
                    // Create new product
                    dealerProduct = await tx.dealerProduct.create({
                        data: {
                            name: productName,
                            type,
                            unit,
                            costPrice: new Prisma.Decimal(cost),
                            sellingPrice: new Prisma.Decimal(sell),
                            currentStock: new Prisma.Decimal(qty),
                            minStock: minStockValue !== undefined ? new Prisma.Decimal(minStockValue) : null,
                            dealerId: dealer.id,
                            manualCompanyId: id,
                            expiryDate: parsedExpiry.expiryDate,
                            expiryDateKey: parsedExpiry.expiryDateKey,
                        },
                    });
                }

                // Create product transaction
                await tx.dealerProductTransaction.create({
                    data: {
                        type: "PURCHASE",
                        quantity: new Prisma.Decimal(qty),
                        unitPrice: new Prisma.Decimal(cost),
                        totalAmount: new Prisma.Decimal(itemTotal),
                        date: date ? new Date(date) : new Date(),
                        description: `Purchase from ${company.name}`,
                        reference: reference || null,
                        productId: dealerProduct.id,
                        unit: unit || null,
                        expiryDate: parsedExpiry.expiryDate,
                    },
                });

                purchaseItems.push({
                    productName,
                    type,
                    unit,
                    quantity: new Prisma.Decimal(qty),
                    costPrice: new Prisma.Decimal(cost),
                    sellingPrice: new Prisma.Decimal(sell),
                    totalAmount: new Prisma.Decimal(itemTotal),
                    expiryDate: parsedExpiry.expiryDate,
                    dealerProductId: dealerProduct.id,
                });
            }

            const discountNum =
                tradeDiscountAmount === undefined || tradeDiscountAmount === null || tradeDiscountAmount === ""
                    ? 0
                    : Number(tradeDiscountAmount);
            if (Number.isNaN(discountNum) || discountNum < 0) {
                throw new Error("Trade discount must be a valid non-negative number");
            }
            if (discountNum > grossTotalAmount) {
                const grossStr = grossTotalAmount.toFixed(2);
                throw new Error(`Trade discount cannot exceed gross total (${grossStr})`);
            }
            const netTotalAmount = grossTotalAmount - discountNum;

            // Create purchase record
            const purchase = await tx.dealerManualPurchase.create({
                data: {
                    date: date ? new Date(date) : new Date(),
                    totalAmount: new Prisma.Decimal(netTotalAmount),
                    tradeDiscountAmount: discountNum > 0 ? new Prisma.Decimal(discountNum) : null,
                    notes: notes || null,
                    reference: reference || null,
                    billImageUrl:
                        typeof billImageUrl === "string" && billImageUrl.trim()
                            ? billImageUrl.trim()
                            : null,
                    manualCompanyId: id,
                    items: {
                        create: purchaseItems,
                    },
                },
                include: {
                    items: true,
                },
            });

            // Update company balance
            await tx.dealerManualCompany.update({
                where: { id },
                data: {
                    balance: { increment: new Prisma.Decimal(netTotalAmount) },
                    totalPurchases: { increment: new Prisma.Decimal(netTotalAmount) },
                },
            });

            return purchase;
        });

        await writeBusinessAudit(req, {
            action: "dealer.purchase.recorded",
            targetType: "DealerManualPurchase",
            targetId: result.id,
            description: "Recorded a supplier purchase",
            businessType: "DEALER",
            businessId: dealer.id,
            metadata: { amount: Number(result.totalAmount), itemCount: result.items.length, supplierId: id },
        });

        return res.status(201).json({
            success: true,
            data: result,
            message: "Purchase recorded successfully. Items added to inventory.",
        });
    } catch (error: any) {
        const msg = error.message || "Internal server error";
        if (
            msg.startsWith("Trade discount") ||
            msg.includes("Trade discount") ||
            msg === "Trade discount must be a valid non-negative number" ||
            msg === "Expiry date must be a valid date"
        ) {
            return res.status(400).json({ message: msg });
        }
        console.error("Record manual purchase error:", error);
        return res.status(500).json({
            message: msg,
        });
    }
};

// ==================== RECORD PAYMENT ====================
export const recordManualCompanyPayment = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { amount, paymentMethod, paymentDate, notes, reference, receiptUrl } = req.body;
        const rawDirection = req.body.direction;

        if (rawDirection !== undefined && rawDirection !== null && rawDirection !== "RECEIVED" && rawDirection !== "MADE") {
            return res.status(400).json({ message: "Payment direction must be RECEIVED or MADE" });
        }

        const direction = getManualCompanyPaymentDirection(rawDirection);
        const paymentAmount = parsePositivePaymentAmount(amount);

        if (!paymentAmount) {
            return res.status(400).json({ message: "Valid amount is required" });
        }

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const company = await prisma.dealerManualCompany.findUnique({
            where: { id },
        });

        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const currentCompany = await tx.dealerManualCompany.findUnique({
                where: { id },
                select: { balance: true },
            });
            if (!currentCompany) {
                throw new Error("Manual company not found");
            }

            const isMade = direction === "MADE";
            const newBalance = isMade
                ? new Prisma.Decimal(currentCompany.balance).minus(paymentAmount)
                : new Prisma.Decimal(currentCompany.balance).plus(paymentAmount);

            // Update company balance
            await tx.dealerManualCompany.update({
                where: { id },
                data: {
                    balance: isMade
                        ? { decrement: paymentAmount }
                        : { increment: paymentAmount },
                    ...(isMade ? { totalPayments: { increment: paymentAmount } } : {}),
                },
            });

            // Create payment record
            const payment = await tx.dealerManualCompanyPayment.create({
                data: {
                    amount: paymentAmount,
                    direction,
                    paymentMethod: paymentMethod || "CASH",
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                    notes: notes || null,
                    reference: reference || null,
                    receiptUrl: receiptUrl || null,
                    balanceAfter: newBalance,
                    manualCompanyId: id,
                },
            });

            return payment;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        await writeBusinessAudit(req, {
            action: "dealer.supplier_payment.recorded",
            targetType: "DealerManualCompanyPayment",
            targetId: result.id,
            description: "Recorded a supplier payment",
            businessType: "DEALER",
            businessId: dealer.id,
            metadata: {
                amount: Number(result.amount),
                direction: result.direction || direction,
                paymentMethod: result.paymentMethod,
                supplierId: id,
            },
        });
        return res.status(201).json({
            success: true,
            data: result,
            message: "Payment recorded successfully",
        });
    } catch (error: any) {
        console.error("Record manual company payment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== VOID (REVERSE) PURCHASE ====================
export const voidManualPurchase = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.userId;
        const { companyId, purchaseId } = req.params;
        const { reason } = req.body;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) return res.status(404).json({ message: "Dealer not found" });

        const company = await prisma.dealerManualCompany.findUnique({ where: { id: companyId } });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        // 404 vs "already voided" are a pre-check for a clean error message;
        // the race-safe guard lives inside the transaction below.
        const purchase = await prisma.dealerManualPurchase.findUnique({
            where: { id: purchaseId },
            include: { items: true },
        });
        if (!purchase || purchase.manualCompanyId !== companyId) {
            return res.status(404).json({ message: "Purchase not found" });
        }
        if (purchase.voidedAt) {
            return res.status(400).json({ message: "Purchase already voided" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Claim the void atomically before doing any reversals. The
            // conditional update takes a row lock, so a concurrent request
            // sees count=0 and bails — otherwise both callers would apply
            // the inventory + balance reversals and corrupt the ledger.
            const claim = await tx.dealerManualPurchase.updateMany({
                where: {
                    id: purchaseId,
                    manualCompanyId: companyId,
                    voidedAt: null,
                },
                data: {
                    voidedAt: new Date(),
                    voidedReason: reason ? String(reason).trim() || null : null,
                },
            });
            if (claim.count === 0) {
                // Another request got here first (or the record was moved).
                // A thrown Error with this exact message gets mapped to a 400
                // response in the catch block below.
                throw new Error("Purchase already voided");
            }

            // Stock safety checks. These run AFTER the claim so a failure
            // rolls the void back (including the voidedAt we just set).
            for (const item of purchase.items) {
                if (!item.dealerProductId) continue;
                const product = await tx.dealerProduct.findUnique({
                    where: { id: item.dealerProductId },
                    select: { id: true, currentStock: true },
                });
                if (!product) continue;
                const currentStock = Number(product.currentStock || 0);
                // Use baseQuantity (base unit) to mirror what the original purchase added.
                // Fall back to quantity for older records that predate baseQuantity.
                const qty = Number(item.baseQuantity ?? item.quantity ?? 0);
                if (currentStock < qty) {
                    throw new Error(
                        `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}.`
                    );
                }
            }

            // Reverse inventory + create reversal transactions
            for (const item of purchase.items) {
                if (!item.dealerProductId) continue;
                const qty = Number(item.baseQuantity ?? item.quantity ?? 0);
                const cost = Number(item.costPrice || 0);
                const totalAmount = qty * cost;

                await tx.dealerProduct.update({
                    where: { id: item.dealerProductId },
                    data: { currentStock: { decrement: new Prisma.Decimal(qty) } },
                });

                await tx.dealerProductTransaction.create({
                    data: {
                        type: "RETURN",
                        quantity: new Prisma.Decimal(qty),
                        unitPrice: new Prisma.Decimal(cost),
                        totalAmount: new Prisma.Decimal(totalAmount),
                        date: new Date(),
                        description: `Void manual purchase from ${company.name}`,
                        reference: `VOID_PURCHASE:${purchaseId}`,
                        productId: item.dealerProductId,
                        unit: item.unit || null,
                        expiryDate: item.expiryDate,
                    },
                });
            }

            // Reverse company totals
            await tx.dealerManualCompany.update({
                where: { id: companyId },
                data: {
                    balance: { decrement: purchase.totalAmount },
                    totalPurchases: { decrement: purchase.totalAmount },
                },
            });

            return tx.dealerManualPurchase.findUnique({ where: { id: purchaseId } });
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: "Purchase voided successfully",
        });
    } catch (error: any) {
        const msg = error.message || "Internal server error";
        if (msg.startsWith("Cannot delete:") || msg === "Purchase already voided") {
            return res.status(400).json({ message: msg });
        }
        console.error("Void manual purchase error:", error);
        return res.status(500).json({ message: msg });
    }
};

// ==================== VOID (REVERSE) PAYMENT ====================
export const voidManualCompanyPayment = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.userId;
        const { companyId, paymentId } = req.params;
        const { reason } = req.body;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) return res.status(404).json({ message: "Dealer not found" });

        const company = await prisma.dealerManualCompany.findUnique({ where: { id: companyId } });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const payment = await prisma.dealerManualCompanyPayment.findUnique({
            where: { id: paymentId },
        });
        if (!payment || payment.manualCompanyId !== companyId) {
            return res.status(404).json({ message: "Payment not found" });
        }
        if ((payment as any).voidedAt) {
            return res.status(400).json({ message: "Payment already voided" });
        }

        const result = await prisma.$transaction(async (tx) => {
            const currentPayment = await tx.dealerManualCompanyPayment.findUnique({
                where: { id: paymentId },
            });
            if (!currentPayment || currentPayment.manualCompanyId !== companyId) {
                throw new Error("Payment not found");
            }
            if (currentPayment.voidedAt) {
                throw new Error("Payment already voided");
            }

            const direction = getManualCompanyPaymentDirection(currentPayment.direction);
            const isMade = direction === "MADE";

            await tx.dealerManualCompany.update({
                where: { id: companyId },
                data: {
                    balance: isMade
                        ? { increment: currentPayment.amount }
                        : { decrement: currentPayment.amount },
                    ...(isMade ? { totalPayments: { decrement: currentPayment.amount } } : {}),
                },
            });

            return tx.dealerManualCompanyPayment.update({
                where: { id: paymentId },
                data: {
                    voidedAt: new Date(),
                    voidedReason: reason ? String(reason).trim() || null : null,
                },
            });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        return res.status(200).json({ success: true, data: result, message: "Payment voided successfully" });
    } catch (error: any) {
        console.error("Void manual payment error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// ==================== GET STATEMENT ====================
const STATEMENT_TABS = ["purchases", "payments", "settlements", "adjustments", "voided"] as const;
type StatementTab = (typeof STATEMENT_TABS)[number];

const mapStatementPurchase = (p: any) => ({
    type: "PURCHASE" as const,
    id: p.id,
    date: p.date,
    amount: Number(p.totalAmount),
    tradeDiscountAmount: Number(p.tradeDiscountAmount ?? 0),
    notes: p.notes,
    reference: p.reference,
    billImageUrl: p.billImageUrl,
    items: p.items,
});

const mapStatementPayment = (p: any) => ({
    type: "PAYMENT" as const,
    id: p.id,
    date: p.paymentDate,
    amount: Number(p.amount),
    direction: getManualCompanyPaymentDirection(p.direction),
    notes: p.notes,
    reference: p.reference,
    paymentMethod: p.paymentMethod,
    balanceAfter: Number(p.balanceAfter),
});

const mapStatementSettlementSale = (sale: any) => ({
    type: "SUPPLIER_SETTLEMENT_SALE" as const,
    id: sale.id,
    date: sale.date,
    amount: Number(sale.totalAmount),
    notes: sale.notes,
    reference: sale.invoiceNumber,
    items: sale.items,
});

const mapStatementAdjustment = (a: any) => ({
    type: a.type as "OPENING_BALANCE" | "ADJUSTMENT",
    id: a.id,
    date: a.date,
    amount: Number(a.amount),
    notes: a.notes,
    balanceAfter: Number(a.balanceAfter),
});

const mapVoidedPurchase = (p: any) => ({
    kind: "PURCHASE" as const,
    id: p.id,
    date: p.date,
    amount: Number(p.totalAmount),
    tradeDiscountAmount: Number(p.tradeDiscountAmount ?? 0),
    voidedAt: p.voidedAt,
    voidedReason: p.voidedReason,
    billImageUrl: p.billImageUrl,
    itemsCount: Array.isArray(p.items) ? p.items.length : 0,
});

const mapVoidedPayment = (p: any) => ({
    kind: "PAYMENT" as const,
    id: p.id,
    date: p.paymentDate,
    amount: Number(p.amount),
    direction: getManualCompanyPaymentDirection(p.direction),
    voidedAt: p.voidedAt,
    voidedReason: p.voidedReason,
});

/**
 * One tab of a supplier's account, paged in the database (10 per page by
 * default), plus the true row count of every tab.
 */
async function getStatementTab(
    res: Response,
    dealerId: string,
    company: any,
    query: Record<string, any>
) {
    const type = String(query.type) as StatementTab;
    if (!STATEMENT_TABS.includes(type)) {
        return res.status(400).json({ message: "Invalid tab" });
    }

    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(50, Math.max(1, Math.floor(Number(query.limit)) || 10));
    const skip = (page - 1) * limit;
    const manualCompanyId = company.id;

    const purchaseWhere = { manualCompanyId, voidedAt: null };
    const paymentWhere = { manualCompanyId, voidedAt: null };
    const settlementWhere = { dealerId, manualCompanyId, isSupplierSettlementSale: true };
    const voidedWhere = { manualCompanyId, voidedAt: { not: null } };

    const [purchases, payments, settlements, adjustments, voidedPurchases, voidedPayments, latestOpening] =
        await Promise.all([
            prisma.dealerManualPurchase.count({ where: purchaseWhere }),
            prisma.dealerManualCompanyPayment.count({ where: paymentWhere }),
            prisma.dealerSale.count({ where: settlementWhere }),
            prisma.dealerManualCompanyAdjustment.count({ where: { manualCompanyId } }),
            prisma.dealerManualPurchase.count({ where: voidedWhere }),
            prisma.dealerManualCompanyPayment.count({ where: voidedWhere }),
            prisma.dealerManualCompanyAdjustment.findFirst({
                where: { manualCompanyId, type: "OPENING_BALANCE" },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            }),
        ]);
    const counts = {
        purchases,
        payments,
        settlements,
        adjustments,
        voided: voidedPurchases + voidedPayments,
    };

    let rows: any[];
    if (type === "purchases") {
        rows = (await prisma.dealerManualPurchase.findMany({
            where: purchaseWhere,
            include: { items: true },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit,
        })).map(mapStatementPurchase);
    } else if (type === "payments") {
        rows = (await prisma.dealerManualCompanyPayment.findMany({
            where: paymentWhere,
            orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit,
        })).map(mapStatementPayment);
    } else if (type === "settlements") {
        rows = (await prisma.dealerSale.findMany({
            where: settlementWhere,
            include: {
                items: {
                    include: { product: { select: { id: true, name: true, unit: true } } },
                },
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit,
        })).map(mapStatementSettlementSale);
    } else if (type === "adjustments") {
        rows = (await prisma.dealerManualCompanyAdjustment.findMany({
            where: { manualCompanyId },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit,
        })).map(mapStatementAdjustment);
    } else {
        // Voided rows live in two tables: take enough from each, merge, then cut the page.
        const [vPurchases, vPayments] = await Promise.all([
            prisma.dealerManualPurchase.findMany({
                where: voidedWhere,
                include: { items: true },
                orderBy: [{ voidedAt: "desc" }, { id: "desc" }],
                take: skip + limit,
            }),
            prisma.dealerManualCompanyPayment.findMany({
                where: voidedWhere,
                orderBy: [{ voidedAt: "desc" }, { id: "desc" }],
                take: skip + limit,
            }),
        ]);
        rows = [...vPurchases.map(mapVoidedPurchase), ...vPayments.map(mapVoidedPayment)]
            .sort((a, b) => new Date(b.voidedAt).getTime() - new Date(a.voidedAt).getTime())
            .slice(skip, skip + limit);
    }

    const total = counts[type];
    return res.status(200).json({
        success: true,
        data: {
            company: {
                id: company.id,
                name: company.name,
                phone: company.phone,
                address: company.address,
                balance: Number(company.balance),
                totalPurchases: Number(company.totalPurchases),
                totalPayments: Number(company.totalPayments),
                totalSettlementSales: Number(company.totalSettlementSales),
            },
            openingBalance: latestOpening
                ? {
                    amount: Number(latestOpening.amount),
                    date: latestOpening.date,
                    notes: latestOpening.notes,
                }
                : { amount: 0, date: null, notes: null },
            type,
            rows,
            counts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
    });
}

export const getManualCompanyStatement = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { page = "1", limit = "20", includeVoided } = req.query as any;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        const company = await prisma.dealerManualCompany.findUnique({
            where: { id },
        });

        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        // The account page asks for one tab at a time. Without `type` the old
        // mixed statement below is returned (used by Download statement).
        if (req.query.type !== undefined) {
            return getStatementTab(res, dealer.id, company, req.query);
        }

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const includeVoidedBool = String(includeVoided).toLowerCase() === "true";

        // Get purchases
        const purchases = await prisma.dealerManualPurchase.findMany({
            where: { manualCompanyId: id, voidedAt: null },
            include: { items: true },
            orderBy: { date: "desc" },
        });

        // Get payments
        const payments = await prisma.dealerManualCompanyPayment.findMany({
            where: { manualCompanyId: id, voidedAt: null },
            orderBy: { paymentDate: "desc" },
        });

        const [voidedPurchases, voidedPayments] = includeVoidedBool
            ? await Promise.all([
                prisma.dealerManualPurchase.findMany({
                    where: { manualCompanyId: id, voidedAt: { not: null } },
                    include: { items: true },
                    orderBy: { voidedAt: "desc" },
                }),
                prisma.dealerManualCompanyPayment.findMany({
                    where: { manualCompanyId: id, voidedAt: { not: null } },
                    orderBy: { voidedAt: "desc" },
                }),
            ])
            : [[], []];

        // Get adjustments (opening balance & other adjustments) and the
        // goods-only sales that settled this supplier's payable.
        const [adjustments, settlementSales] = await Promise.all([
            prisma.dealerManualCompanyAdjustment.findMany({
                where: { manualCompanyId: id },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            }).catch((error) => {
                console.warn("Could not load supplier opening balance records:", error);
                return [];
            }),
            prisma.dealerSale.findMany({
                where: {
                    dealerId: dealer.id,
                    manualCompanyId: id,
                    isSupplierSettlementSale: true,
                },
                include: {
                    items: {
                        include: { product: { select: { id: true, name: true, unit: true } } },
                    },
                },
                orderBy: { date: "desc" },
            }),
        ]);

        const latestOpening = adjustments.find((a) => a.type === "OPENING_BALANCE") ?? null;

        // Merge and sort
        const transactions = [
            ...purchases.map((p) => ({
                type: "PURCHASE" as const,
                id: p.id,
                date: p.date,
                amount: Number(p.totalAmount),
                tradeDiscountAmount: Number((p as any).tradeDiscountAmount ?? 0),
                notes: p.notes,
                reference: p.reference,
                billImageUrl: p.billImageUrl,
                items: p.items,
            })),
            ...payments.map((p) => ({
                type: "PAYMENT" as const,
                id: p.id,
                date: p.paymentDate,
                amount: Number(p.amount),
                direction: getManualCompanyPaymentDirection(p.direction),
                notes: p.notes,
                reference: p.reference,
                paymentMethod: p.paymentMethod,
                balanceAfter: Number(p.balanceAfter),
            })),
            ...settlementSales.map((sale) => ({
                type: "SUPPLIER_SETTLEMENT_SALE" as const,
                id: sale.id,
                date: sale.date,
                amount: Number(sale.totalAmount),
                notes: sale.notes,
                reference: sale.invoiceNumber,
                items: sale.items,
            })),
            ...adjustments.map((a) => ({
                type: a.type as "OPENING_BALANCE" | "ADJUSTMENT",
                id: a.id,
                date: a.date,
                amount: Number(a.amount),
                notes: a.notes,
                balanceAfter: Number(a.balanceAfter),
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const total = transactions.length;
        const paginated = transactions.slice(skip, skip + limitNum);

        const voidedTransactions = includeVoidedBool
            ? [
                ...voidedPurchases.map((p: any) => ({
                    kind: "PURCHASE" as const,
                    id: p.id,
                    date: p.date,
                    amount: Number(p.totalAmount),
                    tradeDiscountAmount: Number(p.tradeDiscountAmount ?? 0),
                    voidedAt: p.voidedAt,
                    voidedReason: p.voidedReason,
                    billImageUrl: p.billImageUrl,
                    itemsCount: Array.isArray(p.items) ? p.items.length : 0,
                })),
                ...voidedPayments.map((p: any) => ({
                    kind: "PAYMENT" as const,
                    id: p.id,
                    date: p.paymentDate,
                    amount: Number(p.amount),
                    direction: getManualCompanyPaymentDirection(p.direction),
                    voidedAt: p.voidedAt,
                    voidedReason: p.voidedReason,
                })),
            ].sort((a, b) => new Date(b.voidedAt).getTime() - new Date(a.voidedAt).getTime())
            : [];

        return res.status(200).json({
            success: true,
            data: {
                company: {
                    id: company.id,
                    name: company.name,
                    phone: company.phone,
                    address: company.address,
                    balance: Number(company.balance),
                    totalPurchases: Number(company.totalPurchases),
                    totalPayments: Number(company.totalPayments),
                    totalSettlementSales: Number(company.totalSettlementSales),
                },
                openingBalance: latestOpening
                    ? {
                        amount: Number(latestOpening.amount),
                        date: latestOpening.date,
                        notes: latestOpening.notes,
                    }
                    : { amount: 0, date: null, notes: null },
                transactions: paginated,
                voidedTransactions,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error: any) {
        console.error("Get manual company statement error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// ==================== GET PROFIT SUMMARY ====================
// Profit = product sales − cost of the items sold + settled Broiler margin.
// Optional startDate/endDate (YYYY-MM-DD) are full Nepal days.
export const getDealerProfitSummary = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;

        const dateRange = parseDealerDateRange(req.query.startDate, req.query.endDate);
        if (!dateRange.ok) {
            return res.status(400).json({ message: dateRange.message });
        }
        const dateFilter = dateRange.range ? { date: dateRange.range } : {};

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        // Broiler proceeds belong to the farmer. Only the settled margin is dealer income.
        const saleWhere: Prisma.DealerSaleWhereInput = {
            dealerId: dealer.id,
            farmerId: null,
            accountId: null,
            isChickenSale: false,
            ...dateFilter,
        };

        const [saleAggregate, costAggregate, itemsMissingCost, marginAggregate, purchaseAggregate] =
            await Promise.all([
                prisma.dealerSale.aggregate({
                    where: saleWhere,
                    _sum: { totalAmount: true },
                }),
                prisma.dealerSaleItem.aggregate({
                    where: { sale: saleWhere },
                    _sum: { costAmount: true },
                }),
                prisma.dealerSaleItem.count({
                    where: { sale: saleWhere, OR: [{ productId: null }, { costAmount: null }] },
                }),
                prisma.dealerLedgerEntry.aggregate({
                    where: { dealerId: dealer.id, type: "BROILER_SALE_MARGIN", ...dateFilter },
                    _sum: { amount: true },
                }),
                // What was bought, after trade discount, without voided bills.
                prisma.dealerManualPurchase.aggregate({
                    where: {
                        manualCompany: { dealerId: dealer.id },
                        voidedAt: null,
                        ...dateFilter,
                    },
                    _sum: { totalAmount: true },
                }),
            ]);

        const round2 = (value: number) => Math.round(value * 100) / 100;
        const normalSales = round2(Number(saleAggregate._sum.totalAmount || 0));
        const costOfGoodsSold = round2(Number(costAggregate._sum.costAmount || 0));
        const broilerMargin = round2(Number(marginAggregate._sum.amount || 0));
        const totalPurchases = round2(Number(purchaseAggregate._sum.totalAmount || 0));
        const totalSales = round2(normalSales + broilerMargin);
        const profit = round2(normalSales - costOfGoodsSold + broilerMargin);

        return res.status(200).json({
            success: true,
            data: {
                totalPurchases,
                totalSales,
                normalSales,
                costOfGoodsSold,
                broilerMargin,
                profit,
                itemsMissingCost,
            },
        });
    } catch (error: any) {
        console.error("Get dealer profit summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
