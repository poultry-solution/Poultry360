import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

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
                    },
                },
            },
        });

        return res.status(200).json({
            success: true,
            data: companies,
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

        const [purchaseCount, paymentCount] = await Promise.all([
            prisma.dealerManualPurchase.count({
                where: { manualCompanyId: id, voidedAt: null },
            }),
            prisma.dealerManualCompanyPayment.count({
                where: { manualCompanyId: id, voidedAt: null },
            }),
        ]);

        if (purchaseCount > 0 || paymentCount > 0) {
            return res.status(400).json({
                message: "Company has transactions; archive instead.",
            });
        }

        await prisma.dealerManualCompany.delete({ where: { id } });

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

        const company = await prisma.dealerManualCompany.findUnique({ where: { id } });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }

        const latest = await prisma.dealerManualCompanyAdjustment.findFirst({
            where: { manualCompanyId: id, type: "OPENING_BALANCE" },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            select: { amount: true },
        });
        const prevOpening = latest ? Number(latest.amount) : 0;
        const delta = nextOpening - prevOpening;
        const newBalance = Number(company.balance) + delta;

        const adjDate = date ? new Date(date) : new Date();

        const updated = await prisma.$transaction(async (tx) => {
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
        });

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
        const { items, notes, reference, date } = req.body;

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
            let totalAmount = 0;
            const purchaseItems: any[] = [];

            for (const item of items) {
                const { productName, type, unit, quantity, costPrice, sellingPrice } = item;

                if (!productName || !type || !unit || !quantity || costPrice === undefined || costPrice === null || sellingPrice === undefined || sellingPrice === null) {
                    throw new Error("Each item must have productName, type, unit, quantity, costPrice, and sellingPrice");
                }

                const qty = Number(quantity);
                const cost = Number(costPrice);
                const sell = Number(sellingPrice);
                const itemTotal = qty * cost;
                totalAmount += itemTotal;

                // Find or create DealerProduct
                let dealerProduct = await tx.dealerProduct.findFirst({
                    where: {
                        dealerId: dealer.id,
                        name: productName,
                        costPrice: new Prisma.Decimal(cost),
                        sellingPrice: new Prisma.Decimal(sell),
                        manualCompanyId: id,
                        supplierCompanyId: null,
                    },
                });

                if (dealerProduct) {
                    // Increment stock
                    dealerProduct = await tx.dealerProduct.update({
                        where: { id: dealerProduct.id },
                        data: {
                            currentStock: { increment: new Prisma.Decimal(qty) },
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
                            dealerId: dealer.id,
                            manualCompanyId: id,
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
                    dealerProductId: dealerProduct.id,
                });
            }

            // Create purchase record
            const purchase = await tx.dealerManualPurchase.create({
                data: {
                    date: date ? new Date(date) : new Date(),
                    totalAmount: new Prisma.Decimal(totalAmount),
                    notes: notes || null,
                    reference: reference || null,
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
                    balance: { increment: new Prisma.Decimal(totalAmount) },
                    totalPurchases: { increment: new Prisma.Decimal(totalAmount) },
                },
            });

            return purchase;
        });

        return res.status(201).json({
            success: true,
            data: result,
            message: "Purchase recorded successfully. Items added to inventory.",
        });
    } catch (error: any) {
        console.error("Record manual purchase error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
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

        if (!amount || Number(amount) <= 0) {
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
            const paymentAmount = Number(amount);
            const newBalance = Number(company.balance) - paymentAmount;

            // Update company balance
            await tx.dealerManualCompany.update({
                where: { id },
                data: {
                    balance: { decrement: new Prisma.Decimal(paymentAmount) },
                    totalPayments: { increment: new Prisma.Decimal(paymentAmount) },
                },
            });

            // Create payment record
            const payment = await tx.dealerManualCompanyPayment.create({
                data: {
                    amount: new Prisma.Decimal(paymentAmount),
                    paymentMethod: paymentMethod || "CASH",
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                    notes: notes || null,
                    reference: reference || null,
                    receiptUrl: receiptUrl || null,
                    balanceAfter: new Prisma.Decimal(newBalance),
                    manualCompanyId: id,
                },
            });

            return payment;
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

        const purchase = await prisma.dealerManualPurchase.findUnique({
            where: { id: purchaseId },
            include: { items: true },
        });
        if (!purchase || purchase.manualCompanyId !== companyId) {
            return res.status(404).json({ message: "Purchase not found" });
        }
        if ((purchase as any).voidedAt) {
            return res.status(400).json({ message: "Purchase already voided" });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Stock safety checks
            for (const item of purchase.items) {
                if (!item.dealerProductId) continue;
                const product = await tx.dealerProduct.findUnique({
                    where: { id: item.dealerProductId },
                    select: { id: true, currentStock: true },
                });
                if (!product) continue;
                const currentStock = Number(product.currentStock || 0);
                const qty = Number(item.quantity || 0);
                if (currentStock < qty) {
                    throw new Error(
                        `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}.`
                    );
                }
            }

            // Reverse inventory + create reversal transactions
            for (const item of purchase.items) {
                if (!item.dealerProductId) continue;
                const qty = Number(item.quantity || 0);
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

            // Mark voided
            const updated = await tx.dealerManualPurchase.update({
                where: { id: purchaseId },
                data: {
                    voidedAt: new Date(),
                    voidedReason: reason ? String(reason).trim() || null : null,
                },
            });

            return updated;
        });

        return res.status(200).json({
            success: true,
            data: result,
            message: "Purchase voided successfully",
        });
    } catch (error: any) {
        const msg = error.message || "Internal server error";
        if (msg.startsWith("Cannot delete:")) {
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
            await tx.dealerManualCompany.update({
                where: { id: companyId },
                data: {
                    balance: { increment: payment.amount },
                    totalPayments: { decrement: payment.amount },
                },
            });

            return tx.dealerManualCompanyPayment.update({
                where: { id: paymentId },
                data: {
                    voidedAt: new Date(),
                    voidedReason: reason ? String(reason).trim() || null : null,
                },
            });
        });

        return res.status(200).json({ success: true, data: result, message: "Payment voided successfully" });
    } catch (error: any) {
        console.error("Void manual payment error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// ==================== GET STATEMENT ====================
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

        // Get adjustments (opening balance & other adjustments)
        const adjustments = await prisma.dealerManualCompanyAdjustment.findMany({
            where: { manualCompanyId: id },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        });

        const latestOpening = adjustments.find((a) => a.type === "OPENING_BALANCE") ?? null;

        // Merge and sort
        const transactions = [
            ...purchases.map((p) => ({
                type: "PURCHASE" as const,
                id: p.id,
                date: p.date,
                amount: Number(p.totalAmount),
                notes: p.notes,
                reference: p.reference,
                items: p.items,
            })),
            ...payments.map((p) => ({
                type: "PAYMENT" as const,
                id: p.id,
                date: p.paymentDate,
                amount: Number(p.amount),
                notes: p.notes,
                reference: p.reference,
                paymentMethod: p.paymentMethod,
                balanceAfter: Number(p.balanceAfter),
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
                    voidedAt: p.voidedAt,
                    voidedReason: p.voidedReason,
                    itemsCount: Array.isArray(p.items) ? p.items.length : 0,
                })),
                ...voidedPayments.map((p: any) => ({
                    kind: "PAYMENT" as const,
                    id: p.id,
                    date: p.paymentDate,
                    amount: Number(p.amount),
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
export const getDealerProfitSummary = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const userId = req.userId;

        const dealer = await prisma.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });

        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }

        // Total purchases: sum of all DealerProductTransaction with type PURCHASE
        const purchaseAggregate = await prisma.dealerProductTransaction.aggregate({
            where: {
                product: { dealerId: dealer.id },
                type: "PURCHASE",
            },
            _sum: { totalAmount: true },
        });

        // Total sales: sum of all DealerSale totalAmount
        const saleAggregate = await prisma.dealerSale.aggregate({
            where: { dealerId: dealer.id },
            _sum: { totalAmount: true },
        });

        const totalPurchases = Number(purchaseAggregate._sum.totalAmount || 0);
        const totalSales = Number(saleAggregate._sum.totalAmount || 0);
        const profit = totalSales - totalPurchases;

        return res.status(200).json({
            success: true,
            data: {
                totalPurchases,
                totalSales,
                profit,
            },
        });
    } catch (error: any) {
        console.error("Get dealer profit summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
